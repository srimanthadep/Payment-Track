import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog";
import { ManagePortalsDialog } from "@/components/portals/ManagePortalsDialog";
import { UploadPayoutDialog } from "@/components/transactions/UploadPayoutDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Transactions = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [managePortalsOpen, setManagePortalsOpen] = useState(false);
  const [portalsRefreshKey, setPortalsRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              Manage all your payment transactions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(true)}>
              Import Payouts
            </Button>
            <Button variant="outline" onClick={() => setManagePortalsOpen(true)}>
              Manage Portals
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        <TransactionsTable userId={user.id} />
        
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
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
