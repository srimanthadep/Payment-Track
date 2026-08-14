import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { RupeeIcon } from "@/components/icons/RupeeIcon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

interface StatsCardsProps {
  userId: string;
  period?: Period;
  onPeriodChange?: (period: Period) => void;
  showTabs?: boolean;
}

interface Stats {
  totalWithdrawals: number;
  totalRepayments: number;
  totalCommissions: number;
  totalProfit: number;
}

export type Period = "daily" | "weekly" | "monthly" | "all";

export const StatsCards = ({ userId, period: controlledPeriod, onPeriodChange, showTabs = false }: StatsCardsProps) => {
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
    const fetchStats = async () => {
      setIsLoading(true);
      
      let query = supabase
        .from("transactions")
        .select("transaction_type, amount, commission, site_fee, transaction_date")
        .eq("user_id", userId);

      // Apply date filter based on period
      const now = new Date();
      let startDate: Date;

      if (period === "daily") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === "weekly") {
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
      } else if (period === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (period !== "all" && startDate!) {
        query = query.gte("transaction_date", startDate.toISOString());
      }

      const { data: transactions, error } = await query;

      if (error) {
        console.error("Error fetching stats:", error);
        setIsLoading(false);
        return;
      }

      const withdrawals = transactions
        ?.filter((t) => t.transaction_type?.toLowerCase() === "withdrawal")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const repayments = transactions
        ?.filter((t) => t.transaction_type?.toLowerCase() === "repayment")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const commissions = transactions
        ?.reduce((sum, t) => sum + Number(t.commission || 0), 0) || 0;

      const profit = transactions
        ?.reduce((sum, t) => sum + Number(t.commission || 0), 0) || 0;

      setStats({
        totalWithdrawals: withdrawals,
        totalRepayments: repayments,
        totalCommissions: commissions,
        totalProfit: profit,
      });

      setIsLoading(false);
    };

    fetchStats();

    // Set up realtime subscription
    const channel = supabase
      .channel("transactions-changes")
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
      supabase.removeChannel(channel);
    };
  }, [userId, period]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "daily":
        return "Today";
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
      title: "Total Withdrawals",
      value: stats.totalWithdrawals,
      icon: ArrowDownCircle,
      gradient: "from-primary to-primary/70",
    },
    {
      title: "Total Repayments",
      value: stats.totalRepayments,
      icon: ArrowUpCircle,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Total Commissions",
      value: stats.totalCommissions,
      icon: RupeeIcon,
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: `${getPeriodLabel()} Profit`,
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
              <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
              <TabsTrigger value="all" className="text-xs sm:text-sm">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => {
        const Icon = card.icon;
        return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden relative">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-2">
                {card.title}
              </CardTitle>
                  <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${card.gradient} flex-shrink-0`}>
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
          </Card>
            </motion.div>
        );
      })}
      </div>
    </div>
  );
};
