import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilterState } from "@/components/transactions/TransactionFilters";
import { getCardTypeDisplayName } from "@/utils/commissionCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

interface ProfitChartProps {
  userId: string;
  filters?: FilterState;
}

type Period = "daily" | "weekly" | "monthly";

interface ChartDataPoint {
  date: string;
  profit: number;
}

export const ProfitChart = ({ userId, filters }: ProfitChartProps) => {
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
        let endDate: Date | null = null;
        let daysBack = 30;

        if (filters?.dateRange?.from || filters?.dateRange?.to) {
          startDate = filters.dateRange.from ? new Date(filters.dateRange.from) : new Date(0);
          startDate.setHours(0, 0, 0, 0);
          if (filters.dateRange.to) {
            endDate = new Date(filters.dateRange.to);
            endDate.setHours(23, 59, 59, 999);
          }
        } else if (period === "daily") {
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

        let query = supabase
          .from("transactions")
          .select("transaction_date, commission, site_fee, profit, portal_id, transaction_type, card_type, amount")
          .eq("user_id", userId)
          .gte("transaction_date", startDate.toISOString());

        if (endDate) {
          query = query.lte("transaction_date", endDate.toISOString());
        }

        const { data: transactions, error } = await query.order("transaction_date", { ascending: true });

        if (!isCurrent) return;

        if (error) {
          console.error("Error fetching chart data:", error);
          setChartData([]);
        } else {
          // Apply dashboard filters client-side
          let filtered = (transactions as any[]) || [];
          if (filters) {
            if (filters.portals && filters.portals.length > 0) {
              filtered = filtered.filter((t: any) => filters.portals.includes(t.portal_id));
            }
            if (filters.transactionType && filters.transactionType.length > 0) {
              const types = filters.transactionType.map((x: string) => x.toLowerCase());
              filtered = filtered.filter((t: any) =>
                types.includes((t.transaction_type || "").toLowerCase())
              );
            }
            if (filters.amountRange && filters.amountRange.min !== null) {
              filtered = filtered.filter((t: any) => Number(t.amount || 0) >= filters.amountRange.min!);
            }
            if (filters.amountRange && filters.amountRange.max !== null) {
              filtered = filtered.filter((t: any) => Number(t.amount || 0) <= filters.amountRange.max!);
            }
            if (filters.cardTypes && filters.cardTypes.length > 0) {
              filtered = filtered.filter((t: any) => {
                if (!t.card_type) return false;
                const rawType = t.card_type.toLowerCase();
                const displayName = (getCardTypeDisplayName(t.card_type) || "").toLowerCase();
                return filters.cardTypes.some((sel) => {
                  const s = sel.toLowerCase();
                  if (rawType === s || displayName === s) return true;
                  if (s === "rupay" && (rawType.includes("rupay") || displayName.includes("rupay"))) return true;
                  if (s === "visa" && (rawType.includes("visa") || displayName.includes("visa"))) return true;
                  if (s === "mastercard" && (rawType.includes("master") || displayName.includes("master"))) return true;
                  if (s === "business" && (rawType.includes("business") || displayName.includes("business"))) return true;
                  if (s === "au_card" && (rawType.includes("au") || displayName.includes("au"))) return true;
                  if (s === "amex_diners" && (rawType.includes("amex") || rawType.includes("diners") || displayName.includes("amex") || displayName.includes("diners"))) return true;
                  if (s === "machine_swiping" && (rawType.includes("swip") || rawType.includes("machine") || displayName.includes("swip") || displayName.includes("machine"))) return true;
                  return false;
                });
              });
            }
            if (filters.dateRange?.from && filters.dateRange?.to) {
              const from = new Date(filters.dateRange.from);
              from.setHours(0, 0, 0, 0);
              const to = new Date(filters.dateRange.to);
              to.setHours(23, 59, 59, 999);
              filtered = filtered.filter((t: any) => {
                const d = new Date(t.transaction_date);
                return d >= from && d <= to;
              });
            } else if (filters.dateRange?.from) {
              const from = new Date(filters.dateRange.from);
              from.setHours(0, 0, 0, 0);
              const to = new Date(filters.dateRange.from);
              to.setHours(23, 59, 59, 999);
              filtered = filtered.filter((t: any) => {
                const d = new Date(t.transaction_date);
                return d >= from && d <= to;
              });
            }
          }

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

          filtered.forEach((transaction) => {
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

            // Calculate true net profit: commission - site_fee (or profit column if explicitly present)
            const netProfit =
              transaction.profit !== undefined && transaction.profit !== null && !isNaN(Number(transaction.profit))
                ? Number(transaction.profit)
                : Number(transaction.commission || 0) - Number(transaction.site_fee || 0);

            groupedData[key].profit += netProfit;
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
  }, [userId, period, filters]);

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
