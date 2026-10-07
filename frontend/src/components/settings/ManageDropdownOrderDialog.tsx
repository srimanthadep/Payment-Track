import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  settingsService,
  DropdownSortMode,
  DropdownOrderingConfig,
} from "@/services/settingsService";
import { Reorder, motion } from "framer-motion";
import {
  GripVertical,
  Zap,
  SlidersHorizontal,
  RotateCcw,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Flame,
  Check,
  Info,
} from "lucide-react";

export interface DropdownItem {
  id: string;
  name: string;
  label?: string;
  isDefault?: boolean;
  color?: string;
  [key: string]: any;
}

interface ManageDropdownOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropdownKey: string;
  title: string;
  description?: string;
  items: DropdownItem[];
  onOrderSaved?: () => void;
  onApplied?: () => void;
}

export const ManageDropdownOrderDialog: React.FC<ManageDropdownOrderDialogProps> = ({
  open,
  onOpenChange,
  dropdownKey,
  title,
  description,
  items,
  onOrderSaved,
  onApplied,
}) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<DropdownSortMode>("manual");
  const [orderedItems, setOrderedItems] = useState<DropdownItem[]>([]);
  const [config, setConfig] = useState<DropdownOrderingConfig>({
    mode: "manual",
    manualOrder: [],
    selectionCounts: {},
    lastSelectedAt: {},
  });

  // Load configuration and initialize items order
  useEffect(() => {
    if (!open) return;
    const currentConfig = settingsService.getDropdownOrderingConfig(dropdownKey);
    setConfig(currentConfig);
    setMode(currentConfig.mode || "manual");

    // Order items based on current settings
    const sorted = settingsService.sortOptions(dropdownKey, items);
    setOrderedItems(sorted);
  }, [open, dropdownKey, items]);

  const counts = config.selectionCounts || {};

  // Case-insensitive and alias-aware count resolver
  const getItemCount = useCallback(
    (item: any) => {
      let maxCount = 0;
      if (item.name && counts[item.name] !== undefined) maxCount = Math.max(maxCount, counts[item.name]);
      if (item.id && counts[item.id] !== undefined) maxCount = Math.max(maxCount, counts[item.id]);
      const lowerName = (item.name || item.label || "").toLowerCase();
      const lowerId = (item.id || "").toLowerCase();
      for (const [k, v] of Object.entries(counts)) {
        const lk = k.toLowerCase();
        if (lk === lowerName || lk === lowerId) {
          maxCount = Math.max(maxCount, v);
        }
      }
      return maxCount;
    },
    [counts]
  );

  const timestamps = config.lastSelectedAt || {};

  const getItemTime = useCallback(
    (item: any) => {
      let maxTime = 0;
      if (item.id && timestamps[item.id]) {
        maxTime = Math.max(maxTime, new Date(timestamps[item.id]).getTime());
      }
      if (item.name && timestamps[item.name]) {
        maxTime = Math.max(maxTime, new Date(timestamps[item.name]).getTime());
      }
      const lowerName = (item.name || item.label || "").toLowerCase();
      const lowerId = (item.id || "").toLowerCase();
      for (const [k, v] of Object.entries(timestamps)) {
        const lk = k.toLowerCase();
        if (lk === lowerName || lk === lowerId) {
          maxTime = Math.max(maxTime, new Date(v).getTime());
        }
      }
      return maxTime;
    },
    [timestamps]
  );

  // Automatically sorted view items matching settingsService.sortOptions exactly
  const autoSortedItems = useMemo(() => {
    const initialIndexMap = new Map<any, number>();
    items.forEach((item, idx) => {
      initialIndexMap.set(item.id ?? item.name ?? item, idx);
    });

    return [...items].sort((a, b) => {
      const countA = getItemCount(a);
      const countB = getItemCount(b);
      if (countB !== countA) return countB - countA;

      const timeA = getItemTime(a);
      const timeB = getItemTime(b);
      if (timeB !== timeA) return timeB - timeA;

      const idxA = initialIndexMap.get(a.id ?? a.name ?? a) ?? 9999;
      const idxB = initialIndexMap.get(b.id ?? b.name ?? b) ?? 9999;
      return idxA - idxB;
    });
  }, [items, getItemCount, getItemTime]);

  const totalSelections = useMemo(() => {
    return autoSortedItems.reduce((sum, item) => sum + getItemCount(item), 0);
  }, [autoSortedItems, getItemCount]);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncFromHistory = async () => {
    setIsSyncing(true);
    try {
      const success = await settingsService.bootstrapFromHistory();
      if (success) {
        setConfig(settingsService.getDropdownOrderingConfig(dropdownKey));
        toast({
          title: "Synced with History",
          description: "Dropdown frequencies calculated from past transactions.",
        });
      }
    } catch (e) {
      toast({
        title: "Sync Failed",
        description: "Could not calculate historical frequencies.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // If no selections exist, automatically trigger bootstrap from transactions history
  useEffect(() => {
    if (!open) return;
    if (totalSelections === 0 && !isSyncing) {
      settingsService.bootstrapFromHistory().then((success) => {
        if (success) {
          setConfig(settingsService.getDropdownOrderingConfig(dropdownKey));
        }
      });
    }
  }, [open, dropdownKey, totalSelections]);

  // Quick move up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newItems = [...orderedItems];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(index - 1, 0, moved);
    setOrderedItems(newItems);
  };

  // Quick move down
  const handleMoveDown = (index: number) => {
    if (index >= orderedItems.length - 1) return;
    const newItems = [...orderedItems];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(index + 1, 0, moved);
    setOrderedItems(newItems);
  };

  // Reset to default original sequence
  const handleResetToDefault = () => {
    setOrderedItems([...items]);
    toast({
      title: "Order Reset",
      description: "Restored to the original default sequence.",
    });
  };

  // Reset frequency usage counts
  const handleResetUsageStats = () => {
    settingsService.resetDropdownCounts(dropdownKey);
    const updated = settingsService.getDropdownOrderingConfig(dropdownKey);
    setConfig(updated);
    toast({
      title: "Usage Stats Cleared",
      description: "Selection counts for this dropdown have been reset to zero.",
    });
  };

  // Save changes
  const handleSave = () => {
    const manualOrderKeys = (mode === "automatic" ? autoSortedItems : orderedItems).map(
      (item) => item.id || item.name
    );
    settingsService.setDropdownOrderingConfig(dropdownKey, {
      mode,
      manualOrder: manualOrderKeys,
    });

    toast({
      title: mode === "automatic" ? "Automatic Ordering Active" : "Order Saved",
      description:
        mode === "automatic"
          ? `"${title}" will keep the most frequently used items on top forever.`
          : `"${title}" will now display in your custom manual order.`,
    });

    onOrderSaved?.();
    onApplied?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/50 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Order & Ranking — {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {description || "Choose how options are ordered in dropdown menus"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-3 pb-2 bg-muted/20 border-b border-border/40 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-muted/80 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${mode === "manual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Manual Drag & Drop</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("automatic")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${mode === "automatic"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Automatic</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground px-1">
            <Info className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            {mode === "manual" ? (
              <span>Drag items by the handle or use arrows to change the dropdown sequence.</span>
            ) : (
              <span>
                <strong className="text-foreground">Dynamic Permanent Ranking:</strong> The most used item stays on top. As usage shifts over time, items automatically re-rank themselves forever without any manual effort.
              </span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 sleek-scrollbar min-h-0">
          {mode === "manual" ? (
            <Reorder.Group
              axis="y"
              values={orderedItems}
              onReorder={setOrderedItems}
              className="space-y-2"
            >
              {orderedItems.map((item, index) => {
                const count = getItemCount(item);

                return (
                  <Reorder.Item
                    key={item.id || item.name}
                    value={item}
                    className="flex items-center justify-between p-2.5 rounded-xl border bg-card hover:border-primary/40 transition-colors shadow-sm cursor-default select-none group"
                    whileDrag={{
                      scale: 1.02,
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-primary transition-colors p-1 -m-1"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>

                      <span className="text-[11px] font-bold text-muted-foreground/80 w-5 shrink-0 text-center">
                        #{index + 1}
                      </span>

                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs sm:text-sm font-semibold truncate text-foreground">
                          {item.name || item.label}
                        </span>
                        {item.isDefault && (
                          <span className="text-[9px] text-muted-foreground font-medium uppercase px-1 py-0.2 bg-muted rounded shrink-0">
                            Default
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {count > 0 && (
                        <span className="text-[10px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full font-medium">
                          {count} {count === 1 ? "use" : "uses"}
                        </span>
                      )}

                      <div className="flex items-center gap-0.5 ml-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                          className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-20"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === orderedItems.length - 1}
                          onClick={() => handleMoveDown(index)}
                          className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-20"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mb-1">
                <span>Ranked by usage ({totalSelections} total selections)</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSyncFromHistory}
                    disabled={isSyncing}
                    className="h-6 text-[11px] px-2 text-primary hover:text-primary gap-1"
                    title="Recalculate frequencies from all past transactions in database"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Syncing..." : "Sync from History"}
                  </Button>
                  {totalSelections > 0 && (
                    <button
                      type="button"
                      onClick={handleResetUsageStats}
                      className="text-[11px] text-destructive hover:underline font-medium ml-1"
                    >
                      Reset Stats
                    </button>
                  )}
                </div>
              </div>

              {totalSelections === 0 && (
                <div className="p-4 rounded-xl border border-dashed border-border/70 bg-muted/20 text-center space-y-2 my-2">
                  <p className="text-xs text-muted-foreground">
                    No selections recorded yet. Click below to automatically calculate frequencies from all past transactions.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSyncFromHistory}
                    disabled={isSyncing}
                    className="h-8 text-xs gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Scanning History..." : "Calculate from Past Transactions"}
                  </Button>
                </div>
              )}

              {autoSortedItems.map((item, index) => {
                const count = getItemCount(item);
                const percent = totalSelections > 0 ? Math.round((count / totalSelections) * 100) : 0;
                const isTop = index === 0 && count > 0;

                return (
                  <motion.div
                    key={item.id || item.name}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex flex-col p-2.5 rounded-xl border ${isTop
                        ? "bg-primary/[0.04] border-primary/40"
                        : "bg-card border-border/80"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-xs font-bold w-5 text-center ${isTop ? "text-primary" : "text-muted-foreground"
                            }`}
                        >
                          #{index + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold truncate text-foreground flex items-center gap-1.5">
                          {item.name || item.label}
                          {isTop && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                              <Flame className="h-3 w-3" /> Most Used
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={count > 0 ? "default" : "outline"}
                          className={`text-[10px] px-2 py-0.5 font-semibold ${count > 0
                              ? "bg-primary/10 text-primary hover:bg-primary/15 border-primary/20"
                              : "text-muted-foreground"
                            }`}
                        >
                          {count} {count === 1 ? "selection" : "selections"}
                        </Badge>
                      </div>
                    </div>

                    {totalSelections > 0 && (
                      <div className="mt-2 w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isTop ? "bg-primary" : "bg-primary/50"
                            }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        <DialogFooter className="px-5 py-3 border-t border-border/50 bg-muted/20 flex flex-row items-center justify-between sm:justify-between gap-2 shrink-0">
          <div>
            {mode === "manual" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetToDefault}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset to Default</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="h-8 text-xs gap-1 font-semibold"
            >
              {mode === "automatic" ? (
                <>
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>Apply Automatic Order</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Manual Order</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
