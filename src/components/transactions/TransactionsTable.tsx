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
import { Download, Search, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
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
  transaction_type: string;
  amount: number;
  commission: number;
  site_fee: number;
  profit: number;
  transaction_date: string;
  reference_number: string | null;
  status: string;
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

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
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
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = transactions.filter(
        (t) =>
          t.portals.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.transaction_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions(transactions);
    }
  }, [searchQuery, transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
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
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
      setSelectAll(true);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
    setSelectAll(next.size === filteredTransactions.length && next.size > 0);
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
    const headers = [
      "Date",
      "Portal",
      "Type",
      "Amount",
      "Commission",
      "Site Fee",
      "Profit",
      "Reference",
      "Status",
    ];

    const csvData = filteredTransactions.map((t) => [
      formatDate(t.transaction_date),
      t.portals.name,
      t.transaction_type,
      t.amount,
      t.commission,
      t.site_fee,
      t.profit,
      t.reference_number || "",
      t.status,
    ]);

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

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 sm:pl-10 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
        {selectedIds.size > 0 && (
          <Button variant="destructive" onClick={bulkDelete} className="text-xs sm:text-sm h-9 px-3">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete ({selectedIds.size})
          </Button>
        )}
        <Button onClick={exportToCSV} variant="outline" className="text-xs sm:text-sm h-9 px-3">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </Button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 sm:hidden">
        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground text-sm">Loading...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">No transactions found</div>
        ) : (
          filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="rounded-lg border p-3 bg-card">
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
                    onClick={() => handleDeleteClick(transaction.id)}
                    className="text-destructive hover:text-destructive h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Type</span>
                  <span className="capitalize font-medium">{transaction.transaction_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Amount</span>
                  <span className="font-semibold">{formatCurrency(transaction.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Commission</span>
                  <span className="text-success font-medium">{formatCurrency(transaction.commission)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Profit</span>
                  <span className="text-success font-semibold">{formatCurrency(transaction.commission)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop/tablet table */}
      <div className="hidden sm:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"><Checkbox checked={selectAll} onCheckedChange={toggleSelectAll} /></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Portal</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Site Fee</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Profit</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell><Checkbox checked={selectedIds.has(transaction.id)} onCheckedChange={() => toggleSelect(transaction.id)} /></TableCell>
                  <TableCell className="font-medium">
                    {formatDate(transaction.transaction_date)}
                  </TableCell>
                  <TableCell>{transaction.portals.name}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.transaction_type === "withdrawal" ? "default" : "secondary"}>
                      {transaction.transaction_type}
                    </Badge>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(transaction.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
