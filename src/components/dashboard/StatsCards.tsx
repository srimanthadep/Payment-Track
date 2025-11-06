import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StatsCardsProps {
  userId: string;
}

interface Stats {
  totalWithdrawals: number;
  totalRepayments: number;
  totalCommissions: number;
  totalProfit: number;
}

type Period = "daily" | "weekly" | "monthly" | "all";

export const StatsCards = ({ userId }: StatsCardsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalWithdrawals: 0,
    totalRepayments: 0,
    totalCommissions: 0,
    totalProfit: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("all");

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
        ?.filter((t) => t.transaction_type === "withdrawal")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const repayments = transactions
        ?.filter((t) => t.transaction_type === "repayment")
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
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
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
      icon: DollarSign,
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
      <div className="flex justify-end">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="overflow-hidden relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                ) : (
                  formatCurrency(card.value)
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Updated in real-time
              </p>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
};
