import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, TrendingUp, TrendingDown } from "lucide-react";
import { format, isToday } from "date-fns";
import {
  calculateCommission,
  type CardType,
} from "@/utils/commissionCalculator";
import { settingsService, CardTypeOption, BankOption, SiteOption } from "@/services/settingsService";
import { activityLogService } from "@/services/activityLogService";
import { CustomerCombobox, CustomerValue } from "@/components/customers/CustomerCombobox";
import { customerService, CustomerSavedCard } from "@/services/customerService";
import { transactionLearningService } from "@/services/transactionLearningService";

interface EditTransactionDialogProps {
  transaction: {
    id: string;
    user_id?: string;
    portal_id: string;
    transaction_type: string;
    amount: number;
    commission: number;
    commission_percent?: number | null;
    site_fee: number;
    site_fee_percent?: number | null;
    imps_charges?: number | null;
    profit?: number;
    reference_number?: string | null;
    status?: string;
    transaction_date: string;
    card_type: string | null;
    customer_mode?: string | null;
    bank_name?: string | null;
    site_name?: string | null;
    customer_id?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    notes?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

interface Portal {
  id: string;
  name: string;
  default_commission_rate: number;
  default_site_fee: number;
}

export const EditTransactionDialog = ({
  transaction,
  open,
  onOpenChange,
  onUpdated,
}: EditTransactionDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [customCards, setCustomCards] = useState<CardTypeOption[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [customerValue, setCustomerValue] = useState<CustomerValue | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    const updateDropdowns = () => {
      setCustomCards(settingsService.getCardTypes());
      setBanks(settingsService.getBanks());
      setSites(settingsService.getSites());
    };
    updateDropdowns();
    return settingsService.subscribe(updateDropdowns);
  }, []);

  const [formData, setFormData] = useState({
    portal_id: "",
    card_type: "" as CardType | string,
    transaction_type: "withdrawal" as "withdrawal" | "repayment",
    amount: "",
    commission_percent: "",
    site_fee_percent: "",
    imps_charges: "",
    customer_mode: "Offline" as "Online" | "Offline",
    bank_name: "",
    site_name: "",
    customer_name: "",
    customer_phone: "",
    transaction_date: new Date(),
  });

  useEffect(() => {
    const fetchPortals = async () => {
      const { data, error } = await supabase
        .from("portals")
        .select("*")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching portals:", error);
      } else {
        setPortals(data as Portal[]);
      }
    };

    fetchPortals();
  }, []);

  useEffect(() => {
    if (transaction) {
      let cardType = (transaction.card_type as CardType) || ("" as CardType | string);
      if (transaction.transaction_type === "repayment" && cardType) {
        if (cardType === "normal_visa" || cardType === "normal_rupay") {
          cardType = "all_visa_rupay";
        } else if (cardType === "hdfc_visa" || cardType === "hdfc_rupay") {
          cardType = "hdfc_visa_rupay";
        } else if (
          cardType === "normal_master" ||
          cardType === "hdfc_master" ||
          cardType === "au_card" ||
          cardType === "amex_diners" ||
          cardType === "machine_swiping"
        ) {
          cardType = "all_master_cards";
        } else if (cardType === "hdfc_business") {
          cardType = "all_business_cards";
        }
      }

      let custName = transaction.customer_name || "";
      let custPhone = transaction.customer_phone || "";
      if (!custName && transaction.notes) {
        const nameMatch = transaction.notes.match(/Customer:\s*([^|]+)/i);
        const phoneMatch = transaction.notes.match(/Phone:\s*([^|]+)/i);
        if (nameMatch) custName = nameMatch[1].trim();
        if (phoneMatch) custPhone = phoneMatch[1].trim();
      }

      if (transaction.customer_id || custName || custPhone) {
        setCustomerValue({
          id: transaction.customer_id || null,
          name: custName,
          phone: custPhone,
          isNew: !transaction.customer_id,
        });
      } else {
        setCustomerValue(null);
      }

      // 1. Parse commission_percent & site_fee_percent
      let commPct = "";
      let feePct = "";

      if (transaction.commission_percent !== undefined && transaction.commission_percent !== null && Number(transaction.commission_percent) > 0) {
        commPct = Number(transaction.commission_percent).toString();
      }
      if (transaction.site_fee_percent !== undefined && transaction.site_fee_percent !== null && Number(transaction.site_fee_percent) > 0) {
        feePct = Number(transaction.site_fee_percent).toString();
      }

      // Check notes for explicitly saved percentages: "Commission: 2.7%" / "Site Fee: 2.31%"
      if (transaction.notes) {
        const commMatch = transaction.notes.match(/Commission:\s*([\d.]+)%/i);
        const feeMatch = transaction.notes.match(/Site Fee:\s*([\d.]+)%/i);
        if (!commPct && commMatch) commPct = commMatch[1];
        if (!feePct && feeMatch) feePct = feeMatch[1];
      }

      const amt = Number(transaction.amount || 0);
      // Fallback to calculation if not in notes: (commission / amount) * 100
      if (!commPct && amt > 0 && transaction.commission !== undefined && transaction.commission !== null) {
        const calculated = (Number(transaction.commission) / amt) * 100;
        commPct = parseFloat(calculated.toFixed(4)).toString();
      }
      if (!feePct && amt > 0 && transaction.site_fee !== undefined && transaction.site_fee !== null && Number(transaction.site_fee) > 0) {
        const calculated = (Number(transaction.site_fee) / amt) * 100;
        feePct = parseFloat(calculated.toFixed(4)).toString();
      }

      // 2. Parse Customer Mode
      let custMode: "Online" | "Offline" = "Offline";
      if (transaction.customer_mode === "Online" || transaction.customer_mode === "Offline") {
        custMode = transaction.customer_mode;
      } else if (transaction.notes) {
        const modeMatch = transaction.notes.match(/Mode:\s*(Online|Offline)/i);
        if (modeMatch) custMode = modeMatch[1] as "Online" | "Offline";
      }

      // 3. Parse Bank Name
      let bank = transaction.bank_name || "";
      if (!bank && transaction.notes) {
        const bankMatch = transaction.notes.match(/Bank:\s*([^|]+)/i);
        if (bankMatch) bank = bankMatch[1].trim();
      }

      // 4. Parse Site Name
      let site = (transaction as any).site_name || "";
      if (!site && transaction.notes) {
        const siteMatch = transaction.notes.match(/Site:\s*([^|]+)/i);
        if (siteMatch) site = siteMatch[1].trim();
      }

      // 5. Parse IMPS / NEFT Charges
      let impsChargesStr = "";
      if (transaction.imps_charges !== undefined && transaction.imps_charges !== null) {
        impsChargesStr = transaction.imps_charges.toString();
      } else if (transaction.notes) {
        const impsMatch = transaction.notes.match(/IMPS(?:\s*\/\s*NEFT)?(?:\s*Charges)?:\s*₹?\s*([\d.]+)/i);
        if (impsMatch) impsChargesStr = impsMatch[1];
      }

      setFormData({
        portal_id: transaction.portal_id || "",
        card_type: cardType,
        transaction_type: (transaction.transaction_type?.toLowerCase() === "repayment" ? "repayment" : "withdrawal") as "withdrawal" | "repayment",
        amount: transaction.amount ? transaction.amount.toString() : "",
        commission_percent: commPct,
        site_fee_percent: feePct,
        imps_charges: impsChargesStr,
        customer_mode: custMode,
        bank_name: bank,
        site_name: site,
        customer_name: custName,
        customer_phone: custPhone,
        transaction_date: transaction.transaction_date
          ? new Date(transaction.transaction_date)
          : new Date(),
      });
    }
  }, [transaction]);

  // Calculate commission amount in rupees
  const commissionAmount = useMemo(() => {
    const amount = parseFloat(formData.amount);
    const percent = parseFloat(formData.commission_percent);
    if (!isNaN(amount) && !isNaN(percent) && amount > 0 && percent > 0) {
      return (amount * percent) / 100;
    }
    return 0;
  }, [formData.amount, formData.commission_percent]);

  // Calculate site fee amount in rupees
  const siteFeeAmount = useMemo(() => {
    const amount = parseFloat(formData.amount);
    const percent = parseFloat(formData.site_fee_percent);
    if (!isNaN(amount) && !isNaN(percent) && amount > 0 && percent > 0) {
      return (amount * percent) / 100;
    }
    return 0;
  }, [formData.amount, formData.site_fee_percent]);

  // Calculate IMPS / NEFT charges in rupees
  const impsChargesAmount = useMemo(() => {
    const imps = parseFloat(formData.imps_charges);
    if (!isNaN(imps) && imps > 0) {
      return imps;
    }
    return 0;
  }, [formData.imps_charges]);

  // Auto calculate profit: Commission - Site Fee - IMPS Charges
  const profit = useMemo(() => {
    return commissionAmount - siteFeeAmount - impsChargesAmount;
  }, [commissionAmount, siteFeeAmount, impsChargesAmount]);

  const handleSelectCustomerCard = (card: CustomerSavedCard) => {
    const tType = (card.transaction_type?.toLowerCase() === "repayment" ? "repayment" : "withdrawal") as "withdrawal" | "repayment";
    const cType = card.card_type || formData.card_type;
    const cMode = (card.customer_mode === "Online" || card.customer_mode === "Offline" ? card.customer_mode : "Offline") as "Online" | "Offline";
    const bName = card.bank_name || formData.bank_name;

    // Resolve sent_to / portal
    const resolvedSentTo =
      card.sent_to ||
      transactionLearningService.getSentToForCard({
        bankName: bName,
        cardType: cType,
        customerId: customerValue?.id || undefined,
        customerName: customerValue?.name || undefined,
      }) || "";

    let matchedPortalId = formData.portal_id;
    if (resolvedSentTo) {
      const matchingPortal = portals.find(
        (p) => p.name.trim().toLowerCase() === resolvedSentTo.trim().toLowerCase() || p.id === resolvedSentTo
      );
      if (matchingPortal) {
        matchedPortalId = matchingPortal.id;
      }
    }

    settingsService.recordDropdownSelection("transactionTypes", tType);
    if (cType) settingsService.recordDropdownSelection("cardTypes", cType);
    if (bName) settingsService.recordDropdownSelection("banks", bName);

    setFormData((prev) => ({
      ...prev,
      transaction_type: tType,
      card_type: cType,
      customer_mode: cMode,
      bank_name: bName,
      portal_id: matchedPortalId || prev.portal_id,
    }));

    toast({
      title: "Card Selected 💳",
      description: `${bName} (${cType})${resolvedSentTo ? ` • Sent to: ${resolvedSentTo}` : ""} auto-filled.`,
    });
  };

  const handlePortalChange = (portalId: string) => {
    const portal = portals.find((p) => p.id === portalId);
    setFormData((prev) => ({
      ...prev,
      portal_id: portalId,
      site_fee_percent: prev.site_fee_percent || (portal?.default_site_fee ? portal.default_site_fee.toString() : ""),
    }));
  };

  const handleCardTypeChange = (cardType: string) => {
    if (cardType) {
      settingsService.recordDropdownSelection("cardTypes", cardType);
    }
    setFormData((prev) => ({
      ...prev,
      card_type: cardType,
    }));
  };

  const handleTransactionTypeChange = (transactionType: "withdrawal" | "repayment") => {
    settingsService.recordDropdownSelection("transactionTypes", transactionType);
    setFormData((prev) => ({
      ...prev,
      transaction_type: transactionType,
      card_type: "",
    }));
  };

  const handleAmountChange = (amount: string) => {
    setFormData((prev) => ({
      ...prev,
      amount,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!formData.card_type) {
      toast({
        title: "Error",
        description: "Please select a card type",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const selectedPortal = portals.find((p) => p.id === formData.portal_id);

    let customerId: string | null = null;
    let customerName: string | null = null;
    let customerPhone: string | null = null;

    if (customerValue && (customerValue.name?.trim() || customerValue.phone?.trim())) {
      customerName = customerValue.name.trim() || null;
      customerPhone = customerValue.phone.trim() || null;

      if (customerValue.id) {
        customerId = customerValue.id;
        customerService.updateCustomer(customerValue.id, {
          name: customerValue.name,
          phone: customerValue.phone,
        }).catch((err) => console.warn("Failed to update customer:", err));
      } else {
        const effectiveUserId = transaction.user_id || currentUserId;
        if (effectiveUserId) {
          const { data: newCust } = await customerService.createCustomer(
            effectiveUserId,
            customerValue.name || "Customer",
            customerValue.phone || null
          );
          if (newCust) {
            customerId = newCust.id;
          }
        }
      }
    }

    // Auto-save card to customer profile if bank_name is provided
    if (customerId && formData.bank_name) {
      customerService.saveCustomerCard(customerId, {
        bank_name: formData.bank_name,
        card_type: formData.card_type,
        transaction_type: formData.transaction_type,
        customer_mode: formData.customer_mode,
        sent_to: selectedPortal?.name || "",
      }).catch((err) => console.warn("Failed to save customer card:", err));
    }

    const commPercent = parseFloat(formData.commission_percent) || 0;
    const feePercent = parseFloat(formData.site_fee_percent) || 0;
    const commAmount = (parseFloat(formData.amount) * commPercent) / 100;
    const feeAmount = (parseFloat(formData.amount) * feePercent) / 100;
    const impsAmount = parseFloat(formData.imps_charges) || 0;
    const profitAmount = commAmount - feeAmount - impsAmount;

    let notesStr = `Sent to: ${selectedPortal?.name || "Portal"} | Mode: ${formData.customer_mode}${
      formData.site_name ? ` | Site: ${formData.site_name}` : ""
    }${
      formData.bank_name ? ` | Bank: ${formData.bank_name}` : ""
    } | Commission: ${commPercent}%${
      formData.site_fee_percent ? ` | Site Fee: ${formData.site_fee_percent}%` : ""
    }${
      impsAmount > 0 ? ` | IMPS Charges: ₹${impsAmount}` : ""
    }`;
    if (customerName) {
      notesStr += ` | Customer: ${customerName}`;
    }
    if (customerPhone) {
      notesStr += ` | Phone: ${customerPhone}`;
    }

    const updatePayload = {
      portal_id: formData.portal_id,
      card_type: formData.card_type,
      transaction_type: formData.transaction_type.toLowerCase(),
      amount: parseFloat(formData.amount),
      commission: commAmount,
      commission_percent: commPercent,
      site_fee: feeAmount,
      site_fee_percent: feePercent,
      imps_charges: impsAmount,
      transaction_date: formData.transaction_date.toISOString(),
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_mode: formData.customer_mode,
      bank_name: formData.bank_name || null,
      site_name: formData.site_name || null,
      notes: notesStr,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("transactions")
      .update(updatePayload)
      .eq("id", transaction.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
      onUpdated();
      onOpenChange(false);

      try {
        activityLogService.log(
          "transaction.updated",
          "transaction",
          `Edited transaction — Amount: ₹${parseFloat(formData.amount).toLocaleString("en-IN")}, Type: ${formData.transaction_type}, Mode: ${formData.customer_mode}${formData.site_name ? `, Site: ${formData.site_name}` : ""}${formData.bank_name ? `, Bank: ${formData.bank_name}` : ""}${commPercent ? `, Commission: ${commPercent}%` : ""}${feePercent ? `, Site Fee: ${feePercent}%` : ""}${customerName ? `, Customer: ${customerName}` : ""}`,
          {
            transaction_id: transaction.id,
            old_amount: transaction.amount,
            new_amount: parseFloat(formData.amount),
            transaction_type: formData.transaction_type,
            card_type: formData.card_type,
            customer_mode: formData.customer_mode,
            bank_name: formData.bank_name,
            site_name: formData.site_name,
            commission_percent: commPercent,
            site_fee_percent: feePercent,
            customer_name: customerName,
            customer_phone: customerPhone,
          }
        );
        // Update learning engine with edited transaction
        transactionLearningService.recordNewTransaction({
          id: transaction.id,
          card_type: formData.card_type,
          transaction_type: formData.transaction_type,
          sent_to: selectedPortal?.name || "Portal",
          site_name: formData.site_name,
          bank_name: formData.bank_name,
          customer_mode: formData.customer_mode,
          customer_name: customerName || undefined,
          customer_id: customerId || undefined,
          amount: parseFloat(formData.amount),
          commission_percent: commPercent,
          site_fee_percent: feePercent,
          imps_charges: impsAmount,
          transaction_date: formData.transaction_date,
        });

        // Record dropdown selections for updated transaction
        if (formData.site_name) settingsService.recordDropdownSelection("sites", formData.site_name);
        if (formData.bank_name) settingsService.recordDropdownSelection("banks", formData.bank_name);
        if (formData.card_type) settingsService.recordDropdownSelection("cardTypes", formData.card_type);
        if (formData.transaction_type) settingsService.recordDropdownSelection("transactionTypes", formData.transaction_type);
      } catch (postErr) {
        console.warn("Post-update processing error (non-fatal):", postErr);
      }
    }
  };

  if (!transaction) return null;

  const hasEnteredCommission = Boolean(formData.amount && formData.commission_percent);
  const selectedPortal = portals.find((p) => p.id === formData.portal_id);
  const isChummi = ["self", "chummi"].includes(selectedPortal?.name?.trim().toLowerCase() || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/50 shrink-0 text-left">
          <DialogTitle className="text-lg font-bold">Edit Transaction</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update transaction details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3.5 sleek-scrollbar">
            {/* 1. Customer Details & Saved Cards (TOP for all transactions) */}
            <div className="bg-muted/30 border border-border/70 rounded-xl p-3 space-y-2">
              <CustomerCombobox
                userId={transaction.user_id || currentUserId}
                value={customerValue}
                onChange={setCustomerValue}
                onSelectCard={handleSelectCustomerCard}
                selectedCard={{
                  bank_name: formData.bank_name,
                  card_type: formData.card_type,
                }}
                disabled={isLoading}
              />
            </div>

            {/* 2. Date & Amount (Side-by-side grid, matching Add Transaction) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tx-date">Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-tx-date"
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-medium h-10 px-3 border-input bg-background hover:bg-accent/50"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">
                      {isToday(formData.transaction_date)
                        ? `Today (${format(formData.transaction_date, "dd MMM")})`
                        : format(formData.transaction_date, "dd MMM yyyy")}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 rounded-2xl shadow-xl border-border/80"
                  align="start"
                >
                  <div className="p-1">
                    <Calendar
                      mode="single"
                      selected={formData.transaction_date}
                      onSelect={(date) => {
                        if (date) {
                          const now = new Date();
                          const adjustedDate = new Date(
                            date.getFullYear(),
                            date.getMonth(),
                            date.getDate(),
                            now.getHours(),
                            now.getMinutes(),
                            now.getSeconds()
                          );
                          setFormData({
                            ...formData,
                            transaction_date: adjustedDate,
                          });
                          setCalendarOpen(false);
                        }
                      }}
                      initialFocus
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          transaction_date: new Date(),
                        });
                        setCalendarOpen(false);
                      }}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Set Today
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount (₹)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 2. Transaction Type & Card Type (Side-by-side grid) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Transaction Type</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={handleTransactionTypeChange}
                required
              >
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="repayment">Repayment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-card_type">Card Type</Label>
              <Select
                value={formData.card_type}
                onValueChange={handleCardTypeChange}
                required
              >
                <SelectTrigger id="edit-card_type">
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {customCards.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                  {formData.card_type &&
                    !customCards.some(
                      (c) => c.name.toLowerCase() === (formData.card_type as string).toLowerCase()
                    ) && (
                      <SelectItem value={formData.card_type}>
                        {formData.card_type}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. Site & Customer Mode */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label
                htmlFor="edit-site_name"
                className="text-xs sm:text-sm font-medium truncate block"
              >
                Site <span className="text-[10px] font-normal text-muted-foreground"><span className="hidden sm:inline">(Optional)</span><span className="sm:hidden">(Opt)</span></span>
              </Label>
              <Select
                value={formData.site_name || "none"}
                onValueChange={(val) => {
                  if (val && val !== "none") {
                    settingsService.recordDropdownSelection("sites", val);
                  }
                  setFormData((prev) => ({ ...prev, site_name: val === "none" ? "" : val }));
                }}
              >
                <SelectTrigger id="edit-site_name">
                  <SelectValue placeholder="Select site (Optional)" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">-- None / Direct --</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label
                htmlFor="edit-customer_mode"
                className="text-xs sm:text-sm font-medium truncate block"
              >
                Customer Mode
              </Label>
              <Select
                value={formData.customer_mode}
                onValueChange={(val: "Online" | "Offline") =>
                  setFormData((prev) => ({ ...prev, customer_mode: val }))
                }
              >
                <SelectTrigger id="edit-customer_mode">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Offline">Offline</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label
              htmlFor="edit-bank_name"
              className="text-xs sm:text-sm font-medium truncate block"
            >
              Bank Credit Card <span className="text-[10px] font-normal text-muted-foreground"><span className="hidden sm:inline">(Optional)</span><span className="sm:hidden">(Opt)</span></span>
            </Label>
            <Select
              value={formData.bank_name || "none"}
              onValueChange={(val) => {
                if (val && val !== "none") {
                  settingsService.recordDropdownSelection("banks", val);
                }
                setFormData((prev) => ({ ...prev, bank_name: val === "none" ? "" : val }));
              }}
            >
              <SelectTrigger id="edit-bank_name">
                <SelectValue placeholder="Select bank (Optional)" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none">-- None / General --</SelectItem>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Commission (%), Site Fee (%) & IMPS/NEFT Charges (₹) - Single row on all devices */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              <Label
                htmlFor="edit-commission_percent"
                className="text-[11px] sm:text-xs font-semibold text-foreground/90 truncate block"
                title="Commission (%)"
              >
                <span className="sm:hidden">Comm %</span>
                <span className="hidden sm:inline">Commission (%)</span>
              </Label>
              <Input
                id="edit-commission_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="2.0"
                className="h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl"
                value={formData.commission_percent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commission_percent: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              <Label
                htmlFor="edit-site_fee_percent"
                className="text-[11px] sm:text-xs font-semibold text-foreground/90 truncate block"
                title="Site Fee (%) (Optional)"
              >
                <span className="sm:hidden">Fee %</span>
                <span className="hidden sm:inline">Site Fee (%)</span>{" "}
                <span className="text-[9px] sm:text-[10px] font-normal text-muted-foreground">(Opt)</span>
              </Label>
              <Input
                id="edit-site_fee_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.5"
                className="h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl"
                value={formData.site_fee_percent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    site_fee_percent: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              <Label
                htmlFor="edit-imps_charges"
                className="text-[11px] sm:text-xs font-semibold text-foreground/90 truncate block"
                title="IMPS / NEFT (₹) (Optional)"
              >
                <span className="sm:hidden">IMPS ₹</span>
                <span className="hidden sm:inline">IMPS/NEFT (₹)</span>{" "}
                <span className="text-[9px] sm:text-[10px] font-normal text-muted-foreground">(Opt)</span>
              </Label>
              <Input
                id="edit-imps_charges"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl"
                value={formData.imps_charges}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    imps_charges: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* 5. Estimated Profit summary box */}
          {hasEnteredCommission && (
            <div
              className={`rounded-xl border p-2.5 sm:p-3 space-y-2 shadow-xs transition-all ${
                profit >= 0
                  ? "border-emerald-500/25 bg-emerald-500/[0.04] dark:bg-emerald-950/20"
                  : "border-rose-500/25 bg-rose-500/[0.04] dark:bg-rose-950/20"
              }`}
            >
              {/* Header: Title + Net Profit */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-bold text-foreground/90">
                  Estimated Profit
                </span>
                <span
                  className={`text-base sm:text-lg font-bold font-mono tracking-tight shrink-0 ${
                    profit >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  ₹{profit.toFixed(2)}
                </span>
              </div>

              {/* Badges: Net Margin Pill */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(() => {
                  const commP = parseFloat(formData.commission_percent) || 0;
                  const feeP = parseFloat(formData.site_fee_percent) || 0;
                  const netMargin = Math.round((commP - feeP) * 100) / 100;
                  if (netMargin < 0) {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap animate-pulse shadow-2xs">
                        <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                        <span>Loss: {netMargin}%</span>
                      </span>
                    );
                  } else if (netMargin < 0.25) {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Low Margin: +{netMargin}%</span>
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 whitespace-nowrap shadow-2xs">
                      <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                      <span>Margin: +{netMargin}%</span>
                    </span>
                  );
                })()}
              </div>

              {/* Bottom Breakdown: 3 symmetrical columns matching the inputs above */}
              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-border/50 text-[10px] sm:text-xs">
                <div className="text-muted-foreground truncate">
                  <span>Comm: </span>
                  <span className="font-semibold text-foreground/90">₹{commissionAmount.toFixed(2)}</span>
                </div>
                <div className="text-muted-foreground text-center truncate">
                  <span>Fee: </span>
                  <span className="font-semibold text-foreground/90">₹{siteFeeAmount.toFixed(2)}</span>
                </div>
                <div className="text-right truncate">
                  {impsChargesAmount > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      IMPS: -₹{impsChargesAmount.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">
                      IMPS: ₹0.00
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 6. Portal */}
          <div className="space-y-2">
            <Label htmlFor="edit-portal">Portal</Label>
            <Select
              value={formData.portal_id}
              onValueChange={handlePortalChange}
              required
            >
              <SelectTrigger id="edit-portal">
                <SelectValue placeholder="Select portal" />
              </SelectTrigger>
              <SelectContent>
                {portals.map((portal) => (
                  <SelectItem key={portal.id} value={portal.id}>
                    {portal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          </div>

          {/* 8. Action Buttons (Fixed at bottom) */}
          <div className="px-5 py-3 border-t border-border/50 bg-muted/20 shrink-0 flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Transaction"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
