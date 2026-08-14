import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { formatCurrency } from "@/utils/format";

interface StickySummaryHeaderProps {
  userId: string;
}

export const StickySummaryHeader = ({ userId }: StickySummaryHeaderProps) => {
  const [summary, setSummary] = useState({
    totalProfit: 0,
    totalBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSummary();

    const channel = supabase
      .channel("sticky-summary-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchSummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchSummary = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("commission, amount, transaction_type")
        .eq("user_id", userId);

      if (error) throw error;

      const totalProfit = (data || []).reduce((sum, t) => sum + Number(t.commission || 0), 0);
      const withdrawals = (data || [])
        .filter((t) => t.transaction_type?.toLowerCase() === "withdrawal")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const repayments = (data || [])
        .filter((t) => t.transaction_type?.toLowerCase() === "repayment")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalBalance = repayments - withdrawals;

      setSummary({ totalProfit, totalBalance });
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
    >
      <Card className="border-0 rounded-none shadow-none">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Total Profit</div>
              <div className="text-lg font-bold text-success">
                {isLoading ? "..." : formatCurrency(summary.totalProfit)}
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex-1 text-right">
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className={`text-lg font-bold ${summary.totalBalance >= 0 ? "text-success" : "text-destructive"}`}>
                {isLoading ? "..." : formatCurrency(summary.totalBalance)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

