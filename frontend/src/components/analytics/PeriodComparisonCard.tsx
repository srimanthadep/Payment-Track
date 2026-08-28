import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, TrendingUp, ArrowRightLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PeriodComparisonProps {
  currentMetrics: {
    volume: number;
    commission: number;
    siteFee: number;
    netRevenue: number;
    expenses: number;
    netProfit: number;
    count: number;
  };
  previousMetrics: {
    volume: number;
    commission: number;
    siteFee: number;
    netRevenue: number;
    expenses: number;
    netProfit: number;
    count: number;
  };
  periodLabel: string;
  previousPeriodLabel: string;
}

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

export const PeriodComparisonCard = ({
  currentMetrics,
  previousMetrics,
  periodLabel,
  previousPeriodLabel,
}: PeriodComparisonProps) => {
  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const volumeChange = calcChange(currentMetrics.volume, previousMetrics.volume);
  const netRevenueChange = calcChange(currentMetrics.netRevenue, previousMetrics.netRevenue);
  const netProfitChange = calcChange(currentMetrics.netProfit, previousMetrics.netProfit);
  const countChange = calcChange(currentMetrics.count, previousMetrics.count);

  const chartData = [
    {
      metric: "Volume (÷10k)",
      Current: Math.round(currentMetrics.volume / 10000),
      Previous: Math.round(previousMetrics.volume / 10000),
    },
    {
      metric: "Net Revenue",
      Current: Math.round(currentMetrics.netRevenue),
      Previous: Math.round(previousMetrics.netRevenue),
    },
    {
      metric: "Expenses",
      Current: Math.round(currentMetrics.expenses),
      Previous: Math.round(previousMetrics.expenses),
    },
    {
      metric: "Net Profit",
      Current: Math.round(currentMetrics.netProfit),
      Previous: Math.round(previousMetrics.netProfit),
    },
  ];

  const renderBadge = (change: number, reverse = false) => {
    const isPositive = reverse ? change <= 0 : change >= 0;
    const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
    const colorClass = isPositive
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800";

    return (
      <Badge className={`text-[11px] font-semibold gap-0.5 border ${colorClass}`}>
        <Icon className="h-3 w-3" />
        {Math.abs(change).toFixed(1)}%
      </Badge>
    );
  };

  return (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-4.5 w-4.5 text-primary" />
              Period Comparison: {periodLabel} vs {previousPeriodLabel}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Performance change compared to the preceding period
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* KPI Comparison Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Turnover Volume</span>
              {renderBadge(volumeChange)}
            </div>
            <div className="text-base sm:text-lg font-bold text-foreground">{formatINR(currentMetrics.volume)}</div>
            <div className="text-[11px] text-muted-foreground">
              vs {formatINR(previousMetrics.volume)} prev
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Net Revenue</span>
              {renderBadge(netRevenueChange)}
            </div>
            <div className="text-base sm:text-lg font-bold text-primary">{formatINR(currentMetrics.netRevenue)}</div>
            <div className="text-[11px] text-muted-foreground">
              vs {formatINR(previousMetrics.netRevenue)} prev
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Net Profit</span>
              {renderBadge(netProfitChange)}
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatINR(currentMetrics.netProfit)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              vs {formatINR(previousMetrics.netProfit)} prev
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs space-y-1.5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Transactions</span>
              {renderBadge(countChange)}
            </div>
            <div className="text-base sm:text-lg font-bold text-foreground">{currentMetrics.count} txns</div>
            <div className="text-[11px] text-muted-foreground">
              vs {previousMetrics.count} prev
            </div>
          </div>
        </div>

        {/* Grouped Comparative Bar Chart with Zero Background Shadow */}
        <div className="space-y-3 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Side-by-Side Performance Comparison
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                barGap={6}
                barCategoryGap={32}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis
                  dataKey="metric"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  formatter={(val: any, name: string) => [
                    `₹${Number(val).toLocaleString("en-IN")}`,
                    name === "Current" ? "Current Period" : "Previous Period",
                  ]}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    padding: "8px 12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  formatter={(value) => (value === "Current" ? "Current Period" : "Previous Period")}
                />
                <Bar
                  dataKey="Previous"
                  name="Previous"
                  fill="hsl(var(--muted-foreground)/0.35)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="Current"
                  name="Current"
                  fill="hsl(var(--primary))"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
