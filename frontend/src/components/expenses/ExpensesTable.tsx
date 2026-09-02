import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Trash2,
  Edit2,
  Download,
  Filter,
  Receipt,
  Calendar as CalendarIcon,
  CreditCard,
  User,
  ArrowUpDown,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Expense, expensesService } from "@/services/expensesService";
import { ExpenseCategoryOption } from "@/services/settingsService";
import { EditExpenseDialog } from "./EditExpenseDialog";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { activityLogService } from "@/services/activityLogService";

interface ExpensesTableProps {
  expenses: Expense[];
  categories: ExpenseCategoryOption[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const ExpensesTable = ({
  expenses,
  categories,
  isLoading,
  onRefresh,
}: ExpensesTableProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Category Color Map
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      map[cat.name.toLowerCase()] = cat.color;
    });
    return map;
  }, [categories]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCategory = (exp.category || "").toLowerCase().includes(query);
        const matchesPayee = (exp.paid_to || "").toLowerCase().includes(query);
        const matchesNotes = (exp.notes || "").toLowerCase().includes(query);
        const matchesRef = (exp.reference_number || "").toLowerCase().includes(query);
        const matchesAmount = exp.amount.toString().includes(query);

        if (!matchesCategory && !matchesPayee && !matchesNotes && !matchesRef && !matchesAmount) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "all" && exp.category !== selectedCategory) {
        return false;
      }

      // Payment method filter
      if (selectedPaymentMethod !== "all" && exp.payment_method !== selectedPaymentMethod) {
        return false;
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategory, selectedPaymentMethod]);

  const allSelected =
    filteredExpenses.length > 0 &&
    filteredExpenses.every((e) => selectedIds.has(e.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredExpenses.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleDeleteConfirm = async () => {
    if (isBulkDeleting) {
      const ids = Array.from(selectedIds);
      const { error } = await expensesService.bulkDeleteExpenses(ids);
      if (error) {
        toast({ title: "Error", description: error, variant: "destructive" });
      } else {
        const count = ids.length;
        activityLogService.log(
          "expense.bulk_deleted",
          "expense",
          `Bulk deleted ${count} expense${count !== 1 ? "s" : ""}`,
          { count, ids }
        );
        toast({ title: "Deleted", description: `${ids.length} expense(s) removed` });
        setSelectedIds(new Set());
        onRefresh();
      }
    } else if (expenseToDelete) {
      const { error } = await expensesService.deleteExpense(expenseToDelete);
      if (error) {
        toast({ title: "Error", description: error, variant: "destructive" });
      } else {
        activityLogService.log(
          "expense.deleted",
          "expense",
          `Deleted expense (ID: ${expenseToDelete})`,
          { expense_id: expenseToDelete }
        );
        toast({ title: "Expense Deleted", description: "Expense removed successfully" });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(expenseToDelete);
          return next;
        });
        onRefresh();
      }
    }
    setDeleteDialogOpen(false);
    setExpenseToDelete(null);
    setIsBulkDeleting(false);
  };

  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      toast({ title: "No Data", description: "No expenses to export", variant: "destructive" });
      return;
    }
    expensesService.exportToCSV(
      filteredExpenses,
      `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    toast({ title: "Exported", description: "Expenses CSV downloaded successfully" });
  };

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses by notes, category, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Payment Method Filter */}
          <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="UPI / GPay / PhonePe">UPI</SelectItem>
              <SelectItem value="Bank Transfer / NEFT / IMPS">Bank Transfer</SelectItem>
              <SelectItem value="Credit / Debit Card">Card</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="h-9 text-xs gap-1.5"
              onClick={() => {
                setIsBulkDeleting(true);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.size})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main Table / Mobile Cards */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold">Category</TableHead>
                <TableHead className="text-xs font-semibold">Payment Mode</TableHead>
                <TableHead className="text-xs font-semibold">Description / Notes</TableHead>
                <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                <TableHead className="w-20 text-center text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} className="h-14 text-center">
                      <div className="h-4 bg-muted/60 rounded animate-pulse w-3/4 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0 border-0">
                    <EmptyState
                      title="No Expenses Found"
                      description="No expenses logged for this period or search filter. Try clearing filters or add a new expense."
                      className="m-4"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => {
                  const badgeColor =
                    categoryColorMap[expense.category.toLowerCase()] ||
                    "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-200";

                  return (
                    <TableRow
                      key={expense.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        selectedIds.has(expense.id) ? "bg-muted/50" : ""
                      }`}
                    >
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedIds.has(expense.id)}
                          onCheckedChange={() => handleToggleSelect(expense.id)}
                          aria-label={`Select ${expense.category}`}
                        />
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap font-medium text-muted-foreground">
                        {format(new Date(expense.expense_date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-semibold border text-xs px-2.5 py-0.5 rounded-md ${badgeColor}`}
                        >
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          {expense.payment_method || "Cash"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                        {expense.notes ? expense.notes : <span className="italic opacity-50">-</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm font-bold text-destructive">
                        -₹{expense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingExpense(expense)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setExpenseToDelete(expense.id);
                              setIsBulkDeleting(false);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-border">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Loading expenses...</div>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              title="No Expenses Found"
              description="No expenses logged for this period or search filter."
              className="m-3"
            />
          ) : (
            filteredExpenses.map((expense) => {
              const badgeColor =
                categoryColorMap[expense.category.toLowerCase()] ||
                "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-200";

              return (
                <div key={expense.id} className="p-3.5 space-y-2 hover:bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.has(expense.id)}
                        onCheckedChange={() => handleToggleSelect(expense.id)}
                      />
                      <Badge
                        variant="outline"
                        className={`font-semibold border text-xs px-2 py-0.5 rounded-md ${badgeColor}`}
                      >
                        {expense.category}
                      </Badge>
                    </div>
                    <span className="text-base font-bold text-destructive">
                      -₹{expense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(expense.expense_date), "dd MMM yyyy")}
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <CreditCard className="h-3 w-3" />
                      {expense.payment_method || "Cash"}
                    </div>
                    {expense.notes && (
                      <div className="col-span-2 text-xs text-muted-foreground bg-muted/30 rounded p-1.5 mt-1">
                        {expense.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setEditingExpense(expense)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setExpenseToDelete(expense.id);
                        setIsBulkDeleting(false);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditExpenseDialog
        expense={editingExpense}
        open={!!editingExpense}
        onOpenChange={(val) => !val && setEditingExpense(null)}
        onUpdated={() => {
          setEditingExpense(null);
          onRefresh();
        }}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {isBulkDeleting
                ? `Are you sure you want to permanently delete ${selectedIds.size} selected expense(s)? This action cannot be undone.`
                : "Are you sure you want to permanently delete this expense? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
