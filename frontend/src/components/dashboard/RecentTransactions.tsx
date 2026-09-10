import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { FilterState } from "@/components/transactions/TransactionFilters";
import { getCardTypeDisplayName } from "@/utils/commissionCalculator";

interface RecentTransactionsProps {
  userId: string;
  filters?: FilterState;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  commission: number;
  transaction_date: string;
  portal_id: string;
  status: string;
  card_type: string | null;
  portals: {
    name: string;
  };
}

export const RecentTransactions = ({ userId, filters }: RecentTransactionsProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        // Fetch more rows when filters are active so enough survive filtering
        const hasActiveFilters = filters && (
          filters.portals.length > 0 ||
          filters.status.length > 0 ||
          filters.transactionType.length > 0 ||
          (filters.cardTypes && filters.cardTypes.length > 0) ||
          filters.amountRange.min !== null ||
          filters.amountRange.max !== null ||
          filters.dateRange.from || filters.dateRange.to
        );
        const fetchLimit = hasActiveFilters ? 100 : 5;

        const { data, error } = await supabase
          .from("transactions")
          .select(`
            id,
            transaction_type,
            amount,
            commission,
            transaction_date,
            portal_id,
            status,
            card_type,
            portals (
              name
            )
          `)
          .eq("user_id", userId)
          .order("transaction_date", { ascending: false })
          .limit(fetchLimit);

        if (!isCurrent) return;

        if (error) {
          console.error("Error fetching recent transactions:", error);
          setTransactions([]);
        } else {
          let result = (data as Transaction[]) || [];

          // Apply dashboard filters client-side
          if (filters) {
            if (filters.portals && filters.portals.length > 0) {
              result = result.filter((t) => filters.portals.includes(t.portal_id));
            }
            if (filters.status && filters.status.length > 0) {
              result = result.filter((t) => filters.status.includes(t.status));
            }
            if (filters.transactionType && filters.transactionType.length > 0) {
              const types = filters.transactionType.map((x) => x.toLowerCase());
              result = result.filter((t) =>
                types.includes((t.transaction_type || "").toLowerCase())
              );
            }
            if (filters.amountRange && filters.amountRange.min !== null) {
              result = result.filter((t) => Number(t.amount || 0) >= filters.amountRange.min!);
            }
            if (filters.amountRange && filters.amountRange.max !== null) {
              result = result.filter((t) => Number(t.amount || 0) <= filters.amountRange.max!);
            }
            if (filters.cardTypes && filters.cardTypes.length > 0) {
              result = result.filter((t) => {
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
              result = result.filter((t) => {
                const d = new Date(t.transaction_date);
                return d >= from && d <= to;
              });
            } else if (filters.dateRange?.from) {
              const from = new Date(filters.dateRange.from);
              from.setHours(0, 0, 0, 0);
              const to = new Date(filters.dateRange.from);
              to.setHours(23, 59, 59, 999);
              result = result.filter((t) => {
                const d = new Date(t.transaction_date);
                return d >= from && d <= to;
              });
            }
          }

          // Always show at most 5 results
          setTransactions(result.slice(0, 5));
        }
      } catch (err) {
        console.error("Error in fetchTransactions:", err);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    fetchTransactions();

    // Fallback timer ensures recent transactions never get stuck loading
    const timer = setTimeout(() => {
      if (isCurrent) setIsLoading(false);
    }, 2000);

    // Live WebSocket Subscription
    const channel = supabase
      .channel("recent-transactions-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return format(d, "dd MMM yyyy, hh:mm a");
    } catch {
      return date;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg sm:text-xl">Recent Transactions</CardTitle>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live Feed
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-6 w-20 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {transactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className="flex items-center justify-between gap-3 border-b pb-3 sm:pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                    transaction.transaction_type?.toLowerCase() === "withdrawal"
                      ? "bg-primary/10"
                      : "bg-blue-500/10"
                  }`}>
                    {transaction.transaction_type?.toLowerCase() === "withdrawal" ? (
                      <ArrowDownCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    ) : (
                      <ArrowUpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base capitalize truncate">
                      {transaction.transaction_type}
                    </p>
                    <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                      <span className="truncate">{transaction.portals.name}</span>
                      <span>•</span>
                      <span>{formatDate(transaction.transaction_date)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm sm:text-base">
                    {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs sm:text-sm text-success">
                    +{formatCurrency(transaction.commission)}
                  </p>
                </div>
              </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
