import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ProfitChart } from "@/components/dashboard/ProfitChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { PortalComparisonChart } from "@/components/dashboard/PortalComparisonChart";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
    // Force re-render of child components
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

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
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Overview of your payment transactions and profits
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <StatsCards userId={user.id} key={refreshKey} />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            <ProfitChart userId={user.id} />
            <RecentTransactions userId={user.id} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <PortalComparisonChart userId={user.id} />
          </motion.div>
        </motion.div>
      </PullToRefresh>
    </DashboardLayout>
  );
};

export default Dashboard;
