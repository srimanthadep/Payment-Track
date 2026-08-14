import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Activity, ArrowUp, ArrowDown } from "lucide-react";
import { RupeeIcon } from "@/components/icons/RupeeIcon";

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  totalProfit: number;
  activeUsers: number;
  transactionsToday: number;
  revenueToday: number;
  profitToday: number;
}

export const AdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    totalProfit: 0,
    activeUsers: 0,
    transactionsToday: 0,
    revenueToday: 0,
    profitToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Live Real-Time WebSockets for Admin Stats
    const channel = supabase
      .channel("admin-stats-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchStats();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get active users (users with transactions in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activeUsersData } = await supabase
        .from("transactions")
        .select("user_id")
        .gte("transaction_date", thirtyDaysAgo.toISOString());

      const uniqueActiveUsers = new Set(activeUsersData?.map(t => t.user_id) || []).size;

      // Get all transactions
      const { data: allTransactions, count: transactionCount } = await supabase
        .from("transactions")
        .select("commission, site_fee, transaction_date", { count: "exact" });

      // Calculate totals
      const totalRevenue = allTransactions?.reduce((sum, t) => sum + Number(t.commission || 0), 0) || 0;
      const totalProfit = allTransactions?.reduce((sum, t) => sum + (Number(t.commission || 0) - Number(t.site_fee || 0)), 0) || 0;

      // Get today's transactions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayTransactions } = await supabase
        .from("transactions")
        .select("commission, site_fee")
        .gte("transaction_date", today.toISOString());

      const transactionsToday = todayTransactions?.length || 0;
      const revenueToday = todayTransactions?.reduce((sum, t) => sum + Number(t.commission || 0), 0) || 0;
      const profitToday = todayTransactions?.reduce((sum, t) => sum + (Number(t.commission || 0) - Number(t.site_fee || 0)), 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        totalTransactions: transactionCount || 0,
        totalRevenue,
        totalProfit,
        activeUsers: uniqueActiveUsers,
        transactionsToday,
        revenueToday,
        profitToday,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      subtitle: `${stats.activeUsers} active (30 days)`,
    },
    {
      title: "Total Transactions",
      value: stats.totalTransactions,
      icon: Activity,
      gradient: "from-purple-500 to-purple-600",
      subtitle: `${stats.transactionsToday} today`,
    },
    {
      title: "Total Revenue",
      value: stats.totalRevenue,
      icon: RupeeIcon,
      gradient: "from-green-500 to-green-600",
      subtitle: `${formatCurrency(stats.revenueToday)} today`,
    },
    {
      title: "Total Profit",
      value: stats.totalProfit,
      icon: TrendingUp,
      gradient: "from-orange-500 to-orange-600",
      subtitle: `${formatCurrency(stats.profitToday)} today`,
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              <div className="h-6 w-6 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-6 w-24 bg-muted animate-pulse rounded mb-1" />
              <div className="h-2.5 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        const displayValue = card.title.includes("Revenue") || card.title.includes("Profit")
          ? formatCurrency(card.value)
          : card.value.toLocaleString();

        return (
          <Card key={card.title} className="overflow-hidden relative">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-2">
                {card.title}
              </CardTitle>
              <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${card.gradient} flex-shrink-0`}>
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg sm:text-2xl font-bold">{displayValue}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {card.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

