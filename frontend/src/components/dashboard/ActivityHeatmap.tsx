import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar as CalendarIcon, Flame, Trophy, Sparkles } from "lucide-react";
import { subDays, format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isAfter, isToday } from "date-fns";

interface ActivityHeatmapProps {
  transactions: Array<{
    amount: number;
    profit?: number;
    commission?: number;
    site_fee?: number;
    transaction_date: string;
  }>;
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date | null;
}

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

export const ActivityHeatmap = ({
  transactions,
  onSelectDate,
  selectedDate,
}: ActivityHeatmapProps) => {
  const heatmapData = useMemo(() => {
    const today = new Date();
    // Exactly 30 days window
    const thirtyDaysAgo = subDays(today, 29);

    // Week aligned grid starting on Monday for authentic GitHub layout
    const gridStart = startOfWeek(thirtyDaysAgo, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(today, { weekStartsOn: 1 });

    const allGridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    // Aggregate transactions by date string YYYY-MM-DD
    const txByDate: Record<string, { count: number; volume: number; profit: number }> = {};

    transactions.forEach((tx) => {
      const dateKey = tx.transaction_date ? tx.transaction_date.split("T")[0] : "";
      if (!dateKey) return;
      if (!txByDate[dateKey]) {
        txByDate[dateKey] = { count: 0, volume: 0, profit: 0 };
      }
      txByDate[dateKey].count += 1;
      txByDate[dateKey].volume += Number(tx.amount || 0);
      const profit =
        tx.profit !== undefined && tx.profit !== null
          ? Number(tx.profit)
          : Number(tx.commission || 0) - Number(tx.site_fee || 0);
      txByDate[dateKey].profit += profit;
    });

    // Find max profit within the 30-day window to normalize green intensity levels (0 to 4)
    const windowProfits: number[] = [];
    eachDayOfInterval({ start: thirtyDaysAgo, end: today }).forEach((d) => {
      const k = format(d, "yyyy-MM-dd");
      if (txByDate[k]) windowProfits.push(txByDate[k].profit);
    });

    const maxProfit = Math.max(...windowProfits, 1000);

    // Build weeks array (columns) with 7 days each (rows)
    const weeks: Array<Array<{
      date: Date;
      dateKey: string;
      inWindow: boolean;
      isFuture: boolean;
      count: number;
      volume: number;
      profit: number;
      intensity: number;
    }>> = [];

    let currentWeek: any[] = [];
    allGridDays.forEach((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const inWindow = day >= thirtyDaysAgo && day <= today;
      const isFuture = isAfter(day, today);
      const data = txByDate[dateKey] || { count: 0, volume: 0, profit: 0 };

      let intensity = 0;
      if (inWindow && data.profit > 0) {
        const ratio = data.profit / maxProfit;
        if (ratio > 0.75) intensity = 4;
        else if (ratio > 0.45) intensity = 3;
        else if (ratio > 0.2) intensity = 2;
        else intensity = 1;
      }

      currentWeek.push({
        date: day,
        dateKey,
        inWindow,
        isFuture,
        count: data.count,
        volume: data.volume,
        profit: data.profit,
        intensity,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // 30-day summary calculations
    let totalTxCount30 = 0;
    let totalProfit30 = 0;
    let totalVolume30 = 0;
    let activeDays30 = 0;

    eachDayOfInterval({ start: thirtyDaysAgo, end: today }).forEach((d) => {
      const k = format(d, "yyyy-MM-dd");
      const data = txByDate[k];
      if (data) {
        if (data.count > 0) activeDays30 += 1;
        totalTxCount30 += data.count;
        totalProfit30 += data.profit;
        totalVolume30 += data.volume;
      }
    });

    return {
      weeks,
      totalTxCount30,
      totalProfit30,
      totalVolume30,
      activeDays30,
      thirtyDaysAgo,
      today,
    };
  }, [transactions]);

  // GitHub / LeetCode Authentic Color Palette
  const getCellColor = (intensity: number, inWindow: boolean, isFuture: boolean, isSelected: boolean) => {
    if (isSelected) {
      return "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 z-10";
    }
    if (isFuture || !inWindow) {
      return "bg-transparent border border-transparent opacity-0 pointer-events-none";
    }

    switch (intensity) {
      case 4:
        return "bg-[#216e39] dark:bg-[#39d353] hover:opacity-80";
      case 3:
        return "bg-[#30a14e] dark:bg-[#26a641] hover:opacity-80";
      case 2:
        return "bg-[#40c463] dark:bg-[#006d32] hover:opacity-80";
      case 1:
        return "bg-[#9be9a8] dark:bg-[#0e4429] hover:opacity-80";
      default:
        return "bg-[#ebedf0] dark:bg-[#161b22] border border-[#d0d7de]/50 dark:border-[#30363d]/50 hover:border-border";
    }
  };

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CalendarIcon className="h-4.5 w-4.5 text-primary" />
              30-Day Activity Heatmap
            </CardTitle>
            <CardDescription className="text-xs">
              {format(heatmapData.thirtyDaysAgo, "dd MMM yyyy")} – {format(heatmapData.today, "dd MMM yyyy")} • Click any day to inspect
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-card">
              {heatmapData.activeDays30} active days
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 text-xs font-bold px-2.5 py-1">
              {formatINR(heatmapData.totalProfit30)} earned
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 pb-4 space-y-4">
        <TooltipProvider delayDuration={50}>
          <div className="flex justify-center sm:justify-start overflow-x-auto pb-1">
            <div className="inline-flex items-start gap-2">
              {/* Day of week labels on left (GitHub style: Mon, Wed, Fri) */}
              <div className="grid grid-rows-7 gap-[5px] text-[10px] font-medium text-muted-foreground pt-[2px] pr-1 select-none">
                <span className="h-4 sm:h-5 flex items-center">Mon</span>
                <span className="h-4 sm:h-5 flex items-center opacity-0">Tue</span>
                <span className="h-4 sm:h-5 flex items-center">Wed</span>
                <span className="h-4 sm:h-5 flex items-center opacity-0">Thu</span>
                <span className="h-4 sm:h-5 flex items-center">Fri</span>
                <span className="h-4 sm:h-5 flex items-center opacity-0">Sat</span>
                <span className="h-4 sm:h-5 flex items-center">Sun</span>
              </div>

              {/* Heatmap Columns (Weeks) */}
              <div className="flex gap-[5px]">
                {heatmapData.weeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-rows-7 gap-[5px]">
                    {week.map((day) => {
                      const isSelected = selectedDate ? isSameDay(day.date, selectedDate) : false;
                      const todayBadge = isToday(day.date);

                      if (!day.inWindow || day.isFuture) {
                        return <div key={day.dateKey} className="w-4 h-4 sm:w-5 sm:h-5 rounded-[3px]" />;
                      }

                      return (
                        <Tooltip key={day.dateKey}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onSelectDate?.(day.date)}
                              className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[3px] transition-all cursor-pointer relative ${getCellColor(
                                day.intensity,
                                day.inWindow,
                                day.isFuture,
                                isSelected
                              )}`}
                              aria-label={`${format(day.date, "dd MMM")}: ${day.count} txns`}
                            >
                              {todayBadge && (
                                <span className="absolute inset-0 rounded-[3px] border border-primary/60 pointer-events-none" />
                              )}
                            </button>
                          </TooltipTrigger>

                          <TooltipContent side="top" className="text-xs p-2.5 space-y-1.5 shadow-xl border-border bg-popover">
                            <div className="font-bold text-foreground flex items-center justify-between gap-2 border-b border-border/50 pb-1">
                              <span>{format(day.date, "EEEE, dd MMM yyyy")}</span>
                              {todayBadge && <span className="text-[10px] text-primary font-semibold">Today</span>}
                            </div>
                            <div className="space-y-1 text-muted-foreground">
                              <div className="flex justify-between gap-4">
                                <span>Transactions:</span>
                                <span className="font-semibold text-foreground">{day.count}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Turnover:</span>
                                <span className="font-semibold text-foreground">{formatINR(day.volume)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Net Profit:</span>
                                <span className="font-bold text-emerald-500">{formatINR(day.profit)}</span>
                              </div>
                            </div>
                            <div className="text-[10px] text-primary font-medium pt-1 border-t border-border/40 text-center">
                              Click to filter dashboard to this date
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* GitHub / LeetCode Authentic Footer Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">{heatmapData.totalTxCount30}</span> transactions processed in the last 30 days
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-[2px] bg-[#ebedf0] dark:bg-[#161b22] border border-[#d0d7de]/50 dark:border-[#30363d]/50" title="0 transactions" />
              <div className="w-3 h-3 rounded-[2px] bg-[#9be9a8] dark:bg-[#0e4429]" title="Low" />
              <div className="w-3 h-3 rounded-[2px] bg-[#40c463] dark:bg-[#006d32]" title="Medium" />
              <div className="w-3 h-3 rounded-[2px] bg-[#30a14e] dark:bg-[#26a641]" title="High" />
              <div className="w-3 h-3 rounded-[2px] bg-[#216e39] dark:bg-[#39d353]" title="Very High" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
