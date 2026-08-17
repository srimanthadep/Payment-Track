import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense, ExpenseStats } from "@/services/expensesService";
import { 
  Users, 
  Store, 
  Fuel, 
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";

interface ExpenseStatsCardsProps {
  stats: ExpenseStats;
  filteredExpenses: Expense[];
  selectedDateLabel?: string;
}

export const ExpenseStatsCards = ({
  stats,
  filteredExpenses,
  selectedDateLabel = "Selected Period",
}: ExpenseStatsCardsProps) => {
  // Compute grouped totals from filtered expenses
  let workerTotal = 0;
  let shopTotal = 0;
  let petrolAndOtherTotal = 0;

  filteredExpenses.forEach((exp) => {
    const amt = Number(exp.amount) || 0;
    const catLower = (exp.category || "").toLowerCase();
    if (catLower.includes("worker") || catLower.includes("salary")) {
      workerTotal += amt;
    } else if (
      catLower.includes("shop") ||
      catLower.includes("rent") ||
      catLower.includes("bill") ||
      catLower.includes("current")
    ) {
      shopTotal += amt;
    } else {
      petrolAndOtherTotal += amt;
    }
  });

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const cards = [
    {
      title: `Total Expenses (${selectedDateLabel})`,
      value: totalFiltered,
      icon: Wallet,
      gradient: "from-red-500 to-red-600",
    },
    {
      title: "Worker Salaries",
      value: workerTotal,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Shop Rent & Bills",
      value: shopTotal,
      icon: Store,
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: "Petrol & Overheads",
      value: petrolAndOtherTotal,
      icon: Fuel,
      gradient: "from-amber-500 to-amber-600",
    },
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="overflow-hidden relative shadow-sm border-border/80">
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
                <div className="text-lg sm:text-2xl font-bold tracking-tight">
                  {formatCurrency(card.value)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                  Updated in real-time
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
