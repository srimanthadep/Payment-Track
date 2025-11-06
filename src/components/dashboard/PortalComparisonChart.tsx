import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

interface PortalComparisonProps {
  userId: string;
  period?: "daily" | "weekly" | "monthly" | "all";
}

interface PortalData {
  name: string;
  transactions: number;
  totalAmount: number;
  totalCommission: number;
  totalProfit: number;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export const PortalComparisonChart = ({ userId, period = "all" }: PortalComparisonProps) => {
  const [chartData, setChartData] = useState<PortalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId, period]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("transactions")
        .select("amount, commission, portals(name)")
        .eq("user_id", userId);

      // Apply date filter
      const now = new Date();
      let startDate: Date | null = null;

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

      if (startDate) {
        query = query.gte("transaction_date", startDate.toISOString());
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

        portalMap[portalName].transactions += 1;
        portalMap[portalName].totalAmount += Number(tx.amount || 0);
        portalMap[portalName].totalCommission += Number(tx.commission || 0);
        portalMap[portalName].totalProfit += Number(tx.commission || 0);
      });

      const data = Object.values(portalMap).sort((a, b) => b.totalProfit - a.totalProfit);
      setChartData(data);
    } catch (error) {
      console.error("Error fetching portal comparison data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portal Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portal Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Portal Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={{ stroke: "hsl(var(--muted))" }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={{ stroke: "hsl(var(--muted))" }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: "12px",
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="totalProfit" name="Profit" fill="hsl(var(--success))" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
            <Bar dataKey="totalCommission" name="Commission" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Portal</th>
                <th className="text-right p-2">Transactions</th>
                <th className="text-right p-2">Total Amount</th>
                <th className="text-right p-2">Total Profit</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((portal, index) => (
                <tr key={portal.name} className="border-b">
                  <td className="p-2 font-medium">{portal.name}</td>
                  <td className="text-right p-2">{portal.transactions}</td>
                  <td className="text-right p-2">{formatCurrency(portal.totalAmount)}</td>
                  <td className="text-right p-2 font-semibold text-success">
                    {formatCurrency(portal.totalProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

