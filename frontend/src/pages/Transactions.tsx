import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog";
import { ManagePortalsDialog } from "@/components/portals/ManagePortalsDialog";
import { UploadPayoutDialog } from "@/components/transactions/UploadPayoutDialog";
import { DateSwitch } from "@/components/transactions/DateSwitch";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

const Transactions = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [managePortalsOpen, setManagePortalsOpen] = useState(false);
  const [portalsRefreshKey, setPortalsRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [portalSummary, setPortalSummary] = useState<{
    portalNames: string[];
    totalAmount: number;
    count: number;
  } | null>(null);

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
  };

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
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 sm:space-y-6"
        >
          {/* Header Row: Title on Left with Portal Status Card, DateSwitch on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                  Transactions
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Manage all your payment transactions
                </p>
              </div>

              {/* Status Card beside transaction header when portal is selected */}
              {portalSummary && portalSummary.portalNames.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full sm:w-auto inline-flex items-center justify-between gap-3 bg-gradient-to-r from-primary/15 via-primary/10 to-emerald-500/10 border border-primary/25 rounded-xl px-3.5 py-2 shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-md">
                      🏢 {portalSummary.portalNames.join(", ")}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Total ({portalSummary.count} txns)
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-foreground">
                        ₹{portalSummary.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex items-center">
              <DateSwitch
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="w-full sm:w-auto text-sm h-9 hidden sm:flex"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Transaction
            </Button>
            <Button
              className="w-full sm:w-auto text-sm h-9"
              variant="secondary"
              onClick={() => setUploadOpen(true)}
            >
              Import Payouts
            </Button>
            <Button
              className="w-full sm:w-auto text-sm h-9"
              variant="outline"
              onClick={() => setManagePortalsOpen(true)}
            >
              Manage Portals
            </Button>
          </div>

          {/* Transactions Table with Date Filter applied */}
          <TransactionsTable
            userId={user.id}
            selectedDate={selectedDate}
            onPortalFilterSummaryChange={setPortalSummary}
            key={`tx-table-${refreshKey}`}
          />

          <AddTransactionDialog
            userId={user.id}
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            portalsRefreshKey={portalsRefreshKey}
            onSuccess={(addedDate) => {
              setRefreshKey((k) => k + 1);
              if (addedDate) {
                setSelectedDate(addedDate);
              }
            }}
          />

          <ManagePortalsDialog
            open={managePortalsOpen}
            onOpenChange={(open) => {
              setManagePortalsOpen(open);
              if (!open) setPortalsRefreshKey((k) => k + 1);
            }}
          />

          <UploadPayoutDialog
            userId={user.id}
            open={uploadOpen}
            onOpenChange={(open) => {
              setUploadOpen(open);
              if (!open) setRefreshKey((k) => k + 1);
            }}
          />
        </motion.div>
      </PullToRefresh>
      <FloatingActionButton onClick={() => setIsDialogOpen(true)} />
    </DashboardLayout>
  );
};

export default Transactions;
