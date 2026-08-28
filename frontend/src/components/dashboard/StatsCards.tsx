import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { RupeeIcon } from "@/components/icons/RupeeIcon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { format, isToday } from "date-fns";

export type Period = "daily" | "weekly" | "monthly" | "all";

interface StatsCardsProps {
  userId: string;
  period?: Period;
  selectedDate?: Date | null;
  onPeriodChange?: (period: Period) => void;
  showTabs?: boolean;
}

interface Stats {
  totalWithdrawals: number;
  totalRepayments: number;
  totalCommissions: number;
  totalProfit: number;
}

export const StatsCards = ({
  userId,
  period: controlledPeriod,
  selectedDate,
  onPeriodChange,
  showTabs = false,
}: StatsCardsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalWithdrawals: 0,
    totalRepayments: 0,
    totalCommissions: 0,
    totalProfit: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [internalPeriod, setInternalPeriod] = useState<Period>("daily");

  const period = controlledPeriod || internalPeriod;
  const setPeriod = (p: Period) => {
    setInternalPeriod(p);
    onPeriodChange?.(p);
  };

  useEffect(() => {
    let isCurrent = true;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("transactions")
          .select("transaction_type, amount, commission, site_fee, transaction_date")
          .eq("user_id", userId);

        const now = new Date();
        const activeDate = selectedDate || now;

        if (period === "daily") {
          const startOfDay = new Date(
            activeDate.getFullYear(),
            activeDate.getMonth(),
            activeDate.getDate(),
            0,
            0,
            0,
            0
          );
          const endOfDay = new Date(
            activeDate.getFullYear(),
            activeDate.getMonth(),
            activeDate.getDate(),
            23,
            59,
            59,
            999
          );
          query = query
            .gte("transaction_date", startOfDay.toISOString())
            .lte("transaction_date", endOfDay.toISOString());
        } else if (period === "weekly") {
          const dayOfWeek = now.getDay();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - dayOfWeek);
          startOfWeek.setHours(0, 0, 0, 0);
          query = query.gte("transaction_date", startOfWeek.toISOString());
        } else if (period === "monthly") {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          query = query.gte("transaction_date", startOfMonth.toISOString());
        }

        const { data: transactions, error } = await query;
        if (!isCurrent) return;

        if (error) {
          console.error("Error fetching stats:", error);
        } else {
          const withdrawals =
            transactions
              ?.filter((t) => t.transaction_type?.toLowerCase() === "withdrawal")
              .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

          const repayments =
            transactions
              ?.filter((t) => t.transaction_type?.toLowerCase() === "repayment")
              .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

          const commissions =
            transactions?.reduce(
              (sum, t) => sum + Number(t.commission || 0),
              0
            ) || 0;

          const profit =
            transactions?.reduce(
              (sum, t) => sum + (Number(t.commission || 0) - Number(t.site_fee || 0)),
              0
            ) || 0;

          setStats({
            totalWithdrawals: withdrawals,
            totalRepayments: repayments,
            totalCommissions: commissions,
            totalProfit: profit,
          });
        }
      } catch (err) {
        console.error("Error in fetchStats:", err);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    fetchStats();

    // Fallback timer ensures stats never get stuck loading
    const timer = setTimeout(() => {
      if (isCurrent) setIsLoading(false);
    }, 2000);

    // Realtime subscription
    const channel = supabase
      .channel("transactions-stats-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      isCurrent = false;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, period, selectedDate]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "daily": {
        const activeDate = selectedDate || new Date();
        return isToday(activeDate) ? "Today" : format(activeDate, "dd MMM");
      }
      case "weekly":
        return "This Week";
      case "monthly":
        return "This Month";
      default:
        return "All Time";
    }
  };

  const cards = [
    {
      title: `Total Withdrawals (${getPeriodLabel()})`,
      value: stats.totalWithdrawals,
      icon: ArrowDownCircle,
      gradient: "from-primary to-primary/70",
    },
    {
      title: `Total Repayments (${getPeriodLabel()})`,
      value: stats.totalRepayments,
      icon: ArrowUpCircle,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: `Total Commissions (${getPeriodLabel()})`,
      value: stats.totalCommissions,
      icon: RupeeIcon,
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: `Total Profit (${getPeriodLabel()})`,
      value: stats.totalProfit,
      icon: TrendingUp,
      gradient: "from-success to-success/70",
    },
  ];

  return (
    <div className="space-y-4">
      {showTabs && (
        <div className="flex justify-center sm:justify-end">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
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
      )}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 items-stretch">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full"
            >
              <Card className="overflow-hidden relative shadow-sm border-border/80 h-full flex flex-col justify-between">
                <div>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-2 min-h-[2rem] sm:min-h-[2.25rem] flex items-center">
                      {card.title}
                    </CardTitle>
                    <div
                      className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${card.gradient} flex-shrink-0`}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg sm:text-2xl font-bold">
                      {isLoading ? (
                        <div className="h-6 sm:h-8 w-20 sm:w-24 bg-muted animate-pulse rounded" />
                      ) : (
                        formatCurrency(card.value)
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Updated in real-time
                    </p>
                  </CardContent>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
