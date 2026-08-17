import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  IndianRupee, BarChart3, Wallet, Activity,
  Calendar, CreditCard, Target,
  Zap, PieChart as PieChartIcon, Globe,
} from "lucide-react";
import { expensesService, Expense } from "@/services/expensesService";
import { format, subDays } from "date-fns";

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

type AnalyticsPeriod = "7d" | "30d" | "90d" | "all";

// --- Helper ---
const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatINRShort = (n: number) => {
  const num = Number(n || 0);
  if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
};

const CHART_COLORS = [
  "hsl(220, 80%, 50%)", "hsl(142, 76%, 36%)", "hsl(280, 65%, 55%)",
  "hsl(35, 95%, 55%)", "hsl(0, 84%, 60%)", "hsl(190, 80%, 45%)",
  "hsl(330, 70%, 55%)", "hsl(60, 80%, 45%)",
];

// --- Page Component ---
const Analytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

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
    let cutoff: Date | null = null;
    if (period === "7d") cutoff = subDays(now, 7);
    else if (period === "30d") cutoff = subDays(now, 30);
    else if (period === "90d") cutoff = subDays(now, 90);

    const safeTx = Array.isArray(transactions) ? transactions : [];
    const safeExp = Array.isArray(expenses) ? expenses : [];

    const filteredTx = cutoff
      ? safeTx.filter((t) => t.transaction_date && new Date(t.transaction_date) >= cutoff!)
      : safeTx;

    const filteredExp = cutoff
      ? safeExp.filter((e) => e.expense_date && new Date(e.expense_date) >= cutoff!)
      : safeExp;

    // --- KPI Cards ---
    const totalRevenue = filteredTx.reduce((s, t) => s + Number(t.commission || 0), 0);
    const totalExpenses = filteredExp.reduce((s, e) => s + Number(e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalVolume = filteredTx.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalSiteFees = filteredTx.reduce((s, t) => s + Number(t.site_fee || 0), 0);
    const avgCommission = filteredTx.length > 0 ? totalRevenue / filteredTx.length : 0;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;
    const txCount = filteredTx.length;

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
    let prevCutoffStart: Date | null = null;
    let prevCutoffEnd: Date | null = null;
    if (period === "7d") { prevCutoffStart = subDays(now, 14); prevCutoffEnd = subDays(now, 7); }
    else if (period === "30d") { prevCutoffStart = subDays(now, 60); prevCutoffEnd = subDays(now, 30); }
    else if (period === "90d") { prevCutoffStart = subDays(now, 180); prevCutoffEnd = subDays(now, 90); }

    let prevRevenue = 0;
    let prevExpenseTotal = 0;
    if (prevCutoffStart && prevCutoffEnd) {
      const prevTx = safeTx.filter((t) => {
        if (!t.transaction_date) return false;
        const d = new Date(t.transaction_date);
        return d >= prevCutoffStart! && d < prevCutoffEnd!;
      });
      prevRevenue = prevTx.reduce((s, t) => s + Number(t.commission || 0), 0);
      const prevExp = safeExp.filter((e) => {
        if (!e.expense_date) return false;
        const d = new Date(e.expense_date);
        return d >= prevCutoffStart! && d < prevCutoffEnd!;
      });
      prevExpenseTotal = prevExp.reduce((s, e) => s + Number(e.amount || 0), 0);
    }

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const expenseGrowth = prevExpenseTotal > 0 ? ((totalExpenses - prevExpenseTotal) / prevExpenseTotal) * 100 : 0;

    // --- Daily Revenue vs Expense trend ---
    const dailyMap: Record<string, { date: string; revenue: number; expenses: number; profit: number; volume: number }> = {};
    filteredTx.forEach((t) => {
      if (!t.transaction_date) return;
      const key = format(new Date(t.transaction_date), "yyyy-MM-dd");
      if (!dailyMap[key]) dailyMap[key] = { date: key, revenue: 0, expenses: 0, profit: 0, volume: 0 };
      dailyMap[key].revenue += Number(t.commission || 0);
      dailyMap[key].volume += Number(t.amount || 0);
    });
    filteredExp.forEach((e) => {
      if (!e.expense_date) return;
      const key = format(new Date(e.expense_date), "yyyy-MM-dd");
      if (!dailyMap[key]) dailyMap[key] = { date: key, revenue: 0, expenses: 0, profit: 0, volume: 0 };
      dailyMap[key].expenses += Number(e.amount || 0);
    });
    const revenueVsExpenseTrend = Object.values(dailyMap)
      .map((d) => ({ ...d, profit: d.revenue - d.expenses, label: format(new Date(d.date), "dd MMM") }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- Card Type Breakdown ---
    const cardMap: Record<string, { name: string; volume: number; commission: number; count: number }> = {};
    filteredTx.forEach((t) => {
      const card = t.card_type || "Standard";
      if (!cardMap[card]) cardMap[card] = { name: card, volume: 0, commission: 0, count: 0 };
      cardMap[card].volume += Number(t.amount || 0);
      cardMap[card].commission += Number(t.commission || 0);
      cardMap[card].count += 1;
    });
    const cardBreakdown = Object.values(cardMap).sort((a, b) => b.volume - a.volume);

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

    // --- Portal Performance Breakdown ---
    const portalMap: Record<string, { name: string; volume: number; commission: number; count: number }> = {};
    filteredTx.forEach((t) => {
      const pName = t.portals?.name || "Direct";
      if (!portalMap[pName]) portalMap[pName] = { name: pName, volume: 0, commission: 0, count: 0 };
      portalMap[pName].volume += Number(t.amount || 0);
      portalMap[pName].commission += Number(t.commission || 0);
      portalMap[pName].count += 1;
    });
    const portalBreakdown = Object.values(portalMap).sort((a, b) => b.volume - a.volume);

    // --- Best and worst days ---
    const bestDay = revenueVsExpenseTrend.length > 0
      ? revenueVsExpenseTrend.reduce((best, d) => d.profit > best.profit ? d : best, revenueVsExpenseTrend[0])
      : null;
    const worstDay = revenueVsExpenseTrend.length > 0
      ? revenueVsExpenseTrend.reduce((worst, d) => d.profit < worst.profit ? d : worst, revenueVsExpenseTrend[0])
      : null;

    // --- Avg daily transactions ---
    const uniqueDays = new Set(
      filteredTx
        .filter((t) => t.transaction_date)
        .map((t) => format(new Date(t.transaction_date), "yyyy-MM-dd"))
    );
    const avgDailyTx = uniqueDays.size > 0 ? txCount / uniqueDays.size : 0;

    return {
      totalRevenue, totalExpenses, netProfit, totalVolume, totalSiteFees,
      avgCommission, profitMargin, txCount,
      revenueGrowth, expenseGrowth,
      revenueVsExpenseTrend, cardBreakdown, expenseBreakdown, portalBreakdown,
      typePie, bestDay, worstDay, avgDailyTx,
    };
  }, [transactions, expenses, period]);

  if (isLoading || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const periodLabel = period === "7d" ? "7 Days" : period === "30d" ? "30 Days" : period === "90d" ? "90 Days" : "All Time";

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                Analytics
              </h1>
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20">
                {periodLabel}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Complete business intelligence — revenue, expenses, profitability & trends
            </p>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
            <TabsList className="grid grid-cols-4 w-full sm:w-auto bg-muted/60">
              <TabsTrigger value="7d" className="text-xs sm:text-sm font-semibold">7D</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs sm:text-sm font-semibold">30D</TabsTrigger>
              <TabsTrigger value="90d" className="text-xs sm:text-sm font-semibold">90D</TabsTrigger>
              <TabsTrigger value="all" className="text-xs sm:text-sm font-semibold">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* --- KPI Cards Row --- */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Total Revenue",
              value: analytics.totalRevenue,
              icon: IndianRupee,
              gradient: "from-emerald-500 to-emerald-600",
              growth: analytics.revenueGrowth,
              subtitle: `${analytics.txCount} transactions`,
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
              growth: null,
              subtitle: `${analytics.profitMargin.toFixed(1)}% margin`,
            },
            {
              title: "Transaction Volume",
              value: analytics.totalVolume,
              icon: Activity,
              gradient: "from-purple-500 to-purple-600",
              growth: null,
              subtitle: `Avg ${formatINR(analytics.avgCommission)} commission`,
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
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatINRShort} width={55} />
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

        {/* --- Middle Row: Pie Charts + Key Metrics --- */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Transaction Type Split */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
                  { label: "Total Site Fees Paid", value: formatINR(analytics.totalSiteFees), icon: CreditCard, color: "text-amber-600" },
                  { label: "Avg Txn / Day", value: analytics.avgDailyTx.toFixed(1), icon: Calendar, color: "text-purple-600" },
                  { label: "Best Day Profit", value: analytics.bestDay ? formatINR(analytics.bestDay.profit) : "—", sublabel: analytics.bestDay ? analytics.bestDay.label : "", icon: Zap, color: "text-emerald-600" },
                  { label: "Worst Day Profit", value: analytics.worstDay ? formatINR(analytics.worstDay.profit) : "—", sublabel: analytics.worstDay ? analytics.worstDay.label : "", icon: TrendingDown, color: "text-red-600" },
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

        {/* --- Card Type Performance --- */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <Card className="shadow-sm border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Card Type Performance
              </CardTitle>
              <CardDescription className="text-xs">Transaction volume and commission by card type</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {analytics.cardBreakdown.length > 0 ? (
                <div className="w-full h-[260px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.cardBreakdown} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatINRShort} width={55} />
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

        {/* --- Portal Performance --- */}
        {analytics.portalBreakdown.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card className="shadow-sm border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Portal Performance
                </CardTitle>
                <CardDescription className="text-xs">Volume and commission breakdown by payment portal</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="text-left py-2.5 px-2 font-semibold text-muted-foreground">Portal</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">Volume</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">Commission</th>
                        <th className="text-right py-2.5 px-2 font-semibold text-muted-foreground">Txns</th>
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
                          <td className="py-2.5 px-2 text-right">{p.count}</td>
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
      </motion.div>
    </DashboardLayout>
  );
};

export default Analytics;
