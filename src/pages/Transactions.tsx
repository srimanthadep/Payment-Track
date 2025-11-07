import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog";
import { ManagePortalsDialog } from "@/components/portals/ManagePortalsDialog";
import { UploadPayoutDialog } from "@/components/transactions/UploadPayoutDialog";
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

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
          <div className="space-y-3">
          <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Transactions</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage all your payment transactions
            </p>
          </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="w-full sm:w-auto text-sm h-9 hidden sm:flex" onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" />
            Add Transaction
          </Button>
              <Button className="w-full sm:w-auto text-sm h-9" variant="secondary" onClick={() => setUploadOpen(true)}>
                Import Payouts
              </Button>
              <Button className="w-full sm:w-auto text-sm h-9" variant="outline" onClick={() => setManagePortalsOpen(true)}>
                Manage Portals
              </Button>
            </div>
        </div>

          <TransactionsTable userId={user.id} key={refreshKey} />
        
        <AddTransactionDialog 
          userId={user.id}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
            portalsRefreshKey={portalsRefreshKey}
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
            onOpenChange={setUploadOpen}
        />
        </motion.div>
      </PullToRefresh>
      <FloatingActionButton onClick={() => setIsDialogOpen(true)} />
    </DashboardLayout>
  );
};

export default Transactions;
