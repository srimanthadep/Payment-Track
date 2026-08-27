import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isToday, isYesterday, addDays, subDays } from "date-fns";

interface DateSwitchProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  className?: string;
}

export const DateSwitch = ({
  selectedDate,
  onDateChange,
  className = "",
}: DateSwitchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isAllTransactions = selectedDate === null;
  const activeDate = selectedDate || new Date();

  const handlePrevDay = useCallback(() => {
    onDateChange(subDays(activeDate, 1));
  }, [activeDate, onDateChange]);

  const handleNextDay = useCallback(() => {
    onDateChange(addDays(activeDate, 1));
  }, [activeDate, onDateChange]);

  // Keyboard shortcut listener for Left Arrow & Right Arrow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing inside an input, textarea, select, or editable element
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

      // Don't interfere if a modal dialog is currently focused/open with active form
      const openDialog = document.querySelector('[role="dialog"]');
      if (openDialog && openDialog.contains(target)) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevDay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextDay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlePrevDay, handleNextDay]);

  const handleTodayClick = (e: React.MouseEvent) => {
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

  const isCurrentDayToday = selectedDate ? isToday(selectedDate) : false;
  const isCurrentDayYesterday = selectedDate ? isYesterday(selectedDate) : false;

  const dateTitle = isAllTransactions
    ? "All Transactions"
    : isCurrentDayToday
    ? `Today, ${format(activeDate, "dd MMM yyyy")}`
    : isCurrentDayYesterday
    ? `Yesterday, ${format(activeDate, "dd MMM yyyy")}`
    : format(activeDate, "EEE, dd MMM yyyy");

  return (
    <div
      className={`flex sm:inline-flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 bg-card border border-border/80 rounded-2xl sm:rounded-xl p-1.5 sm:p-1 shadow-xs select-none ${className}`}
    >
      {/* Previous Day Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handlePrevDay}
        className="h-8 w-8 rounded-xl sm:rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground active:scale-95 transition-all flex-shrink-0"
        title="Previous Day (← Left Arrow)"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Styled Popover Calendar Trigger */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-xl sm:rounded-lg hover:bg-muted/60 cursor-pointer group transition-all text-center sm:text-left outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0"
            title="Click to open calendar"
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
          {/* Calendar Picker Component */}
          <div className="p-1">
            <Calendar
              mode="single"
              selected={activeDate}
              onSelect={handleSelectDate}
              initialFocus
              className="rounded-xl"
            />
          </div>

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
              All Transactions
            </Button>
            <Button
              type="button"
              variant={!isAllTransactions && isCurrentDayToday ? "default" : "outline"}
              size="sm"
              onClick={handleTodayClick}
              className="h-7 px-3 text-xs font-semibold"
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Next Day Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleNextDay}
        className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground active:scale-95 transition-all flex-shrink-0"
        title="Next Day (→ Right Arrow)"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>

      {/* Quick Action Buttons on Right */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isAllTransactions && !isCurrentDayToday && (
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
        {!isAllTransactions && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(null)}
            className="h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground font-medium rounded-xl hover:bg-muted/80 transition-all"
            title="Clear date filter and view all transactions"
          >
            View All
          </Button>
        )}
      </div>
    </div>
  );
};
