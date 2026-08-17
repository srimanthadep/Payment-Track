import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Expense } from "@/services/expensesService";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

interface ExpenseCategoryChartProps {
  expenses: Expense[];
}

const CATEGORY_COLORS = [
  "#3b82f6", // blue - worker salary
  "#6366f1", // indigo - worker exp
  "#f59e0b", // amber - petrol
  "#eab308", // yellow - current bill
  "#a855f7", // purple - shop rent
  "#10b981", // emerald - shop exp
  "#71717a", // zinc - others
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

export const ExpenseCategoryChart = ({ expenses }: ExpenseCategoryChartProps) => {
  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const categoryMap = new Map<string, { amount: number; count: number }>();
  expenses.forEach((e) => {
    const cat = e.category || "Others";
    const cur = categoryMap.get(cat) || { amount: 0, count: 0 };
    categoryMap.set(cat, {
      amount: cur.amount + (Number(e.amount) || 0),
      count: cur.count + 1,
    });
  });

  const chartData = Array.from(categoryMap.entries())
    .map(([name, val], i) => ({
      name,
      value: val.amount,
      count: val.count,
      percentage: total > 0 ? (val.amount / total) * 100 : 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Category Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of expenses across categories
            </CardDescription>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
            {chartData.length} Categories
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Chart visual */}
          <div className="md:col-span-5 h-[180px] sm:h-[200px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`₹${Number(value).toLocaleString("en-IN")}`, "Amount"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.75rem",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total</span>
              <span className="text-xs sm:text-sm font-bold">
                ₹{total > 100000 ? `${(total / 100000).toFixed(2)}L` : total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Progress list */}
          <div className="md:col-span-7 space-y-2.5">
            {chartData.slice(0, 6).map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate max-w-[140px] sm:max-w-[200px]">{item.name}</span>
                    <span className="text-muted-foreground text-[11px]">({item.count})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                    <span className="font-semibold">₹{item.value.toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <Progress value={item.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
