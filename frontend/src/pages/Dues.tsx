import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, HandCoins } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { AddDueDialog } from "@/components/dues/AddDueDialog";
import { DuesStatsCards } from "@/components/dues/DuesStatsCards";
import { DuesTable } from "@/components/dues/DuesTable";
import { Due, useDues } from "@/hooks/useDues";
import { useRole } from "@/hooks/useRole";

const formatCurrency = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Dues = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isStaff, isLoading: isRoleLoading } = useRole();

  useEffect(() => {
    if (!isRoleLoading && isStaff) {
      navigate("/transactions", { replace: true });
    }
  }, [isStaff, isRoleLoading, navigate]);

  const [user, setUser] = useState<User | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { dues, isLoading, error, createDue, updateDue, addPayment, deleteDue, fetchDues } = useDues(
    user?.id
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    }
  }, [error, toast]);

  const insights = useMemo(() => {
    const totalRepaid = dues.reduce((sum, due) => sum + Number(due.amount_paid || 0), 0);
    const totalOutstanding = dues.reduce(
      (sum, due) => sum + Math.max(0, Number(due.principal_amount || 0) - Number(due.amount_paid || 0)),
      0
    );
    const overdueCount = dues.filter((due) => due.status === "overdue").length;

    const borrowerTotals = new Map<string, { outstanding: number; status: Due["status"] }>();
    dues.forEach((due) => {
      const borrowerName = due.borrower_name || "Unknown";
      const current = borrowerTotals.get(borrowerName) || { outstanding: 0, status: due.status };
      current.outstanding += Math.max(0, Number(due.principal_amount || 0) - Number(due.amount_paid || 0));
      if (due.status === "overdue") {
        current.status = "overdue";
      }
      borrowerTotals.set(borrowerName, current);
    });

    const borrowerBreakdown = Array.from(borrowerTotals.entries())
      .map(([borrower, values]) => ({ borrower, ...values }))
      .filter((item) => item.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);

    return {
      totalRepaid,
      totalOutstanding,
      overdueCount,
      borrowerBreakdown,
      activeDuesCount: dues.filter((due) => due.status !== "paid").length,
    };
  }, [dues]);

  const handleCreateDue = async (input: {
    borrower_name: string;
    borrower_contact?: string | null;
    principal_amount: number;
    date_given: string;
    expected_return_date?: string | null;
    notes?: string | null;
  }) => {
    const result = await createDue(input);
    if (!result.success && result.error) {
      toast({ title: "Failed to create due", description: result.error, variant: "destructive" });
      return;
    }

    toast({
      title: "Due added",
      description: `Due recorded for ${input.borrower_name}.`,
    });
    setIsAddOpen(false);
  };

  const handleRefresh = async () => {
    await fetchDues();
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 sm:space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Dues</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/25">
                  Loans Given
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Track money lent, repayment progress, and overdue borrowers in real time.
              </p>
            </div>
            <Button size="sm" className="h-9 text-xs gap-1.5 shadow-xs" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Due
            </Button>
          </div>

          <DuesStatsCards
            totalOutstanding={insights.totalOutstanding}
            totalRepaid={insights.totalRepaid}
            overdueCount={insights.overdueCount}
            activeDuesCount={insights.activeDuesCount}
          />

          <Card className="shadow-sm border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-primary" />
                Per-borrower outstanding breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.borrowerBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">No outstanding borrower balances.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {insights.borrowerBreakdown.map((entry) => (
                    <div
                      key={entry.borrower}
                      className={`rounded-lg border px-3 py-2 ${
                        entry.status === "overdue"
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-border/70 bg-muted/20"
                      }`}
                    >
                      <p className="text-sm font-semibold truncate">{entry.borrower}</p>
                      <p
                        className={`text-xs mt-1 font-medium ${
                          entry.status === "overdue" ? "text-destructive" : "text-amber-700"
                        }`}
                      >
                        Owes {formatCurrency(entry.outstanding)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <DuesTable
            dues={dues}
            isLoading={isLoading}
            onUpdateDue={updateDue}
            onAddPayment={addPayment}
            onDeleteDue={deleteDue}
          />
        </motion.div>
      </PullToRefresh>

      <FloatingActionButton onClick={() => setIsAddOpen(true)} aria-label="Add Due" />

      <AddDueDialog open={isAddOpen} onOpenChange={setIsAddOpen} onCreate={handleCreateDue} />
    </DashboardLayout>
  );
};

export default Dues;
