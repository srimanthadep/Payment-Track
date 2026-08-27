import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCards, Period } from "@/components/dashboard/StatsCards";
import { ProfitChart } from "@/components/dashboard/ProfitChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { PortalComparisonChart } from "@/components/dashboard/PortalComparisonChart";
import { DateSwitch } from "@/components/transactions/DateSwitch";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session) {
        navigate("/auth");
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    <DashboardLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 sm:space-y-6"
        >
          {/* Header with Title, DateSwitch, and Period Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Overview of your payment transactions and profits
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0">
              <DateSwitch
                selectedDate={selectedDate}
                onDateChange={(newDate) => {
                  setSelectedDate(newDate);
                  if (newDate) {
                    setPeriod("daily");
                  }
                }}
              />

              <Tabs
                value={period}
                onValueChange={(v) => setPeriod(v as Period)}
              >
                <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                  <TabsTrigger value="daily" className="text-xs sm:text-sm">
                    Daily
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs sm:text-sm">
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs sm:text-sm">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs sm:text-sm">
                    All Time
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
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
              key={`stats-${refreshKey}-${period}-${
                selectedDate ? selectedDate.toISOString() : "all"
              }`}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            <ProfitChart userId={user.id} key={`profit-${refreshKey}`} />
            <RecentTransactions
              userId={user.id}
              key={`recent-${refreshKey}`}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <PortalComparisonChart
              userId={user.id}
              period={period}
              selectedDate={selectedDate}
              key={`portal-${refreshKey}-${period}-${
                selectedDate ? selectedDate.toISOString() : "all"
              }`}
            />
          </motion.div>
        </motion.div>
      </PullToRefresh>
    </DashboardLayout>
  );
};

export default Dashboard;
