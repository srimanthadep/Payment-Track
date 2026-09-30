import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilterState } from "@/components/transactions/TransactionFilters";
import { getCardTypeDisplayName } from "@/utils/commissionCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  ArrowLeftRight,
  Percent,
} from "lucide-react";
import { RupeeIcon } from "@/components/icons/RupeeIcon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { formatCurrency } from "@/utils/format";
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

export type Period = "daily" | "weekly" | "monthly" | "all";

interface StatsCardsProps {
  userId: string;
  period?: Period;
  selectedDate?: Date | null;
  onPeriodChange?: (period: Period) => void;
  showTabs?: boolean;
  filters?: FilterState;
}

interface Stats {
  totalWithdrawals: number;
  totalRepayments: number;
  totalCommissions: number;
  totalProfit: number;
  totalTransactions: number;
  bharatRupaySiteFee: number;
  upenderRupaySiteFee: number;
  totalRupaySiteFee: number;
}

// Letter B Icon for Barath Portal
const LetterBIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <text
      x="50%"
      y="50%"
      dominantBaseline="central"
      textAnchor="middle"
      fontSize="18"
      fontFamily="Arial, sans-serif"
      fontWeight="bold"
    >
      B
    </text>
  </svg>
);

// Letter U Icon for Upender Portal
const LetterUIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <text
      x="50%"
      y="50%"
      dominantBaseline="central"
      textAnchor="middle"
      fontSize="18"
      fontFamily="Arial, sans-serif"
      fontWeight="bold"
    >
      U
    </text>
  </svg>
);

export const StatsCards = ({
  userId,
  period: controlledPeriod,
  selectedDate,
  onPeriodChange,
  showTabs = false,
  filters,
}: StatsCardsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalWithdrawals: 0,
    totalRepayments: 0,
    totalCommissions: 0,
    totalProfit: 0,
    totalTransactions: 0,
    bharatRupaySiteFee: 0,
    upenderRupaySiteFee: 0,
    totalRupaySiteFee: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [internalPeriod, setInternalPeriod] = useState<Period>("daily");

  const period = controlledPeriod || internalPeriod;
  const setPeriod = (p: Period) => {
    setInternalPeriod(p);
    onPeriodChange?.(p);
  };

  useEffect(() => {
    let isCurrent = true;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("transactions")
          .select(
            "transaction_type, amount, commission, site_fee, transaction_date, card_type, notes, portal_id, portals(name)"
          )
          .eq("user_id", userId);

        const now = new Date();
        const activeDate = selectedDate || now;

        // If a specific date range is set in the filters, honor it at query level
        if (filters?.dateRange?.from || filters?.dateRange?.to) {
          const from = filters.dateRange.from ? new Date(filters.dateRange.from) : new Date(0);
          from.setHours(0, 0, 0, 0);
          const to = filters.dateRange.to
            ? new Date(filters.dateRange.to)
            : (filters.dateRange.from ? new Date(filters.dateRange.from) : new Date());
          to.setHours(23, 59, 59, 999);
          query = query
            .gte("transaction_date", from.toISOString())
            .lte("transaction_date", to.toISOString());
        } else if (period === "daily") {
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

        let { data: transactions, error } = await query;

        // Resilient fallback if relationship query encounters any schema variation
        if (error) {
          const fallbackRes = await supabase
            .from("transactions")
            .select("transaction_type, amount, commission, site_fee, transaction_date, card_type, notes, portal_id")
            .eq("user_id", userId);
          if (!fallbackRes.error && fallbackRes.data) {
            transactions = fallbackRes.data as any;
            error = null;
          }
        }

        if (!isCurrent) return;

        if (error) {
          console.error("Error fetching stats:", error);
        } else {
          // Apply dashboard filters client-side
          if (filters && transactions) {
            if (filters.portals && filters.portals.length > 0) {
              transactions = transactions.filter((t: any) =>
                filters.portals.includes(t.portal_id)
              );
            }
            if (filters.transactionType && filters.transactionType.length > 0) {
              const types = filters.transactionType.map((x: string) => x.toLowerCase());
              transactions = transactions.filter((t: any) =>
                types.includes((t.transaction_type || "").toLowerCase())
              );
            }
            if (filters.amountRange && filters.amountRange.min !== null) {
              transactions = transactions.filter((t: any) => Number(t.amount || 0) >= filters.amountRange.min!);
            }
            if (filters.amountRange && filters.amountRange.max !== null) {
              transactions = transactions.filter((t: any) => Number(t.amount || 0) <= filters.amountRange.max!);
            }
            if (filters.cardTypes && filters.cardTypes.length > 0) {
              transactions = transactions.filter((t: any) => {
                if (!t.card_type) return false;
                const rawType = t.card_type.toLowerCase();
                const displayName = (getCardTypeDisplayName(t.card_type) || "").toLowerCase();
                return filters.cardTypes.some((sel) => {
                  const s = sel.toLowerCase();
                  if (rawType === s || displayName === s) return true;
                  if (s === "rupay" && (rawType.includes("rupay") || displayName.includes("rupay"))) return true;
                  if (s === "visa" && (rawType.includes("visa") || displayName.includes("visa"))) return true;
                  if (s === "mastercard" && (rawType.includes("master") || displayName.includes("master"))) return true;
                  if (s === "business" && (rawType.includes("business") || displayName.includes("business"))) return true;
                  if (s === "au_card" && (rawType.includes("au") || displayName.includes("au"))) return true;
                  if (s === "amex_diners" && (rawType.includes("amex") || rawType.includes("diners") || displayName.includes("amex") || displayName.includes("diners"))) return true;
                  if (s === "machine_swiping" && (rawType.includes("swip") || rawType.includes("machine") || displayName.includes("swip") || displayName.includes("machine"))) return true;
                  return false;
                });
              });
            }
            if (filters.dateRange?.from && filters.dateRange?.to) {
              const from = new Date(filters.dateRange.from);
              from.setHours(0, 0, 0, 0);
              const to = new Date(filters.dateRange.to);
              to.setHours(23, 59, 59, 999);
              transactions = transactions.filter((t: any) => {
                const d = new Date(t.transaction_date);
                return d >= from && d <= to;
              });
            } else if (filters.dateRange?.from) {
              const from = new Date(filters.dateRange.from);
              from.setHours(0, 0, 0, 0);
              const to = new Date(filters.dateRange.from);
              to.setHours(23, 59, 59, 999);
              transactions = transactions.filter((t: any) => {
                const d = new Date(t.transaction_date);
                return d >= from && d <= to;
              });
            }
          }
          const withdrawals =
            transactions
              ?.filter((t) => t.transaction_type?.toLowerCase() === "withdrawal")
              .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

          const repayments =
            transactions
              ?.filter((t) => t.transaction_type?.toLowerCase() === "repayment")
              .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

          const commissions =
            transactions?.reduce(
              (sum, t) => sum + Number(t.commission || 0),
              0
            ) || 0;

          const profit =
            transactions?.reduce(
              (sum, t) => sum + (Number(t.commission || 0) - Number(t.site_fee || 0)),
              0
            ) || 0;

          // Combined sum of Withdrawals and Repayments
          const totalTransactions = withdrawals + repayments;

          // Helper to check if card type is Rupay
          const isRupay = (t: any) => {
            const card = (t.card_type || "").toLowerCase();
            return card.includes("rupay") || (t.notes && t.notes.toLowerCase().includes("rupay"));
          };

          // Helper to get portal name from relation, field, or notes fallback
          const getPortalName = (t: any) => {
            if (t.portals?.name) return t.portals.name;
            if (typeof t.portals === "string") return t.portals;
            if (t.portal_name) return t.portal_name;
            if (t.notes) {
              const match = t.notes.match(/Sent to:\s*([^|]+)/i);
              if (match && match[1]) return match[1].trim();
            }
            return "";
          };

          const isBharatPortal = (t: any) => {
            const name = getPortalName(t).toLowerCase();
            return (
              name.includes("bharat") ||
              name.includes("barath") ||
              (t.notes && (t.notes.toLowerCase().includes("bharat") || t.notes.toLowerCase().includes("barath")))
            );
          };

          const isUpenderPortal = (t: any) => {
            const name = getPortalName(t).toLowerCase();
            return name.includes("upender") || (t.notes && t.notes.toLowerCase().includes("upender"));
          };

          // Rupay site fee from Bharat Portal
          const bharatRupaySiteFee =
            transactions
              ?.filter((t) => isRupay(t) && isBharatPortal(t))
              .reduce((sum, t) => sum + Number(t.site_fee || 0), 0) || 0;

          // Rupay site fee from Upender Portal
          const upenderRupaySiteFee =
            transactions
              ?.filter((t) => isRupay(t) && isUpenderPortal(t))
              .reduce((sum, t) => sum + Number(t.site_fee || 0), 0) || 0;

          // Combined Rupay site fee from Bharat Portal + Upender Portal
          const totalRupaySiteFee = bharatRupaySiteFee + upenderRupaySiteFee;

          setStats({
            totalWithdrawals: withdrawals,
            totalRepayments: repayments,
            totalCommissions: commissions,
            totalProfit: profit,
            totalTransactions,
            bharatRupaySiteFee,
            upenderRupaySiteFee,
            totalRupaySiteFee,
          });
        }
      } catch (err) {
        console.error("Error in fetchStats:", err);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    fetchStats();

    // Fallback timer ensures stats never get stuck loading
    const timer = setTimeout(() => {
      if (isCurrent) setIsLoading(false);
    }, 2000);

    // Realtime subscription
    const channel = supabase
      .channel("transactions-stats-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      isCurrent = false;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, period, selectedDate, filters]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

  const cards = [
    // Row 1: Existing 4 Status Cards
    {
      title: `Total Withdrawals (${getPeriodLabel()})`,
      value: stats.totalWithdrawals,
      icon: ArrowDownCircle,
      gradient: "from-primary to-primary/70",
    },
    {
      title: `Total Repayments (${getPeriodLabel()})`,
      value: stats.totalRepayments,
      icon: ArrowUpCircle,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: `Total Commissions (${getPeriodLabel()})`,
      value: stats.totalCommissions,
      icon: RupeeIcon,
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: `Total Profit (${getPeriodLabel()})`,
      value: stats.totalProfit,
      icon: TrendingUp,
      gradient: "from-success to-success/70",
    },
    // Row 2: Additional 4 Status Cards
    {
      title: `Total Transactions (${getPeriodLabel()})`,
      value: stats.totalTransactions,
      icon: ArrowLeftRight,
      gradient: "from-indigo-500 to-indigo-600",
    },
    {
      title: `RuPay Barath (${getPeriodLabel()})`,
      value: stats.bharatRupaySiteFee,
      icon: LetterBIcon,
      gradient: "from-orange-500 to-amber-600",
    },
    {
      title: `RuPay Upender (${getPeriodLabel()})`,
      value: stats.upenderRupaySiteFee,
      icon: LetterUIcon,
      gradient: "from-teal-500 to-emerald-600",
    },
    {
      title: `Total Rupay Site Fee (${getPeriodLabel()})`,
      value: stats.totalRupaySiteFee,
      icon: Percent,
      gradient: "from-rose-500 to-pink-600",
    },
  ];

  return (
    <div className="space-y-4">
      {showTabs && (
        <div className="flex justify-center sm:justify-end">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="grid grid-cols-4 w-full sm:w-auto">
              <TabsTrigger value="daily" className="text-xs sm:text-sm">
                Daily
              </TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs sm:text-sm">
                Weekly
              </TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs sm:text-sm">
                Monthly
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 items-stretch">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full"
            >
              <Card className="overflow-hidden relative shadow-sm border-border/80 h-full flex flex-col justify-between">
                <div>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium leading-tight pr-2 min-h-[2.25rem] sm:min-h-[2.5rem] flex items-center">
                      {card.title}
                    </CardTitle>
                    <div
                      className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${card.gradient} flex-shrink-0`}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg sm:text-2xl font-bold">
                      {isLoading ? (
                        <div className="h-6 sm:h-8 w-20 sm:w-24 bg-muted animate-pulse rounded" />
                      ) : (
                        formatCurrency(card.value)
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Updated in real-time
                    </p>
                  </CardContent>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
