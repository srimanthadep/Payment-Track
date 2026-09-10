import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  SlidersHorizontal,
  CalendarIcon,
  Globe,
  ArrowLeftRight,
  CreditCard,
  X,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  FilterState,
  DEFAULT_CARD_FILTER_OPTIONS,
} from "@/components/transactions/TransactionFilters";

interface DashboardFilterSheetProps {
  userId: string;
  onFiltersChange: (filters: FilterState) => void;
  filters: FilterState;
}

const EMPTY_FILTERS: FilterState = {
  dateRange: { from: null, to: null },
  portals: [],
  status: [],
  transactionType: [],
  cardTypes: [],
  amountRange: { min: null, max: null },
};

export const DashboardFilterSheet = ({
  userId,
  onFiltersChange,
  filters,
}: DashboardFilterSheetProps) => {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [portals, setPortals] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch portals for the portal filter section
  useEffect(() => {
    const fetchPortals = async () => {
      const { data } = await supabase
        .from("portals")
        .select("id, name")
        .eq("is_active", true);
      if (data) setPortals(data);
    };
    fetchPortals();
  }, []);

  // Sync local state when the sheet opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.portals.length > 0) count++;
    if (filters.transactionType.length > 0) count++;
    if (filters.cardTypes && filters.cardTypes.length > 0) count++;
    return count;
  }, [filters]);

  const updateLocal = (patch: Partial<FilterState>) => {
    setLocalFilters((prev) => ({ ...prev, ...patch }));
  };

  const toggleInArray = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const clearAll = () => {
    setLocalFilters(EMPTY_FILTERS);
    onFiltersChange(EMPTY_FILTERS);
  };

  const setQuickDateRange = (preset: string) => {
    const today = new Date();
    let from: Date | null = null;
    let to: Date | null = new Date(today);

    switch (preset) {
      case "today":
        from = new Date(today);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "week":
        from = new Date(today);
        from.setDate(today.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "month":
        from = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "30days":
        from = new Date(today);
        from.setDate(today.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "clear":
        from = null;
        to = null;
        break;
    }
    updateLocal({ dateRange: { from, to } });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          id="dashboard-filter-trigger"
          variant="outline"
          className={cn(
            "h-9 text-xs sm:text-sm font-medium transition-all gap-1.5",
            activeFilterCount > 0
              ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              : "bg-background hover:bg-accent/50"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold rounded-full ml-0.5"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-bold">Filters</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Refine your dashboard data
              </SheetDescription>
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset All
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable Filter Sections */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">

            {/* 1. Date Range */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Date Range</Label>
                {(localFilters.dateRange.from || localFilters.dateRange.to) && (
                  <button
                    type="button"
                    onClick={() => setQuickDateRange("clear")}
                    className="ml-auto text-[11px] text-primary hover:underline font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[
                  { label: "Today", key: "today" },
                  { label: "7 Days", key: "week" },
                  { label: "This Month", key: "month" },
                  { label: "30 Days", key: "30days" },
                ].map((p) => (
                  <Button
                    key={p.key}
                    size="sm"
                    variant="outline"
                    onClick={() => setQuickDateRange(p.key)}
                    className="h-7 text-[11px] font-medium hover:bg-primary/10 hover:border-primary/30"
                  >
                    {p.label}
                  </Button>
                ))}
              </div>

              {/* Selected Range Display */}
              {localFilters.dateRange.from && (
                <div className="text-xs text-muted-foreground mb-2 px-1">
                  {localFilters.dateRange.from && localFilters.dateRange.to
                    ? `${format(localFilters.dateRange.from, "dd MMM yyyy")} — ${format(localFilters.dateRange.to, "dd MMM yyyy")}`
                    : localFilters.dateRange.from
                    ? `From ${format(localFilters.dateRange.from, "dd MMM yyyy")}`
                    : ""}
                </div>
              )}

              {/* Calendar */}
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card/30 p-2">
                <Calendar
                  mode="range"
                  selected={{
                    from: localFilters.dateRange.from || undefined,
                    to: localFilters.dateRange.to || undefined,
                  }}
                  onSelect={(range) => {
                    const from = range?.from ? new Date(range.from) : null;
                    if (from) from.setHours(0, 0, 0, 0);
                    const to = range?.to ? new Date(range.to) : null;
                    if (to) to.setHours(23, 59, 59, 999);
                    updateLocal({
                      dateRange: {
                        from,
                        to,
                      },
                    });
                  }}
                  numberOfMonths={1}
                  className="w-full p-0"
                  classNames={{
                    months: "w-full",
                    month: "w-full space-y-3",
                    caption: "flex justify-center pt-1 relative items-center mb-2",
                    caption_label: "text-sm font-semibold text-foreground",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "grid grid-cols-7 w-full",
                    head_cell: "text-muted-foreground font-medium text-[0.8rem] text-center w-full",
                    row: "grid grid-cols-7 w-full mt-1.5",
                    cell: "h-9 w-full text-center text-sm p-0 relative flex items-center justify-center [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 mx-auto p-0 font-normal aria-selected:opacity-100 flex items-center justify-center rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground",
                  }}
                />
              </div>
            </section>

            <Separator />

            {/* 2. Portal Filter */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Portal</Label>
                {localFilters.portals.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-1">
                    {localFilters.portals.length}
                  </Badge>
                )}
                {localFilters.portals.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateLocal({ portals: [] })}
                    className="ml-auto text-[11px] text-primary hover:underline font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {portals.map((portal) => (
                  <label
                    key={portal.id}
                    className="flex items-center space-x-2.5 cursor-pointer p-2 hover:bg-muted/70 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={localFilters.portals.includes(portal.id)}
                      onChange={() =>
                        updateLocal({
                          portals: toggleInArray(localFilters.portals, portal.id),
                        })
                      }
                      className="rounded accent-primary h-3.5 w-3.5"
                    />
                    <span className="text-xs font-medium">{portal.name}</span>
                  </label>
                ))}
                {portals.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">No portals found</p>
                )}
              </div>
            </section>

            <Separator />
            {/* 3. Transaction Type Filter */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Transaction Type</Label>
                {localFilters.transactionType.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-1">
                    {localFilters.transactionType.length}
                  </Badge>
                )}
                {localFilters.transactionType.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateLocal({ transactionType: [] })}
                    className="ml-auto text-[11px] text-primary hover:underline font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {["withdrawal", "repayment"].map((type) => (
                  <label
                    key={type}
                    className="flex items-center space-x-2.5 cursor-pointer p-2 hover:bg-muted/70 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={localFilters.transactionType.includes(type)}
                      onChange={() =>
                        updateLocal({
                          transactionType: toggleInArray(
                            localFilters.transactionType,
                            type
                          ),
                        })
                      }
                      className="rounded accent-primary h-3.5 w-3.5"
                    />
                    <span className="text-xs capitalize font-medium">{type}</span>
                  </label>
                ))}
              </div>
            </section>

            <Separator />

            {/* 4. Card Type Filter */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Card Type</Label>
                {(localFilters.cardTypes?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-1">
                    {localFilters.cardTypes.length}
                  </Badge>
                )}
                {(localFilters.cardTypes?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => updateLocal({ cardTypes: [] })}
                    className="ml-auto text-[11px] text-primary hover:underline font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {DEFAULT_CARD_FILTER_OPTIONS.map((card) => (
                  <label
                    key={card.id}
                    className="flex items-start space-x-2.5 cursor-pointer p-2 hover:bg-muted/70 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={localFilters.cardTypes?.includes(card.id) || false}
                      onChange={() =>
                        updateLocal({
                          cardTypes: toggleInArray(
                            localFilters.cardTypes || [],
                            card.id
                          ),
                        })
                      }
                      className="mt-0.5 rounded accent-primary h-3.5 w-3.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground">
                        {card.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {card.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t border-border/60 flex-row gap-2">
          <Button
            variant="outline"
            onClick={clearAll}
            className="flex-1 h-10 text-sm gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Clear All
          </Button>
          <Button
            onClick={applyFilters}
            className="flex-1 h-10 text-sm font-semibold"
          >
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
