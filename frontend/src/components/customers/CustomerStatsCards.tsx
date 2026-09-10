import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerSummaryStats } from "@/services/customerService";
import { Users, IndianRupee, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface CustomerStatsCardsProps {
  stats: CustomerSummaryStats;
  filteredCount: number;
}

export const CustomerStatsCards = ({
  stats,
  filteredCount,
}: CustomerStatsCardsProps) => {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const cards = [
    {
      title: "Total Customers",
      value: stats.totalCustomers.toString(),
      isCurrency: false,
      subtitle: filteredCount !== stats.totalCustomers
        ? `Showing ${filteredCount} filtered`
        : "Active tracked clients",
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      title: "Customer Volume",
      value: formatCurrency(stats.totalCustomerVolume),
      isCurrency: true,
      subtitle: "Total transaction value",
      icon: IndianRupee,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      title: "Customer Profit",
      value: formatCurrency(stats.totalCustomerProfit),
      isCurrency: true,
      subtitle: "Gross profit generated",
      icon: TrendingUp,
      gradient: "from-purple-500 to-violet-600",
    },
    {
      title: "Avg Customer Value",
      value: formatCurrency(stats.avgCustomerLifetimeValue),
      isCurrency: true,
      subtitle: stats.topCustomer
        ? `Top: ${stats.topCustomer.name}`
        : "Average lifetime volume",
      icon: Sparkles,
      gradient: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="overflow-hidden relative shadow-sm border-border/80 hover:border-border transition-all">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-2 line-clamp-2">
                  {card.title}
                </CardTitle>
                <div
                  className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${card.gradient} flex-shrink-0 shadow-xs`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {card.value}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                  {card.subtitle}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
