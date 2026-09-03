import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Calendar,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  BarChart3,
  CalendarDays,
  Lock,
  ArrowRight,
  Layers,
  Sparkles,
  Info,
  Wallet,
  Globe,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import {
  calculateEnsembleForecast,
  calculateDetailedBreakdowns,
  TransactionRecord,
  ExpenseRecord,
} from "@/utils/forecastingEngine";

interface CashFlowForecastProps {
  currentMonthRevenue: number;
  currentMonthExpenses: number;
  currentMonthProfit: number;
  currentMonthVolume: number;
  transactionCount: number;
  allTransactions?: TransactionRecord[];
  allExpenses?: ExpenseRecord[];
  currentMonthTransactions?: TransactionRecord[];
  onViewDetailedPredictions?: () => void;
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
  allTransactions = [],
  allExpenses = [],
  currentMonthTransactions = [],
  onViewDetailedPredictions,
}: CashFlowForecastProps) => {
  const [showMethodology, setShowMethodology] = useState(false);

  // Compute the Ensemble Forecast
  const forecast = useMemo(() => {
    return calculateEnsembleForecast({
      allTransactions,
      allExpenses,
      currentMonthRevenue,
      currentMonthExpenses,
      currentMonthProfit,
      currentMonthVolume,
      currentMonthTxCount: transactionCount,
    });
  }, [
    allTransactions,
    allExpenses,
    currentMonthRevenue,
    currentMonthExpenses,
    currentMonthProfit,
    currentMonthVolume,
    transactionCount,
  ]);

  // Compute portal-level breakdown
  const { portalBreakdown } = useMemo(() => {
    return calculateDetailedBreakdowns(
      forecast,
      currentMonthTransactions,
      allTransactions
    );
  }, [forecast, currentMonthTransactions, allTransactions]);

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="border border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Clean Executive Forecasting Emblem */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <TrendingUp className="h-5 w-5" />
              </div>

              <div className="space-y-0.5">
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                  Monthly Profit & Run-Rate Forecast
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  AI & velocity projection for {format(new Date(), "MMMM yyyy")}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {onViewDetailedPredictions && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 gap-1 px-2.5"
                  onClick={onViewDetailedPredictions}
                >
                  <span>Detailed Predictions</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-xs px-2.5 py-1 font-semibold rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 cursor-help"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{forecast.accuracyScore}% Model Accuracy</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-xs p-3">
                  <p className="font-semibold text-foreground mb-1">
                    Ensemble Predictive Reliability: {forecast.accuracyScore}%
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {forecast.accuracyExplanation}
                  </p>
                </TooltipContent>
              </Tooltip>

              <Badge
                variant="outline"
                className="text-xs bg-muted/40 font-semibold px-2.5 py-1 rounded-full border-border/80 text-muted-foreground"
              >
                Day {forecast.dayOfMonth} of {forecast.totalDaysInMonth} ({forecast.monthProgress}%)
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-0">
          {/* Executive Split Hero Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-emerald-500/5 border border-primary/20 shadow-xs">
            {/* Left Column: Primary Metric & Velocity */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Projected Month-End Net Profit
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Pace
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight mt-1.5">
                  {formatINR(forecast.projectedProfit)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 cursor-help">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Run-rate: {formatINR(forecast.dailyProfitRunRate)}/day
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs p-2">
                    Actual profit divided by {forecast.dayOfMonth} elapsed days
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-muted-foreground bg-card border border-border/70 cursor-help shadow-2xs">
                      <span>Expected Range:</span>
                      <span className="font-semibold text-foreground">
                        {formatINR(forecast.profitConfidenceLow)} – {formatINR(forecast.profitConfidenceHigh)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs p-2.5 max-w-xs">
                    Confidence Interval (±{formatINR(forecast.profitMarginOfError)}) based on transaction volatility
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Right Column: Actuals vs Remaining Breakdown Card */}
            <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl bg-card border border-border/70 shadow-2xs space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-emerald-600" />
                    Capital Fulfillment
                  </span>
                  <span className="font-bold text-foreground">
                    {Math.round((forecast.actualProfit / Math.max(forecast.projectedProfit, 1)) * 100)}% Booked
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, Math.round((forecast.actualProfit / Math.max(forecast.projectedProfit, 1)) * 100)))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Locked In</span>
                  <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(forecast.actualProfit)}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">{forecast.dayOfMonth} days locked</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Projected Rest</span>
                  <div className="text-sm sm:text-base font-bold text-foreground">
                    {formatINR(forecast.projectedRemainingProfit)}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">{forecast.daysRemaining} days left</span>
                </div>
              </div>
            </div>
          </div>

        {/* Expandable Model Methodology & Breakdown */}
        {showMethodology && (
          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3.5 text-xs text-muted-foreground animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                Ensemble Forecast Architecture Breakdown
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold">
                Tier: {forecast.accuracyTier}
              </Badge>
            </div>

            <p className="text-[11px] leading-relaxed text-foreground/80">
              {forecast.accuracyExplanation}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-card border border-border/60 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" />
                  Locked Actuals (100% Certain)
                </div>
                <div className="text-foreground font-bold">{formatINR(forecast.actualProfit)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {forecast.dayOfMonth} days elapsed with zero variance error.
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border/60 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                  Remaining Calendar Weights
                </div>
                <div className="text-foreground font-bold">
                  {forecast.daysRemaining} days left
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {forecast.remainingWeekdayCount} weekdays, {forecast.remainingWeekendCount} weekends weighted dynamically.
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border/60 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                  Historical Prior Anchor
                </div>
                <div className="text-foreground font-bold">
                  {forecast.historicalDaysAnalyzed > 0
                    ? `${forecast.historicalDaysAnalyzed} days baseline`
                    : "Calibrating baseline"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Prevents early-month volatility spikes.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Portal Profit Breakdown Cards */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Estimated Profit Breakdown by Portal
            </span>
            <span className="text-[11px] text-muted-foreground">
              {portalBreakdown.length > 0 ? `${portalBreakdown.length} active portals` : "All Portals Combined"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Total Estimated Net Profit Card */}
            <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-2 hover:border-primary/40 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xs">
                    <Wallet className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Total Estimated Profit</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                >
                  All Portals
                </Badge>
              </div>

              <div className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                {formatINR(forecast.projectedProfit)}
              </div>

              <div className="space-y-1.5 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Booked Actuals:</span>
                  <span className="font-semibold text-foreground">{formatINR(forecast.actualProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Total Revenue:</span>
                  <span className="font-semibold text-primary">{formatINR(forecast.projectedRevenue)}</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((forecast.actualProfit / Math.max(forecast.projectedProfit, 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2, 3, 4... Portal Estimated Profit Cards */}
            {portalBreakdown.length > 0 ? (
              portalBreakdown.map((portal, index) => {
                const gradientColors = [
                  "from-blue-500 to-indigo-600",
                  "from-purple-500 to-violet-600",
                  "from-amber-500 to-orange-600",
                  "from-cyan-500 to-teal-600",
                  "from-rose-500 to-pink-600",
                ];
                const grad = gradientColors[index % gradientColors.length];

                return (
                  <div
                    key={portal.name}
                    className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-2 hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-lg bg-gradient-to-br ${grad} text-white flex items-center justify-center text-[10px] font-bold shadow-xs`}
                        >
                          {portal.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[120px]" title={portal.name}>
                          {portal.name}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
                      >
                        {portal.sharePercent}% Share
                      </Badge>
                    </div>

                    <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {formatINR(portal.projectedAmount)}
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Booked:</span>
                        <span className="font-semibold text-foreground">{formatINR(portal.actualAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transactions:</span>
                        <span className="font-medium text-foreground">{portal.transactionCount} completed</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, portal.sharePercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-2">
                  <span className="text-[11px] text-muted-foreground font-medium">Projected Revenue</span>
                  <div className="text-xl font-bold text-primary">{formatINR(forecast.projectedRevenue)}</div>
                  <span className="text-[10px] text-muted-foreground block">Gross commission less fees</span>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-2">
                  <span className="text-[11px] text-muted-foreground font-medium">Projected Turnover</span>
                  <div className="text-xl font-bold text-foreground">{formatINR(forecast.projectedVolume)}</div>
                  <span className="text-[10px] text-muted-foreground block">{formatINR(forecast.dailyVolumeRunRate)}/day avg</span>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-2">
                  <span className="text-[11px] text-muted-foreground font-medium">Projected Txns</span>
                  <div className="text-xl font-bold text-foreground">{forecast.projectedTransactions} transactions</div>
                  <span className="text-[10px] text-muted-foreground block">{forecast.daysRemaining} days remaining</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar for Month */}
        <div className="space-y-2 pt-1 border-t border-border/50">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Billing Cycle Completion</span>
            <span className="font-semibold text-foreground">
              {forecast.daysRemaining} days left ({forecast.monthProgress}% complete)
            </span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${forecast.monthProgress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </TooltipProvider>
  );
};
