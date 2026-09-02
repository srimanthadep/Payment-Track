import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import {
  format,
  isToday,
  startOfWeek,
  endOfWeek,
  isThisWeek,
  startOfMonth,
  endOfMonth,
  isThisMonth,
} from "date-fns";

interface PortalComparisonProps {
  userId: string;
  period?: "daily" | "weekly" | "monthly" | "all";
  selectedDate?: Date | null;
}

interface PortalData {
  name: string;
  transactions: number;
  totalAmount: number;
  totalCommission: number;
  totalProfit: number;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export const PortalComparisonChart = ({
  userId,
  period = "daily",
  selectedDate,
}: PortalComparisonProps) => {
  const [chartData, setChartData] = useState<PortalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("transactions")
        .select("amount, commission, site_fee, profit, transaction_date, portals(name)")
        .eq("user_id", userId);

      // Apply date filter based on selectedDate and period
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
        const start = startOfWeek(activeDate, { weekStartsOn: 1 });
        const end = endOfWeek(activeDate, { weekStartsOn: 1 });
        query = query
          .gte("transaction_date", start.toISOString())
          .lte("transaction_date", end.toISOString());
      } else if (period === "monthly") {
        const start = startOfMonth(activeDate);
        const end = endOfMonth(activeDate);
        query = query
          .gte("transaction_date", start.toISOString())
          .lte("transaction_date", end.toISOString());
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Group by portal
      const portalMap: Record<string, PortalData> = {};

      transactions?.forEach((tx: any) => {
        const portalName = tx.portals?.name || "Unknown";
        if (!portalMap[portalName]) {
          portalMap[portalName] = {
            name: portalName,
            transactions: 0,
            totalAmount: 0,
            totalCommission: 0,
            totalProfit: 0,
          };
        }

        const profit =
          tx.profit !== undefined && tx.profit !== null
            ? Number(tx.profit)
            : Number(tx.commission || 0) - Number(tx.site_fee || 0);

        portalMap[portalName].transactions += 1;
        portalMap[portalName].totalAmount += Number(tx.amount || 0);
        portalMap[portalName].totalCommission += Number(tx.commission || 0);
        portalMap[portalName].totalProfit += profit;
      });

      const data = Object.values(portalMap).sort((a, b) => b.totalProfit - a.totalProfit);
      setChartData(data);
    } catch (error) {
      console.error("Error fetching portal comparison data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Live WebSocket Subscription
    const channel = supabase
      .channel("portal-comparison-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, period, selectedDate]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getPeriodLabel = () => {
    const activeDate = selectedDate || new Date();
    switch (period) {
      case "daily":
        return isToday(activeDate) ? "Today" : format(activeDate, "dd MMM");
      case "weekly": {
        if (isThisWeek(activeDate, { weekStartsOn: 1 })) return "This Week";
        const start = startOfWeek(activeDate, { weekStartsOn: 1 });
        const end = endOfWeek(activeDate, { weekStartsOn: 1 });
        return `${format(start, "dd MMM")} - ${format(end, "dd MMM")}`;
      }
      case "monthly": {
        if (isThisMonth(activeDate)) return "This Month";
        return format(activeDate, "MMM yyyy");
      }
      default:
        return "All Time";
    }
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-1">{payload[0].name}</p>
          <p className="text-xs text-muted-foreground">
            Profit: <span className="text-success font-medium">{formatCurrency(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ 
    cx, 
    cy, 
    midAngle, 
    innerRadius, 
    outerRadius, 
    percent, 
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg sm:text-xl">
            Portal Comparison ({getPeriodLabel()})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[250px] flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">No transaction data for {getPeriodLabel()}</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-center lg:items-start justify-between">
            {/* Left side: Pie Chart and Legend */}
            <div className="flex-1 min-w-0 space-y-3 w-full">
              {/* Pie Chart for Profit Distribution */}
              <div className="w-full h-[220px] sm:h-[280px] lg:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={70}
                      innerRadius={35}
                      fill="#8884d8"
                      dataKey="totalProfit"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                {chartData.map((portal, index) => (
                  <div key={portal.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs font-medium">{portal.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: Fixed-Width Summary Cards (1-3 portals: 1 col, 4+ portals: 2 cols) */}
            <div className="w-full lg:w-auto flex justify-center lg:justify-end items-start flex-shrink-0">
              <div
                className={
                  chartData.length >= 4
                    ? "grid grid-cols-2 gap-2 sm:gap-2.5"
                    : "grid grid-cols-1 gap-2 sm:gap-2.5"
                }
              >
                {chartData.map((portal, index) => (
                  <motion.div
                    key={portal.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-[150px] min-[400px]:w-[165px] sm:w-[175px] rounded-lg border p-2.5 bg-card/60 shadow-2xs flex flex-col justify-between hover:bg-card/90 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <p className="text-xs font-semibold truncate" title={portal.name}>
                        {portal.name}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground">Txns</span>
                        <span className="font-medium text-foreground">{portal.transactions}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-semibold text-foreground truncate ml-1">
                          {formatCurrency(portal.totalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t text-[10px]">
                        <span className="text-muted-foreground">Profit</span>
                        <span className="font-bold text-success truncate ml-1">
                          {formatCurrency(portal.totalProfit)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
