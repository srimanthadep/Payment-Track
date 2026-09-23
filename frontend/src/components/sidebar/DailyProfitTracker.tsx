import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { dateSyncService } from "@/services/dateSyncService";
import { format, isToday, isYesterday } from "date-fns";

const DAILY_TARGET = 5000;

// Color thresholds
const getBarColor = (profit: number) => {
  if (profit >= 4000) return { bg: "bg-emerald-500", text: "text-emerald-600", label: "Near Target" };
  if (profit >= 2000) return { bg: "bg-amber-500", text: "text-amber-600", label: "Average Pace" };
  return { bg: "bg-red-500", text: "text-red-500", label: "Low Pace" };
};

interface DailyProfitTrackerProps {
  variant?: "default" | "compact";
}

export const DailyProfitTracker = ({ variant = "default" }: DailyProfitTrackerProps) => {
  const { effectiveUserId, isLoading: roleLoading } = useRole();
  const [profit, setProfit] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [chummiPortalId, setChummiPortalId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<Date | null>(() => dateSyncService.getActiveDate());

  // Listen to date switches across the app
  useEffect(() => {
    return dateSyncService.subscribe((date) => {
      setActiveDate(date);
    });
  }, []);

  // 1. Fetch Chummi portal ID once
  useEffect(() => {
    let cancelled = false;
    const fetchPortalId = async () => {
      const { data, error } = await supabase
        .from("portals")
        .select("id")
        .ilike("name", "chummi")
        .limit(1)
        .maybeSingle();

      if (!cancelled && !error && data) {
        setChummiPortalId(data.id);
      }
    };
    fetchPortalId();
    return () => { cancelled = true; };
  }, []);

  // 2. Fetch profit for Chummi portal for active date (today or past date)
  const fetchProfit = useCallback(async () => {
    if (!effectiveUserId || !chummiPortalId) return;

    const target = activeDate || new Date();
    const dayStart = new Date(target);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(target);
    dayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("transactions")
      .select("commission, site_fee")
      .eq("user_id", effectiveUserId)
      .eq("portal_id", chummiPortalId)
      .gte("transaction_date", dayStart.toISOString())
      .lte("transaction_date", dayEnd.toISOString());

    if (!error && data) {
      const totalProfit = data.reduce(
        (sum, t) => sum + (Number(t.commission || 0) - Number(t.site_fee || 0)),
        0
      );
      setProfit(totalProfit);
    }
    setIsLoading(false);
  }, [effectiveUserId, chummiPortalId, activeDate]);

  useEffect(() => {
    fetchProfit();
  }, [fetchProfit]);

  // 3. Subscribe to realtime transaction changes
  useEffect(() => {
    if (!effectiveUserId || !chummiPortalId) return;

    const channel = supabase
      .channel("daily-profit-tracker")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => {
          // Re-fetch on any transaction change
          fetchProfit();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId, chummiPortalId, fetchProfit]);

  const percent = Math.min(100, DAILY_TARGET > 0 ? (profit / DAILY_TARGET) * 100 : 0);
  const color = getBarColor(profit);

  const targetDate = activeDate || new Date();
  const isCurrentDay = isToday(targetDate);
  const isYesterdayDay = isYesterday(targetDate);

  const dateLabel = isCurrentDay
    ? "Daily Target"
    : isYesterdayDay
    ? "Yesterday"
    : format(targetDate, "dd MMM");

  const fullDateLabel = format(targetDate, "dd MMM yyyy");

  if (roleLoading || isLoading) {
    // Skeleton loader
    if (variant === "compact") {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-1.5 w-16 rounded-full bg-muted animate-pulse" />
        </div>
      );
    }
    return (
      <div className="px-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  // Compact variant for mobile header
  if (variant === "compact") {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/60 bg-muted/30 min-w-0"
        title={`Chummi (${isCurrentDay ? "Today" : dateLabel}): ₹${Math.round(profit).toLocaleString("en-IN")} / ₹${DAILY_TARGET.toLocaleString("en-IN")}`}
      >
        <TrendingUp className={cn("h-3.5 w-3.5 shrink-0", color.text)} strokeWidth={2.2} />
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative h-1.5 w-14 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
                color.bg
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className={cn("text-[9.5px] font-semibold tabular-nums shrink-0", color.text)}>
            ₹{profit >= 1000 ? `${(profit / 1000).toFixed(1)}k` : Math.round(profit).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    );
  }

  // Default variant for desktop sidebar and mobile
  return (
    <div className="px-2 space-y-1.5">
      {/* Header with Title on left and Numbers on right */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <TrendingUp className={cn("h-3.5 w-3.5 shrink-0", color.text)} strokeWidth={2.2} />
          <span
            className="text-[11px] font-semibold text-muted-foreground truncate"
            title={`Target for ${fullDateLabel}`}
          >
            {dateLabel}
          </span>
        </div>
        <div className="text-[11px] tabular-nums shrink-0">
          <span className={cn("font-semibold", color.text)}>
            {profit < 0 ? `-₹${Math.abs(Math.round(profit)).toLocaleString("en-IN")}` : `₹${Math.round(profit).toLocaleString("en-IN")}`}
          </span>
          <span className="text-muted-foreground font-normal">
            {" "}/ ₹{DAILY_TARGET.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 w-full rounded-full bg-secondary/80 overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
            color.bg
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
