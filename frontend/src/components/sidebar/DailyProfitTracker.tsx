import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar as CalendarIcon,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { dateSyncService } from "@/services/dateSyncService";
import { format, isToday, isYesterday, subDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  fetchDailyTargetData,
  exportDailyTargetToExcel,
  exportDailyTargetToPDF,
} from "@/utils/dailyTargetExport";

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

type DateRangePreset = "7" | "15" | "30" | "60" | "custom";

export const DailyProfitTracker = ({ variant = "default" }: DailyProfitTrackerProps) => {
  const { effectiveUserId, isLoading: roleLoading } = useRole();
  const { toast } = useToast();
  const [profit, setProfit] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selfPortalId, setSelfPortalId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<Date | null>(() => dateSyncService.getActiveDate());

  // Export Dialog State
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [preset, setPreset] = useState<DateRangePreset>("30");
  const [customStart, setCustomStart] = useState(() =>
    format(subDays(new Date(), 29), "yyyy-MM-dd")
  );
  const [customEnd, setCustomEnd] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Listen to date switches across the app
  useEffect(() => {
    return dateSyncService.subscribe((date) => {
      setActiveDate(date);
    });
  }, []);

  // 1. Fetch Self portal ID once (fallback to chummi if any legacy records)
  useEffect(() => {
    let cancelled = false;
    const fetchPortalId = async () => {
      try {
        const { data, error } = await supabase
          .from("portals")
          .select("id")
          .or("name.ilike.%self%,name.ilike.%chummi%")
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          if (!error && data) {
            setSelfPortalId(data.id);
          } else {
            setIsLoading(false);
          }
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchPortalId();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Fetch profit for Self portal for active date (today or past date)
  const fetchProfit = useCallback(async () => {
    if (!effectiveUserId) return;
    if (!selfPortalId) {
      setIsLoading(false);
      return;
    }

    const target = activeDate || new Date();
    const dayStart = new Date(target);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(target);
    dayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("transactions")
      .select("commission, site_fee")
      .eq("user_id", effectiveUserId)
      .eq("portal_id", selfPortalId)
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
  }, [effectiveUserId, selfPortalId, activeDate]);

  useEffect(() => {
    fetchProfit();
  }, [fetchProfit]);

  // 3. Subscribe to realtime transaction changes
  useEffect(() => {
    if (!effectiveUserId || !selfPortalId) return;

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
          fetchProfit();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId, selfPortalId, fetchProfit]);

  // Resolve current active date range
  const getSelectedDates = (): { start: Date; end: Date } => {
    const today = new Date();
    if (preset === "custom") {
      return {
        start: new Date(`${customStart}T00:00:00`),
        end: new Date(`${customEnd}T23:59:59.999`),
      };
    }
    const daysBack = parseInt(preset, 10) || 30;
    return {
      start: subDays(today, daysBack - 1),
      end: today,
    };
  };

  const handleExportExcel = async () => {
    if (!effectiveUserId) {
      toast({ title: "User not identified", variant: "destructive" });
      return;
    }
    setIsExportingExcel(true);
    try {
      const { start, end } = getSelectedDates();
      const result = await fetchDailyTargetData(effectiveUserId, start, end, DAILY_TARGET);
      exportDailyTargetToExcel(result);
      toast({
        title: "Excel Download Complete",
        description: `Exported ${result.days.length} days of daily target records.`,
      });
      setExportDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err?.message || "Failed to generate Excel file",
        variant: "destructive",
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    if (!effectiveUserId) {
      toast({ title: "User not identified", variant: "destructive" });
      return;
    }
    setIsExportingPDF(true);
    try {
      const { start, end } = getSelectedDates();
      const result = await fetchDailyTargetData(effectiveUserId, start, end, DAILY_TARGET);
      await exportDailyTargetToPDF(result);
      toast({
        title: "PDF Download Complete",
        description: `Exported ${result.days.length} days of daily target records.`,
      });
      setExportDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err?.message || "Failed to generate PDF document",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

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

  const renderExportDialog = () => (
    <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Download className="h-4 w-4 text-primary" />
            Download Daily Target Reports
          </DialogTitle>
          <DialogDescription className="text-xs">
            Export Self portal daily profit performance against the ₹{DAILY_TARGET.toLocaleString("en-IN")} daily target
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preset Buttons */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground block mb-2">
              Select Time Range
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "7", label: "7 Days" },
                { id: "15", label: "15 Days" },
                { id: "30", label: "30 Days" },
                { id: "60", label: "60 Days" },
              ].map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={preset === item.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreset(item.id as DateRangePreset)}
                  className="h-8 text-xs font-medium"
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="mt-2">
              <Button
                type="button"
                variant={preset === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreset("custom")}
                className="w-full h-8 text-xs font-medium gap-1.5"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Custom Date Range
              </Button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20">
              <div className="space-y-1">
                <Label htmlFor="custom-from" className="text-[11px] font-medium text-muted-foreground">
                  From Date
                </Label>
                <Input
                  id="custom-from"
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-to" className="text-[11px] font-medium text-muted-foreground">
                  To Date
                </Label>
                <Input
                  id="custom-to"
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>
          )}

          {/* Range summary box */}
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Selected Window:</span>
            <span className="font-semibold text-primary">
              {preset === "custom"
                ? `${format(new Date(`${customStart}T00:00:00`), "dd MMM yyyy")} - ${format(new Date(`${customEnd}T00:00:00`), "dd MMM yyyy")}`
                : `Past ${preset} Days (${format(subDays(new Date(), parseInt(preset) - 1), "dd MMM")} - ${format(new Date(), "dd MMM")})`}
            </span>
          </div>

          {/* Download Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isExportingExcel || isExportingPDF}
              onClick={handleExportExcel}
              className="h-9 text-xs font-semibold gap-1.5 border-emerald-600/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Excel (.xlsx)
                </>
              )}
            </Button>

            <Button
              type="button"
              disabled={isExportingExcel || isExportingPDF}
              onClick={handleExportPDF}
              className="h-9 text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  PDF Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (roleLoading || isLoading) {
    if (variant === "compact") {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-1.5 w-16 rounded-full bg-muted animate-pulse" />
        </div>
      );
    }
    return (
      <div className="px-1.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-2 w-full rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  // Compact variant for mobile header
  if (variant === "compact") {
    return (
      <>
        {renderExportDialog()}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/60 bg-muted/30 min-w-0 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setExportDialogOpen(true)}
          title={`Self (${isCurrentDay ? "Today" : dateLabel}): ₹${Math.round(profit).toLocaleString("en-IN")} / ₹${DAILY_TARGET.toLocaleString("en-IN")} — Click to download reports`}
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
      </>
    );
  }

  // Default variant for desktop sidebar
  return (
    <>
      {renderExportDialog()}
      <div className="px-1.5 space-y-1.5 group">
        {/* Header with Title on left, Numbers and Download on right */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <TrendingUp className={cn("h-3.5 w-3.5 shrink-0", color.text)} strokeWidth={2.2} />
            <span
              className="text-[11px] font-semibold text-muted-foreground truncate"
              title={`Target for ${fullDateLabel}`}
            >
              {dateLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="text-[11px] tabular-nums">
              <span className={cn("font-semibold", color.text)}>
                {profit < 0
                  ? `-₹${Math.abs(Math.round(profit)).toLocaleString("en-IN")}`
                  : `₹${Math.round(profit).toLocaleString("en-IN")}`}
              </span>
              <span className="text-muted-foreground font-normal">
                {" "}/ ₹{DAILY_TARGET.toLocaleString("en-IN")}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setExportDialogOpen(true)}
              className="h-5 w-5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 p-0 shrink-0 transition-colors"
              title="Download Daily Target reports (Excel / PDF)"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 w-full rounded-full bg-secondary/80 overflow-hidden shadow-inner">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
              color.bg
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </>
  );
};
