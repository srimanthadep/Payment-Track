import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  ScrollText,
  Search,
  Download,
  RefreshCw,
  LogIn,
  LogOut,
  UserPlus,
  ArrowRightLeft,
  Receipt,
  FileDown,
  Settings,
  Globe,
  CreditCard,
  Target,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  Calendar,
  Filter,
  Trash2,
  Edit2,
  PlusCircle,
  FileText,
  BarChart3,
  FileSpreadsheet,
  X,
  Code2,
  CheckCircle2,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  activityLogService,
  ActivityLog,
  ActivityCategory,
  ActivityLogFilters,
  LogStats,
} from "@/services/activityLogService";

// ─── Category Configurations ───────────────────────────────────────────────

interface CategoryStyle {
  label: string;
  badgeClass: string;
  iconBg: string;
  iconColor: string;
  dotColor: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  auth: {
    label: "Auth",
    badgeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    iconBg: "bg-violet-500/10 dark:bg-violet-500/20",
    iconColor: "text-violet-600 dark:text-violet-400",
    dotColor: "bg-violet-500",
  },
  transaction: {
    label: "Transaction",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
  },
  expense: {
    label: "Expense",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
  },
  export: {
    label: "Export",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  settings: {
    label: "Settings",
    badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    iconBg: "bg-slate-500/10 dark:bg-slate-500/20",
    iconColor: "text-slate-600 dark:text-slate-400",
    dotColor: "bg-slate-500",
  },
  portal: {
    label: "Portal",
    badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    iconBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    dotColor: "bg-cyan-500",
  },
  card_type: {
    label: "Card Type",
    badgeClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    iconBg: "bg-pink-500/10 dark:bg-pink-500/20",
    iconColor: "text-pink-600 dark:text-pink-400",
    dotColor: "bg-pink-500",
  },
  goal: {
    label: "Goal",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    dotColor: "bg-purple-500",
  },
};

const ACTION_METADATA_MAP: Record<
  string,
  { title: string; icon: React.ElementType }
> = {
  "auth.login": { title: "User Sign In", icon: LogIn },
  "auth.logout": { title: "User Sign Out", icon: LogOut },
  "auth.signup": { title: "New Account Created", icon: UserPlus },
  "transaction.created": { title: "Transaction Added", icon: PlusCircle },
  "transaction.updated": { title: "Transaction Updated", icon: Edit2 },
  "transaction.deleted": { title: "Transaction Deleted", icon: Trash2 },
  "transaction.bulk_deleted": { title: "Bulk Transactions Deleted", icon: Trash2 },
  "expense.created": { title: "Expense Added", icon: PlusCircle },
  "expense.updated": { title: "Expense Updated", icon: Edit2 },
  "expense.deleted": { title: "Expense Deleted", icon: Trash2 },
  "expense.bulk_deleted": { title: "Bulk Expenses Deleted", icon: Trash2 },
  "export.pdf_transactions": { title: "Transactions PDF Export", icon: FileText },
  "export.pdf_analytics": { title: "Analytics PDF Export", icon: FileText },
  "export.csv_transactions": { title: "Transactions CSV Export", icon: FileSpreadsheet },
  "export.settings_backup": { title: "Settings Backup Export", icon: FileDown },
  "goal.created": { title: "Goal Created", icon: Target },
  "goal.updated": { title: "Goal Updated", icon: Target },
  "goal.deleted": { title: "Goal Deleted", icon: Trash2 },
  "portal.created": { title: "Portal Created", icon: Globe },
  "portal.updated": { title: "Portal Updated", icon: Globe },
  "portal.deleted": { title: "Portal Deleted", icon: Trash2 },
};

const resolveActionInfo = (action: string, category: string) => {
  if (ACTION_METADATA_MAP[action]) {
    return ACTION_METADATA_MAP[action];
  }
  const parts = action.split(".");
  const noun = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const verb = parts[1]
    ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1).replace(/_/g, " ")
    : "Action";
  return {
    title: `${noun} ${verb}`,
    icon: Activity,
  };
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatTimeWithSeconds = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
};

const formatFullDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatRelative = (iso: string): string => {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return formatFullDate(iso);
  } catch {
    return "";
  }
};

const groupByDate = (logs: ActivityLog[]): { label: string; logs: ActivityLog[] }[] => {
  const groups: Record<string, ActivityLog[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const log of logs) {
    const d = new Date(log.created_at);
    const key = d.toDateString();
    const label =
      key === today
        ? "Today"
        : key === yesterday
        ? "Yesterday"
        : d.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          });
    if (!groups[label]) groups[label] = [];
    groups[label].push(log);
  }

  return Object.entries(groups).map(([label, logs]) => ({ label, logs }));
};

// ─── Single Activity Row Component ─────────────────────────────────────────

interface ActivityRowProps {
  log: ActivityLog;
  index: number;
}

const ActivityRow = ({ log, index }: ActivityRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const style = CATEGORY_STYLES[log.category] || CATEGORY_STYLES.settings;
  const actionInfo = resolveActionInfo(log.action, log.category);
  const ActionIcon = actionInfo.icon;

  const metadataEntries = useMemo(() => {
    if (!log.metadata || typeof log.metadata !== "object") return [];
    return Object.entries(log.metadata).filter(
      ([key, val]) =>
        val !== null &&
        val !== undefined &&
        val !== "" &&
        typeof val !== "object" &&
        key !== "user_id"
    );
  }, [log.metadata]);

  const hasMetadata =
    log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.2 }}
      className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
    >
      {/* Left: Icon + Content */}
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        {/* Soft Icon Badge */}
        <div
          className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 ${style.iconBg} ${style.iconColor} border border-border/30 shadow-2xs`}
        >
          <ActionIcon className="h-4 w-4" />
        </div>

        {/* Text Block */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm tracking-tight text-foreground">
              {actionInfo.title}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-medium h-5 px-1.5 rounded-md border ${style.badgeClass}`}
            >
              {style.label}
            </Badge>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {log.description}
          </p>

          {/* Quick Structured Chips (inline preview if available) */}
          {metadataEntries.length > 0 && !expanded && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {metadataEntries.slice(0, 3).map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40"
                >
                  <span className="capitalize text-muted-foreground/70">
                    {k.replace(/_/g, " ")}:
                  </span>
                  <span className="text-foreground">
                    {typeof v === "number" && k.toLowerCase().includes("amount")
                      ? `₹${v.toLocaleString("en-IN")}`
                      : String(v)}
                  </span>
                </span>
              ))}
              {metadataEntries.length > 3 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-[11px] text-primary hover:underline font-medium ml-0.5"
                >
                  +{metadataEntries.length - 3} more
                </button>
              )}
            </div>
          )}

          {/* Expand Toggle */}
          {hasMetadata && (
            <div className="pt-0.5">
              <button
                onClick={() => setExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    <span>Hide details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    <span>View full details</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Expanded Metadata Tray */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden pt-2"
              >
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                    <span className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Layers className="h-3 w-3" /> Event Payload
                    </span>
                    <button
                      onClick={() => setShowRawJson((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <Code2 className="h-3 w-3" />
                      {showRawJson ? "Formatted View" : "Raw JSON"}
                    </button>
                  </div>

                  {showRawJson ? (
                    <pre className="p-2 rounded bg-background/80 font-mono text-[11px] text-foreground overflow-auto max-h-40 border border-border/40">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(log.metadata).map(([key, val]) => (
                        <div
                          key={key}
                          className="bg-background/70 p-2 rounded-md border border-border/40 space-y-0.5"
                        >
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground truncate">
                            {key.replace(/_/g, " ")}
                          </p>
                          <p className="font-medium text-xs text-foreground break-all">
                            {typeof val === "object"
                              ? JSON.stringify(val)
                              : typeof val === "number" &&
                                (key.includes("amount") || key.includes("cost"))
                              ? `₹${val.toLocaleString("en-IN")}`
                              : String(val)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Exact Timestamp Block */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center flex-shrink-0 pt-1 sm:pt-0 pl-12 sm:pl-0 border-t sm:border-t-0 border-border/30">
        <span className="font-mono font-medium text-xs sm:text-sm tracking-tight text-foreground flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground sm:hidden" />
          {formatTimeWithSeconds(log.created_at)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {formatRelative(log.created_at)}
        </span>
      </div>
    </motion.div>
  );
};

// ─── Main ActivityLogs Page ────────────────────────────────────────────────

const ActivityLogs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<LogStats>({
    total: 0,
    today: 0,
    byCategory: {},
    lastActivity: null,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<ActivityLogFilters>({
    category: "all",
    search: "",
    dateFrom: "",
    dateTo: "",
    page: 1,
    pageSize: 50,
  });

  const [user, setUser] = useState<any>(null);

  // Auth Guard & User state
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const fetchStats = useCallback(async () => {
    const s = await activityLogService.getLogStats();
    setStats(s);
  }, []);

  const fetchLogs = useCallback(async (f: ActivityLogFilters, p: number) => {
    setIsLoading(true);
    const result = await activityLogService.getLogs({ ...f, page: p, pageSize: 50 });
    setLogs(result.logs);
    setTotal(result.total);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLogs(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription for activity_logs
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("activity-logs-realtime-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newLog = payload.new as ActivityLog;
          setLogs((prev) => {
            if (prev.some((l) => l.id === newLog.id)) return prev;
            return [newLog, ...prev];
          });
          setTotal((prev) => prev + 1);
          fetchStats();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "activity_logs",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchLogs(filters, page);
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, filters, page, fetchLogs, fetchStats]);

  const applyFilters = (newFilters: ActivityLogFilters) => {
    setFilters(newFilters);
    setPage(1);
    fetchLogs(newFilters, 1);
    fetchStats();
  };

  const handleSearchChange = (v: string) => {
    applyFilters({ ...filters, search: v });
  };

  const handleCategoryChange = (cat: string) => {
    applyFilters({ ...filters, category: cat as ActivityCategory | "all" });
  };

  const handleDateChange = (key: "dateFrom" | "dateTo", val: string) => {
    applyFilters({ ...filters, [key]: val });
  };

  const clearFilters = () => {
    applyFilters({
      category: "all",
      search: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const hasActiveFilters =
    (filters.category && filters.category !== "all") ||
    Boolean(filters.search) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    activityLogService.getLogs({ ...filters, page: next, pageSize: 50 }).then((res) => {
      setLogs((prev) => [...prev, ...res.logs]);
    });
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await activityLogService.exportLogsCSV(filters);
      toast({
        title: "Export Successful",
        description: "Activity audit logs exported to CSV",
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Could not generate CSV export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const topCategoryEntry = Object.entries(stats.byCategory).sort(
    ([, a], [, b]) => b - a
  )[0];

  const groupedLogs = useMemo(() => groupByDate(logs), [logs]);

  // Stat card definitions matching the app's StatsCards.tsx styling
  const statCardsData = [
    {
      title: "Total Operations",
      value: stats.total.toLocaleString("en-IN"),
      sub: "Historical audit entries",
      icon: Activity,
      gradient: "from-primary to-primary/70",
    },
    {
      title: "Today's Operations",
      value: stats.today.toLocaleString("en-IN"),
      sub: new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      icon: Calendar,
      gradient: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Most Active Module",
      value: topCategoryEntry
        ? CATEGORY_STYLES[topCategoryEntry[0]]?.label || topCategoryEntry[0]
        : "None",
      sub: topCategoryEntry ? `${topCategoryEntry[1]} recorded actions` : "No data",
      icon: BarChart3,
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: "Latest Audit Event",
      value: stats.lastActivity ? formatTimeWithSeconds(stats.lastActivity) : "—",
      sub: stats.lastActivity ? formatRelative(stats.lastActivity) : "No activity",
      icon: Clock,
      gradient: "from-amber-500 to-amber-600",
    },
  ];

  const categoryTabItems: { key: ActivityCategory | "all"; label: string }[] = [
    { key: "all", label: "All Events" },
    { key: "transaction", label: "Transactions" },
    { key: "expense", label: "Expenses" },
    { key: "auth", label: "Auth" },
    { key: "goal", label: "Goals" },
    { key: "export", label: "Exports" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4 sm:space-y-6"
      >
        {/* ── Page Header ──────────────────────────────────────────── */}
        <div className="pb-1 border-b border-border/60 space-y-1">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                Activity Logs
              </h1>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[11px] font-semibold bg-muted/60 text-muted-foreground border-border/60"
              >
                {total.toLocaleString("en-IN")} records
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-md border border-emerald-500/20 whitespace-nowrap">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Audit Feed
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 gap-1.5 text-xs sm:text-sm font-medium px-2 sm:px-3"
                onClick={() => {
                  fetchStats();
                  fetchLogs(filters, 1);
                  setPage(1);
                }}
                title="Refresh logs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Button
                size="sm"
                className="h-8 sm:h-9 gap-1.5 text-xs sm:text-sm font-medium px-2 sm:px-3"
                onClick={handleExportCSV}
                disabled={isExporting}
                title="Export CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete audit trail of actions, transactions, and system events
          </p>
        </div>

        {/* ── Stats Cards Row ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
          {statCardsData.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="h-full"
              >
                <Card className="overflow-hidden relative shadow-xs border-border/80 h-full flex flex-col justify-between">
                  <div>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium leading-tight text-muted-foreground pr-2 min-h-[2rem] flex items-center">
                        {card.title}
                      </CardTitle>
                      <div
                        className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${card.gradient} flex-shrink-0 shadow-xs`}
                      >
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-lg sm:text-2xl font-bold tracking-tight">
                        {card.value}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                        {card.sub}
                      </p>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ── Unified Activity Feed Card ───────────────────────────── */}
        <Card className="border border-border/80 shadow-xs overflow-hidden bg-card">
          {/* Card Top: Controls & Search Bar */}
          <div className="p-3 sm:p-4 border-b border-border/60 bg-muted/20 space-y-3">
            {/* Quick Segmented Category Tabs */}
            <div className="overflow-x-auto pb-0.5 scrollbar-none">
              <Tabs
                value={filters.category || "all"}
                onValueChange={handleCategoryChange}
                className="w-full"
              >
                <TabsList className="h-9 p-1 bg-muted/70 inline-flex w-auto min-w-full sm:min-w-0">
                  {categoryTabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className="text-xs sm:text-sm font-medium px-3 py-1 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              {/* Search Box */}
              <div className="sm:col-span-6 lg:col-span-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search descriptions, amounts, users, portals..."
                  value={filters.search || ""}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm bg-background/80"
                />
              </div>

              {/* Date Range: From */}
              <div className="sm:col-span-3 lg:col-span-3">
                <Input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => handleDateChange("dateFrom", e.target.value)}
                  className="h-9 text-xs sm:text-sm bg-background/80"
                  placeholder="From Date"
                />
              </div>

              {/* Date Range: To */}
              <div className="sm:col-span-3 lg:col-span-3">
                <Input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => handleDateChange("dateTo", e.target.value)}
                  className="h-9 text-xs sm:text-sm bg-background/80"
                  placeholder="To Date"
                />
              </div>

              {/* Clear Filter Button */}
              {hasActiveFilters && (
                <div className="sm:col-span-12 lg:col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 w-full lg:w-auto"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Clear</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed Body */}
          <div>
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="h-9 w-9 bg-muted rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                    <div className="h-4 bg-muted rounded w-16" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center border border-border/40">
                  <ScrollText className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    No activity logs found
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-sm mx-auto">
                    {hasActiveFilters
                      ? "No records match your active search or filter criteria. Try clearing filters."
                      : "Actions taken across transactions, expenses, and authentication will appear here in real-time."}
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs h-8 mt-2"
                  >
                    Reset All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div>
                {groupedLogs.map(({ label, logs: dayLogs }) => (
                  <div key={label}>
                    {/* Clean Date Divider */}
                    <div className="sticky top-0 z-10 bg-muted/50 dark:bg-muted/30 backdrop-blur-sm px-4 py-2 sm:px-6 flex items-center justify-between border-y border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>{label}</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal h-4.5 px-1.5 bg-background/80"
                      >
                        {dayLogs.length} {dayLogs.length === 1 ? "activity" : "activities"}
                      </Badge>
                    </div>

                    {/* Day's Activities */}
                    <div className="divide-y divide-border/30">
                      {dayLogs.map((log, index) => (
                        <ActivityRow key={log.id} log={log} index={index} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Pagination / Load More Footer */}
                {logs.length < total && (
                  <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      className="gap-1.5 text-xs h-8 px-4"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                      Load more activities ({total - logs.length} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default ActivityLogs;
