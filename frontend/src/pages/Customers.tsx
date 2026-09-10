import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { Button } from "@/components/ui/button";
import { Users, Plus, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import {
  customerService,
  CustomerProfile,
  CustomerSummaryStats,
} from "@/services/customerService";
import { CustomerStatsCards } from "@/components/customers/CustomerStatsCards";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerDetailDialog } from "@/components/customers/CustomerDetailDialog";
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog";

const Customers = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check auth session
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

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await customerService.getCustomers(user.id);
    setCustomers(data || []);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user, refreshKey, fetchCustomers]);

  // Realtime subscription for live updates when transactions or customers change
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("customers-realtime-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCustomers();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCustomers]);

  // Keep selectedCustomer updated if background refresh happens
  useEffect(() => {
    if (selectedCustomer) {
      const updated = customers.find((c) => c.id === selectedCustomer.id);
      if (updated) {
        setSelectedCustomer(updated);
      }
    }
  }, [customers, selectedCustomer]);

  const stats: CustomerSummaryStats = useMemo(() => {
    return customerService.calculateStats(customers);
  }, [customers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  const handleSelectCustomer = (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
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
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                  Customers
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  Directory
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Track client profiles, transaction history, and customer lifetime value
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-1.5 shadow-xs"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>

              <Button
                size="sm"
                className="h-9 text-xs gap-1.5 shadow-xs"
                onClick={() => setIsAddTxnOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Transaction</span>
              </Button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <CustomerStatsCards
            stats={stats}
            filteredCount={customers.length}
          />

          {/* Main Customers Table & Card List */}
          <CustomersTable
            customers={customers}
            isLoading={isLoading}
            onSelectCustomer={handleSelectCustomer}
            onAddTransactionClick={() => setIsAddTxnOpen(true)}
          />
        </motion.div>
      </PullToRefresh>

      {/* Floating Action Button on Mobile */}
      <FloatingActionButton
        onClick={() => setIsAddTxnOpen(true)}
        aria-label="Add Transaction"
      />

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        customer={selectedCustomer}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        userId={user.id}
        open={isAddTxnOpen}
        onOpenChange={setIsAddTxnOpen}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
        }}
      />
    </DashboardLayout>
  );
};

export default Customers;
