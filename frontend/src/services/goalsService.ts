import { supabase } from "@/integrations/supabase/client";

export interface Goal {
  id: string;
  user_id: string;
  goal_type: string;
  target_amount: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  user_id: string;
  goal_type: string;
  target_amount: number;
  period_start: string;
  period_end: string;
}

export interface GoalWithProgress extends Goal {
  current_amount: number;
  progress_percent: number;
}

export type GoalType =
  | "monthly_profit"
  | "monthly_commission"
  | "monthly_volume"
  | "weekly_profit"
  | "weekly_volume"
  | "daily_transactions";

export const GOAL_TYPE_LABELS: Record<GoalType, { label: string; description: string; icon: string }> = {
  monthly_profit: {
    label: "Monthly Profit",
    description: "Net profit target for the month",
    icon: "💰",
  },
  monthly_commission: {
    label: "Monthly Commission",
    description: "Total commission earnings target",
    icon: "📈",
  },
  monthly_volume: {
    label: "Monthly Volume",
    description: "Total transaction volume target",
    icon: "📊",
  },
  weekly_profit: {
    label: "Weekly Profit",
    description: "Net profit target for the week",
    icon: "⚡",
  },
  weekly_volume: {
    label: "Weekly Volume",
    description: "Total transaction volume for the week",
    icon: "🎯",
  },
  daily_transactions: {
    label: "Daily Transactions",
    description: "Number of transactions per day",
    icon: "🔥",
  },
};

class GoalsService {
  async getGoals(userId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as Goal[]) || [];
  }

  async getActiveGoals(userId: string): Promise<Goal[]> {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .lte("period_start", today)
      .gte("period_end", today)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as Goal[]) || [];
  }

  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const { data, error } = await supabase
      .from("goals")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as Goal;
  }

  async updateGoal(id: string, updates: Partial<CreateGoalInput>): Promise<Goal> {
    const { data, error } = await supabase
      .from("goals")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Goal;
  }

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) throw error;
  }

  /**
   * Calculate progress for a goal by querying actual transactions
   */
  async calculateProgress(
    goal: Goal,
    userId: string
  ): Promise<{ current: number; percent: number }> {
    const { goal_type, period_start, period_end, target_amount } = goal;

    if (goal_type === "daily_transactions") {
      const { count, error } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("transaction_date", period_start)
        .lte("transaction_date", period_end);

      if (error) throw error;
      const current = count || 0;
      return {
        current,
        percent: target_amount > 0 ? Math.min(100, (current / target_amount) * 100) : 0,
      };
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("amount, commission, site_fee, profit")
      .eq("user_id", userId)
      .gte("transaction_date", period_start)
      .lte("transaction_date", period_end);

    if (error) throw error;
    const txns = data || [];

    let current = 0;
    switch (goal_type) {
      case "monthly_profit":
      case "weekly_profit":
        current = txns.reduce(
          (sum, t) => sum + (Number(t.commission || 0) - Number(t.site_fee || 0)),
          0
        );
        break;
      case "monthly_commission":
        current = txns.reduce((sum, t) => sum + Number(t.commission || 0), 0);
        break;
      case "monthly_volume":
      case "weekly_volume":
        current = txns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        break;
      default:
        current = 0;
    }

    return {
      current,
      percent: target_amount > 0 ? Math.min(100, (current / target_amount) * 100) : 0,
    };
  }
}

export const goalsService = new GoalsService();
