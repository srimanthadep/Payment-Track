import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip as RadixTooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  CalendarDays,
  Lock,
  Zap,
  Sliders,
  BarChart3,
  PieChart,
  HelpCircle,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  IndianRupee,
  Activity,
  Wallet,
  Percent,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import {
  calculateEnsembleForecast,
  generateDailyTrajectoryPoints,
  calculateDetailedBreakdowns,
  TransactionRecord,
  ExpenseRecord,
  EnsembleForecastResult,
} from "@/utils/forecastingEngine";

interface PredictionsDetailViewProps {
  transactions: TransactionRecord[];
  expenses: ExpenseRecord[];
  currentMonthRevenue: number;
  currentMonthExpenses: number;
  currentMonthProfit: number;
  currentMonthVolume: number;
  transactionCount: number;
  currentMonthTransactions: TransactionRecord[];
}

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const formatINRShort = (n: number) => {
  const num = Number(n || 0);
  if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
};

const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const PredictionsDetailView: React.FC<PredictionsDetailViewProps> = ({
  transactions,
  expenses,
  currentMonthRevenue,
  currentMonthExpenses,
  currentMonthProfit,
  currentMonthVolume,
  transactionCount,
  currentMonthTransactions,
}) => {
  const [whatIfPercent, setWhatIfPercent] = useState<number>(0);

  // Core ensemble forecast
  const forecast: EnsembleForecastResult = useMemo(() => {
    return calculateEnsembleForecast({
      allTransactions: transactions,
      allExpenses: expenses,
      currentMonthRevenue,
      currentMonthExpenses,
      currentMonthProfit,
      currentMonthVolume,
      currentMonthTxCount: transactionCount,
    });
  }, [
    transactions,
    expenses,
    currentMonthRevenue,
    currentMonthExpenses,
    currentMonthProfit,
    currentMonthVolume,
    transactionCount,
  ]);

  // Trajectory points for chart
  const trajectoryData = useMemo(() => {
    return generateDailyTrajectoryPoints(forecast, transactions, expenses);
  }, [forecast, transactions, expenses]);

  // Portal & type breakdowns
  const { portalBreakdown } = useMemo(() => {
    return calculateDetailedBreakdowns(forecast, currentMonthTransactions, transactions);
  }, [forecast, currentMonthTransactions, transactions]);

  // What-If simulated profit calculation
  const simulatedProjectedProfit = useMemo(() => {
    const remainingAdjusted = forecast.projectedRemainingProfit * (1 + whatIfPercent / 100);
    return Math.round(forecast.actualProfit + remainingAdjusted);
  }, [forecast, whatIfPercent]);

  const simulatedDifference = simulatedProjectedProfit - forecast.projectedProfit;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4 sm:space-y-6">
        {/* 1. Main Run-Rate Forecast Card (Matches system UI) */}
        <Card className="border border-border/70 shadow-xs overflow-hidden">
          <CardHeader className="p-3.5 sm:p-6 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Clean Executive Forecasting Emblem */}
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>

                <div className="space-y-0.5">
                  <CardTitle className="text-sm sm:text-lg font-bold tracking-tight">
                    Monthly Profit & Run-Rate Forecast
                  </CardTitle>
                  <CardDescription className="text-[11px] sm:text-xs text-muted-foreground">
                    AI & velocity projection for {format(new Date(), "MMMM yyyy")}
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto flex-wrap">
                <RadixTooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 font-semibold rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-1 sm:gap-1.5 cursor-help"
                    >
                      <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{forecast.accuracyScore}% Accuracy</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-xs p-3">
                    <p className="font-semibold text-foreground mb-1">
                      Ensemble Reliability: {forecast.accuracyScore}%
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {forecast.accuracyExplanation}
                    </p>
                  </TooltipContent>
                </RadixTooltip>

                <Badge
                  variant="outline"
                  className="text-[10px] sm:text-xs bg-muted/40 font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border-border/80 text-muted-foreground"
                >
                  Day {forecast.dayOfMonth}/{forecast.totalDaysInMonth} ({forecast.monthProgress}%)
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-5 p-3.5 sm:p-6 pt-0 sm:pt-0">
            {/* Executive Split Hero Box */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/5 via-card to-emerald-500/5 border border-primary/20 shadow-xs">
              {/* Left Column: Primary Metric & Velocity */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-2.5 sm:space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Projected Month-End Net Profit
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Pace
                    </span>
                  </div>
                  <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight mt-1 sm:mt-1.5">
                    {formatINR(forecast.projectedProfit)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                  <RadixTooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 cursor-help">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Run-rate: {formatINR(forecast.dailyProfitRunRate)}/day
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs p-2">
                      Actual profit divided by {forecast.dayOfMonth} elapsed days
                    </TooltipContent>
                  </RadixTooltip>

                  <RadixTooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-medium text-muted-foreground bg-card border border-border/70 cursor-help shadow-2xs">
                        <span>Expected:</span>
                        <span className="font-semibold text-foreground">
                          {formatINRShort(forecast.profitConfidenceLow)} – {formatINRShort(forecast.profitConfidenceHigh)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs p-2.5 max-w-xs">
                      Confidence Interval (±{formatINR(forecast.profitMarginOfError)}) based on transaction volatility
                    </TooltipContent>
                  </RadixTooltip>
                </div>
              </div>

              {/* Right Column: Actuals vs Remaining Breakdown Card */}
              <div className="lg:col-span-5 flex flex-col justify-between p-3 sm:p-4 rounded-xl bg-card border border-border/70 shadow-2xs space-y-2.5 sm:space-y-3">
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px] sm:text-xs">
                      <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" />
                      Capital Fulfillment
                    </span>
                    <span className="font-bold text-foreground text-[11px] sm:text-xs">
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
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground">Locked In</span>
                    <div className="text-xs sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(forecast.actualProfit)}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground block">{forecast.dayOfMonth} days locked</span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground">Projected Rest</span>
                    <div className="text-xs sm:text-base font-bold text-foreground">
                      {formatINR(forecast.projectedRemainingProfit)}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground block">{forecast.daysRemaining} days left</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Portal Profit Breakdown Cards - 2 IN A ROW ON MOBILE */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Estimated Profit Breakdown by Portal
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                  {portalBreakdown.length > 0 ? `${portalBreakdown.length} active portals` : "All Portals Combined"}
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 items-stretch">
                {/* 1. Total Estimated Net Profit Card */}
                <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-2 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <div className="p-1 sm:p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xs shrink-0">
                          <Wallet className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-semibold text-foreground truncate">Total Est. Profit</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 shrink-0 hidden sm:inline-flex"
                      >
                        All Portals
                      </Badge>
                    </div>

                    <div className="text-base sm:text-xl lg:text-2xl font-extrabold text-foreground tracking-tight mt-1 sm:mt-1.5 truncate">
                      {formatINR(forecast.projectedProfit)}
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-1.5 pt-1.5 border-t border-border/50 text-[10px] sm:text-[11px] text-muted-foreground">
                    <div className="flex justify-between items-center">
                      <span>Booked:</span>
                      <span className="font-semibold text-foreground truncate ml-1">{formatINRShort(forecast.actualProfit)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Revenue:</span>
                      <span className="font-semibold text-primary truncate ml-1">{formatINRShort(forecast.projectedRevenue)}</span>
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
                        className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-2 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between h-full"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                              <div
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br ${grad} text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold shadow-xs shrink-0`}
                              >
                                {portal.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[11px] sm:text-xs font-semibold text-foreground truncate max-w-[85px] sm:max-w-[120px]" title={portal.name}>
                                {portal.name}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0"
                            >
                              {portal.sharePercent}%
                            </Badge>
                          </div>

                          <div className="text-base sm:text-xl lg:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight mt-1 sm:mt-1.5 truncate">
                            {formatINR(portal.projectedAmount)}
                          </div>
                        </div>

                        <div className="space-y-1 sm:space-y-1.5 pt-1.5 border-t border-border/50 text-[10px] sm:text-[11px] text-muted-foreground">
                          <div className="flex justify-between items-center">
                            <span>Booked:</span>
                            <span className="font-semibold text-foreground truncate ml-1">{formatINRShort(portal.actualAmount)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Txns:</span>
                            <span className="font-medium text-foreground truncate ml-1">{portal.transactionCount} done</span>
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
                    <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Projected Revenue</span>
                      <div className="text-base sm:text-xl font-bold text-primary truncate">{formatINR(forecast.projectedRevenue)}</div>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground block truncate">Gross comm less fees</span>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Projected Turnover</span>
                      <div className="text-base sm:text-xl font-bold text-foreground truncate">{formatINR(forecast.projectedVolume)}</div>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground block truncate">{formatINR(forecast.dailyVolumeRunRate)}/day avg</span>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1.5 sm:space-y-2 flex flex-col justify-between h-full">
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">Projected Txns</span>
                      <div className="text-base sm:text-xl font-bold text-foreground truncate">{forecast.projectedTransactions} txns</div>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground block truncate">{forecast.daysRemaining} days remaining</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Progress Bar for Month */}
            <div className="space-y-1.5 sm:space-y-2 pt-1 border-t border-border/50">
              <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground">
                <span>Billing Cycle Completion</span>
                <span className="font-semibold text-foreground">{forecast.daysRemaining} days left</span>
              </div>
              <div className="w-full h-2 sm:h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${forecast.monthProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

      {/* 2. Standard KPI Cards Row (Matching Analytics.tsx global mobile style: 2 in a row) */}
      <div className="grid gap-2.5 sm:gap-4 grid-cols-2 lg:grid-cols-4 items-stretch">
        <Card className="overflow-hidden relative shadow-sm border-border/80 hover:shadow-md transition-shadow h-full flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-1 line-clamp-1">
              Forecasted Profit
            </CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xs flex-shrink-0">
              <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-base sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
              {formatINR(forecast.projectedProfit)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
              Booked: {formatINRShort(forecast.actualProfit)} ({Math.round((forecast.actualProfit / Math.max(forecast.projectedProfit, 1)) * 100)}%)
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative shadow-sm border-border/80 hover:shadow-md transition-shadow h-full flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-1 line-clamp-1">
              Forecasted Turnover
            </CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-xs flex-shrink-0">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-base sm:text-2xl font-bold tracking-tight truncate">
              {formatINR(forecast.projectedVolume)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
              Avg {formatINRShort(forecast.dailyVolumeRunRate)}/day
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative shadow-sm border-border/80 hover:shadow-md transition-shadow h-full flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-1 line-clamp-1">
              Forecasted Expenses
            </CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-xs flex-shrink-0">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-base sm:text-2xl font-bold tracking-tight text-red-500 truncate">
              {formatINR(forecast.projectedExpenses)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
              Booked: {formatINRShort(forecast.actualExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden relative shadow-sm border-border/80 hover:shadow-md transition-shadow h-full flex flex-col justify-between">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-1 line-clamp-1">
              Reliability Score
            </CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-xs flex-shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-base sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {forecast.accuracyScore}%
            </div>
            <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium truncate">
              Tier: {forecast.accuracyTier}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. 30-Day Cumulative Trajectory Chart (Matches Analytics.tsx chart style) */}
      <Card className="shadow-sm border-border/80">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                30-Day Cumulative Profit Trajectory
              </CardTitle>
              <CardDescription className="text-xs">
                Daily cumulative net profit with projected trajectory and expected confidence corridor
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-emerald-500" />
                Locked Actuals
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-blue-500" />
                Projected Path
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="w-full h-[260px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradActualTrajectory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradConfidenceBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(220, 80%, 50%)" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="hsl(220, 80%, 50%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md p-3 shadow-lg text-xs space-y-1">
                        <div className="font-semibold text-foreground flex justify-between gap-4 border-b border-border/50 pb-1">
                          <span>{d.dateLabel}</span>
                          <span className={d.isActual ? "text-emerald-500 font-semibold" : "text-primary font-semibold"}>
                            {d.isActual ? "Locked Actual" : "Ensemble Projection"}
                          </span>
                        </div>
                        {d.isActual ? (
                          <div className="flex justify-between gap-4 text-emerald-600 font-medium pt-1">
                            <span>Actual Cumulative:</span>
                            <span>{formatINR(d.actualCumulativeProfit)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between gap-4 text-blue-600 font-medium pt-1">
                              <span>Projected Cumulative:</span>
                              <span>{formatINR(d.projectedCumulativeProfit)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-muted-foreground text-[10px]">
                              <span>Expected Range:</span>
                              <span>{formatINR(d.confidenceLow)} – {formatINR(d.confidenceHigh)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between gap-4 text-muted-foreground text-[10px] pt-1 border-t border-border/40">
                          <span>Daily Pace:</span>
                          <span>{formatINR(d.dailyProjectedProfit)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="confidenceHigh"
                  stroke="transparent"
                  fill="url(#gradConfidenceBand)"
                />
                <Area
                  type="monotone"
                  dataKey="actualCumulativeProfit"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  fill="url(#gradActualTrajectory)"
                />
                <Line
                  type="monotone"
                  dataKey="projectedCumulativeProfit"
                  stroke="hsl(220, 80%, 50%)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 4. Seasonality & Scenario Simulator Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Day-of-Week Seasonality Decomposition */}
        <Card className="lg:col-span-2 shadow-sm border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Day-of-Week Seasonality Multipliers
            </CardTitle>
            <CardDescription className="text-xs">
              Historical activity indexed against average day (1.00x). Scaled across remaining days.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                const weight = forecast.dayOfWeekWeights[dow] || 1.0;
                const isAboveAverage = weight >= 1.0;
                const isWeekend = dow === 0 || dow === 6;

                return (
                  <div
                    key={dow}
                    className={`p-2 sm:p-3 rounded-xl border text-center space-y-0.5 sm:space-y-1 ${
                      isWeekend ? "bg-muted/20 border-border/50" : "bg-card border-border/80 shadow-xs"
                    }`}
                  >
                    <div className="text-[11px] sm:text-xs font-semibold text-foreground">{DOW_SHORT[dow]}</div>
                    <div
                      className={`text-base sm:text-lg font-bold ${
                        isAboveAverage
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {weight.toFixed(2)}x
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                      {isAboveAverage ? "Above avg" : "Below avg"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/50 flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
              <span>Calendar Composition:</span>
              <span className="font-semibold text-foreground">
                {forecast.remainingWeekdayCount} weekdays + {forecast.remainingWeekendCount} weekends remaining
              </span>
            </div>
          </CardContent>
        </Card>

        {/* What-If Scenario Simulator */}
        <Card className="shadow-sm border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Sliders className="h-4 w-4 text-amber-500" />
              What-If Simulator
            </CardTitle>
            <CardDescription className="text-xs">
              Simulate performance if daily pace shifts.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Velocity Adjustment:</span>
                <span
                  className={`font-bold ${
                    whatIfPercent > 0
                      ? "text-emerald-600"
                      : whatIfPercent < 0
                      ? "text-red-500"
                      : "text-foreground"
                  }`}
                >
                  {whatIfPercent > 0 ? `+${whatIfPercent}%` : `${whatIfPercent}%`}
                </span>
              </div>
              <Slider
                value={[whatIfPercent]}
                min={-30}
                max={50}
                step={5}
                onValueChange={(val) => setWhatIfPercent(val[0])}
                className="py-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>-30%</span>
                <span>Baseline (0%)</span>
                <span>+50%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-1">
              <div className="text-xs text-muted-foreground">Simulated Month-End Profit:</div>
              <div className="text-xl font-bold text-foreground">
                {formatINR(simulatedProjectedProfit)}
              </div>
              {whatIfPercent !== 0 && (
                <div
                  className={`text-[11px] font-semibold ${
                    simulatedDifference > 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {simulatedDifference > 0 ? "+" : ""}
                  {formatINR(simulatedDifference)} vs baseline
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => setWhatIfPercent(0)}
                disabled={whatIfPercent === 0}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => setWhatIfPercent(20)}
              >
                +20% Surge
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Payment Portal Contribution Table (Exact matching style of Analytics.tsx portal table) */}
      <Card className="shadow-sm border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                Payment Portal Projected Contribution
              </CardTitle>
              <CardDescription className="text-xs">
                Month-end profit projection across active payment portals
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20">
              {portalBreakdown.length} Portals
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {portalBreakdown.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No portal transactions recorded yet for this month.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Portal</th>
                    <th className="pb-2 text-right font-medium">Booked Profit</th>
                    <th className="pb-2 text-right font-medium">Projected Month-End</th>
                    <th className="pb-2 text-right font-medium">Projected Share</th>
                    <th className="pb-2 text-right font-medium">Txns So Far</th>
                  </tr>
                </thead>
                <tbody>
                  {portalBreakdown.map((p, i) => (
                    <tr
                      key={p.name}
                      className="border-b border-border/40 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-2.5 px-2 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          {p.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-muted-foreground">
                        {formatINR(p.actualAmount)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-emerald-600">
                        {formatINR(p.projectedAmount)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold">{p.sharePercent}%</span>
                          <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(100, p.sharePercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right text-muted-foreground">
                        {p.transactionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </TooltipProvider>
  );
};
