import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Download, Search, Trash2, Edit, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { TransactionFilters, FilterState } from "./TransactionFilters";
import { EditTransactionDialog } from "./EditTransactionDialog";
import { getCardTypeDisplayName, type CardType } from "@/utils/commissionCalculator";
import { exportToPDF } from "@/utils/pdfExport";
import { TransactionsTableSkeleton } from "@/components/ui/skeletons";
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

export const TransactionsTable = ({ userId }: TransactionsTableProps) => {
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
    amountRange: { min: null, max: null },
  });
  const [portals, setPortals] = useState<Array<{ id: string; name: string }>>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  const itemsPerPage = 20;

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
        .order("transaction_date", { ascending: false })
        .range(0, itemsPerPage - 1);

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
        setTransactions(data as Transaction[]);
        setFilteredTransactions(data as Transaction[]);
        setHasMore((data?.length || 0) === itemsPerPage);
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

    // Text search
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.portals.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.transaction_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Date range filter
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

      setFilteredTransactions(filtered);
    setDisplayedTransactions(filtered.slice(0, itemsPerPage));
    setPage(1);
    setHasMore(filtered.length > itemsPerPage);
  }, [searchQuery, transactions, filters]);

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
    const csvData = filteredTransactions.map((t) => [
      formatDate(t.transaction_date),
      t.portals.name,
      t.transaction_type,
      t.card_type ? getCardTypeDisplayName(t.card_type as CardType) : "",
      t.amount,
      t.commission,
      t.site_fee,
      t.profit,
      t.reference_number || "",
      t.status,
    ]);

    const headers = [
      "Date",
      "Portal",
      "Type",
      "Card Type",
      "Amount",
      "Commission",
      "Site Fee",
      "Profit",
      "Reference",
      "Status",
    ];

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString()}.csv`;
    a.click();

    toast({
      title: "Success",
      description: "Transactions exported to CSV",
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      transactions: filteredTransactions, // Export all filtered, not just displayed
      dateRange: filters.dateRange,
    });
    toast({
      title: "Success",
      description: "PDF report generated",
    });
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
        <Button onClick={exportToCSV} variant="outline" className="text-xs sm:text-sm h-9 px-3">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
        <Button onClick={handleExportPDF} variant="outline" className="text-xs sm:text-sm h-9 px-3">
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          Export PDF
        </Button>
        </div>
      </div>

      {/* Mobile: Export buttons and filters in integrated grid */}
      <div className="w-full">
        <div className="grid grid-cols-3 gap-2 sm:hidden mb-2">
          <Button onClick={exportToCSV} variant="outline" className="h-9 text-xs px-2">
            <Download className="mr-1 h-3 w-3" />
            CSV
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="h-9 text-xs px-2">
            <FileText className="mr-1 h-3 w-3" />
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
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 sm:hidden">
        {isLoading && filteredTransactions.length === 0 ? (
          <TransactionsTableSkeleton />
        ) : filteredTransactions.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">No transactions found</div>
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
                        <div className="text-xs font-medium truncate">{formatDate(transaction.transaction_date)}</div>
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
                      <span className="text-success font-semibold text-right">{formatCurrency(transaction.commission)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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
              <TableHead>Date</TableHead>
              <TableHead>Portal</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Card Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Site Fee</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Profit</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found</p>
                </TableCell>
              </TableRow>
            ) : (
                <>
                  {displayedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                      <TableCell><Checkbox checked={selectedIds.has(transaction.id)} onCheckedChange={() => toggleSelect(transaction.id)} /></TableCell>
                  <TableCell className="font-medium">
                    {formatDate(transaction.transaction_date)}
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
                      <TableCell className="text-right font-semibold hidden sm:table-cell">
                        {formatCurrency(transaction.commission)}
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
