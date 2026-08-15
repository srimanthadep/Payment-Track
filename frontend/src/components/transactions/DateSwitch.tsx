import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isToday, addDays, subDays } from "date-fns";

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

  const handlePrevDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateChange(subDays(activeDate, 1));
  };

  const handleNextDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateChange(addDays(activeDate, 1));
  };

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
  const formattedDate = isAllTransactions ? "All Transactions" : format(activeDate, "EEE, dd MMM yyyy");

  return (
    <div
      className={`inline-flex items-center gap-1 sm:gap-1.5 bg-card border border-border/80 rounded-xl p-1 shadow-sm select-none ${className}`}
    >
      {/* Previous Day Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handlePrevDay}
        className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all"
        title="Previous Day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Styled Popover Calendar Trigger */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/70 cursor-pointer group transition-all text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Click to open calendar"
          >
            <CalendarIcon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform flex-shrink-0" />

            <span className="text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap text-foreground">
              {formattedDate}
            </span>

            {/* Indicator Badge */}
            {isAllTransactions ? (
              <span className="bg-primary/10 text-primary font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-md uppercase border border-primary/20">
                ALL
              </span>
            ) : isCurrentDayToday ? (
              <span className="bg-primary/10 text-primary font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-md uppercase border border-primary/20">
                TODAY
              </span>
            ) : (
              <span
                onClick={handleTodayClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-md uppercase transition-colors shadow-xs"
                title="Jump to today"
              >
                GO TO TODAY
              </span>
            )}
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
        className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all"
        title="Next Day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isAllTransactions && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDateChange(null)}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg"
          title="Clear date filter and view all transactions"
        >
          View All
        </Button>
      )}
    </div>
  );
};
