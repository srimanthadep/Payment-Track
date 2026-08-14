import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      {/* Mobile: Grid layout for better space utilization - 3 columns */}
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
        {/* Date Range Filter */}
        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 text-xs sm:text-sm w-full sm:w-auto",
                filters.dateRange.from || filters.dateRange.to ? "bg-primary/10" : ""
              )}
            >
              <CalendarIcon className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">
                {filters.dateRange.from && filters.dateRange.to
                  ? `${format(filters.dateRange.from, "MMM d")} - ${format(filters.dateRange.to, "MMM d")}`
                  : filters.dateRange.from
                  ? format(filters.dateRange.from, "MMM d")
                  : "Date Range"}
              </span>
              <span className="sm:hidden">Date</span>
            </Button>
          </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setQuickDateRange("today")} className="text-xs">
                Today
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuickDateRange("week")} className="text-xs">
                Last 7 Days
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuickDateRange("month")} className="text-xs">
                This Month
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQuickDateRange("30days")} className="text-xs">
                Last 30 Days
              </Button>
            </div>
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
            />
            <div className="flex justify-between">
              <Button size="sm" variant="ghost" onClick={() => setQuickDateRange("clear")} className="text-xs">
                Clear
              </Button>
              <Button size="sm" onClick={() => setDateRangeOpen(false)} className="text-xs">
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

        {/* Portal Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("h-9 text-xs sm:text-sm w-full sm:w-auto", filters.portals.length > 0 ? "bg-primary/10" : "")}
            >
              <span className="hidden sm:inline">Portal</span>
              <span className="sm:hidden">Portal</span>
              {filters.portals.length > 0 && ` (${filters.portals.length})`}
            </Button>
          </PopoverTrigger>
        <PopoverContent className="w-56" align="start">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Select Portals</Label>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {portals.map((portal) => (
                <label key={portal.id} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-muted rounded">
                  <input
                    type="checkbox"
                    checked={filters.portals.includes(portal.id)}
                    onChange={() => togglePortal(portal.id)}
                    className="rounded"
                  />
                  <span className="text-xs">{portal.name}</span>
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
              className={cn("h-9 text-xs sm:text-sm w-full sm:w-auto", filters.status.length > 0 ? "bg-primary/10" : "")}
            >
              Status {filters.status.length > 0 && `(${filters.status.length})`}
            </Button>
          </PopoverTrigger>
        <PopoverContent className="w-48" align="start">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Select Status</Label>
            <div className="space-y-1">
              {["completed", "pending", "failed"].map((status) => (
                <label key={status} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-muted rounded">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={() => toggleStatus(status)}
                    className="rounded"
                  />
                  <span className="text-xs capitalize">{status}</span>
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
              className={cn("h-9 text-xs sm:text-sm w-full sm:w-auto", filters.transactionType.length > 0 ? "bg-primary/10" : "")}
            >
              Type {filters.transactionType.length > 0 && `(${filters.transactionType.length})`}
            </Button>
          </PopoverTrigger>
        <PopoverContent className="w-48" align="start">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Select Type</Label>
            <div className="space-y-1">
              {["withdrawal", "repayment"].map((type) => (
                <label key={type} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-muted rounded">
                  <input
                    type="checkbox"
                    checked={filters.transactionType.includes(type)}
                    onChange={() => toggleTransactionType(type)}
                    className="rounded"
                  />
                  <span className="text-xs capitalize">{type}</span>
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
              className={cn("h-9 text-xs sm:text-sm w-full sm:w-auto col-span-3 sm:col-span-1", filters.amountRange.min !== null || filters.amountRange.max !== null ? "bg-primary/10" : "")}
            >
              <span className="hidden sm:inline">Amount Range</span>
              <span className="sm:hidden">Amount</span>
            </Button>
          </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Amount Range (₹)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Min</Label>
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
                <Label className="text-xs">Max</Label>
                <Input
                  type="number"
                  placeholder="∞"
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
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9 text-xs sm:text-sm w-full sm:w-auto col-span-3 sm:col-span-1">
            <X className="mr-1 h-3.5 w-3.5" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
};

