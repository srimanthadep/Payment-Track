import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCards, Period } from "@/components/dashboard/StatsCards";
import { ProfitChart } from "@/components/dashboard/ProfitChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { PortalComparisonChart } from "@/components/dashboard/PortalComparisonChart";
import { GoalProgressWidget } from "@/components/dashboard/GoalProgressWidget";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { DashboardFilterSheet } from "@/components/dashboard/DashboardFilterSheet";
import { DateSwitch } from "@/components/transactions/DateSwitch";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { profileService, UserProfile } from "@/services/profileService";
import { FilterState } from "@/components/transactions/TransactionFilters";
import { getCardTypeDisplayName } from "@/utils/commissionCalculator";
import { useRole } from "@/hooks/useRole";
import { dateSyncService } from "@/services/dateSyncService";
import { DailyProfitTracker } from "@/components/sidebar/DailyProfitTracker";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isStaff, isLoading: isRoleLoading } = useRole();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isRoleLoading && isStaff) {
      navigate("/transactions", { replace: true });
    }
  }, [isStaff, isRoleLoading, navigate]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => dateSyncService.getActiveDate() || new Date()
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [todayStats, setTodayStats] = useState({ count: 0, volume: 0 });
  const [heatmapTxns, setHeatmapTxns] = useState<any[]>([]);
  const [dashboardFilters, setDashboardFilters] = useState<FilterState>({
    dateRange: { from: null, to: null },
    portals: [],
    status: [],
    transactionType: [],
    cardTypes: [],
    amountRange: { min: null, max: null },
  });

  const filterKey = useMemo(() => JSON.stringify(dashboardFilters), [dashboardFilters]);

  // Filter heatmap transactions client-side based on dashboard filters
  const filteredHeatmapTxns = useMemo(() => {
    let filtered = [...heatmapTxns];

    if (dashboardFilters.portals && dashboardFilters.portals.length > 0) {
      filtered = filtered.filter((t) => dashboardFilters.portals.includes(t.portal_id));
    }
    if (dashboardFilters.status && dashboardFilters.status.length > 0) {
      filtered = filtered.filter((t) => dashboardFilters.status.includes(t.status));
    }
    if (dashboardFilters.transactionType && dashboardFilters.transactionType.length > 0) {
      const types = dashboardFilters.transactionType.map((x) => x.toLowerCase());
      filtered = filtered.filter((t) =>
        types.includes((t.transaction_type || "").toLowerCase())
      );
    }
    if (dashboardFilters.amountRange && dashboardFilters.amountRange.min !== null) {
      filtered = filtered.filter((t) => Number(t.amount || 0) >= dashboardFilters.amountRange.min!);
    }
    if (dashboardFilters.amountRange && dashboardFilters.amountRange.max !== null) {
      filtered = filtered.filter((t) => Number(t.amount || 0) <= dashboardFilters.amountRange.max!);
    }
    if (dashboardFilters.cardTypes && dashboardFilters.cardTypes.length > 0) {
      filtered = filtered.filter((t) => {
        if (!t.card_type) return false;
        const rawType = t.card_type.toLowerCase();
        const displayName = (getCardTypeDisplayName(t.card_type) || "").toLowerCase();
        return dashboardFilters.cardTypes.some((sel) => {
          const s = sel.toLowerCase();
          if (rawType === s || displayName === s) return true;
          if (s === "rupay" && (rawType.includes("rupay") || displayName.includes("rupay"))) return true;
          if (s === "visa" && (rawType.includes("visa") || displayName.includes("visa"))) return true;
          if (s === "mastercard" && (rawType.includes("master") || displayName.includes("master"))) return true;
          if (s === "business" && (rawType.includes("business") || displayName.includes("business"))) return true;
          if (s === "au_card" && (rawType.includes("au") || displayName.includes("au"))) return true;
          if (s === "amex_diners" && (rawType.includes("amex") || rawType.includes("diners") || displayName.includes("amex") || displayName.includes("diners"))) return true;
          if (s === "machine_swiping" && (rawType.includes("swip") || rawType.includes("machine") || displayName.includes("swip") || displayName.includes("machine"))) return true;
          return false;
        });
      });
    }
    if (dashboardFilters.dateRange?.from && dashboardFilters.dateRange?.to) {
      const from = new Date(dashboardFilters.dateRange.from);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dashboardFilters.dateRange.to);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => {
        const d = new Date(t.transaction_date);
        return d >= from && d <= to;
      });
    } else if (dashboardFilters.dateRange?.from) {
      const from = new Date(dashboardFilters.dateRange.from);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dashboardFilters.dateRange.from);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => {
        const d = new Date(t.transaction_date);
        return d >= from && d <= to;
      });
    }

    return filtered;
  }, [heatmapTxns, dashboardFilters]);

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    let mounted = true;

    // 1. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (!session && event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    // 2. Check for existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 3. Safety timeout fallback: guarantee that skeleton disappears within 1.5s
    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Ensure view always starts at the top of the page (showing Greeting & Top Section)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [isLoading]);

  // Fetch user profile for greeting
  useEffect(() => {
    if (user) {
      if (user.user_metadata?.full_name || user.user_metadata?.name) {
        setUserProfile({
          id: user.id,
          email: user.email,
          fullName: user.user_metadata.full_name || user.user_metadata.name,
        });
      }
    }
    profileService.getUserProfile().then((p) => {
      if (p) setUserProfile(p);
    });
  }, [user]);

  // Fetch today's quick stats for greeting subtitle
  useEffect(() => {
    if (!user) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .gte("transaction_date", startOfDay.toISOString())
      .lte("transaction_date", endOfDay.toISOString())
      .then(({ data }) => {
        if (data) {
          setTodayStats({
            count: data.length,
            volume: data.reduce((s, t) => s + Number(t.amount || 0), 0),
          });
        }
      });

    // Fetch last 30 days of transactions for heatmap
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    startOfDay.setHours(0, 0, 0, 0);
    supabase
      .from("transactions")
      .select("amount, profit, commission, site_fee, transaction_date, portal_id, transaction_type, card_type")
      .eq("user_id", user.id)
      .gte("transaction_date", thirtyDaysAgo.toISOString())
      .then(({ data }) => {
        if (data) setHeatmapTxns(data);
      });
  }, [user, refreshKey]);

  // Global Realtime WebSocket listener for live dashboard auto-refresh
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("dashboard-live-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setRefreshKey((k) => k + 1);
          if (payload.eventType === "INSERT") {
            const newTx = payload.new as any;
            toast({
              title: "⚡ Live Transaction Received",
              description: `₹${Number(newTx.amount).toLocaleString("en-IN")} ${newTx.transaction_type} just recorded`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout
      headerAction={
        <DashboardFilterSheet
          userId={user.id}
          filters={dashboardFilters}
          onFiltersChange={setDashboardFilters}
          variant="header"
        />
      }
    >
      <PullToRefresh onRefresh={handleRefresh}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 sm:space-y-6"
        >
          {/* Header with Greeting, DateSwitch, and Period Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {(() => {
                  const hour = new Date().getHours();
                  const name = userProfile?.fullName?.split(" ")[0] || "";
                  const greeting =
                    hour < 12
                      ? "Good Morning"
                      : hour < 18
                      ? "Good Afternoon"
                      : "Good Evening";
                  const emoji =
                    hour < 12 ? "🌅" : hour < 18 ? "☀️" : "🌙";
                  return `${greeting}${name ? `, ${name}` : ""} ${emoji}`;
                })()}
              </h1>
              <p className="text-sm text-muted-foreground">
                {todayStats.count > 0
                  ? `You've processed ${todayStats.count} transactions worth ₹${todayStats.volume.toLocaleString(
                      "en-IN"
                    )} today`
                  : "No transactions recorded yet today"}
              </p>
            </div>

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
                  setPeriod(v as Period);
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

              <div className="hidden lg:block">
                <DashboardFilterSheet
                  userId={user.id}
                  filters={dashboardFilters}
                  onFiltersChange={setDashboardFilters}
                />
              </div>
            </div>
          </div>

          {/* Mobile Progress Tracker (replaces Filters button on mobile screen) */}
          <div className="lg:hidden">
            <DailyProfitTracker />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <StatsCards
              userId={user.id}
              period={period}
              selectedDate={selectedDate}
              onPeriodChange={setPeriod}
              filters={dashboardFilters}
              key={`stats-${refreshKey}-${period}-${
                selectedDate ? selectedDate.toISOString() : "all"
              }-${filterKey}`}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            <ProfitChart
              userId={user.id}
              filters={dashboardFilters}
              key={`profit-${refreshKey}-${filterKey}`}
            />
            <RecentTransactions
              userId={user.id}
              filters={dashboardFilters}
              key={`recent-${refreshKey}-${filterKey}`}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            <div className="lg:col-span-2">
              <PortalComparisonChart
                userId={user.id}
                period={period}
                selectedDate={selectedDate}
                filters={dashboardFilters}
                key={`portal-${refreshKey}-${period}-${
                  selectedDate ? selectedDate.toISOString() : "all"
                }-${filterKey}`}
              />
            </div>
            <GoalProgressWidget
              userId={user.id}
              key={`goals-${refreshKey}`}
            />
          </motion.div>

          {/* Activity Heatmap Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <ActivityHeatmap
              transactions={filteredHeatmapTxns}
              selectedDate={period === "daily" ? selectedDate : null}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setPeriod("daily");
              }}
            />
          </motion.div>
        </motion.div>
      </PullToRefresh>
    </DashboardLayout>
  );
};

export default Dashboard;
