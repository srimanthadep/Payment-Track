import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { activityLogService } from "@/services/activityLogService";

export type DueStatus = "outstanding" | "partially_paid" | "paid" | "overdue";

export interface DuePayment {
  id: string;
  amount: number;
  date: string;
  method: string;
  notes: string;
}

export interface Due {
  id: string;
  user_id: string;
  borrower_name: string;
  borrower_contact: string | null;
  principal_amount: number;
  date_given: string;
  expected_return_date: string | null;
  notes: string | null;
  payments: DuePayment[];
  amount_paid: number;
  status: DueStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateDueInput {
  borrower_name: string;
  borrower_contact?: string | null;
  principal_amount: number;
  date_given: string;
  expected_return_date?: string | null;
  notes?: string | null;
}

export interface AddPaymentInput {
  amount: number;
  date: string;
  method: string;
  notes?: string;
}

const isPastDate = (value?: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < now;
};

export const deriveDueStatus = (
  principalAmount: number,
  amountPaid: number,
  expectedReturnDate?: string | null
): DueStatus => {
  const principal = Number(principalAmount || 0);
  const paid = Number(amountPaid || 0);

  if (principal <= 0) return "paid";
  if (paid >= principal) return "paid";
  if (isPastDate(expectedReturnDate)) return "overdue";
  if (paid > 0) return "partially_paid";
  return "outstanding";
};

const toPayment = (value: any): DuePayment => ({
  id: String(value?.id || `pay_${Date.now()}`),
  amount: Number(value?.amount || 0),
  date: String(value?.date || new Date().toISOString()),
  method: String(value?.method || "Cash"),
  notes: String(value?.notes || ""),
});

const normalizeDue = (row: any): Due => {
  const parsedPayments = Array.isArray(row?.payments)
    ? row.payments.map(toPayment)
    : [];

  const amountPaid = Number(
    row?.amount_paid ?? parsedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );

  const principalAmount = Number(row?.principal_amount || 0);
  const expectedReturnDate = row?.expected_return_date || null;

  return {
    id: row.id,
    user_id: row.user_id,
    borrower_name: row.borrower_name || "",
    borrower_contact: row.borrower_contact || null,
    principal_amount: principalAmount,
    date_given: row.date_given,
    expected_return_date: expectedReturnDate,
    notes: row.notes || null,
    payments: parsedPayments,
    amount_paid: amountPaid,
    status: deriveDueStatus(principalAmount, amountPaid, expectedReturnDate),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const useDues = (userId?: string) => {
  const [dues, setDues] = useState<Due[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDues = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("dues")
      .select("*")
      .eq("user_id", userId)
      .order("date_given", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setIsLoading(false);
      return;
    }

    setDues((data || []).map(normalizeDue));
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchDues();
    }
  }, [userId, fetchDues]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("dues-live-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dues",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchDues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchDues]);

  const createDue = useCallback(
    async (input: CreateDueInput) => {
      if (!userId) return { success: false, error: "No user session" };

      const principalAmount = Number(input.principal_amount || 0);
      const payload = {
        user_id: userId,
        borrower_name: input.borrower_name.trim(),
        borrower_contact: input.borrower_contact?.trim() || null,
        principal_amount: principalAmount,
        date_given: input.date_given,
        expected_return_date: input.expected_return_date || null,
        notes: input.notes?.trim() || null,
        payments: [] as Json,
        amount_paid: 0,
        status: deriveDueStatus(principalAmount, 0, input.expected_return_date),
      };

      const { data, error: insertError } = await supabase
        .from("dues")
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      if (data) {
        const normalized = normalizeDue(data);
        setDues((prev) => [normalized, ...prev]);
      }

      activityLogService.log(
        "due.created",
        "transaction",
        `Added due for ${input.borrower_name.trim()} of ₹${principalAmount.toLocaleString("en-IN")}`,
        { borrower_name: input.borrower_name.trim(), principal_amount: principalAmount }
      );

      return { success: true, error: null };
    },
    [userId]
  );

  const updateDue = useCallback(
    async (id: string, updates: Partial<Due>) => {
      if (!userId) return { success: false, error: "No user session" };

      const previousDues = dues;
      const target = dues.find((due) => due.id === id);
      if (!target) {
        return { success: false, error: "Due not found" };
      }

      const nextExpectedReturnDate =
        updates.expected_return_date !== undefined
          ? updates.expected_return_date || null
          : target.expected_return_date;

      const nextPayments =
        updates.payments !== undefined
          ? Array.isArray(updates.payments)
            ? updates.payments.map(toPayment)
            : []
          : target.payments;

      const derivedAmountPaid =
        updates.amount_paid !== undefined
          ? Number(updates.amount_paid || 0)
          : nextPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const nextPrincipal =
        updates.principal_amount !== undefined
          ? Number(updates.principal_amount || 0)
          : target.principal_amount;

      const nextStatus =
        updates.status || deriveDueStatus(nextPrincipal, derivedAmountPaid, nextExpectedReturnDate);

      const optimisticDue: Due = {
        ...target,
        ...updates,
        expected_return_date: nextExpectedReturnDate,
        payments: nextPayments,
        amount_paid: derivedAmountPaid,
        principal_amount: nextPrincipal,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      setDues((prev) => prev.map((due) => (due.id === id ? optimisticDue : due)));
      setError(null);

      const dbUpdates: Record<string, any> = {
        ...updates,
        expected_return_date: nextExpectedReturnDate,
        payments: nextPayments as unknown as Json,
        amount_paid: derivedAmountPaid,
        principal_amount: nextPrincipal,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from("dues")
        .update(dbUpdates)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        setDues(previousDues);
        setError(updateError.message);
        return { success: false, error: updateError.message };
      }

      if (data) {
        const normalized = normalizeDue(data);
        setDues((prev) => prev.map((due) => (due.id === id ? normalized : due)));
      }

      activityLogService.log("due.updated", "transaction", `Updated due for ${target.borrower_name}`, {
        due_id: id,
        updates: Object.keys(updates),
      });

      return { success: true, error: null };
    },
    [userId, dues]
  );

  const addPayment = useCallback(
    async (dueId: string, input: AddPaymentInput) => {
      const target = dues.find((due) => due.id === dueId);
      if (!target) {
        return { success: false, error: "Due not found" };
      }

      const payment: DuePayment = {
        id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        amount: Number(input.amount || 0),
        date: input.date,
        method: input.method || "Cash",
        notes: input.notes?.trim() || "",
      };

      const nextPayments = [...target.payments, payment];
      const nextAmountPaid = nextPayments.reduce(
        (sum, duePayment) => sum + Number(duePayment.amount || 0),
        0
      );

      const status = deriveDueStatus(
        target.principal_amount,
        nextAmountPaid,
        target.expected_return_date
      );

      const result = await updateDue(dueId, {
        payments: nextPayments,
        amount_paid: nextAmountPaid,
        status,
      });

      if (result.success) {
        activityLogService.log(
          "due.payment_added",
          "transaction",
          `Added payment of ₹${payment.amount.toLocaleString("en-IN")} for ${target.borrower_name}`,
          { due_id: dueId, payment }
        );
      }

      return result;
    },
    [dues, updateDue]
  );

  return {
    dues,
    isLoading,
    error,
    fetchDues,
    createDue,
    updateDue,
    addPayment,
  };
};
