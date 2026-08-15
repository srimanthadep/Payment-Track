import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TransactionFiltersProps {
  portals: Array<{ id: string; name: string }>;
  onFiltersChange: (filters: FilterState) => void;
}

export interface FilterState {
  dateRange: { from: Date | null; to: Date | null };
  portals: string[];
  status: string[];
  transactionType: string[];
  amountRange: { min: number | null; max: number | null };
}

export const TransactionFilters = ({ portals, onFiltersChange }: TransactionFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: null, to: null },
    portals: [],
    status: [],
    transactionType: [],
    amountRange: { min: null, max: null },
  });

  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFiltersChange(updated);
  };

  const togglePortal = (portalId: string) => {
    const updated = filters.portals.includes(portalId)
      ? filters.portals.filter((id) => id !== portalId)
      : [...filters.portals, portalId];
    updateFilters({ portals: updated });
  };

  const toggleStatus = (status: string) => {
    const updated = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    updateFilters({ status: updated });
  };

  const toggleTransactionType = (type: string) => {
    const updated = filters.transactionType.includes(type)
      ? filters.transactionType.filter((t) => t !== type)
      : [...filters.transactionType, type];
    updateFilters({ transactionType: updated });
  };

  const setQuickDateRange = (preset: string) => {
    const today = new Date();
    let from: Date | null = null;
    let to: Date | null = new Date(today);

    switch (preset) {
      case "today":
        from = new Date(today);
        from.setHours(0, 0, 0, 0);
        break;
      case "week":
        from = new Date(today);
        from.setDate(today.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        break;
      case "month":
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "30days":
        from = new Date(today);
        from.setDate(today.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        break;
      case "clear":
        from = null;
        to = null;
        break;
    }

    updateFilters({ dateRange: { from, to } });
    if (preset !== "clear") {
      setDateRangeOpen(false);
    }
  };

  const clearAllFilters = () => {
    const cleared: FilterState = {
      dateRange: { from: null, to: null },
      portals: [],
      status: [],
      transactionType: [],
      amountRange: { min: null, max: null },
    };
    setFilters(cleared);
    onFiltersChange(cleared);
  };

  const hasActiveFilters =
    filters.dateRange.from ||
    filters.dateRange.to ||
    filters.portals.length > 0 ||
    filters.status.length > 0 ||
    filters.transactionType.length > 0 ||
    filters.amountRange.min !== null ||
    filters.amountRange.max !== null;

  return (
    <div className="w-full">
      {/* Filter Buttons Row */}
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2">
        {/* Compact Date Range Filter */}
        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 text-xs sm:text-sm w-full sm:w-auto font-medium transition-colors",
                filters.dateRange.from || filters.dateRange.to
                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  : "bg-background hover:bg-accent/50"
              )}
            >
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="hidden sm:inline">
                {filters.dateRange.from && filters.dateRange.to
                  ? `${format(filters.dateRange.from, "dd MMM")} - ${format(filters.dateRange.to, "dd MMM")}`
                  : filters.dateRange.from
                  ? format(filters.dateRange.from, "dd MMM yyyy")
                  : "Date Range"}
              </span>
              <span className="sm:hidden">
                {filters.dateRange.from ? "Range Set" : "Date"}
              </span>
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-auto p-0 rounded-2xl shadow-xl border border-border/80 overflow-hidden bg-popover"
            align="start"
            sideOffset={6}
          >
            {/* Quick Presets Bar */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-muted/40 border-b border-border/60">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setQuickDateRange("today")}
                className="h-7 px-2 text-[11px] font-medium hover:bg-background shadow-xs"
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setQuickDateRange("week")}
                className="h-7 px-2 text-[11px] font-medium hover:bg-background shadow-xs"
              >
                7 Days
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setQuickDateRange("month")}
                className="h-7 px-2 text-[11px] font-medium hover:bg-background shadow-xs"
              >
                This Month
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setQuickDateRange("30days")}
                className="h-7 px-2 text-[11px] font-medium hover:bg-background shadow-xs"
              >
                30 Days
              </Button>
            </div>

            {/* Compact Range Calendar */}
            <div className="p-1">
              <Calendar
                mode="range"
                selected={{
                  from: filters.dateRange.from || undefined,
                  to: filters.dateRange.to || undefined,
                }}
                onSelect={(range) => {
                  updateFilters({
                    dateRange: {
                      from: range?.from || null,
                      to: range?.to || null,
                    },
                  });
                }}
                numberOfMonths={1}
                className="rounded-xl"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-2 border-t border-border/60 bg-muted/20">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setQuickDateRange("clear")}
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => setDateRangeOpen(false)}
                className="h-7 px-3 text-xs font-semibold"
              >
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Portal Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 text-xs sm:text-sm w-full sm:w-auto font-medium transition-colors",
                filters.portals.length > 0
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background hover:bg-accent/50"
              )}
            >
              <span>Portal</span>
              {filters.portals.length > 0 && ` (${filters.portals.length})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 rounded-xl shadow-lg border-border/80" align="start">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Portals</Label>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {portals.map((portal) => (
                  <label key={portal.id} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-muted/70 rounded-md transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.portals.includes(portal.id)}
                      onChange={() => togglePortal(portal.id)}
                      className="rounded accent-primary"
                    />
                    <span className="text-xs font-medium">{portal.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 text-xs sm:text-sm w-full sm:w-auto font-medium transition-colors",
                filters.status.length > 0
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background hover:bg-accent/50"
              )}
            >
              Status {filters.status.length > 0 && `(${filters.status.length})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3 rounded-xl shadow-lg border-border/80" align="start">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Status</Label>
              <div className="space-y-1">
                {["completed", "pending", "failed"].map((status) => (
                  <label key={status} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-muted/70 rounded-md transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => toggleStatus(status)}
                      className="rounded accent-primary"
                    />
                    <span className="text-xs capitalize font-medium">{status}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Transaction Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 text-xs sm:text-sm w-full sm:w-auto font-medium transition-colors",
                filters.transactionType.length > 0
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background hover:bg-accent/50"
              )}
            >
              Type {filters.transactionType.length > 0 && `(${filters.transactionType.length})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3 rounded-xl shadow-lg border-border/80" align="start">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Type</Label>
              <div className="space-y-1">
                {["withdrawal", "repayment"].map((type) => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-muted/70 rounded-md transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.transactionType.includes(type)}
                      onChange={() => toggleTransactionType(type)}
                      className="rounded accent-primary"
                    />
                    <span className="text-xs capitalize font-medium">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Amount Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 text-xs sm:text-sm w-full sm:w-auto col-span-3 sm:col-span-1 font-medium transition-colors",
                filters.amountRange.min !== null || filters.amountRange.max !== null
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background hover:bg-accent/50"
              )}
            >
              <span className="hidden sm:inline">Amount Range</span>
              <span className="sm:hidden">Amount</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 rounded-xl shadow-lg border-border/80" align="start">
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount Range (₹)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Min (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.amountRange.min || ""}
                    onChange={(e) =>
                      updateFilters({
                        amountRange: {
                          ...filters.amountRange,
                          min: e.target.value ? parseFloat(e.target.value) : null,
                        },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Max (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.amountRange.max || ""}
                    onChange={(e) =>
                      updateFilters({
                        amountRange: {
                          ...filters.amountRange,
                          max: e.target.value ? parseFloat(e.target.value) : null,
                        },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-9 text-xs sm:text-sm w-full sm:w-auto col-span-3 sm:col-span-1 text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
};
