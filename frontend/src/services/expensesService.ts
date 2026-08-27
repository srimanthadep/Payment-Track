import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  expense_date: string;
  paid_to: string | null;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  user_id: string;
  category: string;
  amount: number;
  expense_date: string;
  paid_to?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface UpdateExpenseInput {
  category?: string;
  amount?: number;
  expense_date?: string;
  paid_to?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface ExpenseStats {
  totalAmount: number;
  count: number;
  averageAmount: number;
  categoryBreakdown: {
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  todayAmount: number;
  thisMonthAmount: number;
}

const EXPENSES_CACHE_KEY_PREFIX = "payment_track_expenses_cache_u_";

class ExpensesService {
  private getCacheKey(userId: string): string {
    return `${EXPENSES_CACHE_KEY_PREFIX}${userId}`;
  }

  private getCachedExpenses(userId: string): Expense[] {
    if (!userId) return [];
    try {
      const stored = localStorage.getItem(this.getCacheKey(userId));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to read cached expenses", e);
    }
    return [];
  }

  private setCachedExpenses(userId: string, expenses: Expense[]): void {
    if (!userId) return;
    try {
      localStorage.setItem(this.getCacheKey(userId), JSON.stringify(expenses));
    } catch (e) {
      console.error("Failed to save cached expenses", e);
    }
  }

  public async getExpenses(userId: string): Promise<{ data: Expense[]; error: string | null }> {
    if (!userId) return { data: [], error: "No user ID provided" };
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .order("expense_date", { ascending: false });

      if (error) {
        console.error("Supabase getExpenses error:", error);
        // Return local cache as fallback if network fails
        return { data: this.getCachedExpenses(userId), error: error.message };
      }

      if (data) {
        const remoteExpenses = data as unknown as Expense[];
        this.setCachedExpenses(userId, remoteExpenses);
        return { data: remoteExpenses, error: null };
      }

      return { data: [], error: null };
    } catch (err: any) {
      console.error("Failed to fetch expenses from database:", err);
      return { data: this.getCachedExpenses(userId), error: err.message || "Failed to fetch expenses" };
    }
  }

  public async createExpense(input: CreateExpenseInput): Promise<{ data: Expense | null; error: string | null }> {
    const id = "exp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const newExpenseRecord = {
      id,
      user_id: input.user_id,
      category: input.category,
      amount: Number(input.amount),
      expense_date: input.expense_date || now,
      paid_to: input.paid_to || null,
      payment_method: input.payment_method || "Cash",
      reference_number: input.reference_number || null,
      notes: input.notes || null,
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert(newExpenseRecord)
        .select()
        .single();

      if (error) {
        console.error("Supabase createExpense error:", error);
        return { data: null, error: error.message };
      }

      if (data) {
        const created = data as unknown as Expense;
        const all = this.getCachedExpenses(input.user_id);
        this.setCachedExpenses(input.user_id, [created, ...all]);
        return { data: created, error: null };
      }

      return { data: newExpenseRecord, error: null };
    } catch (err: any) {
      console.error("Failed to insert expense into database:", err);
      return { data: null, error: err.message || "Database insert failed" };
    }
  }

  public async updateExpense(
    id: string,
    updates: UpdateExpenseInput,
    userId: string
  ): Promise<{ data: Expense | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Supabase updateExpense error:", error);
        return { data: null, error: error.message };
      }

      if (data) {
        const updated = data as unknown as Expense;
        const all = this.getCachedExpenses(userId);
        const idx = all.findIndex((e) => e.id === id);
        if (idx !== -1) {
          all[idx] = updated;
          this.setCachedExpenses(userId, all);
        }
        return { data: updated, error: null };
      }

      return { data: null, error: null };
    } catch (err: any) {
      console.error("Failed to update expense in database:", err);
      return { data: null, error: err.message || "Database update failed" };
    }
  }

  public async deleteExpense(id: string, userId?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Supabase deleteExpense error:", error);
        return { success: false, error: error.message };
      }

      if (userId) {
        const all = this.getCachedExpenses(userId);
        this.setCachedExpenses(userId, all.filter((e) => e.id !== id));
      }
      return { success: true, error: null };
    } catch (err: any) {
      console.error("Failed to delete expense from database:", err);
      return { success: false, error: err.message || "Database delete failed" };
    }
  }

  public async bulkDeleteExpenses(ids: string[], userId?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .in("id", ids);

      if (error) {
        console.error("Supabase bulkDeleteExpenses error:", error);
        return { success: false, error: error.message };
      }

      if (userId) {
        const idSet = new Set(ids);
        const all = this.getCachedExpenses(userId);
        this.setCachedExpenses(userId, all.filter((e) => !idSet.has(e.id)));
      }
      return { success: true, error: null };
    } catch (err: any) {
      console.error("Failed to bulk delete expenses from database:", err);
      return { success: false, error: err.message || "Database bulk delete failed" };
    }
  }

  public calculateStats(expenses: Expense[]): ExpenseStats {
    const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const count = expenses.length;
    const averageAmount = count > 0 ? totalAmount / count : 0;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let todayAmount = 0;
    let thisMonthAmount = 0;

    const categoryMap = new Map<string, { amount: number; count: number }>();

    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      const d = new Date(exp.expense_date);

      if (exp.expense_date.slice(0, 10) === todayStr) {
        todayAmount += amt;
      }

      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        thisMonthAmount += amt;
      }

      const cat = exp.category || "Others";
      const existing = categoryMap.get(cat) || { amount: 0, count: 0 };
      categoryMap.set(cat, {
        amount: existing.amount + amt,
        count: existing.count + 1,
      });
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      amount: stats.amount,
      count: stats.count,
      percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);

    return {
      totalAmount,
      count,
      averageAmount,
      categoryBreakdown,
      todayAmount,
      thisMonthAmount,
    };
  }

  public exportToCSV(expenses: Expense[], filename = "expenses-report.csv"): void {
    const headers = [
      "Date",
      "Category",
      "Amount (INR)",
      "Paid To / Worker",
      "Payment Method",
      "Reference No",
      "Notes",
    ];

    const rows = expenses.map((exp) => [
      exp.expense_date.slice(0, 10),
      `"${(exp.category || "").replace(/"/g, '""')}"`,
      Number(exp.amount || 0).toFixed(2),
      `"${(exp.paid_to || "").replace(/"/g, '""')}"`,
      `"${(exp.payment_method || "").replace(/"/g, '""')}"`,
      `"${(exp.reference_number || "").replace(/"/g, '""')}"`,
      `"${(exp.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const expensesService = new ExpensesService();
