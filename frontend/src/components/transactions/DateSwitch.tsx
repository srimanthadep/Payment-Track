import { useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const dateInputRef = useRef<HTMLInputElement>(null);
  const activeDate = selectedDate || new Date();

  const handlePrevDay = () => {
    onDateChange(subDays(activeDate, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(activeDate, 1));
  };

  const handleTodayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateChange(new Date());
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [year, month, day] = e.target.value.split("-").map(Number);
      const newDate = new Date(year, month - 1, day);
      onDateChange(newDate);
    }
  };

  const isCurrentDayToday = selectedDate ? isToday(selectedDate) : true;
  const formattedDate = format(activeDate, "EEE, dd MMM yyyy");
  const isoDateForInput = format(activeDate, "yyyy-MM-dd");

  return (
    <div
      className={`inline-flex items-center gap-1 sm:gap-1.5 bg-background border border-border/80 rounded-xl p-1 shadow-sm hover:border-border transition-colors select-none ${className}`}
    >
      {/* Previous Day Chevron Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handlePrevDay}
        className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        title="Previous Day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Date Trigger with hidden native calendar picker */}
      <div
        onClick={() => {
          try {
            dateInputRef.current?.showPicker();
          } catch {
            dateInputRef.current?.focus();
          }
        }}
        className="relative flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted/60 cursor-pointer group transition-colors"
        title="Click to choose a date from calendar"
      >
        <CalendarIcon className="h-4 w-4 text-primary group-hover:scale-105 transition-transform flex-shrink-0" />

        <span className="text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap text-foreground">
          {formattedDate}
        </span>

        {/* TODAY / GO TO TODAY indicator */}
        {isCurrentDayToday ? (
          <span className="bg-primary/10 text-primary font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-md uppercase border border-primary/20">
            TODAY
          </span>
        ) : (
          <button
            type="button"
            onClick={handleTodayClick}
            className="bg-accent hover:bg-primary/15 text-accent-foreground hover:text-primary font-bold text-[10px] tracking-wider px-2 py-0.5 rounded-md uppercase border border-border transition-colors"
            title="Jump to today"
          >
            GO TO TODAY
          </button>
        )}

        {/* Hidden Date Input */}
        <input
          ref={dateInputRef}
          type="date"
          value={isoDateForInput}
          onChange={handleNativeDateChange}
          className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
          tabIndex={-1}
        />
      </div>

      {/* Next Day Chevron Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleNextDay}
        className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        title="Next Day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
