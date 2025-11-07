import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { motion } from "framer-motion";

interface RecentTransactionsProps {
  userId: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  commission: number;
  transaction_date: string;
  portals: {
    name: string;
  };
}

export const RecentTransactions = ({ userId }: RecentTransactionsProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          transaction_type,
          amount,
          commission,
          transaction_date,
          portals (
            name
          )
        `)
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching recent transactions:", error);
      } else {
        setTransactions(data as Transaction[]);
      }

      setIsLoading(false);
    };

    fetchTransactions();
  }, [userId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl">Recent Transactions</CardTitle>
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
                    transaction.transaction_type === "withdrawal"
                      ? "bg-primary/10"
                      : "bg-blue-500/10"
                  }`}>
                    {transaction.transaction_type === "withdrawal" ? (
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
