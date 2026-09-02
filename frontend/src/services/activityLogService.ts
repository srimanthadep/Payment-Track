import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ActivityCategory =
  | "auth"
  | "transaction"
  | "expense"
  | "export"
  | "settings"
  | "portal"
  | "card_type"
  | "goal";

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  category: ActivityCategory;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivityLogFilters {
  category?: ActivityCategory | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface LogStats {
  total: number;
  today: number;
  byCategory: Record<string, number>;
  lastActivity: string | null;
}

// ─── Service ───────────────────────────────────────────────────────────────

class ActivityLogService {
  /**
   * Log an activity. Fire-and-forget — failures are silent so they never
   * interrupt the main user flow.
   */
  async log(
    action: string,
    category: ActivityCategory,
    description: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action,
        category,
        description,
        metadata,
      });
    } catch {
      // Intentionally silent — logging must never break the main flow
    }
  }

  /**
   * Fetch paginated activity logs with optional filters.
   */
  async getLogs(
    filters: ActivityLogFilters = {}
  ): Promise<{ logs: ActivityLog[]; total: number }> {
    const {
      category,
      search,
      dateFrom,
      dateTo,
      page = 1,
      pageSize = 50,
    } = filters;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { logs: [], total: 0 };

    let query = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (search && search.trim()) {
      query = query.ilike("description", `%${search.trim()}%`);
    }
    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
    }
    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) {
      console.error("[ActivityLogService] getLogs error:", error);
      return { logs: [], total: 0 };
    }

    return {
      logs: (data as ActivityLog[]) ?? [],
      total: count ?? 0,
    };
  }

  /**
   * Get aggregate statistics for the summary cards.
   */
  async getLogStats(): Promise<LogStats> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return { total: 0, today: 0, byCategory: {}, lastActivity: null };

    const { data: allLogs, count: total } = await supabase
      .from("activity_logs")
      .select("category, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const todayStr = new Date().toISOString().split("T")[0];
    const { count: today } = await supabase
      .from("activity_logs")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .gte("created_at", `${todayStr}T00:00:00.000Z`);

    const byCategory: Record<string, number> = {};
    for (const row of allLogs ?? []) {
      byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
    }

    const lastActivity =
      allLogs && allLogs.length > 0 ? allLogs[0].created_at : null;

    return {
      total: total ?? 0,
      today: today ?? 0,
      byCategory,
      lastActivity,
    };
  }

  /**
   * Export filtered logs as a downloadable CSV.
   */
  async exportLogsCSV(filters: ActivityLogFilters = {}): Promise<void> {
    const { logs } = await this.getLogs({ ...filters, page: 1, pageSize: 10000 });

    const headers = ["Timestamp", "Category", "Action", "Description"];
    const rows = logs.map((l) => [
      new Date(l.created_at).toLocaleString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      l.category,
      l.action,
      `"${l.description.replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const today = new Date().toISOString().split("T")[0];
    link.download = `ActivityLogs-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const activityLogService = new ActivityLogService();
