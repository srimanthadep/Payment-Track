import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";

interface TransactionWithUser {
  id: string;
  amount: number;
  transaction_type: string;
  status: string;
  transaction_date: string;
  reference_number: string;
  commission: number;
  site_fee: number;
  profit: number;
  user_id: string;
  profiles: {
    email: string;
    full_name: string;
  };
  portals: {
    name: string;
  };
}

export const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<TransactionWithUser[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = transactions.filter(
        (tx) =>
          (tx.profiles?.full_name || tx.profiles?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (tx.portals?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.transaction_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (tx.reference_number || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions(transactions);
    }
  }, [searchQuery, transactions]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          portals(name)
        `)
        .order("transaction_date", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch profiles separately
      const txWithProfiles = await Promise.all(
        (data || []).map(async (tx) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", tx.user_id)
            .single();

          return {
            ...tx,
            profiles: profile || { email: "", full_name: "" },
          };
        })
      );

      setTransactions(txWithProfiles as TransactionWithUser[]);
      setFilteredTransactions(txWithProfiles as TransactionWithUser[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
        .eq("id", transactionToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });

      fetchTransactions();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "User",
      "Portal",
      "Type",
      "Amount",
      "Commission",
      "Site Fee",
      "Profit",
      "Reference",
      "Status",
    ];

    const csvData = filteredTransactions.map((tx) => [
      new Date(tx.transaction_date).toLocaleDateString(),
      tx.profiles?.full_name || tx.profiles?.email || "-",
      tx.portals?.name || "-",
      tx.transaction_type,
      tx.amount,
      tx.commission || 0,
      tx.site_fee || 0,
      tx.profit || 0,
      tx.reference_number || "",
      tx.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-transactions-${new Date().toISOString()}.csv`;
    a.click();

    toast({
      title: "Success",
      description: "Transactions exported to CSV",
    });
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading transactions...</p>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 sm:pl-10 h-9 text-sm"
          />
        </div>
        <Button className="w-full sm:w-auto text-sm h-9" onClick={exportToCSV} variant="outline">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm">Date</TableHead>
              <TableHead className="text-xs sm:text-sm">User</TableHead>
              <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Portal</TableHead>
              <TableHead className="text-xs sm:text-sm hidden md:table-cell">Type</TableHead>
              <TableHead className="text-xs sm:text-sm text-right">Amount</TableHead>
              <TableHead className="text-xs sm:text-sm text-right hidden lg:table-cell">Commission</TableHead>
              <TableHead className="text-xs sm:text-sm text-right hidden sm:table-cell">Site Fee</TableHead>
              <TableHead className="text-xs sm:text-sm text-right hidden sm:table-cell">Profit</TableHead>
              <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Reference</TableHead>
              <TableHead className="text-xs sm:text-sm hidden md:table-cell">Status</TableHead>
              <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No transactions found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs sm:text-sm">
                    {new Date(tx.transaction_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium text-xs sm:text-sm">
                    <div className="truncate max-w-[120px] sm:max-w-none">{tx.profiles?.full_name || tx.profiles?.email || "-"}</div>
                    <div className="text-[10px] text-muted-foreground sm:hidden mt-0.5">{tx.portals?.name || "-"}</div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{tx.portals?.name || "-"}</TableCell>
                  <TableCell className="capitalize text-xs sm:text-sm hidden md:table-cell">{tx.transaction_type}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm font-semibold">{formatCurrency(tx.amount)}</TableCell>
                  <TableCell className="text-right text-success text-xs sm:text-sm hidden lg:table-cell">
                    {formatCurrency(tx.commission || 0)}
                  </TableCell>
                  <TableCell className="text-right text-destructive text-xs sm:text-sm hidden sm:table-cell">
                    {formatCurrency(tx.site_fee || 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-xs sm:text-sm hidden sm:table-cell">
                    {formatCurrency(tx.commission || 0)}
                  </TableCell>
                  <TableCell className="font-mono text-xs sm:text-sm hidden lg:table-cell">
                    {tx.reference_number || "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={tx.status === "completed" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(tx.id)}
                      className="text-destructive hover:text-destructive h-7 w-7"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
