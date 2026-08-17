import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DateSwitch } from "@/components/transactions/DateSwitch";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { format, isSameDay } from "date-fns";

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

  // Filtered by Date
  const dateFilteredExpenses = useMemo(() => {
    if (!selectedDate) return expenses;
    return expenses.filter((exp) => isSameDay(new Date(exp.expense_date), selectedDate));
  }, [expenses, selectedDate]);

  // Overall & Filtered Stats
  const stats: ExpenseStats = useMemo(() => {
    return expensesService.calculateStats(expenses);
  }, [expenses]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "All Time";
    return format(selectedDate, "dd MMM yyyy");
  }, [selectedDate]);

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
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
