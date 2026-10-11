import { useState, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CustomerProfile,
  CustomerTransaction,
  CustomerSavedCard,
} from "@/services/customerService";
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
  MessageCircle,
  FileText,
  CreditCard,
  Plus,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportTransactionsToCSV } from "@/utils/exportUtils";
import { customerService } from "@/services/customerService";
import { settingsService } from "@/services/settingsService";
import { whatsappService } from "@/services/whatsappService";
import { downloadReceiptPDF } from "@/utils/receiptPdf";
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
  isStaff?: boolean;
}

export const CustomerDetailDialog = ({
  customer,
  open,
  onOpenChange,
  userId,
  onCustomerUpdated,
  onCustomerDeleted,
  isStaff = false,
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
  const [isSendingWelcome, setIsSendingWelcome] = useState(false);
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null);

  // Saved cards state
  const [savedCards, setSavedCards] = useState<CustomerSavedCard[]>(
    customer?.saved_cards || []
  );
  const [activeCustomerId, setActiveCustomerId] = useState<string>(
    customer?.id || ""
  );

  useEffect(() => {
    if (customer) {
      setSavedCards(customer.saved_cards || []);
      setActiveCustomerId(customer.id);
    }
  }, [customer]);

  // Saved card add/edit modal state
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCardIdx, setEditingCardIdx] = useState<number | null>(null);
  const [customBankInput, setCustomBankInput] = useState("");
  const [cardForm, setCardForm] = useState({
    bank_name: "",
    card_type: "Visa",
    transaction_type: "withdrawal" as "withdrawal" | "repayment",
    customer_mode: "Offline" as "Offline" | "Online",
    sent_to: "",
  });
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Saved card delete dialog state
  const [deleteCardIdx, setDeleteCardIdx] = useState<number | null>(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  // Dynamic dropdown suggestions from Settings
  const availableBanks = useMemo(() => {
    const customBanks = settingsService.getBanks().map((b) => b.name);
    const defaultList = [
      "HDFC Bank",
      "SBI Card",
      "ICICI Bank",
      "Axis Bank",
      "Kotak Mahindra Bank",
      "RBL Bank",
      "IndusInd Bank",
      "IDFC FIRST Bank",
      "Yes Bank",
      "Bank of Baroda",
      "Standard Chartered",
      "Other",
    ];
    return Array.from(new Set([...customBanks, ...defaultList])).filter(Boolean);
  }, []);

  const availableCardTypes = useMemo(() => {
    const types = settingsService.getCardTypes().map((c) => c.name);
    const defaultList = [
      "RuPay",
      "Visa",
      "Mastercard",
      "Business Card",
      "AU Cards",
      "Amex & Diners",
      "Machine Swiping",
    ];
    return Array.from(new Set([...types, ...defaultList])).filter(Boolean);
  }, []);

  const availableRecipients = useMemo(() => {
    const recs = settingsService.getRecipients().map((r) => r.name);
    const defaultList = ["Self", "Upender", "Bharath"];
    return Array.from(new Set([...recs, ...defaultList])).filter(Boolean);
  }, []);

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

  const handleSendWelcome = async () => {
    if (!customer.phone) {
      toast({
        variant: "destructive",
        title: "No Phone Number",
        description: "This customer does not have a phone number saved.",
      });
      return;
    }
    setIsSendingWelcome(true);
    try {
      const res = await whatsappService.sendWelcome({
        customerName: customer.name,
        phone: customer.phone,
        userId,
        customerId: customer.id,
      });
      if (res.success) {
        toast({
          title: "WhatsApp Sent ✅",
          description: `Welcome message sent to ${customer.name}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "WhatsApp Failed",
          description: res.error || "Could not send message. Check WhatsApp server configuration.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to send WhatsApp message",
      });
    } finally {
      setIsSendingWelcome(false);
    }
  };

  const handleSendReceipt = async (t: CustomerTransaction) => {
    if (!customer.phone) {
      toast({
        variant: "destructive",
        title: "No Phone Number",
        description: "This customer does not have a phone number saved.",
      });
      return;
    }
    setSendingReceiptId(t.id);
    try {
      const res = await whatsappService.sendReceipt({
        customerName: customer.name,
        phone: customer.phone,
        userId,
        customerId: customer.id,
        transactionId: t.id,
        transaction: {
          amount: t.amount,
          portalName: t.portal_name,
          transactionDate: t.transaction_date,
          transactionType: t.transaction_type,
          commission: t.commission,
          cardType: t.card_type || undefined,
        },
      });
      if (res.success) {
        toast({
          title: "Receipt Sent ✅",
          description: `Transaction receipt sent to ${customer.name} via WhatsApp`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "WhatsApp Failed",
          description: res.error || "Could not send receipt. Check WhatsApp server configuration.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to send receipt",
      });
    } finally {
      setSendingReceiptId(null);
    }
  };

  const handleDownloadReceipt = (t: CustomerTransaction) => {
    downloadReceiptPDF({
      customerName: customer.name,
      customerPhone: customer.phone || undefined,
      transaction: {
        id: t.id,
        amount: t.amount,
        portalName: t.portal_name,
        transactionDate: t.transaction_date,
        transactionType: t.transaction_type,
        commission: t.commission,
        cardType: t.card_type || undefined,
        notes: t.notes || undefined,
      },
    });
    toast({
      title: "PDF Receipt Downloaded",
      description: `Receipt for ₹${t.amount.toLocaleString("en-IN")} downloaded successfully.`,
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

  const handleOpenAddCard = () => {
    setEditingCardIdx(null);
    setCustomBankInput("");
    setCardForm({
      bank_name: availableBanks[0] || "HDFC Bank",
      card_type: availableCardTypes[0] || "Visa",
      transaction_type: "withdrawal",
      customer_mode: "Offline",
      sent_to: "",
    });
    setIsCardModalOpen(true);
  };

  const handleOpenEditCard = (idx: number) => {
    const target = savedCards[idx];
    if (!target) return;
    setEditingCardIdx(idx);
    const isKnownBank = availableBanks.includes(target.bank_name);
    if (!isKnownBank && target.bank_name) {
      setCustomBankInput(target.bank_name);
      setCardForm({
        bank_name: "Other",
        card_type: target.card_type || "Visa",
        transaction_type:
          target.transaction_type?.toLowerCase() === "repayment"
            ? "repayment"
            : "withdrawal",
        customer_mode:
          target.customer_mode?.toLowerCase() === "online" ? "Online" : "Offline",
        sent_to: target.sent_to || "",
      });
    } else {
      setCustomBankInput("");
      setCardForm({
        bank_name: target.bank_name || availableBanks[0] || "HDFC Bank",
        card_type: target.card_type || "Visa",
        transaction_type:
          target.transaction_type?.toLowerCase() === "repayment"
            ? "repayment"
            : "withdrawal",
        customer_mode:
          target.customer_mode?.toLowerCase() === "online" ? "Online" : "Offline",
        sent_to: target.sent_to || "",
      });
    }
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async () => {
    if (!customer) return;
    let trimmedBank = cardForm.bank_name.trim();
    if (trimmedBank === "Other") {
      trimmedBank = customBankInput.trim();
    }
    if (!trimmedBank) {
      toast({
        title: "Bank name required",
        description: "Please specify or select the bank name for this card.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingCard(true);

    if (editingCardIdx !== null) {
      const { data, error } = await customerService.updateCustomerCard(
        activeCustomerId,
        editingCardIdx,
        {
          bank_name: trimmedBank,
          card_type: cardForm.card_type.trim() || "Visa",
          transaction_type: cardForm.transaction_type,
          customer_mode: cardForm.customer_mode,
          sent_to: cardForm.sent_to.trim() || undefined,
        }
      );
      setIsSavingCard(false);

      if (error) {
        toast({
          title: "Failed to update card",
          description: error.message || "An error occurred while updating the card.",
          variant: "destructive",
        });
        return;
      }

      setSavedCards(data || []);
      setIsCardModalOpen(false);
      toast({
        title: "Card updated ✅",
        description: `${trimmedBank} (${cardForm.card_type}) updated successfully.`,
      });
      onCustomerUpdated?.();
    } else {
      const { data, newCustomerId, error } = await customerService.addCustomerCard(
        activeCustomerId,
        {
          bank_name: trimmedBank,
          card_type: cardForm.card_type.trim() || "Visa",
          transaction_type: cardForm.transaction_type,
          customer_mode: cardForm.customer_mode,
          sent_to: cardForm.sent_to.trim() || undefined,
        },
        {
          userId,
          name: customer.name,
          phone: customer.phone,
        }
      );
      setIsSavingCard(false);

      if (error) {
        toast({
          title: "Failed to add card",
          description: error.message || "An error occurred while saving the card.",
          variant: "destructive",
        });
        return;
      }

      if (newCustomerId) {
        setActiveCustomerId(newCustomerId);
      }
      setSavedCards(data || []);
      setIsCardModalOpen(false);
      toast({
        title: "Card saved ✅",
        description: `${trimmedBank} (${cardForm.card_type}) added to ${customer.name}'s profile.`,
      });
      onCustomerUpdated?.();
    }
  };

  const handleDeleteCard = async () => {
    if (deleteCardIdx === null || !customer) return;
    const targetCard = savedCards[deleteCardIdx];

    setIsDeletingCard(true);
    const { data, error } = await customerService.deleteCustomerCard(
      activeCustomerId,
      deleteCardIdx
    );
    setIsDeletingCard(false);

    if (error) {
      toast({
        title: "Failed to delete card",
        description: error.message || "An error occurred while deleting the card.",
        variant: "destructive",
      });
      return;
    }

    setSavedCards(data || []);
    setDeleteCardIdx(null);
    toast({
      title: "Card deleted",
      description: `${targetCard?.bank_name || "Card"} was removed from profile.`,
    });
    onCustomerUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-3xl border-border/80 shadow-2xl">
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
                    className="text-xs h-8 gap-1.5 shadow-xs rounded-xl"
                    onClick={openEditDialog}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs h-8 gap-1.5 shadow-xs rounded-xl"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              )}
              {!isStaff && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-2.5 shadow-xs rounded-xl"
                  onClick={handleExportStatement}
                  title="Export History"
                  aria-label="Export History"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
              {customer.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-2.5 shadow-xs rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                  onClick={handleSendWelcome}
                  disabled={isSendingWelcome}
                  title="Send WhatsApp Welcome"
                  aria-label="Send WhatsApp Welcome"
                >
                  {isSendingWelcome ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Quick Metrics */}
          <div className={`grid grid-cols-2 ${isStaff ? "sm:grid-cols-3" : "sm:grid-cols-4"} gap-3`}>
            <Card className="bg-card/50 border-border/70 shadow-xs rounded-2xl">
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

            {!isStaff && (
              <Card className="bg-card/50 border-border/70 shadow-xs rounded-2xl">
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
            )}

            <Card className="bg-card/50 border-border/70 shadow-xs rounded-2xl">
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

            <Card className="bg-card/50 border-border/70 shadow-xs rounded-2xl">
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
                      className="text-[10px] px-1.5 py-0 bg-background/50 rounded-lg"
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Saved Cards Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <CreditCard className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Saved Cards
                </h3>
                <Badge variant="secondary" className="text-[11px] font-semibold px-2 py-0">
                  {savedCards.length}
                </Badge>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2.5 gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 shadow-xs"
                onClick={handleOpenAddCard}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Card
              </Button>
            </div>

            {savedCards.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">No saved cards for this customer</p>
                    <p className="text-[11px] text-muted-foreground">Save banks, card types, and modes to auto-fill future transactions in 1 click.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-3 gap-1 rounded-xl text-primary border-primary/30 hover:bg-primary/10 shrink-0"
                  onClick={handleOpenAddCard}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Card
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {savedCards.map((c, idx) => {
                  const isWithdrawal = c.transaction_type?.toLowerCase() === "withdrawal";
                  return (
                    <div
                      key={`${c.bank_name}-${c.card_type}-${idx}`}
                      className="p-3 rounded-2xl border border-border/80 bg-card/60 hover:bg-card/90 transition-all shadow-xs flex flex-col justify-between gap-2.5 group relative"
                    >
                      {/* Top row: Bank name + Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <CreditCard className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-foreground truncate" title={c.bank_name}>
                              {c.bank_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {c.card_type}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-lg"
                            title="Edit card"
                            onClick={() => handleOpenEditCard(idx)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-lg"
                            title="Delete card"
                            onClick={() => setDeleteCardIdx(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Badges / Details */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md font-semibold border ${
                            isWithdrawal
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {isWithdrawal ? "Withdrawal" : "Repayment"}
                        </span>

                        {c.customer_mode && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 rounded-md font-medium ${
                              c.customer_mode.toLowerCase() === "online"
                                ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                                : "bg-muted text-muted-foreground border-border/60"
                            }`}
                          >
                            {c.customer_mode.toLowerCase() === "online" ? "Online" : "Offline"}
                          </Badge>
                        )}

                        {c.sent_to && (
                          <span
                            className="inline-flex items-center text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md truncate max-w-[110px]"
                            title={`Sent to: ${c.sent_to}`}
                          >
                            → {c.sent_to}
                          </span>
                        )}

                        {(c.usage_count || 1) > 1 && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold ml-auto">
                            {c.usage_count}x
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
          <div className="hidden sm:block border border-border/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                  <TableHead className="text-xs font-semibold">Portal</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold">Card</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                  {!isStaff && <TableHead className="text-xs font-semibold text-right">Commission</TableHead>}
                  {!isStaff && <TableHead className="text-xs font-semibold text-right">Profit</TableHead>}
                  <TableHead className="text-xs font-semibold">Notes</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Receipt</TableHead>
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
                      {!isStaff && (
                        <TableCell className="text-xs py-2.5 text-right text-muted-foreground">
                          ₹{t.commission.toLocaleString("en-IN")}
                        </TableCell>
                      )}
                      {!isStaff && (
                        <TableCell className="text-xs py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹{t.profit.toLocaleString("en-IN")}
                        </TableCell>
                      )}
                      <TableCell className="text-xs py-2.5 text-muted-foreground max-w-[160px] truncate" title={t.notes || ""}>
                        {t.notes || "—"}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {customer.phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              title="Send Receipt via WhatsApp"
                              onClick={() => handleSendReceipt(t)}
                              disabled={sendingReceiptId === t.id}
                            >
                              {sendingReceiptId === t.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <MessageCircle className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Download PDF Receipt"
                            onClick={() => handleDownloadReceipt(t)}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
                  className="p-3.5 bg-muted/20 border border-border/70 rounded-2xl space-y-2 text-xs"
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

                  {!isStaff && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Profit:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{t.profit.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  {t.notes && (
                    <div className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/50 truncate">
                      {t.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                    {customer.phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1 px-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => handleSendReceipt(t)}
                        disabled={sendingReceiptId === t.id}
                      >
                        {sendingReceiptId === t.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <MessageCircle className="h-3 w-3 text-emerald-600" />
                        )}
                        <span>WhatsApp</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 px-2 text-muted-foreground"
                      onClick={() => handleDownloadReceipt(t)}
                    >
                      <FileText className="h-3 w-3" />
                      <span>PDF</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/80 bg-muted/20 flex justify-end">
          <Button variant="outline" size="sm" className="rounded-xl px-5" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer details used across your CRM records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name" className="text-xs font-semibold">
                Customer Name
              </Label>
              <Input
                id="customer-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Customer name"
                className="rounded-xl"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone" className="text-xs font-semibold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="customer-phone"
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number e.g. 9876543210"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSaving}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCustomer} disabled={isSaving} className="rounded-xl">
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

      {/* Add / Edit Saved Card Dialog */}
      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {editingCardIdx !== null ? "Edit Saved Card" : "Add Saved Card"}
            </DialogTitle>
            <DialogDescription>
              {editingCardIdx !== null
                ? `Update saved card details for ${customer.name}.`
                : `Add a card to ${customer.name}'s profile for fast 1-click auto-fill.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {/* Bank Name */}
            <div className="space-y-1.5">
              <Label htmlFor="card-bank-name" className="text-xs font-semibold">
                Bank Name *
              </Label>
              <Select
                value={cardForm.bank_name}
                onValueChange={(val) =>
                  setCardForm((prev) => ({ ...prev, bank_name: val }))
                }
              >
                <SelectTrigger id="card-bank-name" className="rounded-xl">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-xl">
                  {availableBanks.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cardForm.bank_name === "Other" && (
                <Input
                  value={customBankInput}
                  onChange={(e) => setCustomBankInput(e.target.value)}
                  placeholder="Enter custom bank name (e.g. Canara Bank)"
                  className="rounded-xl text-xs mt-1.5"
                  autoFocus
                />
              )}
            </div>

            {/* Card Type */}
            <div className="space-y-1.5">
              <Label htmlFor="card-type" className="text-xs font-semibold">
                Card Type
              </Label>
              <Select
                value={cardForm.card_type}
                onValueChange={(val) =>
                  setCardForm((prev) => ({ ...prev, card_type: val }))
                }
              >
                <SelectTrigger id="card-type" className="rounded-xl">
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableCardTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Transaction Type */}
              <div className="space-y-1.5">
                <Label htmlFor="card-tx-type" className="text-xs font-semibold">
                  Transaction Type
                </Label>
                <Select
                  value={cardForm.transaction_type}
                  onValueChange={(val: "withdrawal" | "repayment") =>
                    setCardForm((prev) => ({ ...prev, transaction_type: val }))
                  }
                >
                  <SelectTrigger id="card-tx-type" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="repayment">Repayment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mode: Offline / Online */}
              <div className="space-y-1.5">
                <Label htmlFor="card-mode" className="text-xs font-semibold">
                  Mode
                </Label>
                <Select
                  value={cardForm.customer_mode}
                  onValueChange={(val: "Offline" | "Online") =>
                    setCardForm((prev) => ({ ...prev, customer_mode: val }))
                  }
                >
                  <SelectTrigger id="card-mode" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Offline">Offline</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sent To (Recipients dropdown matching system UI) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="card-sent-to" className="text-xs font-semibold">
                  Sent To
                </Label>
                <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
              </div>
              <Select
                value={cardForm.sent_to || "none"}
                onValueChange={(val) =>
                  setCardForm((prev) => ({
                    ...prev,
                    sent_to: val === "none" ? "" : val,
                  }))
                }
              >
                <SelectTrigger id="card-sent-to" className="rounded-xl">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-xl">
                  <SelectItem value="none">None / Direct</SelectItem>
                  {availableRecipients.map((rec) => (
                    <SelectItem key={rec} value={rec}>
                      {rec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCardModalOpen(false)}
              disabled={isSavingCard}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCard}
              disabled={isSavingCard}
              className="rounded-xl"
            >
              {isSavingCard && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingCardIdx !== null ? "Update Card" : "Add Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Saved Card Alert Dialog */}
      <AlertDialog
        open={deleteCardIdx !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCardIdx(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved card?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCardIdx !== null && savedCards[deleteCardIdx] ? (
                <>
                  Are you sure you want to remove{" "}
                  <span className="font-semibold text-foreground">
                    {savedCards[deleteCardIdx].bank_name} ({savedCards[deleteCardIdx].card_type})
                  </span>{" "}
                  from {customer.name}&apos;s saved cards?
                </>
              ) : (
                "This card will be removed from customer's profile."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCard} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!isDeletingCard) {
                  handleDeleteCard();
                }
              }}
              disabled={isDeletingCard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {isDeletingCard && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
