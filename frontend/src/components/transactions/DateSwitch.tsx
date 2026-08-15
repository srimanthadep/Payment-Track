import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isToday, addDays, subDays } from "date-fns";

interface DateSwitchProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
}

export const DateSwitch = ({ selectedDate, onDateChange }: DateSwitchProps) => {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const activeDate = selectedDate || new Date();

  const handlePrevDay = () => {
    onDateChange(subDays(activeDate, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(activeDate, 1));
  };

  const handleTodayClick = () => {
    onDateChange(new Date());
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      // Split YYYY-MM-DD to avoid timezone offset issue
      const [year, month, day] = e.target.value.split("-").map(Number);
      const newDate = new Date(year, month - 1, day);
      onDateChange(newDate);
    }
  };

  const isCurrentDayToday = selectedDate ? isToday(selectedDate) : true;

  const formattedDate = selectedDate
    ? format(selectedDate, "EEE, dd MMM yyyy")
    : format(new Date(), "EEE, dd MMM yyyy");

  const isoDateForInput = format(activeDate, "yyyy-MM-dd");

  return (
    <div className="inline-flex items-center gap-1 sm:gap-2 bg-card border border-border/80 rounded-full px-2 py-1 shadow-sm hover:shadow transition-shadow">
      {/* Previous Day */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handlePrevDay}
        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
        title="Previous Day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Date Display with hidden native picker on click */}
      <div className="relative flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 cursor-pointer group">
        <CalendarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
        
        <span className="text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {formattedDate}
        </span>

        {/* TODAY pill badge */}
        {isCurrentDayToday ? (
          <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold text-[10px] sm:text-[11px] tracking-wider px-2 py-0.5 rounded-full uppercase select-none border border-indigo-200/60 dark:border-indigo-800/60">
            TODAY
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTodayClick();
            }}
            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/80 dark:hover:bg-indigo-800 dark:text-indigo-200 font-bold text-[10px] sm:text-[11px] tracking-wider px-2 py-0.5 rounded-full uppercase transition-colors"
            title="Jump to Today"
          >
            GO TO TODAY
          </button>
        )}

        {/* Hidden native date picker */}
        <input
          ref={dateInputRef}
          type="date"
          value={isoDateForInput}
          onChange={handleNativeDateChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          title="Click to select specific date"
        />
      </div>

      {/* Next Day */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleNextDay}
        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
        title="Next Day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* View All / Clear Filter Button */}
      {selectedDate !== null && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDateChange(null)}
          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground rounded-full ml-0.5 border border-dashed border-muted-foreground/30 hover:border-foreground/50"
          title="View all dates"
        >
          All
        </Button>
      )}
    </div>
  );
};
