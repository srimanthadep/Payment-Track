import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerProfile, CustomerTransaction } from "@/services/customerService";
import {
  Phone,
  Copy,
  Check,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  IndianRupee,
  TrendingUp,
  Percent,
  Clock,
  UserCheck,
  Edit3,
  Trash2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportTransactionsToCSV } from "@/utils/exportUtils";
import { customerService } from "@/services/customerService";
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

interface CustomerDetailDialogProps {
  customer: CustomerProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCustomerUpdated?: () => void;
  onCustomerDeleted?: () => void;
}

export const CustomerDetailDialog = ({
  customer,
  open,
  onOpenChange,
  userId,
  onCustomerUpdated,
  onCustomerDeleted,
}: CustomerDetailDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
  });

  if (!customer) return null;

  const isVirtualCustomer =
    customer.id.startsWith("phone:") || customer.id.startsWith("name:");

  const handleCopyPhone = () => {
    if (!customer.phone) return;
    navigator.clipboard.writeText(customer.phone);
    setCopied(true);
    toast({
      title: "Phone Copied",
      description: `${customer.phone} copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportStatement = () => {
    if (!customer.transactions || customer.transactions.length === 0) return;

    const exportData = customer.transactions.map((t) => ({
      transaction_date: t.transaction_date,
      portals: { name: t.portal_name },
      transaction_type: t.transaction_type,
      card_type: t.card_type,
      amount: t.amount,
      commission: t.commission,
      site_fee: t.site_fee,
      profit: t.profit,
      reference_number: "",
    }));

    const sanitizedName = customer.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    exportTransactionsToCSV(
      exportData,
      `Statement_${sanitizedName}_${format(new Date(), "yyyyMMdd")}.csv`
    );

    toast({
      title: "Statement Exported",
      description: `Statement downloaded for ${customer.name}.`,
    });
  };

  const initials = customer.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("") || "C";

  const openEditDialog = () => {
    setEditForm({
      name: customer.name,
      phone: customer.phone || "",
    });
    setIsEditOpen(true);
  };

  const handleSaveCustomer = async () => {
    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      toast({
        title: "Name required",
        description: "Customer name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const { error } = await customerService.updateCustomer(customer.id, {
      name: trimmedName,
      phone: editForm.phone.trim() || null,
    });
    setIsSaving(false);

    if (error) {
      toast({
        title: "Update failed",
        description: error.message || "Could not update customer.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Customer updated",
      description: `${trimmedName} was updated successfully.`,
    });
    setIsEditOpen(false);
    onCustomerUpdated?.();
  };

  const handleDeleteCustomer = async () => {
    setIsDeleting(true);
    const { error } = await customerService.deleteCustomer(userId, customer.id, {
      name: customer.name,
      phone: customer.phone,
    });
    setIsDeleting(false);

    if (error) {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete customer.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Customer deleted",
      description: `${customer.name} was removed.`,
    });
    setIsDeleteOpen(false);
    onOpenChange(false);
    onCustomerDeleted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header Banner */}
        <div className="p-5 sm:p-6 bg-muted/40 border-b border-border/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Avatar */}
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-primary-foreground font-bold text-lg sm:text-xl shadow-md ring-2 ring-primary/20 shrink-0">
                {initials}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                    {customer.name}
                  </DialogTitle>
                  <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                    {customer.totalTransactions} {customer.totalTransactions === 1 ? "Transaction" : "Transactions"}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground mt-1 flex-wrap">
                  {customer.phone ? (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <a
                        href={`tel:${customer.phone}`}
                        className="hover:text-primary transition-colors font-medium text-foreground"
                      >
                        {customer.phone}
                      </a>
                      <button
                        onClick={handleCopyPhone}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy phone"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/80 italic text-xs">
                      No phone on record
                    </span>
                  )}

                  <span className="hidden sm:inline text-muted-foreground/40">•</span>

                  <div className="flex items-center gap-1 text-xs">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      Since {format(new Date(customer.firstTransactionDate), "dd MMM yyyy")}
                    </span>
                  </div>

                  <span className="hidden sm:inline text-muted-foreground/40">•</span>

                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      Last: {format(new Date(customer.lastTransactionDate), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              {!isVirtualCustomer && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 gap-1.5 shadow-xs"
                    onClick={openEditDialog}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs h-8 gap-1.5 shadow-xs"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 shadow-xs"
                onClick={handleExportStatement}
              >
                <Download className="h-3.5 w-3.5" />
                Export History
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-card/50 border-border/70 shadow-xs">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Total Volume
                  </span>
                  <IndianRupee className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-base sm:text-lg font-bold mt-1 text-foreground">
                  ₹{customer.totalVolume.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/70 shadow-xs">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Total Profit
                  </span>
                  <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <div className="text-base sm:text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  ₹{customer.totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/70 shadow-xs">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Avg Ticket
                  </span>
                  <Percent className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="text-base sm:text-lg font-bold mt-1 text-foreground">
                  ₹{customer.avgTicketSize.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/70 shadow-xs">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Portals Used
                  </span>
                  <Layers className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {customer.portals.map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 bg-background/50"
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History Header */}
          <div className="flex items-center justify-between pt-1">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Transaction History ({customer.transactions.length})
            </h3>
            <span className="text-xs text-muted-foreground">
              Sorted newest first
            </span>
          </div>

          {/* Desktop Transactions Table */}
          <div className="hidden sm:block border border-border/80 rounded-xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                  <TableHead className="text-xs font-semibold">Portal</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold">Card</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Commission</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Profit</TableHead>
                  <TableHead className="text-xs font-semibold">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.transactions.map((t) => {
                  const isWithdrawal = t.transaction_type === "withdrawal";
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="text-xs py-2.5 font-medium whitespace-nowrap">
                        {format(new Date(t.transaction_date), "dd MMM yyyy, hh:mm a")}
                      </TableCell>
                      <TableCell className="text-xs py-2.5">
                        <Badge variant="outline" className="text-[11px] font-medium">
                          {t.portal_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isWithdrawal
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {isWithdrawal ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {isWithdrawal ? "Withdrawal" : "Repayment"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-muted-foreground">
                        {t.card_type || "—"}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-right font-bold">
                        ₹{t.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-right text-muted-foreground">
                        ₹{t.commission.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{t.profit.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-muted-foreground max-w-[160px] truncate" title={t.notes || ""}>
                        {t.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="sm:hidden space-y-2.5">
            {customer.transactions.map((t) => {
              const isWithdrawal = t.transaction_type === "withdrawal";
              return (
                <div
                  key={t.id}
                  className="p-3 bg-muted/20 border border-border/70 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {format(new Date(t.transaction_date), "dd MMM yyyy, hh:mm a")}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isWithdrawal
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isWithdrawal ? "Withdrawal" : "Repayment"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground">Portal & Card:</span>
                    <span className="font-medium text-foreground">
                      {t.portal_name} {t.card_type ? `• ${t.card_type}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-sm text-foreground">
                      ₹{t.amount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Profit:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{t.profit.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {t.notes && (
                    <div className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/50 truncate">
                      {t.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/80 bg-muted/20 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer details used across your CRM records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCustomer} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the customer profile from your directory. Transaction records stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!isDeleting) {
                  handleDeleteCustomer();
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
