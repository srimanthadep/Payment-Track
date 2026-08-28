import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Calendar, Zap } from "lucide-react";
import { getDate, getDaysInMonth, format } from "date-fns";

interface CashFlowForecastProps {
  currentMonthRevenue: number;
  currentMonthExpenses: number;
  currentMonthProfit: number;
  currentMonthVolume: number;
  transactionCount: number;
}

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

export const CashFlowForecast = ({
  currentMonthRevenue,
  currentMonthExpenses,
  currentMonthProfit,
  currentMonthVolume,
  transactionCount,
}: CashFlowForecastProps) => {
  const forecast = useMemo(() => {
    const today = new Date();
    const dayOfMonth = Math.max(getDate(today), 1);
    const totalDaysInMonth = getDaysInMonth(today);
    const daysRemaining = totalDaysInMonth - dayOfMonth;

    // Daily averages
    const dailyRevenueAvg = currentMonthRevenue / dayOfMonth;
    const dailyExpensesAvg = currentMonthExpenses / dayOfMonth;
    const dailyProfitAvg = currentMonthProfit / dayOfMonth;
    const dailyVolumeAvg = currentMonthVolume / dayOfMonth;
    const dailyTxCountAvg = transactionCount / dayOfMonth;

    // Projected totals
    const projectedRevenue = dailyRevenueAvg * totalDaysInMonth;
    const projectedExpenses = dailyExpensesAvg * totalDaysInMonth;
    const projectedProfit = dailyProfitAvg * totalDaysInMonth;
    const projectedVolume = dailyVolumeAvg * totalDaysInMonth;
    const projectedTransactions = Math.round(dailyTxCountAvg * totalDaysInMonth);

    // Confidence ranges (±10%)
    const profitLow = projectedProfit * 0.9;
    const profitHigh = projectedProfit * 1.1;

    // Progress through current month (%)
    const monthProgress = Math.round((dayOfMonth / totalDaysInMonth) * 100);

    return {
      dayOfMonth,
      totalDaysInMonth,
      daysRemaining,
      monthProgress,
      dailyProfitAvg,
      dailyVolumeAvg,
      projectedRevenue,
      projectedExpenses,
      projectedProfit,
      projectedVolume,
      projectedTransactions,
      profitLow,
      profitHigh,
    };
  }, [currentMonthRevenue, currentMonthExpenses, currentMonthProfit, currentMonthVolume, transactionCount]);

  return (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-amber-500" />
              Monthly Profit & Run-Rate Forecast
            </CardTitle>
            <CardDescription className="text-xs">
              AI & velocity projection for {format(new Date(), "MMMM yyyy")}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs bg-card font-semibold px-2.5 py-1 border-border/80 self-start sm:self-auto">
            Day {forecast.dayOfMonth} of {forecast.totalDaysInMonth} ({forecast.monthProgress}%)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Main Projected Net Profit Highlight */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-card to-emerald-500/10 border border-primary/20 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Projected Month-End Net Profit
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Run-rate: {formatINR(forecast.dailyProfitAvg)}/day
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {formatINR(forecast.projectedProfit)}
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2 border-t border-border/50">
            <span>Expected Confidence Range:</span>
            <span className="font-semibold text-foreground">
              {formatINR(forecast.profitLow)} – {formatINR(forecast.profitHigh)}
            </span>
          </div>
        </div>

        {/* Projected Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs space-y-1 hover:border-primary/40 transition-colors">
            <span className="text-[11px] text-muted-foreground font-medium">Projected Turnover</span>
            <div className="text-sm sm:text-base font-bold text-foreground">{formatINR(forecast.projectedVolume)}</div>
            <span className="text-[10px] text-muted-foreground block">{formatINR(forecast.dailyVolumeAvg)}/day avg</span>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs space-y-1 hover:border-primary/40 transition-colors">
            <span className="text-[11px] text-muted-foreground font-medium">Projected Revenue</span>
            <div className="text-sm sm:text-base font-bold text-primary">{formatINR(forecast.projectedRevenue)}</div>
            <span className="text-[10px] text-muted-foreground block">Gross commission less fees</span>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs space-y-1 col-span-2 sm:col-span-1 hover:border-primary/40 transition-colors">
            <span className="text-[11px] text-muted-foreground font-medium">Projected Txns</span>
            <div className="text-sm sm:text-base font-bold text-foreground">{forecast.projectedTransactions} transactions</div>
            <span className="text-[10px] text-muted-foreground block">{forecast.daysRemaining} days remaining</span>
          </div>
        </div>

        {/* Progress Bar for Month */}
        <div className="space-y-2 pt-1 border-t border-border/50">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Billing Cycle Completion</span>
            <span className="font-semibold text-foreground">{forecast.daysRemaining} days left</span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${forecast.monthProgress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
