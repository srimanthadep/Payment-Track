import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  expense_date: string;
  paid_to: string | null;
  payment_method: string;
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
  payment_method?: string;
  reference_number?: string | null;
  notes?: string | null;
}

export interface UpdateExpenseInput {
  category?: string;
  amount?: number;
  expense_date?: string;
  paid_to?: string | null;
  payment_method?: string;
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

const EXPENSES_LOCAL_STORAGE_KEY = "payment_track_expenses_cache_v1";

class ExpensesService {
  private isRemoteTableAvailable: boolean = true;

  private getLocalExpenses(userId?: string): Expense[] {
    try {
      const stored = localStorage.getItem(EXPENSES_LOCAL_STORAGE_KEY);
      if (stored) {
        const list: Expense[] = JSON.parse(stored);
        if (userId) {
          return list.filter((e) => e.user_id === userId);
        }
        return list;
      }
    } catch (e) {
      console.warn("Failed to read local expenses", e);
    }
    return [];
  }

  private saveLocalExpenses(expenses: Expense[]): void {
    try {
      localStorage.setItem(EXPENSES_LOCAL_STORAGE_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error("Failed to save local expenses", e);
    }
  }

  public async getExpenses(userId: string): Promise<{ data: Expense[]; error: string | null }> {
    // If remote table was previously found to be not yet created, return local data instantly
    if (!this.isRemoteTableAvailable) {
      return { data: this.getLocalExpenses(userId), error: null };
    }

    try {
      // Try fetching from Supabase table if available
      const { data, error } = await supabase
        .from("expenses" as any)
        .select("*")
        .eq("user_id", userId)
        .order("expense_date", { ascending: false });

      if (error) {
        // If table doesn't exist in schema cache, remember to avoid spamming network
        if (
          error.message?.includes("schema cache") ||
          error.message?.includes("does not exist") ||
          (error as any).code === "42P01" ||
          (error as any).code === "PGRST204" ||
          (error as any).code === "404"
        ) {
          this.isRemoteTableAvailable = false;
        }
        return { data: this.getLocalExpenses(userId), error: null };
      }

      if (data && Array.isArray(data)) {
        this.isRemoteTableAvailable = true;
        // Sync to local cache
        const remoteExpenses = data as Expense[];
        const localAll = this.getLocalExpenses().filter((e) => e.user_id !== userId);
        this.saveLocalExpenses([...localAll, ...remoteExpenses]);
        return { data: remoteExpenses, error: null };
      }

      return { data: this.getLocalExpenses(userId), error: null };
    } catch {
      this.isRemoteTableAvailable = false;
      return { data: this.getLocalExpenses(userId), error: null };
    }
  }

  public async createExpense(input: CreateExpenseInput): Promise<{ data: Expense | null; error: string | null }> {
    const id = "exp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const newExpense: Expense = {
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

    // Always update local cache immediately for instant UI response
    const all = this.getLocalExpenses();
    this.saveLocalExpenses([newExpense, ...all]);

    if (!this.isRemoteTableAvailable) {
      return { data: newExpense, error: null };
    }

    try {
      const { data, error } = await supabase
        .from("expenses" as any)
        .insert({
          id: newExpense.id,
          user_id: newExpense.user_id,
          category: newExpense.category,
          amount: newExpense.amount,
          expense_date: newExpense.expense_date,
          paid_to: newExpense.paid_to,
          payment_method: newExpense.payment_method,
          reference_number: newExpense.reference_number,
          notes: newExpense.notes,
        })
        .select()
        .single();

      if (error) {
        if (
          error.message?.includes("schema cache") ||
          error.message?.includes("does not exist") ||
          (error as any).code === "42P01"
        ) {
          this.isRemoteTableAvailable = false;
        }
      } else if (data) {
        return { data: data as Expense, error: null };
      }
    } catch {
      this.isRemoteTableAvailable = false;
    }

    return { data: newExpense, error: null };
  }

  public async updateExpense(
    id: string,
    updates: UpdateExpenseInput,
    userId: string
  ): Promise<{ data: Expense | null; error: string | null }> {
    const all = this.getLocalExpenses();
    const idx = all.findIndex((e) => e.id === id);
    let updatedItem: Expense | null = null;

    if (idx !== -1) {
      updatedItem = {
        ...all[idx],
        ...updates,
        amount: updates.amount !== undefined ? Number(updates.amount) : all[idx].amount,
        updated_at: new Date().toISOString(),
      };
      all[idx] = updatedItem;
      this.saveLocalExpenses(all);
    }

    if (!this.isRemoteTableAvailable) {
      return { data: updatedItem, error: null };
    }

    try {
      const { data, error } = await supabase
        .from("expenses" as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return { data: data as Expense, error: null };
      }
    } catch {
      // Handled gracefully via local update
    }

    return { data: updatedItem, error: null };
  }

  public async deleteExpense(id: string): Promise<{ success: boolean; error: string | null }> {
    const all = this.getLocalExpenses();
    this.saveLocalExpenses(all.filter((e) => e.id !== id));

    if (!this.isRemoteTableAvailable) {
      return { success: true, error: null };
    }

    try {
      await supabase.from("expenses" as any).delete().eq("id", id);
    } catch {
      // Handled gracefully via local delete
    }

    return { success: true, error: null };
  }

  public async bulkDeleteExpenses(ids: string[]): Promise<{ success: boolean; error: string | null }> {
    const idSet = new Set(ids);
    const all = this.getLocalExpenses();
    this.saveLocalExpenses(all.filter((e) => !idSet.has(e.id)));

    if (!this.isRemoteTableAvailable) {
      return { success: true, error: null };
    }

    try {
      await supabase.from("expenses" as any).delete().in("id", ids);
    } catch {
      // Handled gracefully via local delete
    }

    return { success: true, error: null };
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
      exp.amount.toFixed(2),
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
