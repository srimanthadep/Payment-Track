import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DateSwitch, DateSwitchRange, PeriodType } from "@/components/transactions/DateSwitch";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";

import { expensesService, Expense, ExpenseStats } from "@/services/expensesService";
import { settingsService, ExpenseCategoryOption } from "@/services/settingsService";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { ExpenseStatsCards } from "@/components/expenses/ExpenseStatsCards";
import { ExpenseCategoryChart } from "@/components/expenses/ExpenseCategoryChart";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";

const Expenses = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [dateRange, setDateRange] = useState<DateSwitchRange>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  });
  const [activePeriod, setActivePeriod] = useState<PeriodType>("day");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  // Load Settings categories
  useEffect(() => {
    const updateCategories = () => {
      setCategories(settingsService.getExpenseCategories());
    };
    updateCategories();
    return settingsService.subscribe(updateCategories);
  }, []);

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await expensesService.getExpenses(user.id);
    setExpenses(data || []);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user, refreshKey, fetchExpenses]);

  // Realtime subscription for expenses table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("expenses-live-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchExpenses]);

  // Filtered by Date / Period Range
  const dateFilteredExpenses = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return expenses;
    return expenses.filter((exp) => {
      if (!exp.expense_date) return false;
      const d = new Date(exp.expense_date);
      if (dateRange.from && dateRange.to) {
        return d >= dateRange.from && d <= dateRange.to;
      }
      if (dateRange.from) {
        return d >= dateRange.from;
      }
      return true;
    });
  }, [expenses, dateRange]);

  // Overall & Filtered Stats
  const stats: ExpenseStats = useMemo(() => {
    return expensesService.calculateStats(expenses);
  }, [expenses]);

  const selectedDateLabel = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return "All Time";
    if (activePeriod === "day" && dateRange.from) {
      if (isToday(dateRange.from)) return `Today, ${format(dateRange.from, "dd MMM yyyy")}`;
      if (isYesterday(dateRange.from)) return `Yesterday, ${format(dateRange.from, "dd MMM yyyy")}`;
      return format(dateRange.from, "dd MMM yyyy");
    }
    if (activePeriod === "7d") return "Last 7 Days";
    if (activePeriod === "30d") return "Last 30 Days";
    if (activePeriod === "month" && dateRange.from) return format(dateRange.from, "MMMM yyyy");
    if (activePeriod === "90d") return "Last 90 Days";
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd MMM")} - ${format(dateRange.to, "dd MMM yyyy")}`;
    }
    return "Filtered Period";
  }, [dateRange, activePeriod]);

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
  };

  const handleRangeChange = (newRange: DateSwitchRange, newPeriod: PeriodType) => {
    setDateRange(newRange);
    setActivePeriod(newPeriod);
    setSelectedDate(newRange.from);
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                  Expenses
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/20">
                  Tracker
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Track all worker salaries, petrol, shop rent, current bills and overheads
              </p>
            </div>

            <div className="flex items-center">
              <DateSwitch
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                dateRange={dateRange}
                activePeriod={activePeriod}
                onRangeChange={handleRangeChange}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                className="text-sm h-9 gap-1.5 shadow-sm"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
              <Button
                variant="outline"
                className="text-sm h-9 text-xs sm:text-sm"
                onClick={() => navigate("/settings")}
              >
                Manage Categories
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{dateFilteredExpenses.length}</span> entries ({selectedDateLabel})
            </div>
          </div>

          {/* KPI Summary Cards */}
          <ExpenseStatsCards
            stats={stats}
            filteredExpenses={dateFilteredExpenses}
            selectedDateLabel={selectedDateLabel}
          />

          {/* Visual Breakdown Chart (if any expenses exist) */}
          {dateFilteredExpenses.length > 0 && (
            <ExpenseCategoryChart expenses={dateFilteredExpenses} />
          )}

          {/* Main Expenses Table */}
          <ExpensesTable
            expenses={dateFilteredExpenses}
            categories={categories}
            isLoading={isLoading}
            onRefresh={fetchExpenses}
          />
        </motion.div>
      </PullToRefresh>

      {/* Floating Action Button for mobile */}
      <FloatingActionButton
        onClick={() => setIsAddDialogOpen(true)}
        aria-label="Add Expense"
      />

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        userId={user.id}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchExpenses}
      />
    </DashboardLayout>
  );
};

export default Expenses;
