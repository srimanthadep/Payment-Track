import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog";
import { ManagePortalsDialog } from "@/components/portals/ManagePortalsDialog";
import { UploadPayoutDialog } from "@/components/transactions/UploadPayoutDialog";
import { DateSwitch } from "@/components/transactions/DateSwitch";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { useRole } from "@/hooks/useRole";
import { dateSyncService } from "@/services/dateSyncService";

export type TransactionPeriod = "daily" | "weekly" | "monthly" | "all";

const Transactions = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isStaff, effectiveUserId } = useRole();
  const [user, setUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [managePortalsOpen, setManagePortalsOpen] = useState(false);
  const [portalsRefreshKey, setPortalsRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState<TransactionPeriod>("daily");
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => dateSyncService.getActiveDate() || new Date()
  );

  const dateRange = useMemo<{ from: Date | null; to: Date | null }>(() => {
    const now = new Date();
    if (period === "all") return { from: null, to: null };
    if (period === "daily") {
      if (!selectedDate) return { from: null, to: null };
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    if (period === "weekly") {
      const activeDate = selectedDate || now;
      const start = startOfWeek(activeDate, { weekStartsOn: 1 });
      const end = endOfWeek(activeDate, { weekStartsOn: 1 });
      return { from: start, to: end };
    }
    if (period === "monthly") {
      const activeDate = selectedDate || now;
      const start = startOfMonth(activeDate);
      const end = endOfMonth(activeDate);
      return { from: start, to: end };
    }
    return { from: null, to: null };
  }, [period, selectedDate]);

  const [portalSummary, setPortalSummary] = useState<{
    portalNames: string[];
    totalAmount: number;
    count: number;
  } | null>(null);

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Open dialog if navigated with ?add=true query param
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setIsDialogOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("add");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Listen for global custom event or direct 'n' / 'N' key press
  useEffect(() => {
    const handleOpenEvent = () => setIsDialogOpen(true);
    window.addEventListener("open-add-transaction", handleOpenEvent);

    const handleDirectKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable ||
            target.closest("input, textarea, select, [contenteditable='true']") ||
            target.closest("[role='dialog']"))
        ) {
          return;
        }
        if (document.querySelector("[role='dialog'], [role='alertdialog']")) return;
        e.preventDefault();
        setIsDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleDirectKey);

    return () => {
      window.removeEventListener("open-add-transaction", handleOpenEvent);
      window.removeEventListener("keydown", handleDirectKey);
    };
  }, []);

  if (!user) return null;

  return (
    <DashboardLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 sm:space-y-6"
        >
          {/* Header Row: Title & Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-1 border-b border-border/60">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                Transactions
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage all your payment transactions
              </p>
            </div>

            {/* Segmented Period Tabs & Daily Date Navigator */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {period !== "all" && (
                <DateSwitch
                  period={period}
                  selectedDate={selectedDate}
                  onDateChange={(newDate) => {
                    setSelectedDate(newDate);
                  }}
                  className="w-full sm:w-auto"
                />
              )}

              <Tabs
                value={period}
                onValueChange={(v) => {
                  setPeriod(v as TransactionPeriod);
                  if (!selectedDate && v !== "all") {
                    setSelectedDate(new Date());
                  }
                }}
                className="w-full sm:w-auto"
              >
                <TabsList
                  className="grid grid-cols-4 w-full sm:w-auto"
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      e.stopPropagation();
                      e.preventDefault();
                    }
                  }}
                >
                  <TabsTrigger
                    value="daily"
                    className="text-xs sm:text-sm"
                    onClick={(e) => (e.currentTarget as HTMLElement).blur()}
                  >
                    Daily
                  </TabsTrigger>
                  <TabsTrigger
                    value="weekly"
                    className="text-xs sm:text-sm"
                    onClick={(e) => (e.currentTarget as HTMLElement).blur()}
                  >
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger
                    value="monthly"
                    className="text-xs sm:text-sm"
                    onClick={(e) => (e.currentTarget as HTMLElement).blur()}
                  >
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger
                    value="all"
                    className="text-xs sm:text-sm"
                    onClick={(e) => (e.currentTarget as HTMLElement).blur()}
                  >
                    All Time
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="text-sm h-9 flex items-center gap-2 shadow-xs"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Transaction</span>
              <kbd className="hidden lg:inline-flex items-center justify-center h-4.5 min-w-[18px] px-1 text-[10px] font-mono font-semibold rounded bg-primary-foreground/20 text-primary-foreground">
                N
              </kbd>
            </Button>
            {!isStaff && (
              <>
                <Button
                  className="w-full sm:w-auto text-xs sm:text-sm h-9 flex items-center justify-center gap-1.5"
                  variant="secondary"
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import Payouts
                </Button>
                <Button
                  className="w-full sm:w-auto text-xs sm:text-sm h-9 flex items-center justify-center gap-1.5"
                  variant="outline"
                  onClick={() => setManagePortalsOpen(true)}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Manage Portals
                </Button>
              </>
            )}
          </div>

          {/* Transactions Table with Period / Date Filter applied */}
          {user && (
            <TransactionsTable
              userId={effectiveUserId || user.id}
              selectedDate={period === "daily" ? selectedDate : null}
              dateRange={dateRange}
              onPortalFilterSummaryChange={setPortalSummary}
              isStaff={isStaff}
              key={`tx-table-${refreshKey}-${effectiveUserId || user.id}`}
            />
          )}

          {user && (
            <AddTransactionDialog
              userId={effectiveUserId || user.id}
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              portalsRefreshKey={portalsRefreshKey}
              isStaff={isStaff}
              onSuccess={(addedDate) => {
                setRefreshKey((k) => k + 1);
                if (addedDate) {
                  setSelectedDate(addedDate);
                }
              }}
            />
          )}

          <ManagePortalsDialog
            open={managePortalsOpen}
            onOpenChange={(open) => {
              setManagePortalsOpen(open);
              if (!open) setPortalsRefreshKey((k) => k + 1);
            }}
          />

          <UploadPayoutDialog
            userId={user.id}
            open={uploadOpen}
            onOpenChange={(open) => {
              setUploadOpen(open);
              if (!open) setRefreshKey((k) => k + 1);
            }}
          />
        </motion.div>
      </PullToRefresh>
      <FloatingActionButton onClick={() => setIsDialogOpen(true)} />
    </DashboardLayout>
  );
};

export default Transactions;
