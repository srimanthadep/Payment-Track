import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  subDays,
  format,
  isSameDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isAfter,
  isToday,
} from "date-fns";

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
    const thirtyDaysAgo = subDays(today, 29);

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

    // Group into distinct months:
    // Past month (August) shows window days; current month (September) displays all days through end of month
    const monthsMap = new Map<string, { year: number; month: number; days: Date[] }>();
    const allDays = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

    allDays.forEach((d) => {
      const key = format(d, "yyyy-MM");
      if (!monthsMap.has(key)) {
        monthsMap.set(key, { year: d.getFullYear(), month: d.getMonth(), days: [] });
      }
      monthsMap.get(key)!.days.push(d);
    });

    const months = Array.from(monthsMap.entries()).map(([key, { year, month, days }]) => {
      const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

      // For the current month, show the full month structure through endOfMonth
      const monthStart = isCurrentMonth ? startOfMonth(today) : days[0];
      const monthEnd = isCurrentMonth ? endOfMonth(today) : days[days.length - 1];

      // Align this month's days to weeks starting on Monday
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

      const weeks: Array<
        Array<{
          date: Date;
          dateKey: string;
          inMonth: boolean;
          inWindow: boolean;
          isFuture: boolean;
          count: number;
          volume: number;
          profit: number;
          intensity: number;
        }>
      > = [];

      let currentWeek: any[] = [];
      gridDays.forEach((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const inMonth = day.getMonth() === month && day.getFullYear() === year;
        const isFuture = isAfter(day, today);
        const inWindow =
          inMonth && (isCurrentMonth ? true : day >= thirtyDaysAgo && day <= today);
        const data = txByDate[dateKey] || { count: 0, volume: 0, profit: 0 };

        let intensity = 0;
        if (inMonth && !isFuture && data.profit > 0) {
          const ratio = data.profit / maxProfit;
          if (ratio > 0.75) intensity = 4;
          else if (ratio > 0.45) intensity = 3;
          else if (ratio > 0.2) intensity = 2;
          else intensity = 1;
        }

        currentWeek.push({
          date: day,
          dateKey,
          inMonth,
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

      return {
        monthKey: key,
        monthName: format(monthStart, "MMMM"),
        year,
        isCurrentMonth,
        weeks,
      };
    });

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
      months,
      totalTxCount30,
      totalProfit30,
      totalVolume30,
      activeDays30,
      thirtyDaysAgo,
      today,
    };
  }, [transactions]);

  // Color Palette maintaining intensity fill on selected state
  const getCellColor = (
    intensity: number,
    inMonth: boolean,
    isFuture: boolean,
    isSelected: boolean
  ) => {
    if (!inMonth) {
      return "bg-transparent border border-transparent opacity-0 pointer-events-none";
    }

    if (isFuture) {
      return "border border-dashed border-gray-400 dark:border-gray-500 bg-[#ebedf0]/70 dark:bg-[#161b22]/70 cursor-default hover:border-gray-600 dark:hover:border-gray-300 transition-colors";
    }

    let color = "";
    switch (intensity) {
      case 4:
        color = "bg-[#216e39] dark:bg-[#39d353]";
        break;
      case 3:
        color = "bg-[#30a14e] dark:bg-[#26a641]";
        break;
      case 2:
        color = "bg-[#40c463] dark:bg-[#006d32]";
        break;
      case 1:
        color = "bg-[#9be9a8] dark:bg-[#0e4429]";
        break;
      default:
        color = "bg-[#ebedf0] dark:bg-[#161b22] border border-[#d0d7de]/50 dark:border-[#30363d]/50";
        break;
    }

    if (isSelected) {
      return `${color} ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 z-10`;
    }

    return `${color} hover:opacity-80`;
  };

  return (
    <Card className="border-border/80 shadow-xs">
      {/* Responsive Header: Streak & Amount in top row on mobile, side-by-side on desktop */}
      <CardHeader className="p-3 sm:p-5 pb-2.5 sm:pb-3">
        {/* Mobile Header (< sm) */}
        <div className="flex flex-col gap-1.5 sm:hidden">
          {/* Row 1: Title & Badges (Days Streak & Amount) in the header */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="p-1 rounded-md bg-primary/10 text-primary flex-shrink-0">
                <CalendarIcon className="h-3.5 w-3.5" />
              </div>
              <CardTitle className="text-xs font-semibold truncate">Activity Heatmap</CardTitle>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge
                variant="outline"
                className="text-[10px] font-medium px-1.5 py-0.5 h-5 bg-card flex items-center"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 inline-block" />
                <span>{heatmapData.activeDays30}d</span>
              </Badge>

              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 text-[10px] font-bold px-1.5 py-0.5 h-5">
                {formatINR(heatmapData.totalProfit30)}
              </Badge>
            </div>
          </div>

          {/* Row 2: Date range & 30 Days pill */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
            <span>
              {format(heatmapData.thirtyDaysAgo, "dd MMM")} – {format(heatmapData.today, "dd MMM yyyy")}
            </span>
            <span className="font-medium bg-muted/60 px-1.5 py-0.5 rounded text-[10px]">
              30 Days
            </span>
          </div>
        </div>

        {/* Desktop Header (sm+) */}
        <div className="hidden sm:flex sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold">Activity Heatmap</CardTitle>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-xs text-muted-foreground">
              {format(heatmapData.thirtyDaysAgo, "dd MMM")} – {format(heatmapData.today, "dd MMM yyyy")}
            </span>

            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-xs font-medium px-2 py-0.5 h-6 bg-card"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 inline-block" />
                <span>{heatmapData.activeDays30}</span>
                <span className="ml-1">active days</span>
              </Badge>

              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 text-xs font-bold px-2 py-0.5 h-6">
                {formatINR(heatmapData.totalProfit30)}
                <span className="font-normal ml-1">earned</span>
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-5 pt-1 sm:pt-2 pb-3 sm:pb-4 space-y-3">
        {/* Heatmap Grid - Centered on mobile, clean overflow handling */}
        <TooltipProvider delayDuration={50}>
          <div className="w-full flex justify-center sm:justify-start overflow-x-auto pb-1">
            <div className="inline-flex items-start gap-2 sm:gap-2.5 select-none touch-manipulation">
              {/* Day of week labels on left (Mon, Wed, Fri, Sun) */}
              <div className="grid grid-rows-7 gap-[5px] text-[10px] font-medium text-muted-foreground pt-5 sm:pt-6 pr-0.5 sm:pr-1">
                <span className="h-4 sm:h-5 flex items-center justify-end">Mon</span>
                <span className="h-4 sm:h-5 flex items-center justify-end opacity-0" aria-hidden="true">Tue</span>
                <span className="h-4 sm:h-5 flex items-center justify-end">Wed</span>
                <span className="h-4 sm:h-5 flex items-center justify-end opacity-0" aria-hidden="true">Thu</span>
                <span className="h-4 sm:h-5 flex items-center justify-end">Fri</span>
                <span className="h-4 sm:h-5 flex items-center justify-end opacity-0" aria-hidden="true">Sat</span>
                <span className="h-4 sm:h-5 flex items-center justify-end">Sun</span>
              </div>

              {/* Month Groups: August and September */}
              <div className="flex items-start gap-2.5 sm:gap-3.5">
                {heatmapData.months.map((m, mIdx) => (
                  <div key={m.monthKey} className="flex items-start gap-2.5 sm:gap-3.5">
                    {/* Subtle vertical separator between different months */}
                    {mIdx > 0 && (
                      <div className="w-px h-[135px] sm:h-[165px] bg-border/70 self-end mb-0.5" />
                    )}

                    <div className="flex flex-col">
                      {/* Distinct Month Header */}
                      <div className="text-[11px] sm:text-xs font-bold text-foreground mb-1.5 h-4 sm:h-4.5 flex items-center gap-1 sm:gap-1.5 select-none">
                        <span>{m.monthName}</span>
                        {m.isCurrentMonth && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
                            title="Current Month"
                          />
                        )}
                      </div>

                      {/* Heatmap Columns for this month */}
                      <div className="flex gap-[4px] sm:gap-[5px]">
                        {m.weeks.map((week, wIdx) => (
                          <div key={wIdx} className="grid grid-rows-7 gap-[4px] sm:gap-[5px]">
                            {week.map((day) => {
                              const isSelected = selectedDate
                                ? isSameDay(day.date, selectedDate)
                                : false;
                              const todayBadge = isToday(day.date);

                              // Days outside this month
                              if (!day.inMonth) {
                                return (
                                  <div
                                    key={day.dateKey}
                                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-[3px]"
                                  />
                                );
                              }

                              // Future days in current month (upcoming days of September)
                              if (day.isFuture) {
                                return (
                                  <Tooltip key={day.dateKey}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-[3px] border border-dashed border-gray-400 dark:border-gray-500 bg-[#ebedf0]/70 dark:bg-[#161b22]/70 cursor-default hover:border-gray-600 dark:hover:border-gray-300 transition-colors"
                                        aria-label={`${format(day.date, "dd MMM")}: Upcoming`}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="text-xs p-2 shadow-xl border-border bg-popover text-center"
                                    >
                                      <div className="font-semibold text-foreground">
                                        {format(day.date, "EEEE, dd MMM yyyy")}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground mt-0.5">
                                        Upcoming in September
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              }

                              // Past and today days with activity
                              return (
                                <Tooltip key={day.dateKey}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => onSelectDate?.(day.date)}
                                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[3px] transition-all cursor-pointer relative flex items-center justify-center ${getCellColor(
                                        day.intensity,
                                        day.inMonth,
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

                                  <TooltipContent
                                    side="top"
                                    className="text-xs p-2.5 space-y-1.5 shadow-xl border-border bg-popover"
                                  >
                                    <div className="font-bold text-foreground flex items-center justify-between gap-2 border-b border-border/50 pb-1">
                                      <span>{format(day.date, "EEEE, dd MMM yyyy")}</span>
                                      {todayBadge && (
                                        <span className="text-[10px] text-primary font-semibold">
                                          Today
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-1 text-muted-foreground">
                                      <div className="flex justify-between gap-4">
                                        <span>Transactions:</span>
                                        <span className="font-semibold text-foreground">
                                          {day.count}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span>Turnover:</span>
                                        <span className="font-semibold text-foreground">
                                          {formatINR(day.volume)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span>Net Profit:</span>
                                        <span className="font-bold text-emerald-500">
                                          {formatINR(day.profit)}
                                        </span>
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
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Footer Legend & Total Count - Clean single row on mobile */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px] sm:text-xs text-muted-foreground">
          <div className="flex items-center gap-1 truncate">
            <span className="font-medium text-foreground">{heatmapData.totalTxCount30}</span>
            <span className="hidden sm:inline">transactions in last 30 days</span>
            <span className="sm:hidden">txns (30d)</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] sm:text-xs">Less</span>
            <div className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] bg-[#ebedf0] dark:bg-[#161b22] border border-[#d0d7de]/50 dark:border-[#30363d]/50"
                title="0 transactions"
              />
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] bg-[#9be9a8] dark:bg-[#0e4429]"
                title="Low"
              />
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] bg-[#40c463] dark:bg-[#006d32]"
                title="Medium"
              />
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] bg-[#30a14e] dark:bg-[#26a641]"
                title="High"
              />
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] bg-[#216e39] dark:bg-[#39d353]"
                title="Very High"
              />
            </div>
            <span className="text-[10px] sm:text-xs">More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
