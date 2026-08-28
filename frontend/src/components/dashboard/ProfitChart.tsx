import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

interface ProfitChartProps {
  userId: string;
}

type Period = "daily" | "weekly" | "monthly";

interface ChartDataPoint {
  date: string;
  profit: number;
}

export const ProfitChart = ({ userId }: ProfitChartProps) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("daily");

  useEffect(() => {
    let isCurrent = true;

    const fetchChartData = async () => {
      setIsLoading(true);
      try {
        const now = new Date();
        let startDate: Date;
        let daysBack = 30;

        if (period === "daily") {
          daysBack = 7;
          startDate = new Date(now);
          startDate.setDate(now.getDate() - daysBack);
        } else if (period === "weekly") {
          daysBack = 84; // 12 weeks
          startDate = new Date(now);
          startDate.setDate(now.getDate() - daysBack);
        } else {
          // monthly
          daysBack = 365; // 12 months
          startDate = new Date(now);
          startDate.setDate(now.getDate() - daysBack);
        }

        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("transaction_date, commission, site_fee")
          .eq("user_id", userId)
          .gte("transaction_date", startDate.toISOString())
          .order("transaction_date", { ascending: true });

        if (!isCurrent) return;

        if (error) {
          console.error("Error fetching chart data:", error);
          setChartData([]);
        } else {
          // Generate all dates in range for better visualization
          const allDates: Date[] = [];
          const currentDate = new Date(startDate);
          
          while (currentDate <= now) {
            allDates.push(new Date(currentDate));
            if (period === "daily") {
              currentDate.setDate(currentDate.getDate() + 1);
            } else if (period === "weekly") {
              currentDate.setDate(currentDate.getDate() + 7);
            } else {
              currentDate.setMonth(currentDate.getMonth() + 1);
            }
          }

          // Group transactions by period
          const groupedData: Record<string, { profit: number }> = {};

          transactions?.forEach((transaction) => {
            const date = new Date(transaction.transaction_date);
            let key: string;
            let dateKey: Date;

            if (period === "daily") {
              dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              key = dateKey.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            } else if (period === "weekly") {
              const weekStart = new Date(date);
              weekStart.setDate(date.getDate() - date.getDay());
              weekStart.setHours(0, 0, 0, 0);
              dateKey = weekStart;
              key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            } else {
              dateKey = new Date(date.getFullYear(), date.getMonth(), 1);
              key = dateKey.toLocaleDateString("en-US", { month: "short", year: "numeric" });
            }

            if (!groupedData[key]) {
              groupedData[key] = {
                date: key,
                dateKey: dateKey.getTime(),
                profit: 0,
              };
            }

            groupedData[key].profit += Number(transaction.commission || 0);
          });

          // Fill in missing dates with zero values
          const formattedData = allDates.map((date) => {
            let key: string;
            let dateKey: Date;
            if (period === "daily") {
              dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              key = dateKey.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            } else if (period === "weekly") {
              const weekStart = new Date(date);
              weekStart.setDate(date.getDate() - date.getDay());
              weekStart.setHours(0, 0, 0, 0);
              dateKey = weekStart;
              key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            } else {
              dateKey = new Date(date.getFullYear(), date.getMonth(), 1);
              key = dateKey.toLocaleDateString("en-US", { month: "short", year: "numeric" });
            }

            return groupedData[key] || {
              date: key,
              dateKey: dateKey.getTime(),
              profit: 0,
            };
          });

          // Remove duplicates and sort
          const uniqueData = formattedData.reduce((acc: Array<ChartDataPoint & { dateKey: number }>, curr) => {
            const existing = acc.find((item) => item.date === curr.date);
            if (!existing) {
              acc.push(curr);
            } else {
              existing.profit += curr.profit;
            }
            return acc;
          }, []);

          uniqueData.sort((a, b) => a.dateKey - b.dateKey);
          setChartData(uniqueData);
        }
      } catch (err) {
        console.error("Error in fetchChartData:", err);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    fetchChartData();

    // Fallback timer ensures chart never stays stuck loading
    const timer = setTimeout(() => {
      if (isCurrent) setIsLoading(false);
    }, 2000);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [userId, period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: ChartDataPoint }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-card p-3 shadow-md">
          <p className="text-xs font-medium text-muted-foreground mb-1">{payload[0].payload.date}</p>
          <p className="text-sm font-semibold text-success">
            Profit: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-lg sm:text-xl">Profit Trends</CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-4 pt-0">
        {isLoading ? (
          <div className="h-[280px] sm:h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[280px] sm:h-[350px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="w-full h-[280px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--muted))" 
                  vertical={false}
                />
              <XAxis 
                dataKey="date" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickLine={{ stroke: "hsl(var(--muted))" }}
                  axisLine={{ stroke: "hsl(var(--muted))" }}
                  interval="preserveStartEnd"
              />
              <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickLine={{ stroke: "hsl(var(--muted))" }}
                  axisLine={{ stroke: "hsl(var(--muted))" }}
                  tickFormatter={(value) => formatCurrency(value)}
                  width={60}
              />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="hsl(var(--success))" 
                  strokeWidth={2.5}
                  fill="url(#colorProfit)"
                  dot={{ fill: "hsl(var(--success))", r: 3, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--success))" }}
              />
              </AreaChart>
          </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
};
