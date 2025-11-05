import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ProfitChartProps {
  userId: string;
}

type Period = "daily" | "weekly" | "monthly";

export const ProfitChart = ({ userId }: ProfitChartProps) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("daily");

  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true);
      
      // Calculate date range based on period
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

      if (error) {
        console.error("Error fetching chart data:", error);
        setIsLoading(false);
        return;
      }

      // Group by period
      let groupedData: any = {};

      transactions?.forEach((transaction) => {
        const date = new Date(transaction.transaction_date);
        let key: string;

        if (period === "daily") {
          key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } else if (period === "weekly") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        } else {
          // monthly
          key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        }

        if (!groupedData[key]) {
          groupedData[key] = {
            date: key,
            commission: 0,
            profit: 0,
          };
        }

        groupedData[key].commission += Number(transaction.commission || 0);
        groupedData[key].profit += Number(transaction.commission || 0);
      });

      const formattedData = Object.values(groupedData);
      setChartData(formattedData);
      setIsLoading(false);
    };

    fetchChartData();
  }, [userId, period]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
        <CardTitle>Profit Trends</CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="commission" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--success))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
