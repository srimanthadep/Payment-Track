import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandCoins, Wallet, AlertTriangle, Users } from "lucide-react";

interface DuesStatsCardsProps {
  totalOutstanding: number;
  totalRepaid: number;
  overdueCount: number;
  activeDuesCount: number;
}

const formatCurrency = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const DuesStatsCards = ({
  totalOutstanding,
  totalRepaid,
  overdueCount,
  activeDuesCount,
}: DuesStatsCardsProps) => {
  const cards = [
    {
      title: "Currently Outstanding",
      value: formatCurrency(totalOutstanding),
      icon: HandCoins,
      accent: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      title: "Total Repaid",
      value: formatCurrency(totalRepaid),
      icon: Wallet,
      accent: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Overdue Dues",
      value: String(overdueCount),
      icon: AlertTriangle,
      accent: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: "Active Borrowers",
      value: String(activeDuesCount),
      icon: Users,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="shadow-sm border-border/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-2">
                {card.title}
              </CardTitle>
              <div className={`p-1.5 sm:p-2 rounded-lg ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.accent}`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-lg sm:text-2xl font-bold tracking-tight ${card.accent}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
