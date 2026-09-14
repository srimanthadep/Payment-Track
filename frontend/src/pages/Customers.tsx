import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { Button } from "@/components/ui/button";
import { Users, Plus, RefreshCw, UserPlus } from "lucide-react";
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
import { AddCustomerDialog } from "@/components/customers/AddCustomerDialog";
import { useRole } from "@/hooks/useRole";

const Customers = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isStaff, effectiveUserId } = useRole();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check URL query param for ?add=true to trigger Add Customer dialog
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setIsAddCustomerOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("add");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Listen for global open-add-customer event (e.g. from C shortcut)
  useEffect(() => {
    const handleOpenAdd = () => setIsAddCustomerOpen(true);
    window.addEventListener("open-add-customer", handleOpenAdd);
    return () => window.removeEventListener("open-add-customer", handleOpenAdd);
  }, []);

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
  const targetUserId = effectiveUserId || user?.id;

  const fetchCustomers = useCallback(async () => {
    if (!targetUserId) return;
    setIsLoading(true);
    const { data } = await customerService.getCustomers(targetUserId);
    setCustomers(data || []);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [targetUserId]);

  useEffect(() => {
    if (targetUserId) {
      fetchCustomers();
    }
  }, [targetUserId, refreshKey, fetchCustomers]);

  // Realtime subscription for live updates when transactions or customers change
  useEffect(() => {
    if (!targetUserId) return;

    const channel = supabase
      .channel("customers-realtime-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${targetUserId}`,
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
          filter: `user_id=eq.${targetUserId}`,
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
          table: "dues",
          filter: `user_id=eq.${targetUserId}`,
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, fetchCustomers]);

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
                className="h-9 text-xs gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setIsAddCustomerOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Customer</span>
              </Button>

              <Button
                variant="outline"
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
            isStaff={isStaff}
          />

          {/* Main Customers Table & Card List */}
          <CustomersTable
            customers={customers}
            isLoading={isLoading}
            onSelectCustomer={handleSelectCustomer}
            onAddTransactionClick={() => setIsAddTxnOpen(true)}
            isStaff={isStaff}
          />
        </motion.div>
      </PullToRefresh>

      {/* Floating Action Button on Mobile */}
      <FloatingActionButton
        onClick={() => setIsAddTxnOpen(true)}
        aria-label="Add Transaction"
      />

      {/* Customer Detail Dialog */}
      {targetUserId && (
        <CustomerDetailDialog
          customer={selectedCustomer}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          userId={targetUserId}
          isStaff={isStaff}
          onCustomerUpdated={() => {
            setRefreshKey((k) => k + 1);
          }}
          onCustomerDeleted={() => {
            setSelectedCustomer(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Add Customer Dialog (Standalone 2-input) */}
      {targetUserId && (
        <AddCustomerDialog
          open={isAddCustomerOpen}
          onOpenChange={setIsAddCustomerOpen}
          userId={targetUserId}
          onSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Add Transaction Dialog */}
      {targetUserId && (
        <AddTransactionDialog
          userId={targetUserId}
          open={isAddTxnOpen}
          onOpenChange={setIsAddTxnOpen}
          isStaff={isStaff}
          onSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default Customers;
