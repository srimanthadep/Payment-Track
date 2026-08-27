import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
  RotateCcw,
  Sparkles,
  CalendarRange,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  format,
  isToday,
  isYesterday,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from "date-fns";
import { DateRange } from "react-day-picker";

export type PeriodType = "day" | "7d" | "30d" | "month" | "90d" | "all" | "custom";

export interface DateSwitchRange {
  from: Date | null;
  to: Date | null;
}

interface DateSwitchProps {
  selectedDate?: Date | null;
  onDateChange?: (date: Date | null) => void;
  dateRange?: DateSwitchRange;
  onRangeChange?: (range: DateSwitchRange, period: PeriodType) => void;
  activePeriod?: PeriodType;
  className?: string;
}

export const DateSwitch = ({
  selectedDate,
  onDateChange,
  dateRange,
  onRangeChange,
  activePeriod: initialPeriod,
  className = "",
}: DateSwitchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodType>(() => {
    if (initialPeriod) return initialPeriod;
    if (selectedDate === null && !dateRange?.from) return "all";
    if (dateRange?.from && dateRange?.to) return "custom";
    return "day";
  });

  const [currentDay, setCurrentDay] = useState<Date>(() => selectedDate || new Date());
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
    if (dateRange?.from) {
      return { from: dateRange.from, to: dateRange.to || undefined };
    }
    return undefined;
  });

  // Sync external selectedDate changes
  useEffect(() => {
    if (selectedDate !== undefined) {
      if (selectedDate === null) {
        setPeriod("all");
      } else {
        setCurrentDay(selectedDate);
        if (period === "all") setPeriod("day");
      }
    }
  }, [selectedDate]);

  // Sync external dateRange changes
  useEffect(() => {
    if (dateRange) {
      if (!dateRange.from && !dateRange.to) {
        setPeriod("all");
      } else if (dateRange.from) {
        setCustomRange({ from: dateRange.from, to: dateRange.to || undefined });
      }
    }
  }, [dateRange]);

  // Sync external activePeriod changes
  useEffect(() => {
    if (initialPeriod) {
      setPeriod(initialPeriod);
    }
  }, [initialPeriod]);

  // Compute effective date range based on active period
  const effectiveRange = useMemo<DateSwitchRange>(() => {
    const now = new Date();
    switch (period) {
      case "day": {
        const start = new Date(currentDay);
        start.setHours(0, 0, 0, 0);
        const end = new Date(currentDay);
        end.setHours(23, 59, 59, 999);
        return { from: start, to: end };
      }
      case "7d": {
        const start = subDays(now, 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { from: start, to: end };
      }
      case "30d": {
        const start = subDays(now, 30);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { from: start, to: end };
      }
      case "month": {
        const start = startOfMonth(currentDay);
        const end = endOfMonth(currentDay);
        end.setHours(23, 59, 59, 999);
        return { from: start, to: end };
      }
      case "90d": {
        const start = subDays(now, 90);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { from: start, to: end };
      }
      case "custom": {
        return {
          from: customRange?.from || null,
          to: customRange?.to || customRange?.from || null,
        };
      }
      case "all":
      default:
        return { from: null, to: null };
    }
  }, [period, currentDay, customRange]);

  // Emit changes to parent
  const emitChange = useCallback(
    (newPeriod: PeriodType, day: Date | null, range: DateSwitchRange) => {
      if (newPeriod === "day") {
        onDateChange?.(day);
      } else if (newPeriod === "all") {
        onDateChange?.(null);
      } else {
        onDateChange?.(day);
      }

      onRangeChange?.(range, newPeriod);
    },
    [onDateChange, onRangeChange]
  );

  // Chevron step backwards
  const handlePrev = useCallback(() => {
    if (period === "day") {
      const prev = subDays(currentDay, 1);
      setCurrentDay(prev);
      const start = new Date(prev);
      start.setHours(0, 0, 0, 0);
      const end = new Date(prev);
      end.setHours(23, 59, 59, 999);
      emitChange("day", prev, { from: start, to: end });
    } else if (period === "month") {
      const prev = subMonths(currentDay, 1);
      setCurrentDay(prev);
      const start = startOfMonth(prev);
      const end = endOfMonth(prev);
      emitChange("month", prev, { from: start, to: end });
    } else if (period === "7d") {
      const prev = subDays(currentDay, 7);
      setCurrentDay(prev);
      const start = subDays(prev, 7);
      emitChange("7d", prev, { from: start, to: prev });
    }
  }, [period, currentDay, emitChange]);

  // Chevron step forwards
  const handleNext = useCallback(() => {
    if (period === "day") {
      const next = addDays(currentDay, 1);
      setCurrentDay(next);
      const start = new Date(next);
      start.setHours(0, 0, 0, 0);
      const end = new Date(next);
      end.setHours(23, 59, 59, 999);
      emitChange("day", next, { from: start, to: end });
    } else if (period === "month") {
      const next = addMonths(currentDay, 1);
      setCurrentDay(next);
      const start = startOfMonth(next);
      const end = endOfMonth(next);
      emitChange("month", next, { from: start, to: end });
    } else if (period === "7d") {
      const next = addDays(currentDay, 7);
      setCurrentDay(next);
      const start = subDays(next, 7);
      emitChange("7d", next, { from: start, to: next });
    }
  }, [period, currentDay, emitChange]);

  // Keyboard shortcut listener for Left Arrow & Right Arrow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable = target?.isContentEditable;
      const isInput =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        isEditable ||
        target?.getAttribute("role") === "textbox";

      if (isInput) return;

      const openDialog = document.querySelector('[role="dialog"]');
      if (openDialog && openDialog.contains(target)) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlePrev, handleNext]);

  // Quick Preset Selection Handler
  const handleSelectPeriod = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    const now = new Date();

    let newDay: Date | null = currentDay;
    let newRange: DateSwitchRange = { from: null, to: null };

    switch (newPeriod) {
      case "day": {
        newDay = new Date();
        setCurrentDay(newDay);
        const start = new Date(newDay);
        start.setHours(0, 0, 0, 0);
        const end = new Date(newDay);
        end.setHours(23, 59, 59, 999);
        newRange = { from: start, to: end };
        break;
      }
      case "7d": {
        const start = subDays(now, 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        newRange = { from: start, to: end };
        break;
      }
      case "30d": {
        const start = subDays(now, 30);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        newRange = { from: start, to: end };
        break;
      }
      case "month": {
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        end.setHours(23, 59, 59, 999);
        newRange = { from: start, to: end };
        break;
      }
      case "90d": {
        const start = subDays(now, 90);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        newRange = { from: start, to: end };
        break;
      }
      case "all": {
        newDay = null;
        newRange = { from: null, to: null };
        break;
      }
      case "custom": {
        if (customRange?.from) {
          newRange = {
            from: customRange.from,
            to: customRange.to || customRange.from,
          };
        }
        break;
      }
    }

    emitChange(newPeriod, newDay, newRange);

    if (newPeriod !== "custom") {
      setIsOpen(false);
    }
  };

  // Calendar Day Selected
  const handleSelectDay = (date: Date | undefined) => {
    if (date) {
      setCurrentDay(date);
      setPeriod("day");
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      emitChange("day", date, { from: start, to: end });
      setIsOpen(false);
    }
  };

  // Custom Range Calendar Select
  const handleSelectCustomRange = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from) {
      const from = new Date(range.from);
      from.setHours(0, 0, 0, 0);
      const to = range.to ? new Date(range.to) : new Date(range.from);
      to.setHours(23, 59, 59, 999);
      emitChange("custom", range.from, { from, to });
    }
  };

  // Jump to today
  const handleTodayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    setCurrentDay(today);
    setPeriod("day");
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    emitChange("day", today, { from: start, to: end });
    setIsOpen(false);
  };

  // Format the label on the button
  const dateTitle = useMemo(() => {
    switch (period) {
      case "day": {
        if (isToday(currentDay)) {
          return `Today, ${format(currentDay, "dd MMM yyyy")}`;
        }
        if (isYesterday(currentDay)) {
          return `Yesterday, ${format(currentDay, "dd MMM yyyy")}`;
        }
        return format(currentDay, "EEE, dd MMM yyyy");
      }
      case "7d":
        return `Last 7 Days (${format(subDays(new Date(), 7), "dd MMM")} - ${format(new Date(), "dd MMM")})`;
      case "30d":
        return "Last 30 Days";
      case "month":
        return `This Month (${format(currentDay, "MMMM yyyy")})`;
      case "90d":
        return "Last 90 Days";
      case "all":
        return "All Time (All Records)";
      case "custom":
        if (customRange?.from && customRange?.to) {
          return `${format(customRange.from, "dd MMM")} - ${format(customRange.to, "dd MMM yyyy")}`;
        }
        if (customRange?.from) {
          return `From ${format(customRange.from, "dd MMM yyyy")}`;
        }
        return "Custom Date Range";
      default:
        return "Select Date Range";
    }
  }, [period, currentDay, customRange]);

  const isDailyToday = period === "day" && isToday(currentDay);
  const showChevrons = period === "day" || period === "month" || period === "7d";

  const PRESETS: Array<{ id: PeriodType; label: string; icon?: any }> = [
    { id: "day", label: "Daily" },
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "month", label: "This Month" },
    { id: "90d", label: "90 Days" },
    { id: "all", label: "All Time" },
    { id: "custom", label: "Custom Range" },
  ];

  return (
    <div
      className={`flex sm:inline-flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 bg-card border border-border/80 rounded-2xl sm:rounded-xl p-1.5 sm:p-1 shadow-xs select-none ${className}`}
    >
      {/* Previous Step Button */}
      {showChevrons ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          className="h-8 w-8 rounded-xl sm:rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground active:scale-95 transition-all flex-shrink-0"
          title="Previous (← Left Arrow)"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      ) : (
        <div className="w-1" />
      )}

      {/* Styled Popover Calendar & Preset Trigger */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-xl sm:rounded-lg hover:bg-muted/60 cursor-pointer group transition-all text-center sm:text-left outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0"
            title="Click to change date range or view preset periods"
          >
            <CalendarIcon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform flex-shrink-0" />

            <span className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
              {dateTitle}
            </span>

            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-0 bg-popover/95 backdrop-blur-md border border-border/80 shadow-xl rounded-2xl overflow-hidden max-w-[95vw] sm:max-w-md"
          align="center"
          sideOffset={8}
        >
          {/* Quick Period Presets Bar */}
          <div className="p-3 border-b border-border/60 bg-muted/20">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-primary" />
              Quick Periods
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {PRESETS.map((preset) => {
                const isActive = period === preset.id;
                return (
                  <Button
                    key={preset.id}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectPeriod(preset.id)}
                    className={`h-7 text-xs font-semibold rounded-lg transition-all ${
                      isActive
                        ? "shadow-xs"
                        : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Calendar Picker Area */}
          <div className="p-2 flex flex-col items-center">
            {period === "custom" ? (
              <div>
                <div className="text-xs text-muted-foreground text-center py-1 font-medium">
                  Select start and end date for custom range
                </div>
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={handleSelectCustomRange}
                  numberOfMonths={1}
                  initialFocus
                  className="rounded-xl"
                />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={currentDay}
                onSelect={handleSelectDay}
                initialFocus
                className="rounded-xl"
              />
            )}
          </div>

          {/* Quick Action Footer in Popover */}
          <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-2 gap-2">
            <Button
              type="button"
              variant={period === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSelectPeriod("all")}
              className="h-7 px-2.5 text-xs font-semibold"
            >
              All Time
            </Button>
            <Button
              type="button"
              variant={isDailyToday ? "default" : "outline"}
              size="sm"
              onClick={handleTodayClick}
              className="h-7 px-3 text-xs font-semibold"
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Next Step Button */}
      {showChevrons ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="h-8 w-8 rounded-xl sm:rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground active:scale-95 transition-all flex-shrink-0"
          title="Next (→ Right Arrow)"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : (
        <div className="w-1" />
      )}

      {/* Quick Action Buttons on Right */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isDailyToday && period !== "all" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTodayClick}
            className="h-8 px-2 sm:px-2.5 text-xs font-semibold bg-primary/10 border-primary/25 text-primary hover:bg-primary/20 hover:text-primary rounded-xl transition-all shadow-2xs"
            title="Jump to today"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Today
          </Button>
        )}
        {period !== "all" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSelectPeriod("all")}
            className="h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground font-medium rounded-xl hover:bg-muted/80 transition-all"
            title="Clear date filter and view all records"
          >
            View All
          </Button>
        )}
      </div>
    </div>
  );
};
