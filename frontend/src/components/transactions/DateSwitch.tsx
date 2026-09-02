import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, RotateCcw } from "lucide-react";
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
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  isThisWeek,
  isSameWeek,
  addMonths,
  subMonths,
  isThisMonth,
  isSameMonth,
} from "date-fns";

export type DateSwitchPeriod = "daily" | "weekly" | "monthly" | "all";

interface DateSwitchProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  period?: DateSwitchPeriod;
  className?: string;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const DateSwitch = ({
  selectedDate,
  onDateChange,
  period = "daily",
  className = "",
}: DateSwitchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isAllTransactions = selectedDate === null;
  const activeDate = selectedDate || new Date();

  // For monthly view year selection
  const [viewYear, setViewYear] = useState<number>(activeDate.getFullYear());

  useEffect(() => {
    if (isOpen) {
      setViewYear(activeDate.getFullYear());
    }
  }, [isOpen, activeDate]);

  const handlePrev = useCallback(() => {
    if (period === "weekly") {
      onDateChange(subWeeks(activeDate, 1));
    } else if (period === "monthly") {
      onDateChange(subMonths(activeDate, 1));
    } else {
      onDateChange(subDays(activeDate, 1));
    }
  }, [activeDate, onDateChange, period]);

  const handleNext = useCallback(() => {
    if (period === "weekly") {
      onDateChange(addWeeks(activeDate, 1));
    } else if (period === "monthly") {
      onDateChange(addMonths(activeDate, 1));
    } else {
      onDateChange(addDays(activeDate, 1));
    }
  }, [activeDate, onDateChange, period]);

  // Keyboard shortcut listener for Left Arrow & Right Arrow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If the datepicker popover is open, don't intercept arrow keys
      if (isOpen) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable = target?.isContentEditable;
      const isInput =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        isEditable ||
        target?.getAttribute("role") === "textbox" ||
        target?.getAttribute("role") === "slider";

      if (isInput) return;

      const openDialog = document.querySelector('[role="dialog"]');
      if (openDialog && openDialog.contains(target)) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        handleNext();
      }
    };

    // Use capture phase (true) so arrow keys are handled by DateSwitch
    // and cannot be intercepted by Radix Tabs switching tabs
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [handlePrev, handleNext, isOpen]);

  const handleResetCurrent = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateChange(new Date());
    setIsOpen(false);
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setIsOpen(false);
    }
  };

  const handleSelectMonth = (monthIndex: number) => {
    const newDate = new Date(viewYear, monthIndex, 1);
    onDateChange(newDate);
    setIsOpen(false);
  };

  // Determine if activeDate is current period
  const isCurrentPeriod = (() => {
    if (!selectedDate) return false;
    if (period === "weekly") return isThisWeek(selectedDate, { weekStartsOn: 1 });
    if (period === "monthly") return isThisMonth(selectedDate);
    return isToday(selectedDate);
  })();

  // Compute title
  const dateTitle = (() => {
    if (isAllTransactions) return "All Records";

    if (period === "weekly") {
      const weekStart = startOfWeek(activeDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(activeDate, { weekStartsOn: 1 });
      const isCurrentWeek = isThisWeek(activeDate, { weekStartsOn: 1 });
      const isPrevWeek = isSameWeek(activeDate, subWeeks(new Date(), 1), { weekStartsOn: 1 });

      if (isCurrentWeek) {
        return `This Week (${format(weekStart, "dd MMM")} – ${format(weekEnd, "dd MMM")})`;
      }
      if (isPrevWeek) {
        return `Last Week (${format(weekStart, "dd MMM")} – ${format(weekEnd, "dd MMM")})`;
      }
      return `${format(weekStart, "dd MMM")} – ${format(weekEnd, "dd MMM yyyy")}`;
    }

    if (period === "monthly") {
      const isCurrentM = isThisMonth(activeDate);
      const isPrevM = isSameMonth(activeDate, subMonths(new Date(), 1));

      if (isCurrentM) {
        return `This Month (${format(activeDate, "MMM yyyy")})`;
      }
      if (isPrevM) {
        return `Last Month (${format(activeDate, "MMM yyyy")})`;
      }
      return format(activeDate, "MMMM yyyy");
    }

    // Default daily
    const isCurrentDayToday = isToday(activeDate);
    const isCurrentDayYesterday = isYesterday(activeDate);
    return isCurrentDayToday
      ? `Today, ${format(activeDate, "dd MMM yyyy")}`
      : isCurrentDayYesterday
      ? `Yesterday, ${format(activeDate, "dd MMM yyyy")}`
      : format(activeDate, "EEE, dd MMM yyyy");
  })();

  const prevButtonTitle =
    period === "weekly"
      ? "Previous Week (← Left Arrow)"
      : period === "monthly"
      ? "Previous Month (← Left Arrow)"
      : "Previous Day (← Left Arrow)";

  const nextButtonTitle =
    period === "weekly"
      ? "Next Week (→ Right Arrow)"
      : period === "monthly"
      ? "Next Month (→ Right Arrow)"
      : "Next Day (→ Right Arrow)";

  const jumpCurrentTitle =
    period === "weekly"
      ? "Jump to This Week"
      : period === "monthly"
      ? "Jump to This Month"
      : "Jump to Today";

  const currentPresetLabel =
    period === "weekly" ? "This Week" : period === "monthly" ? "This Month" : "Today";

  return (
    <div
      className={`flex sm:inline-flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 bg-card border border-border/80 rounded-2xl sm:rounded-xl p-1.5 sm:p-1 shadow-xs select-none ${className}`}
    >
      {/* Previous Period Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handlePrev}
        className="h-8 w-8 rounded-xl sm:rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground active:scale-95 transition-all flex-shrink-0"
        title={prevButtonTitle}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Styled Popover Calendar/Month Trigger */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-xl sm:rounded-lg hover:bg-muted/60 cursor-pointer group transition-all text-center sm:text-left outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0"
            title="Click to select date or period"
          >
            <CalendarIcon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform flex-shrink-0" />

            <span className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
              {dateTitle}
            </span>

            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-0 bg-popover/95 backdrop-blur-md border border-border/80 shadow-xl rounded-2xl overflow-hidden"
          align="center"
          sideOffset={8}
        >
          {/* Quick Presets Header for Weekly */}
          {period === "weekly" && (
            <div className="p-3 border-b border-border/60 bg-muted/20 space-y-2">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Quick Jump
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant={isThisWeek(activeDate, { weekStartsOn: 1 }) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    onDateChange(new Date());
                    setIsOpen(false);
                  }}
                  className="h-7 text-xs font-semibold"
                >
                  This Week
                </Button>
                <Button
                  type="button"
                  variant={
                    isSameWeek(activeDate, subWeeks(new Date(), 1), { weekStartsOn: 1 })
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    onDateChange(subWeeks(new Date(), 1));
                    setIsOpen(false);
                  }}
                  className="h-7 text-xs font-semibold"
                >
                  Last Week
                </Button>
                <Button
                  type="button"
                  variant={
                    isSameWeek(activeDate, subWeeks(new Date(), 2), { weekStartsOn: 1 })
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    onDateChange(subWeeks(new Date(), 2));
                    setIsOpen(false);
                  }}
                  className="h-7 text-xs font-semibold"
                >
                  2 Weeks Ago
                </Button>
                <Button
                  type="button"
                  variant={
                    isSameWeek(activeDate, subWeeks(new Date(), 3), { weekStartsOn: 1 })
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    onDateChange(subWeeks(new Date(), 3));
                    setIsOpen(false);
                  }}
                  className="h-7 text-xs font-semibold"
                >
                  3 Weeks Ago
                </Button>
              </div>
            </div>
          )}

          {/* Quick Presets Header for Monthly */}
          {period === "monthly" && (
            <div className="p-3 border-b border-border/60 bg-muted/20 space-y-2">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Quick Jump
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  type="button"
                  variant={isThisMonth(activeDate) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    onDateChange(new Date());
                    setIsOpen(false);
                  }}
                  className="h-7 text-xs font-semibold"
                >
                  This Month
                </Button>
                <Button
                  type="button"
                  variant={
                    isSameMonth(activeDate, subMonths(new Date(), 1)) ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    onDateChange(subMonths(new Date(), 1));
                    setIsOpen(false);
                  }}
                  className="h-7 text-xs font-semibold"
                >
                  Last Month
                </Button>
                <Button
                  type="button"
                  variant={
                    isSameMonth(activeDate, subMonths(new Date(), 2)) ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    onDateChange(subMonths(new Date(), 2));
                    setIsOpen(false);
                  }}
                  className="h-7 text-xs font-semibold"
                >
                  2 Months Ago
                </Button>
              </div>
            </div>
          )}

          {/* Quick Presets Header for Daily */}
          {period === "daily" && (
            <div className="p-3 pb-1 border-b border-border/60 bg-muted/20 flex items-center gap-1.5">
              <Button
                type="button"
                variant={!isAllTransactions && isToday(activeDate) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  onDateChange(new Date());
                  setIsOpen(false);
                }}
                className="h-7 text-xs font-semibold flex-1"
              >
                Today
              </Button>
              <Button
                type="button"
                variant={!isAllTransactions && isYesterday(activeDate) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  onDateChange(subDays(new Date(), 1));
                  setIsOpen(false);
                }}
                className="h-7 text-xs font-semibold flex-1"
              >
                Yesterday
              </Button>
            </div>
          )}

          {/* Main Picker: Month Grid for Monthly, Calendar for Daily & Weekly */}
          {period === "monthly" ? (
            <div className="p-3 w-72 space-y-3">
              {/* Year Selector */}
              <div className="flex items-center justify-between px-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewYear((y) => y - 1)}
                  className="h-7 w-7 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-bold text-foreground">{viewYear}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewYear((y) => y + 1)}
                  className="h-7 w-7 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((name, idx) => {
                  const isSelected =
                    activeDate.getFullYear() === viewYear && activeDate.getMonth() === idx;
                  const isCurrent =
                    new Date().getFullYear() === viewYear && new Date().getMonth() === idx;

                  return (
                    <Button
                      key={name}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSelectMonth(idx)}
                      className={`h-9 text-xs font-semibold relative ${
                        isCurrent && !isSelected ? "border-primary/60 text-primary font-bold" : ""
                      }`}
                    >
                      {name}
                      {isCurrent && !isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-1">
              {period === "weekly" && (
                <div className="px-3 pt-2 text-[11px] text-muted-foreground text-center">
                  Select any date to switch to that week
                </div>
              )}
              <Calendar
                mode="single"
                selected={activeDate}
                onSelect={handleSelectDate}
                initialFocus
                className="rounded-xl"
              />
            </div>
          )}

          {/* Quick Action Footer in Popover */}
          <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-2 gap-2">
            <Button
              type="button"
              variant={isAllTransactions ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onDateChange(null);
                setIsOpen(false);
              }}
              className="h-7 px-2.5 text-xs font-semibold"
            >
              All Records
            </Button>
            <Button
              type="button"
              variant={!isAllTransactions && isCurrentPeriod ? "default" : "outline"}
              size="sm"
              onClick={handleResetCurrent}
              className="h-7 px-3 text-xs font-semibold"
            >
              {currentPresetLabel}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Next Period Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleNext}
        className="h-8 w-8 rounded-xl sm:rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground active:scale-95 transition-all flex-shrink-0"
        title={nextButtonTitle}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Jump to Current quick icon if not in current period */}
      {!isAllTransactions && !isCurrentPeriod && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleResetCurrent}
          className="h-8 w-8 rounded-xl sm:rounded-lg hover:bg-primary/10 text-primary active:scale-95 transition-all flex-shrink-0"
          title={jumpCurrentTitle}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};
