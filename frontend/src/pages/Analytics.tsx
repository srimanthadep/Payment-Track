import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  IndianRupee, BarChart3, Wallet, Activity,
  Calendar, CreditCard, Target,
  Zap, PieChart as PieChartIcon, Globe,
  ArrowRightLeft, Shield, Crown, Trophy,
  Banknote, Receipt, Percent, ArrowDown, ArrowUp,
  Sparkles, ShieldCheck,
} from "lucide-react";
import { expensesService, Expense } from "@/services/expensesService";
import { PDFReportGenerator } from "@/components/analytics/PDFReportGenerator";
import { PeriodComparisonCard } from "@/components/analytics/PeriodComparisonCard";
import { CashFlowForecast } from "@/components/analytics/CashFlowForecast";
import { PredictionsDetailView } from "@/components/analytics/PredictionsDetailView";
import { calculateEnsembleForecast } from "@/utils/forecastingEngine";
import { DateSwitch } from "@/components/transactions/DateSwitch";
import {
  format,
  subDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  isToday,
  isYesterday,
  startOfWeek,
  endOfWeek,
  subWeeks,
  isThisWeek,
  isThisMonth,
} from "date-fns";

// --- Types ---
interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  commission: number;
  site_fee: number;
  profit?: number;
  card_type: string | null;
  transaction_date: string;
  portal_id?: string;
  portals?: {
    name: string;
  } | null;
}

type AnalyticsPeriod = "daily" | "weekly" | "monthly" | "all";

// --- Helper ---
const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatINRAxis = (n: number) => {
  const num = Number(n || 0);
  if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
};

const formatINRShort = (n: number) => {
  const num = Number(n || 0);
  if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
};

const CHART_COLORS = [
  "hsl(220, 80%, 50%)", "hsl(142, 76%, 36%)", "hsl(280, 65%, 55%)",
  "hsl(35, 95%, 55%)", "hsl(0, 84%, 60%)", "hsl(190, 80%, 45%)",
  "hsl(330, 70%, 55%)", "hsl(60, 80%, 45%)",
];

interface AnalyticsProps {
  defaultTab?: "overview" | "predictions";
}

// --- Page Component ---
const Analytics = ({ defaultTab }: AnalyticsProps = {}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView =
    searchParams.get("tab") === "predictions" || defaultTab === "predictions"
      ? "predictions"
      : "overview";

  const handleViewChange = (view: "overview" | "predictions") => {
    if (view === "predictions") {
      setSearchParams({ tab: "predictions" });
    } else {
      const p = new URLSearchParams(searchParams);
      p.delete("tab");
      setSearchParams(p);
    }
  };

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<AnalyticsPeriod>("daily");
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Current month aggregates dedicated for high-accuracy predictions
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const safeTx = Array.isArray(transactions) ? transactions : [];
    const safeExp = Array.isArray(expenses) ? expenses : [];

    const mTx = safeTx.filter((t) => {
      if (!t.transaction_date) return false;
      const d = new Date(t.transaction_date);
      return d >= start && d <= end;
    });

    const mExp = safeExp.filter((e) => {
      if (!e.expense_date) return false;
      const d = new Date(e.expense_date);
      return d >= start && d <= end;
    });

    const rev = mTx.reduce((s, t) => {
      const p =
        t.profit !== undefined
          ? Number(t.profit)
          : Number(t.commission || 0) - Number(t.site_fee || 0);
      return s + p;
    }, 0);

    const exp = mExp.reduce((s, e) => s + Number(e.amount || 0), 0);
    const profit = rev - exp;
    const vol = mTx.reduce((s, t) => s + Number(t.amount || 0), 0);

    return {
      transactions: mTx,
      expenses: mExp,
      revenue: rev,
      expensesTotal: exp,
      profit,
      volume: vol,
      count: mTx.length,
    };
  }, [transactions, expenses]);

  // Real-time forecast metrics for live accuracy indicator
  const liveForecast = useMemo(() => {
    return calculateEnsembleForecast({
      allTransactions: transactions,
      allExpenses: expenses,
      currentMonthRevenue: currentMonthData.revenue,
      currentMonthExpenses: currentMonthData.expensesTotal,
      currentMonthProfit: currentMonthData.profit,
      currentMonthVolume: currentMonthData.volume,
      currentMonthTxCount: currentMonthData.count,
    });
  }, [transactions, expenses, currentMonthData]);

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch data
  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const { data: txData, error: txError } = await supabase
          .from("transactions")
          .select(`
            id,
            transaction_type,
            amount,
            commission,
            site_fee,
            profit,
            card_type,
            transaction_date,
            portal_id,
            portals (
              name
            )
          `)
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: true });

        if (txError) {
          console.warn("Transactions query warning:", txError.message);
        }
        setTransactions(Array.isArray(txData) ? (txData as any) : []);

        const res = await expensesService.getExpenses(user.id);
        const expList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? (res as any) : [];
        setExpenses(expList);
      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  // Computed analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const safeTx = Array.isArray(transactions) ? transactions : [];
    const safeExp = Array.isArray(expenses) ? expenses : [];

    let filteredTx: Transaction[] = safeTx;
    let filteredExp: Expense[] = safeExp;
    let prevTx: Transaction[] = [];
    let prevExp: Expense[] = [];

    if (period === "daily") {
      const targetDate = selectedDate || now;
      filteredTx = safeTx.filter((t) => t.transaction_date && isSameDay(new Date(t.transaction_date), targetDate));
      filteredExp = safeExp.filter((e) => e.expense_date && isSameDay(new Date(e.expense_date), targetDate));
      const prevDate = subDays(targetDate, 1);
      prevTx = safeTx.filter((t) => t.transaction_date && isSameDay(new Date(t.transaction_date), prevDate));
      prevExp = safeExp.filter((e) => e.expense_date && isSameDay(new Date(e.expense_date), prevDate));
    } else if (period === "weekly") {
      const activeDate = selectedDate || now;
      const start = startOfWeek(activeDate, { weekStartsOn: 1 });
      const end = endOfWeek(activeDate, { weekStartsOn: 1 });
      filteredTx = safeTx.filter((t) => {
        if (!t.transaction_date) return false;
        const d = new Date(t.transaction_date);
        return d >= start && d <= end;
      });
      filteredExp = safeExp.filter((e) => {
        if (!e.expense_date) return false;
        const d = new Date(e.expense_date);
        return d >= start && d <= end;
      });
      const prevStart = subWeeks(start, 1);
      const prevEnd = subWeeks(end, 1);
      prevTx = safeTx.filter((t) => {
        if (!t.transaction_date) return false;
        const d = new Date(t.transaction_date);
        return d >= prevStart && d <= prevEnd;
      });
      prevExp = safeExp.filter((e) => {
        if (!e.expense_date) return false;
        const d = new Date(e.expense_date);
        return d >= prevStart && d <= prevEnd;
      });
    } else if (period === "monthly") {
      const activeDate = selectedDate || now;
      const start = startOfMonth(activeDate);
      const end = endOfMonth(activeDate);
      filteredTx = safeTx.filter((t) => {
        if (!t.transaction_date) return false;
        const d = new Date(t.transaction_date);
        return d >= start && d <= end;
      });
      filteredExp = safeExp.filter((e) => {
        if (!e.expense_date) return false;
        const d = new Date(e.expense_date);
        return d >= start && d <= end;
      });
      const prevMonth = subMonths(activeDate, 1);
      const prevStart = startOfMonth(prevMonth);
      const prevEnd = endOfMonth(prevMonth);
      prevTx = safeTx.filter((t) => {
        if (!t.transaction_date) return false;
        const d = new Date(t.transaction_date);
        return d >= prevStart && d <= prevEnd;
      });
      prevExp = safeExp.filter((e) => {
        if (!e.expense_date) return false;
        const d = new Date(e.expense_date);
        return d >= prevStart && d <= prevEnd;
      });
    }

    // --- KPI Cards ---
    const totalSiteFees = filteredTx.reduce((s, t) => s + Number(t.site_fee || 0), 0);
    const grossCommission = filteredTx.reduce((s, t) => s + Number(t.commission || 0), 0);
    // Actual Net Revenue = Gross Commission - Portal Site Fees
    const totalRevenue = filteredTx.reduce((s, t) => {
      const p = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
      return s + p;
    }, 0);
    const totalExpenses = filteredExp.reduce((s, e) => s + Number(e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalVolume = filteredTx.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalTxProfit = totalRevenue;
    const avgCommission = filteredTx.length > 0 ? totalRevenue / filteredTx.length : 0;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;
    const txCount = filteredTx.length;
    const avgTicketSize = txCount > 0 ? totalVolume / txCount : 0;
    const feeRetentionRate = grossCommission > 0 ? ((grossCommission - totalSiteFees) / grossCommission) * 100 : 0;

    // --- Transaction Types Breakdown ---
    const typeMap: Record<string, { name: string; value: number; count: number }> = {};
    filteredTx.forEach((t) => {
      const type = t.transaction_type || "Other";
      if (!typeMap[type]) typeMap[type] = { name: type, value: 0, count: 0 };
      typeMap[type].value += Number(t.amount || 0);
      typeMap[type].count += 1;
    });
    const typePie = Object.values(typeMap);

    // --- Previous period comparison ---
    let prevRevenue = 0;
    let prevExpenseTotal = 0;
    let prevVolume = 0;
    let prevTxCount = 0;
    let prevTxProfit = 0;
    if (prevTx.length > 0 || prevExp.length > 0) {
      prevRevenue = prevTx.reduce((s, t) => {
        const p = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
        return s + p;
      }, 0);
      prevVolume = prevTx.reduce((s, t) => s + Number(t.amount || 0), 0);
      prevTxCount = prevTx.length;
      prevTxProfit = prevRevenue;
      prevExpenseTotal = prevExp.reduce((s, e) => s + Number(e.amount || 0), 0);
    }

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const expenseGrowth = prevExpenseTotal > 0 ? ((totalExpenses - prevExpenseTotal) / prevExpenseTotal) * 100 : 0;
    const volumeGrowth = prevVolume > 0 ? ((totalVolume - prevVolume) / prevVolume) * 100 : 0;
    const profitGrowth = prevTxProfit > 0 ? ((totalTxProfit - prevTxProfit) / prevTxProfit) * 100 : 0;
    const txCountGrowth = prevTxCount > 0 ? ((txCount - prevTxCount) / prevTxCount) * 100 : 0;

    // --- Daily Revenue vs Expense trend ---
    const dailyMap: Record<string, { date: string; revenue: number; grossCommission: number; siteFee: number; expenses: number; profit: number; volume: number; count: number }> = {};
    filteredTx.forEach((t) => {
      if (!t.transaction_date) return;
      const key = format(new Date(t.transaction_date), "yyyy-MM-dd");
      if (!dailyMap[key]) dailyMap[key] = { date: key, revenue: 0, grossCommission: 0, siteFee: 0, expenses: 0, profit: 0, volume: 0, count: 0 };
      const netRev = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
      dailyMap[key].revenue += netRev;
      dailyMap[key].grossCommission += Number(t.commission || 0);
      dailyMap[key].siteFee += Number(t.site_fee || 0);
      dailyMap[key].volume += Number(t.amount || 0);
      dailyMap[key].count += 1;
    });
    filteredExp.forEach((e) => {
      if (!e.expense_date) return;
      const key = format(new Date(e.expense_date), "yyyy-MM-dd");
      if (!dailyMap[key]) dailyMap[key] = { date: key, revenue: 0, grossCommission: 0, siteFee: 0, expenses: 0, profit: 0, volume: 0, count: 0 };
      dailyMap[key].expenses += Number(e.amount || 0);
    });
    const revenueVsExpenseTrend = Object.values(dailyMap)
      .map((d) => ({ ...d, profit: d.revenue - d.expenses, label: format(new Date(d.date), "dd MMM") }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- Cumulative Profit Growth ---
    let cumulativeSum = 0;
    const cumulativeProfitData = revenueVsExpenseTrend.map((d) => {
      cumulativeSum += d.profit;
      return { ...d, cumulative: cumulativeSum };
    });

    // --- Daily Activity Volume Sparkline ---
    const dailyActivityData = revenueVsExpenseTrend.map((d) => ({
      label: d.label,
      date: d.date,
      volume: d.volume,
      count: d.count,
    }));

    // --- Card Type Breakdown ---
    const cardMap: Record<string, { name: string; volume: number; commission: number; siteFee: number; profit: number; count: number }> = {};
    filteredTx.forEach((t) => {
      const card = t.card_type || "Standard";
      if (!cardMap[card]) cardMap[card] = { name: card, volume: 0, commission: 0, siteFee: 0, profit: 0, count: 0 };
      cardMap[card].volume += Number(t.amount || 0);
      cardMap[card].commission += Number(t.commission || 0);
      cardMap[card].siteFee += Number(t.site_fee || 0);
      const p = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
      cardMap[card].profit += p;
      cardMap[card].count += 1;
    });
    const cardBreakdown = Object.values(cardMap).sort((a, b) => b.volume - a.volume);

    // Card Network Yield (margin %) for radar chart
    const cardYieldData = cardBreakdown.map((c) => ({
      name: c.name,
      yield: c.volume > 0 ? (c.profit / c.volume) * 100 : 0,
      commission: c.volume > 0 ? (c.commission / c.volume) * 100 : 0,
      feeRate: c.volume > 0 ? (c.siteFee / c.volume) * 100 : 0,
    }));

    // --- Expense Category Breakdown ---
    const expCatMap: Record<string, { name: string; amount: number; count: number }> = {};
    filteredExp.forEach((e) => {
      const cat = e.category || "General";
      if (!expCatMap[cat]) expCatMap[cat] = { name: cat, amount: 0, count: 0 };
      expCatMap[cat].amount += Number(e.amount || 0);
      expCatMap[cat].count += 1;
    });
    const expenseBreakdown = Object.values(expCatMap)
      .map((c) => ({ ...c, percentage: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);

    // --- Portal Performance Breakdown (with profit + site fee) ---
    const portalMap: Record<string, { name: string; volume: number; commission: number; siteFee: number; profit: number; count: number }> = {};
    filteredTx.forEach((t) => {
      const pName = t.portals?.name || "Direct";
      if (!portalMap[pName]) portalMap[pName] = { name: pName, volume: 0, commission: 0, siteFee: 0, profit: 0, count: 0 };
      portalMap[pName].volume += Number(t.amount || 0);
      portalMap[pName].commission += Number(t.commission || 0);
      portalMap[pName].siteFee += Number(t.site_fee || 0);
      const p = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
      portalMap[pName].profit += p;
      portalMap[pName].count += 1;
    });
    const portalBreakdown = Object.values(portalMap).sort((a, b) => b.volume - a.volume);

    // Portal Profitability Bar Data (Commission vs Site Fee vs Net Profit)
    const portalProfitBarData = portalBreakdown.map((p) => ({
      name: p.name,
      commission: p.commission,
      siteFee: p.siteFee,
      netProfit: p.profit,
      yield: p.volume > 0 ? (p.profit / p.volume) * 100 : 0,
    }));

    // --- Cash Flow / Capital Movement ---
    const withdrawals = filteredTx.filter(
      (t) => !t.transaction_type || t.transaction_type.toLowerCase() === "withdrawal"
    );
    const repayments = filteredTx.filter(
      (t) => t.transaction_type && t.transaction_type.toLowerCase() === "repayment"
    );
    const withdrawalVolume = withdrawals.reduce((s, t) => s + Number(t.amount || 0), 0);
    const repaymentVolume = repayments.reduce((s, t) => s + Number(t.amount || 0), 0);
    const netCapitalFlow = withdrawalVolume - repaymentVolume;

    // --- Top 5 Highest Value Transactions ---
    const top5ByAmount = [...filteredTx]
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        amount: Number(t.amount || 0),
        profit: t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0),
        portal: t.portals?.name || "Direct",
        card: t.card_type || "Standard",
        date: t.transaction_date ? format(new Date(t.transaction_date), "dd MMM yy") : "-",
        type: t.transaction_type || "Withdrawal",
      }));

    // --- Top 5 Most Profitable Transactions ---
    const top5ByProfit = [...filteredTx]
      .sort((a, b) => {
        const pA = a.profit !== undefined ? Number(a.profit) : Number(a.commission || 0) - Number(a.site_fee || 0);
        const pB = b.profit !== undefined ? Number(b.profit) : Number(b.commission || 0) - Number(b.site_fee || 0);
        return pB - pA;
      })
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        amount: Number(t.amount || 0),
        profit: t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0),
        portal: t.portals?.name || "Direct",
        card: t.card_type || "Standard",
        date: t.transaction_date ? format(new Date(t.transaction_date), "dd MMM yy") : "-",
        type: t.transaction_type || "Withdrawal",
      }));

    // --- Best and worst days ---
    const bestDay = revenueVsExpenseTrend.length > 0
      ? revenueVsExpenseTrend.reduce((best, d) => d.profit > best.profit ? d : best, revenueVsExpenseTrend[0])
      : null;
    const worstDay = revenueVsExpenseTrend.length > 0
      ? revenueVsExpenseTrend.reduce((worst, d) => d.profit < worst.profit ? d : worst, revenueVsExpenseTrend[0])
      : null;
    const peakVolumeDay = revenueVsExpenseTrend.length > 0
      ? revenueVsExpenseTrend.reduce((best, d) => d.volume > best.volume ? d : best, revenueVsExpenseTrend[0])
      : null;

    // --- Avg daily transactions ---
    const uniqueDays = new Set(
      filteredTx
        .filter((t) => t.transaction_date)
        .map((t) => format(new Date(t.transaction_date), "yyyy-MM-dd"))
    );
    const avgDailyTx = uniqueDays.size > 0 ? txCount / uniqueDays.size : 0;
    const avgDailyVolume = uniqueDays.size > 0 ? totalVolume / uniqueDays.size : 0;
    const avgDailyProfit = uniqueDays.size > 0 ? totalTxProfit / uniqueDays.size : 0;

    return {
      grossCommission, totalRevenue, totalExpenses, netProfit, totalVolume, totalSiteFees, totalTxProfit,
      avgCommission, profitMargin, txCount, avgTicketSize, feeRetentionRate,
      revenueGrowth, expenseGrowth, volumeGrowth, profitGrowth, txCountGrowth,
      revenueVsExpenseTrend, cardBreakdown, expenseBreakdown, portalBreakdown,
      typePie, bestDay, worstDay, peakVolumeDay, avgDailyTx, avgDailyVolume, avgDailyProfit,
      cumulativeProfitData, dailyActivityData, cardYieldData, portalProfitBarData,
      withdrawalVolume, repaymentVolume, netCapitalFlow, withdrawals, repayments,
      top5ByAmount, top5ByProfit,
      prevVolume, prevRevenue, prevExpenseTotal, prevTxCount, prevTxProfit,
    };
  }, [transactions, expenses, period, selectedDate]);

  if (isLoading || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const periodLabel = (() => {
    const activeDate = selectedDate || new Date();
    if (period === "all") return "All Time";
    if (period === "weekly") {
      const start = startOfWeek(activeDate, { weekStartsOn: 1 });
      const end = endOfWeek(activeDate, { weekStartsOn: 1 });
      if (isThisWeek(activeDate, { weekStartsOn: 1 })) {
        return `This Week (${format(start, "dd MMM")} – ${format(end, "dd MMM")})`;
      }
      return `${format(start, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
    }
    if (period === "monthly") {
      if (isThisMonth(activeDate)) {
        return `This Month (${format(activeDate, "MMM yyyy")})`;
      }
      return format(activeDate, "MMMM yyyy");
    }
    if (period === "daily" && selectedDate) {
      if (isToday(selectedDate)) return `Today, ${format(selectedDate, "dd MMM yyyy")}`;
      if (isYesterday(selectedDate)) return `Yesterday, ${format(selectedDate, "dd MMM yyyy")}`;
      return format(selectedDate, "dd MMM yyyy");
    }
    return "Daily";
  })();

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 max-w-7xl mx-auto"
      >
        {/* Top View Switcher & Sub-Header */}
        <div className="space-y-4 pb-2 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                  {activeView === "predictions" ? "Predictions & Forecasting" : "Analytics"}
                </h1>
                {activeView === "predictions" ? (
                  <Badge className="text-xs font-semibold px-2.5 py-0.5 rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{liveForecast.accuracyScore}% Accuracy</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20">
                    {periodLabel}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {activeView === "predictions"
                  ? "Multi-factor ensemble time-series projection with Day-of-Week Seasonality, 30-day Trajectory & What-If Simulator"
                  : "Complete business intelligence — revenue, expenses, profitability & trends"}
              </p>
              {user && activeView === "overview" && <PDFReportGenerator userId={user.id} />}
            </div>

            {/* View Switcher using standard shadcn Tabs */}
            <Tabs
              value={activeView}
              onValueChange={(v) => handleViewChange(v as "overview" | "predictions")}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-2 w-full sm:w-auto h-10 p-1 bg-muted/60 border border-border/60 rounded-xl overflow-hidden">
                <TabsTrigger
                  value="overview"
                  className="h-8 text-xs sm:text-sm flex items-center justify-center gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="predictions"
                  className="h-8 text-xs sm:text-sm flex items-center justify-center gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Predictions
                  <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    {liveForecast.accuracyScore}%
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Period selector (only for Overview) */}
          {activeView === "overview" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 pt-1 border-t border-border/40">
              <div className="text-xs text-muted-foreground font-medium hidden sm:block">
                Select Analysis Timeframe:
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {period !== "all" && (
                  <DateSwitch
                    period={period}
                    selectedDate={selectedDate}
                    onDateChange={(newDate) => {
                      setSelectedDate(newDate);
                    }}
                    className="w-full sm:w-auto"
                  />
                )}

                <Tabs
                  value={period}
                  onValueChange={(v) => {
                    setPeriod(v as AnalyticsPeriod);
                    if (!selectedDate && v !== "all") {
                      setSelectedDate(new Date());
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  <TabsList
                    className="grid grid-cols-4 w-full sm:w-auto"
                    onKeyDown={(e) => {
                      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                        e.stopPropagation();
                        e.preventDefault();
                      }
                    }}
                  >
                    <TabsTrigger
                      value="daily"
                      className="text-xs sm:text-sm"
                      onClick={(e) => (e.currentTarget as HTMLElement).blur()}
                    >
                      Daily
                    </TabsTrigger>
                    <TabsTrigger
                      value="weekly"
                      className="text-xs sm:text-sm"
                      onClick={(e) => (e.currentTarget as HTMLElement).blur()}
                    >
                      Weekly
                    </TabsTrigger>
                    <TabsTrigger
                      value="monthly"
                      className="text-xs sm:text-sm"
                      onClick={(e) => (e.currentTarget as HTMLElement).blur()}
                    >
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger
                      value="all"
                      className="text-xs sm:text-sm"
                      onClick={(e) => (e.currentTarget as HTMLElement).blur()}
                    >
                      All Time
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          )}
        </div>

        {/* --- Render Predictions View vs Overview View --- */}
        {activeView === "predictions" ? (
          <PredictionsDetailView
            transactions={transactions}
            expenses={expenses}
            currentMonthRevenue={currentMonthData.revenue}
            currentMonthExpenses={currentMonthData.expensesTotal}
            currentMonthProfit={currentMonthData.profit}
            currentMonthVolume={currentMonthData.volume}
            transactionCount={currentMonthData.count}
            currentMonthTransactions={currentMonthData.transactions}
          />
        ) : (
          <>

        {/* --- KPI Cards Row (with period-over-period growth on all) --- */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Actual Revenue",
              value: analytics.totalRevenue,
              icon: IndianRupee,
              gradient: "from-emerald-500 to-emerald-600",
              growth: analytics.revenueGrowth,
              subtitle: `Gross ₹${formatINRShort(analytics.grossCommission).replace("₹", "")} • Fees ₹${formatINRShort(analytics.totalSiteFees).replace("₹", "")}`,
            },
            {
              title: "Total Expenses",
              value: analytics.totalExpenses,
              icon: Wallet,
              gradient: "from-red-500 to-red-600",
              growth: analytics.expenseGrowth,
              subtitle: "All categories",
            },
            {
              title: "Net Profit",
              value: analytics.netProfit,
              icon: TrendingUp,
              gradient: analytics.netProfit >= 0 ? "from-blue-500 to-blue-600" : "from-red-500 to-rose-600",
              growth: analytics.profitGrowth,
              subtitle: `${analytics.profitMargin.toFixed(1)}% margin`,
            },
            {
              title: "Transaction Volume",
              value: analytics.totalVolume,
              icon: Activity,
              gradient: "from-purple-500 to-purple-600",
              growth: analytics.volumeGrowth,
              subtitle: `Avg ₹${formatINRShort(analytics.avgTicketSize).replace("₹", "")} ticket`,
            },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="overflow-hidden relative shadow-sm border-border/80 hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-2 line-clamp-1">
                      {card.title}
                    </CardTitle>
                    <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${card.gradient} flex-shrink-0 shadow-xs`}>
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg sm:text-2xl font-bold tracking-tight">
                      {formatINR(card.value)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {card.growth !== null && card.growth !== 0 && (
                        <span className={`inline-flex items-center text-[10px] sm:text-xs font-semibold ${card.growth > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {card.growth > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(card.growth).toFixed(1)}%
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        {card.subtitle}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Period-over-Period Comparison Card */}
        {period !== "all" && (
          <PeriodComparisonCard
            currentMetrics={{
              volume: analytics.totalVolume,
              commission: analytics.grossCommission,
              siteFee: analytics.totalSiteFees,
              netRevenue: analytics.totalRevenue,
              expenses: analytics.totalExpenses,
              netProfit: analytics.netProfit,
              count: analytics.txCount,
            }}
            previousMetrics={{
              volume: analytics.prevVolume,
              commission: analytics.prevRevenue,
              siteFee: 0,
              netRevenue: analytics.prevRevenue,
              expenses: analytics.prevExpenseTotal,
              netProfit: analytics.prevTxProfit - analytics.prevExpenseTotal,
              count: analytics.prevTxCount,
            }}
            periodLabel={periodLabel}
            previousPeriodLabel={
              period === "daily"
                ? "Previous Day"
                : period === "weekly"
                ? "Preceding 7 Days"
                : "Previous Month"
            }
          />
        )}

        {/* Monthly Run-Rate & Cash Flow Forecast */}
        <CashFlowForecast
          currentMonthRevenue={analytics.totalRevenue}
          currentMonthExpenses={analytics.totalExpenses}
          currentMonthProfit={analytics.netProfit}
          currentMonthVolume={analytics.totalVolume}
          transactionCount={analytics.txCount}
          allTransactions={transactions}
          allExpenses={expenses}
          currentMonthTransactions={currentMonthData.transactions}
          onViewDetailedPredictions={() => handleViewChange("predictions")}
        />

        {/* --- Cash Flow & Site Fee Efficiency Row --- */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Withdrawal Outflow */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card className="shadow-sm border-border/80 hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-xs">
                    <ArrowUp className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Withdrawal Outflow</span>
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight">{formatINRShort(analytics.withdrawalVolume)}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{analytics.withdrawals.length} transactions</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Repayment Inflow */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-sm border-border/80 hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-xs">
                    <ArrowDown className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Repayment Inflow</span>
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight">{formatINRShort(analytics.repaymentVolume)}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{analytics.repayments.length} transactions</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Net Capital Deployed */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="shadow-sm border-border/80 hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-xs">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Net Capital Flow</span>
                </div>
                <div className={`text-lg sm:text-xl font-bold tracking-tight ${analytics.netCapitalFlow >= 0 ? "" : "text-red-600"}`}>
                  {formatINRShort(analytics.netCapitalFlow)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Net {analytics.netCapitalFlow >= 0 ? "Outflow" : "Inflow"}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Fee Retention Rate */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card className="shadow-sm border-border/80 hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xs">
                    <Shield className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Fee Retention Rate</span>
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600">
                  {analytics.feeRetentionRate.toFixed(1)}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Fees: {formatINRShort(analytics.totalSiteFees)} / Gross: {formatINRShort(analytics.grossCommission)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* --- Revenue vs Expenses Trend --- */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <Card className="shadow-sm border-border/80">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Revenue vs Expenses
                  </CardTitle>
                  <CardDescription className="text-xs">Daily trend comparison for the selected period</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-emerald-500" />Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-red-500" />Expenses</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-500" />Profit</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="w-full h-[260px] sm:h-[320px]">
                {analytics.revenueVsExpenseTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.revenueVsExpenseTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatINRAxis} width={55} />
                      <Tooltip
                        cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div className="rounded-lg border bg-card p-3 shadow-none text-xs space-y-1">
                              <p className="font-semibold text-foreground">{d?.label}</p>
                              <p className="text-emerald-600">Revenue: {formatINR(d?.revenue || 0)}</p>
                              <p className="text-red-500">Expenses: {formatINR(d?.expenses || 0)}</p>
                              <p className={`font-bold ${(d?.profit || 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                                Profit: {formatINR(d?.profit || 0)}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
                      <Area type="monotone" dataKey="expenses" stroke="hsl(0, 84%, 60%)" strokeWidth={2} fill="url(#gradExpense)" dot={false} />
                      <Line type="monotone" dataKey="profit" stroke="hsl(220, 80%, 55%)" strokeWidth={2.5} strokeDasharray="6 3" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data for this period</div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* --- Cumulative Profit Growth + Daily Activity Volume --- */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Cumulative Profit Growth */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="shadow-sm border-border/80 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Cumulative Profit Growth
                </CardTitle>
                <CardDescription className="text-xs">Running total of net profit over time</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="w-full h-[240px] sm:h-[280px]">
                  {analytics.cumulativeProfitData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.cumulativeProfitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatINRAxis} width={55} />
                        <Tooltip
                          cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="rounded-lg border bg-card p-3 shadow-none text-xs space-y-1">
                                <p className="font-semibold text-foreground">{d?.label}</p>
                                <p className="text-emerald-600">Day Profit: {formatINR(d?.profit || 0)}</p>
                                <p className="font-bold text-blue-600">Cumulative: {formatINR(d?.cumulative || 0)}</p>
                              </div>
                            );
                          }}
                        />
                        <Area type="monotone" dataKey="cumulative" stroke="hsl(142, 76%, 36%)" strokeWidth={2.5} fill="url(#gradCumulative)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data for this period</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily Activity Volume Sparkline */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="shadow-sm border-border/80 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-purple-500" />
                  Daily Volume Velocity
                </CardTitle>
                <CardDescription className="text-xs">Transaction volume per day • peak day highlighted</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="w-full h-[240px] sm:h-[280px]">
                  {analytics.dailyActivityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.dailyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatINRAxis} width={55} />
                        <Tooltip
                          cursor={false}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="rounded-lg border bg-card p-3 shadow-none text-xs space-y-1">
                                <p className="font-semibold text-foreground">{d?.label}</p>
                                <p>Volume: {formatINR(d?.volume || 0)}</p>
                                <p className="text-muted-foreground">{d?.count} transactions</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="volume" fill="hsl(280, 65%, 55%)" radius={[4, 4, 0, 0]} opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data for this period</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* --- Middle Row: Pie Charts + Key Metrics --- */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Transaction Type Split */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="shadow-sm border-border/80 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                  Transaction Split
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.typePie.length > 0 ? (
                  <>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.typePie}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {analytics.typePie.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload;
                              return (
                                <div className="rounded-lg border bg-card p-2 shadow-none text-xs">
                                  <p className="font-semibold">{d?.name}</p>
                                  <p>{formatINR(d?.value || 0)} ({d?.count} txns)</p>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 text-xs mt-2">
                      {analytics.typePie.map((t, i) => (
                        <div key={t.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-muted-foreground">{t.name}</span>
                          <span className="font-semibold">{formatINRShort(t.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No transactions recorded</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Expense Category Pie */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="shadow-sm border-border/80 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-red-500" />
                  Expense Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.expenseBreakdown.length > 0 ? (
                  <>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.expenseBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="amount"
                          >
                            {analytics.expenseBreakdown.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload;
                              return (
                                <div className="rounded-lg border bg-card p-2 shadow-none text-xs">
                                  <p className="font-semibold">{d?.name}</p>
                                  <p>{formatINR(d?.amount || 0)} ({d?.percentage?.toFixed(1)}%)</p>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                      {analytics.expenseBreakdown.slice(0, 6).map((c, i) => (
                        <div key={c.name} className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="truncate text-muted-foreground">{c.name}</span>
                          <span className="font-semibold ml-auto">{c.percentage.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No expenses recorded</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Key Business Metrics */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="shadow-sm border-border/80 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Profit Margin", value: `${analytics.profitMargin.toFixed(1)}%`, icon: TrendingUp, color: analytics.profitMargin >= 0 ? "text-emerald-600" : "text-red-600" },
                  { label: "Avg Commission / Txn", value: formatINR(analytics.avgCommission), icon: IndianRupee, color: "text-blue-600" },
                  { label: "Fee Retention Rate", value: `${analytics.feeRetentionRate.toFixed(1)}%`, icon: Shield, color: "text-emerald-600" },
                  { label: "Avg Txn / Day", value: analytics.avgDailyTx.toFixed(1), icon: Calendar, color: "text-purple-600" },
                  { label: "Best Day Profit", value: analytics.bestDay ? formatINR(analytics.bestDay.profit) : "—", sublabel: analytics.bestDay ? analytics.bestDay.label : "", icon: Zap, color: "text-emerald-600" },
                  { label: "Peak Volume Day", value: analytics.peakVolumeDay ? formatINRShort(analytics.peakVolumeDay.volume) : "—", sublabel: analytics.peakVolumeDay ? analytics.peakVolumeDay.label : "", icon: Crown, color: "text-amber-600" },
                  { label: "Worst Day Profit", value: analytics.worstDay ? formatINR(analytics.worstDay.profit) : "—", sublabel: analytics.worstDay ? analytics.worstDay.label : "", icon: TrendingDown, color: "text-red-600" },
                  { label: "Avg Daily Volume", value: formatINRShort(analytics.avgDailyVolume), icon: Banknote, color: "text-indigo-600" },
                ].map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div key={metric.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${metric.color} flex-shrink-0`} />
                        <div>
                          <p className="text-xs text-muted-foreground">{metric.label}</p>
                          {(metric as any).sublabel && <p className="text-[10px] text-muted-foreground/70">{(metric as any).sublabel}</p>}
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${metric.color}`}>{metric.value}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* --- Portal Profitability Comparison (Bar Chart) --- */}
        {analytics.portalProfitBarData.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}>
            <Card className="shadow-sm border-border/80">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      Portal Profitability Comparison
                    </CardTitle>
                    <CardDescription className="text-xs">Commission vs Site Fee vs Net Profit per portal</CardDescription>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-emerald-500" />Commission</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-red-500" />Site Fee</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-500" />Net Profit</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="w-full h-[260px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.portalProfitBarData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatINRAxis} width={55} />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div className="rounded-lg border bg-card p-3 shadow-none text-xs space-y-1">
                              <p className="font-semibold text-foreground">{d?.name}</p>
                              <p className="text-emerald-600">Commission: {formatINR(d?.commission || 0)}</p>
                              <p className="text-red-500">Site Fee: {formatINR(d?.siteFee || 0)}</p>
                              <p className="font-bold text-blue-600">Net Profit: {formatINR(d?.netProfit || 0)}</p>
                              <p className="text-muted-foreground">Yield: {d?.yield?.toFixed(2)}%</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="commission" name="Commission" fill="hsl(142, 76%, 40%)" radius={[4, 4, 0, 0]} barSize={24} opacity={0.85} />
                      <Bar dataKey="siteFee" name="Site Fee" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} barSize={24} opacity={0.85} />
                      <Bar dataKey="netProfit" name="Net Profit" fill="hsl(220, 80%, 55%)" radius={[4, 4, 0, 0]} barSize={24} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* --- Card Type Performance + Card Network Yield Radar --- */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Card Type Performance Bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <Card className="shadow-sm border-border/80 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Card Type Performance
                </CardTitle>
                <CardDescription className="text-xs">Volume and commission by card network</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {analytics.cardBreakdown.length > 0 ? (
                  <div className="w-full h-[260px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.cardBreakdown} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatINRAxis} width={55} />
                        <Tooltip
                          cursor={false}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="rounded-lg border bg-card p-3 shadow-none text-xs space-y-1">
                                <p className="font-semibold text-foreground">{d?.name}</p>
                                <p>Volume: {formatINR(d?.volume || 0)}</p>
                                <p className="text-emerald-600">Commission: {formatINR(d?.commission || 0)}</p>
                                <p className="text-blue-600">Net Profit: {formatINR(d?.profit || 0)}</p>
                                <p className="text-muted-foreground">{d?.count} transactions</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="volume" name="Volume" fill="hsl(220, 80%, 55%)" radius={[6, 6, 0, 0]} barSize={28} opacity={0.85} />
                        <Bar dataKey="commission" name="Commission" fill="hsl(142, 76%, 40%)" radius={[6, 6, 0, 0]} barSize={28} opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No card type data available</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Card Network Yield Radar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}>
            <Card className="shadow-sm border-border/80 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Percent className="h-4 w-4 text-amber-500" />
                  Card Network Yield Analysis
                </CardTitle>
                <CardDescription className="text-xs">Net profit margin % by card type — higher = more profitable</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {analytics.cardYieldData.length > 0 ? (
                  <div className="w-full h-[260px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analytics.cardYieldData}>
                        <PolarGrid stroke="hsl(var(--muted))" />
                        <PolarAngleAxis
                          dataKey="name"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        />
                        <PolarRadiusAxis
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                        />
                        <Radar name="Net Yield %" dataKey="yield" stroke="hsl(142, 76%, 40%)" fill="hsl(142, 76%, 40%)" fillOpacity={0.3} strokeWidth={2} />
                        <Radar name="Commission %" dataKey="commission" stroke="hsl(220, 80%, 55%)" fill="hsl(220, 80%, 55%)" fillOpacity={0.15} strokeWidth={2} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="rounded-lg border bg-card p-3 shadow-none text-xs space-y-1">
                                <p className="font-semibold text-foreground">{d?.name}</p>
                                <p className="text-emerald-600">Net Yield: {d?.yield?.toFixed(2)}%</p>
                                <p className="text-blue-600">Commission Rate: {d?.commission?.toFixed(2)}%</p>
                                <p className="text-red-500">Fee Rate: {d?.feeRate?.toFixed(2)}%</p>
                              </div>
                            );
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No card data available</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* --- Top Transactions Leaderboard --- */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top 5 by Amount */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="shadow-sm border-border/80 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Top 5 Highest Value Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.top5ByAmount.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">#</th>
                          <th className="text-right py-2 px-1.5 font-semibold text-muted-foreground">Amount</th>
                          <th className="text-right py-2 px-1.5 font-semibold text-muted-foreground">Profit</th>
                          <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Portal</th>
                          <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.top5ByAmount.map((t, i) => (
                          <tr key={t.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-1.5">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="py-2 px-1.5 text-right font-bold">{formatINRShort(t.amount)}</td>
                            <td className="py-2 px-1.5 text-right font-semibold text-emerald-600">{formatINRShort(t.profit)}</td>
                            <td className="py-2 px-1.5 font-medium">{t.portal}</td>
                            <td className="py-2 px-1.5 text-muted-foreground hidden sm:table-cell">{t.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-[100px] flex items-center justify-center text-sm text-muted-foreground">No transactions</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top 5 by Profit */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Card className="shadow-sm border-border/80 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Crown className="h-4 w-4 text-emerald-500" />
                  Top 5 Most Profitable Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.top5ByProfit.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">#</th>
                          <th className="text-right py-2 px-1.5 font-semibold text-muted-foreground">Profit</th>
                          <th className="text-right py-2 px-1.5 font-semibold text-muted-foreground">Amount</th>
                          <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground">Portal</th>
                          <th className="text-left py-2 px-1.5 font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.top5ByProfit.map((t, i) => (
                          <tr key={t.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-1.5">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${i === 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="py-2 px-1.5 text-right font-bold text-emerald-600">{formatINRShort(t.profit)}</td>
                            <td className="py-2 px-1.5 text-right font-semibold">{formatINRShort(t.amount)}</td>
                            <td className="py-2 px-1.5 font-medium">{t.portal}</td>
                            <td className="py-2 px-1.5 text-muted-foreground hidden sm:table-cell">{t.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-[100px] flex items-center justify-center text-sm text-muted-foreground">No transactions</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* --- Portal Performance Table (Enhanced) --- */}
        {analytics.portalBreakdown.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
            <Card className="shadow-sm border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Portal Performance Summary
                </CardTitle>
                <CardDescription className="text-xs">Complete breakdown with volume, commission, site fees, profit & yield</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="text-left py-2.5 px-2 font-semibold text-muted-foreground">Portal</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">Volume</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">Commission</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">Site Fee</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">Net Profit</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">Txns</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground hidden sm:table-cell">Yield</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground hidden sm:table-cell">Avg Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.portalBreakdown.map((p, i) => (
                        <tr key={p.name} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-2 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                {i + 1}
                              </span>
                              {p.name}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold">{formatINRShort(p.volume)}</td>
                          <td className="py-2.5 px-2 text-right font-semibold text-emerald-600">{formatINRShort(p.commission)}</td>
                          <td className="py-2.5 px-2 text-right text-red-500">{formatINRShort(p.siteFee)}</td>
                          <td className="py-2.5 px-2 text-right font-bold text-blue-600">{formatINRShort(p.profit)}</td>
                          <td className="py-2.5 px-2 text-right">{p.count}</td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground hidden sm:table-cell">
                            {p.volume > 0 ? ((p.profit / p.volume) * 100).toFixed(2) : "0"}%
                          </td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground hidden sm:table-cell">{formatINRShort(p.count ? p.volume / p.count : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </>
    )}
  </motion.div>
</DashboardLayout>
  );
};

export default Analytics;
