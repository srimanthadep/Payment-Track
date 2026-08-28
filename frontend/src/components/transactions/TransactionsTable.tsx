import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, Trash2, Edit, FileText, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { TransactionFilters, FilterState } from "./TransactionFilters";
import { EditTransactionDialog } from "./EditTransactionDialog";
import { getCardTypeDisplayName, type CardType } from "@/utils/commissionCalculator";
import { exportToPDF } from "@/utils/pdfExport";
import { exportTransactionsToCSV, exportTransactionsToExcel } from "@/utils/exportUtils";
import { TransactionsTableSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
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

interface TransactionsTableProps {
  userId: string;
  selectedDate?: Date | null;
  dateRange?: { from: Date | null; to: Date | null };
  onPortalFilterSummaryChange?: (summary: { portalNames: string[]; totalAmount: number; count: number } | null) => void;
}

interface Transaction {
  id: string;
  portal_id: string;
  transaction_type: string;
  amount: number;
  commission: number;
  site_fee: number;
  profit: number;
  transaction_date: string;
  reference_number: string | null;
  status: string;
  card_type: string | null;
  portals: {
    name: string;
  };
}

export const TransactionsTable = ({
  userId,
  selectedDate,
  dateRange,
  onPortalFilterSummaryChange,
}: TransactionsTableProps) => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: null, to: null },
    portals: [],
    status: [],
    transactionType: [],
    cardTypes: [],
    amountRange: { min: null, max: null },
  });
  const [sortConfig, setSortConfig] = useState<{
    key: "date" | "portal" | "type" | "card_type" | "amount" | "commission" | "site_fee" | "profit" | "status";
    direction: "asc" | "desc";
  }>({ key: "date", direction: "desc" });

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };
  const [portals, setPortals] = useState<Array<{ id: string; name: string }>>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  const itemsPerPage = 20;

  const totals = useMemo(() => {
    const amount = filteredTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const commission = filteredTransactions.reduce((sum, t) => sum + Number(t.commission || 0), 0);
    const siteFee = filteredTransactions.reduce((sum, t) => sum + Number(t.site_fee || 0), 0);
    const profit = filteredTransactions.reduce(
      (sum, t) =>
        sum +
        (t.profit !== undefined
          ? Number(t.profit)
          : Number(t.commission || 0) - Number(t.site_fee || 0)),
      0
    );
    return { amount, commission, siteFee, profit, count: filteredTransactions.length };
  }, [filteredTransactions]);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          portal_id,
          transaction_type,
          amount,
          commission,
          site_fee,
          profit,
          transaction_date,
          reference_number,
          status,
          card_type,
          portals (
            name
          )
        `)
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false });

      // Fetch portals for filters
      const { data: portalsData } = await supabase
        .from("portals")
        .select("id, name")
        .eq("is_active", true);
      
      if (portalsData) {
        setPortals(portalsData);
      }

      if (error) {
        console.error("Error fetching transactions:", error);
        toast({
          title: "Error",
          description: "Failed to fetch transactions",
          variant: "destructive",
        });
      } else {
        const sortedData = [...((data as Transaction[]) || [])].sort(
          (a, b) =>
            new Date(b.transaction_date).getTime() -
            new Date(a.transaction_date).getTime()
        );
        setTransactions(sortedData);
        setFilteredTransactions(sortedData);
        setHasMore(sortedData.length > itemsPerPage);
      }

      setIsLoading(false);
    };

    fetchTransactions();

    // Set up realtime subscription
    const channel = supabase
      .channel("transactions-table-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          fetchTransactions();
          if (payload.eventType === "INSERT") {
            const newTx = payload.new as any;
            toast({
              title: "⚡ Live Transaction",
              description: `₹${Number(newTx.amount).toLocaleString("en-IN")} ${newTx.transaction_type || ""} added to feed`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  useEffect(() => {
    let filtered = [...transactions];

    // Date range filter from DateSwitch or parent
    if (dateRange?.from || dateRange?.to) {
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        filtered = filtered.filter((t) => new Date(t.transaction_date) >= fromDate);
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter((t) => new Date(t.transaction_date) <= toDate);
      }
    } else if (selectedDate) {
      const targetYear = selectedDate.getFullYear();
      const targetMonth = selectedDate.getMonth();
      const targetDay = selectedDate.getDate();
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.transaction_date);
        return (
          txDate.getFullYear() === targetYear &&
          txDate.getMonth() === targetMonth &&
          txDate.getDate() === targetDay
        );
      });
    }

    // Text search
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.portals.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.transaction_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Secondary Date range filter from popover filters
    if (filters.dateRange.from) {
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.transaction_date);
        return txDate >= filters.dateRange.from!;
      });
    }
    if (filters.dateRange.to) {
      filtered = filtered.filter((t) => {
        const txDate = new Date(t.transaction_date);
        txDate.setHours(23, 59, 59, 999);
        return txDate <= filters.dateRange.to!;
      });
    }

    // Portal filter
    if (filters.portals.length > 0) {
      filtered = filtered.filter((t) => filters.portals.includes(t.portal_id));
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter((t) => filters.status.includes(t.status));
    }

    // Transaction type filter
    if (filters.transactionType.length > 0) {
      filtered = filtered.filter((t) => filters.transactionType.includes(t.transaction_type));
    }

    // Amount range filter
    if (filters.amountRange.min !== null) {
      filtered = filtered.filter((t) => t.amount >= filters.amountRange.min!);
    }
    if (filters.amountRange.max !== null) {
      filtered = filtered.filter((t) => t.amount <= filters.amountRange.max!);
    }

    // Card type filter (RuPay, Visa, Mastercard, Business, etc.)
    if (filters.cardTypes && filters.cardTypes.length > 0) {
      filtered = filtered.filter((t) => {
        if (!t.card_type) return false;
        const rawType = t.card_type.toLowerCase();
        const displayName = (getCardTypeDisplayName(t.card_type) || "").toLowerCase();

        return filters.cardTypes.some((selected) => {
          const sel = selected.toLowerCase();
          if (rawType === sel || displayName === sel) return true;
          if (sel === "rupay" && (rawType.includes("rupay") || displayName.includes("rupay"))) return true;
          if (sel === "visa" && (rawType.includes("visa") || displayName.includes("visa"))) return true;
          if (sel === "mastercard" && (rawType.includes("master") || displayName.includes("master"))) return true;
          if (sel === "business" && (rawType.includes("business") || displayName.includes("business"))) return true;
          if (sel === "au_card" && (rawType.includes("au") || displayName.includes("au"))) return true;
          if (sel === "amex_diners" && (rawType.includes("amex") || rawType.includes("diners") || displayName.includes("amex") || displayName.includes("diners"))) return true;
          if (sel === "machine_swiping" && (rawType.includes("swip") || rawType.includes("machine") || displayName.includes("swip") || displayName.includes("machine"))) return true;
          return false;
        });
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.key) {
        case "date":
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          break;
        case "amount":
          comparison = Number(a.amount || 0) - Number(b.amount || 0);
          break;
        case "commission":
          comparison = Number(a.commission || 0) - Number(b.commission || 0);
          break;
        case "site_fee":
          comparison = Number(a.site_fee || 0) - Number(b.site_fee || 0);
          break;
        case "profit": {
          const profitA = a.profit !== undefined ? Number(a.profit) : Number(a.commission || 0) - Number(a.site_fee || 0);
          const profitB = b.profit !== undefined ? Number(b.profit) : Number(b.commission || 0) - Number(b.site_fee || 0);
          comparison = profitA - profitB;
          break;
        }
        case "card_type": {
          const cardA = getCardTypeDisplayName(a.card_type || "").toLowerCase();
          const cardB = getCardTypeDisplayName(b.card_type || "").toLowerCase();
          comparison = cardA.localeCompare(cardB);
          break;
        }
        case "portal":
          comparison = (a.portals?.name || "").localeCompare(b.portals?.name || "");
          break;
        case "type":
          comparison = (a.transaction_type || "").localeCompare(b.transaction_type || "");
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        default:
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      }
      return sortConfig.direction === "desc" ? -comparison : comparison;
    });

    setFilteredTransactions(filtered);
    setDisplayedTransactions(filtered.slice(0, itemsPerPage));
    setPage(1);
    setHasMore(filtered.length > itemsPerPage);
  }, [searchQuery, transactions, filters, selectedDate, dateRange, sortConfig]);

  const portalFilterSummary = useMemo(() => {
    if (filters.portals.length === 0) return null;
    const matchedPortals = portals.filter((p) => filters.portals.includes(p.id));
    const portalNames = matchedPortals.map((p) => p.name);
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalProfit = filteredTransactions.reduce((sum, t) => sum + Number(t.profit || t.commission || 0), 0);
    return {
      portalNames,
      totalAmount,
      totalProfit,
      count: filteredTransactions.length,
    };
  }, [filters.portals, portals, filteredTransactions]);

  useEffect(() => {
    if (onPortalFilterSummaryChange) {
      onPortalFilterSummaryChange(
        portalFilterSummary
          ? {
              portalNames: portalFilterSummary.portalNames,
              totalAmount: portalFilterSummary.totalAmount,
              count: portalFilterSummary.count,
            }
          : null
      );
    }
  }, [portalFilterSummary, onPortalFilterSummaryChange]);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  useEffect(() => {
    if (inView && hasMore && !isLoading && filteredTransactions.length > displayedTransactions.length) {
      const nextPage = page + 1;
      const start = displayedTransactions.length;
      const end = start + itemsPerPage;
      setDisplayedTransactions(filteredTransactions.slice(0, end));
      setPage(nextPage);
      setHasMore(end < filteredTransactions.length);
    }
  }, [inView, hasMore, isLoading, filteredTransactions, displayedTransactions, page]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTimeParts = (date: string) => {
    if (!date) return { date: "-", time: "" };
    const d = new Date(date);
    if (isNaN(d.getTime())) return { date: "-", time: "" };
    const dateStr = d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { date: dateStr, time: timeStr };
  };

  const handleDeleteClick = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleEditUpdated = async () => {
    // Refresh transactions
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        id,
        portal_id,
        transaction_type,
        amount,
        commission,
        site_fee,
        profit,
        transaction_date,
        reference_number,
        status,
        portals (
          name
        )
      `)
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false });

    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionToDelete)
        .eq("user_id", userId); // Ensure user can only delete their own transactions

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });

      // Refresh transactions
      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select(`
          id,
          portal_id,
          transaction_type,
          amount,
          commission,
          site_fee,
          profit,
          transaction_date,
          reference_number,
          status,
          card_type,
          portals (
            name
          )
        `)
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false });

      if (fetchError) throw fetchError;

      setTransactions(data as Transaction[]);
      setFilteredTransactions(data as Transaction[]);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(displayedTransactions.map((t) => t.id)));
      setSelectAll(true);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
      setSelectAll(next.size === displayedTransactions.length && next.size > 0);
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in("id", Array.from(selectedIds))
        .eq("user_id", userId);
      if (error) throw error;
      toast({ title: "Deleted", description: `Deleted ${selectedIds.size} transactions` });
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to delete selected", variant: "destructive" });
    }
  };

  const exportToCSV = () => {
    try {
      if (!filteredTransactions || filteredTransactions.length === 0) {
        toast({
          title: "No Transactions",
          description: "There are no transactions to export.",
          variant: "destructive",
        });
        return;
      }
      exportTransactionsToCSV(filteredTransactions);
      toast({
        title: "Success",
        description: "Transactions exported to CSV",
      });
    } catch (err: any) {
      console.error("Failed to export CSV:", err);
      toast({
        title: "CSV Export Error",
        description: err.message || "Failed to generate CSV",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    try {
      if (!filteredTransactions || filteredTransactions.length === 0) {
        toast({
          title: "No Transactions",
          description: "There are no transactions to export.",
          variant: "destructive",
        });
        return;
      }
      exportTransactionsToExcel(filteredTransactions);
      toast({
        title: "Success",
        description: "Transactions exported to Excel (.xlsx)",
      });
    } catch (err: any) {
      console.error("Failed to export Excel:", err);
      toast({
        title: "Excel Export Error",
        description: err.message || "Failed to generate Excel file",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      if (!filteredTransactions || filteredTransactions.length === 0) {
        toast({
          title: "No Transactions",
          description: "There are no transactions to export.",
          variant: "destructive",
        });
        return;
      }
      await exportToPDF({
        transactions: filteredTransactions, // Export all filtered, not just displayed
        dateRange: filters.dateRange,
      });
      toast({
        title: "Success",
        description: "PDF report generated and downloaded",
      });
    } catch (err: any) {
      console.error("Failed to export PDF:", err);
      toast({
        title: "PDF Export Error",
        description: err.message || "Failed to generate PDF report",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 sm:pl-10 h-9 text-sm"
            />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-md border border-emerald-500/20 whitespace-nowrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Sync
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
        {selectedIds.size > 0 && (
          <Button variant="destructive" onClick={bulkDelete} className="text-xs sm:text-sm h-9 px-3">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete ({selectedIds.size})
          </Button>
        )}
        <Button onClick={exportToExcel} variant="outline" className="text-xs sm:text-sm h-9 px-3">
          <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
          Excel
        </Button>
        <Button onClick={exportToCSV} variant="outline" className="text-xs sm:text-sm h-9 px-3">
          <Download className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
          CSV
        </Button>
        <Button onClick={handleExportPDF} variant="outline" className="text-xs sm:text-sm h-9 px-3">
          <FileText className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
          PDF
        </Button>
        </div>
      </div>

      {/* Mobile: Export buttons and filters in integrated grid */}
      <div className="w-full">
        <div className="grid grid-cols-3 gap-2 sm:hidden mb-2">
          <Button onClick={exportToExcel} variant="outline" className="h-9 text-xs px-2">
            <FileSpreadsheet className="mr-1 h-3 w-3 text-emerald-600" />
            Excel
          </Button>
          <Button onClick={exportToCSV} variant="outline" className="h-9 text-xs px-2">
            <Download className="mr-1 h-3 w-3 text-blue-600" />
            CSV
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="h-9 text-xs px-2">
            <FileText className="mr-1 h-3 w-3 text-rose-600" />
            PDF
          </Button>
        </div>
        {selectedIds.size > 0 && (
          <div className="sm:hidden mb-2">
            <Button variant="destructive" onClick={bulkDelete} className="w-full text-xs h-9">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete ({selectedIds.size})
            </Button>
          </div>
        )}
        <TransactionFilters portals={portals} onFiltersChange={setFilters} />

        {portalFilterSummary && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-gradient-to-r from-primary/10 via-card to-accent/10 border border-primary/20 rounded-xl p-2.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 sm:p-2 bg-primary/15 text-primary rounded-lg font-bold text-xs sm:text-sm tracking-wide">
                🏢 {portalFilterSummary.portalNames.join(", ")}
              </div>
              <div>
                <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  Sum of Total Amount ({portalFilterSummary.count} txns)
                </div>
                <div className="text-sm sm:text-lg lg:text-xl font-bold tracking-tight text-foreground">
                  ₹{portalFilterSummary.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex flex-col text-right bg-background/80 px-2.5 py-1 rounded-lg border border-border/50">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Net Profit
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{portalFilterSummary.totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ ...filters, portals: [] })}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 sm:hidden">
        {isLoading && filteredTransactions.length === 0 ? (
          <TransactionsTableSkeleton />
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            title="No Transactions Found"
            description="No transactions match the selected date or active filters. Adjust your filters or add a new transaction."
            className="my-4"
          />
        ) : (
          <>
            <AnimatePresence>
              {displayedTransactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.02 }}
                  className="rounded-lg border p-3 bg-card"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Checkbox checked={selectedIds.has(transaction.id)} onCheckedChange={() => toggleSelect(transaction.id)} className="flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        {(() => {
                          const { date, time } = formatDateTimeParts(transaction.transaction_date);
                          return (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium">{date}</span>
                              {time && <span className="text-[10px] text-muted-foreground">{time}</span>}
                            </div>
                          );
                        })()}
                        <div className="text-[10px] text-muted-foreground truncate">{transaction.portals.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge
                        variant={
                          transaction.status === "completed"
                            ? "default"
                            : transaction.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {transaction.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(transaction)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(transaction.id)}
                        className="text-destructive hover:text-destructive h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">Type</span>
                      <span className="capitalize font-medium text-right truncate">{transaction.transaction_type}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">Card Type</span>
                      <span className="text-[10px] font-medium text-right truncate">
                        {transaction.card_type ? getCardTypeDisplayName(transaction.card_type as CardType) : "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">Amount</span>
                      <span className="font-semibold text-right">{formatCurrency(transaction.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">Commission</span>
                      <span className="text-success font-medium text-right">{formatCurrency(transaction.commission)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 col-span-2">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">Profit</span>
                      <span className="text-success font-semibold text-right">
                        {formatCurrency(
                          transaction.profit !== undefined
                            ? transaction.profit
                            : transaction.commission - transaction.site_fee
                        )}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Mobile Total Bar at the end */}
            {filteredTransactions.length > 0 && (
              <div className="rounded-xl border bg-muted/40 p-3.5 space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Total ({totals.count} {totals.count === 1 ? "txn" : "txns"})</span>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(totals.amount)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-border/50">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Commission</div>
                    <div className="font-semibold text-success">{formatCurrency(totals.commission)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Site Fee</div>
                    <div className="font-semibold text-destructive">{formatCurrency(totals.siteFee)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Net Profit</div>
                    <div className="font-bold text-success">{formatCurrency(totals.profit)}</div>
                  </div>
                </div>
              </div>
            )}
            {hasMore && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {isLoading && <div className="text-sm text-muted-foreground">Loading more...</div>}
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop/tablet table */}
      <div className="hidden sm:block rounded-md border overflow-x-auto">
        {isLoading && filteredTransactions.length === 0 ? (
          <TransactionsTableSkeleton />
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"><Checkbox checked={selectAll} onCheckedChange={toggleSelectAll} /></TableHead>
              <TableHead
                className="whitespace-nowrap cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center gap-1">
                  <span>Date</span>
                  {sortConfig.key === "date" ? (
                    sortConfig.direction === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("portal")}
              >
                <div className="flex items-center gap-1">
                  <span>Portal</span>
                  {sortConfig.key === "portal" ? (
                    sortConfig.direction === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("type")}
              >
                <div className="flex items-center gap-1">
                  <span>Type</span>
                  {sortConfig.key === "type" ? (
                    sortConfig.direction === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("card_type")}
              >
                <div className="flex items-center gap-1">
                  <span>Card Type</span>
                  {sortConfig.key === "card_type" ? (
                    sortConfig.direction === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Amount</span>
                  {sortConfig.key === "amount" ? (
                    sortConfig.direction === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("commission")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Commission</span>
                  {sortConfig.key === "commission" ? (
                    sortConfig.direction === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="text-right hidden sm:table-cell cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("site_fee")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Site Fee</span>
                  {sortConfig.key === "site_fee" ? (
                    sortConfig.direction === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="text-right hidden sm:table-cell cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("profit")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Profit</span>
                  {sortConfig.key === "profit" ? (
                    sortConfig.direction === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {sortConfig.key === "status" ? (
                    sortConfig.direction === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="p-0 border-0">
                  <EmptyState
                    title="No Transactions Found"
                    description="No transactions match the selected date or active filters. Try clearing search filters or changing the period tab."
                    className="m-4"
                  />
                </TableCell>
              </TableRow>
            ) : (
                <>
                  {displayedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                      <TableCell><Checkbox checked={selectedIds.has(transaction.id)} onCheckedChange={() => toggleSelect(transaction.id)} /></TableCell>
                  <TableCell className="whitespace-nowrap">
                    {(() => {
                      const { date, time } = formatDateTimeParts(transaction.transaction_date);
                      return (
                        <div className="flex flex-col">
                          <span className="font-medium text-xs text-foreground">{date}</span>
                          {time && (
                            <span className="text-[11px] text-muted-foreground leading-tight">
                              {time}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{transaction.portals.name}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.transaction_type?.toLowerCase() === "withdrawal" ? "default" : "secondary"}>
                      {transaction.transaction_type
                        ? transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)
                        : "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {transaction.card_type ? getCardTypeDisplayName(transaction.card_type as CardType) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right text-success">
                    {formatCurrency(transaction.commission)}
                  </TableCell>
                      <TableCell className="text-right text-destructive hidden sm:table-cell">
                    {formatCurrency(transaction.site_fee)}
                  </TableCell>
                      <TableCell className="text-right font-semibold text-success hidden sm:table-cell">
                        {formatCurrency(
                          transaction.profit !== undefined
                            ? transaction.profit
                            : transaction.commission - transaction.site_fee
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                    <Badge
                      variant={
                        transaction.status === "completed"
                          ? "default"
                          : transaction.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(transaction.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {hasMore && (
                    <TableRow>
                      <TableCell colSpan={10} ref={loadMoreRef} className="text-center py-4">
                        {isLoading && <div className="text-sm text-muted-foreground">Loading more...</div>}
                  </TableCell>
                </TableRow>
                  )}
                </>
            )}
          </TableBody>
          {filteredTransactions.length > 0 && (
            <TableFooter className="bg-muted/50 font-semibold border-t-2 border-border/80">
              <TableRow className="hover:bg-transparent">
                <TableCell><div className="w-[40px]" /></TableCell>
                <TableCell colSpan={3} className="font-bold text-foreground">
                  <div className="flex items-center gap-2">
                    <span>Total</span>
                    <Badge variant="outline" className="text-[11px] font-normal px-2 py-0">
                      {totals.count} {totals.count === 1 ? "transaction" : "transactions"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell" />
                <TableCell className="text-right font-bold text-foreground text-sm">
                  {formatCurrency(totals.amount)}
                </TableCell>
                <TableCell className="text-right font-bold text-success text-sm">
                  {formatCurrency(totals.commission)}
                </TableCell>
                <TableCell className="text-right font-bold text-destructive hidden sm:table-cell text-sm">
                  {formatCurrency(totals.siteFee)}
                </TableCell>
                <TableCell className="text-right font-bold text-success hidden sm:table-cell text-sm">
                  {formatCurrency(totals.profit)}
                </TableCell>
                <TableCell className="hidden md:table-cell" />
                <TableCell className="text-right" />
              </TableRow>
            </TableFooter>
          )}
        </Table>
        )}
      </div>

      {/* Mobile sticky bulk actions */}
      {selectedIds.size > 0 && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium">Selected: {selectedIds.size}</div>
            <Button variant="destructive" onClick={bulkDelete} className="h-8 text-xs px-3">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      )}

      <EditTransactionDialog
        transaction={editingTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdated={handleEditUpdated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
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
