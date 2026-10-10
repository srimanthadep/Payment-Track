import { useState, useMemo, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Calendar as CalendarIcon, ArrowUpDown, TrendingUp, TrendingDown, SlidersHorizontal } from "lucide-react";
import { AiIcon } from "@/components/icons/AiIcon";
import { format, isToday } from "date-fns";
import {
  settingsService,
  CardTypeOption,
  RecipientOption,
  TransactionTypeOption,
  BankOption,
  SiteOption,
  DropdownOrderingKey,
} from "@/services/settingsService";
import { ManageDropdownOrderDialog } from "../settings/ManageDropdownOrderDialog";
import { transactionLearningService } from "@/services/transactionLearningService";
import { activityLogService } from "@/services/activityLogService";
import { predictionTrackingService } from "@/services/predictionTrackingService";
import { CustomerCombobox, CustomerValue } from "@/components/customers/CustomerCombobox";
import { customerService, CustomerSavedCard } from "@/services/customerService";
import { whatsappService, formatPhoneForWhatsApp } from "@/services/whatsappService";

interface AddTransactionDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalsRefreshKey?: number;
  onSuccess?: (addedDate?: Date) => void;
  isStaff?: boolean;
  initialData?: {
    amount?: string | number;
    transaction_type?: "withdrawal" | "repayment" | "";
    card_type?: string;
    commission_percent?: string | number;
    site_fee_percent?: string | number;
    sent_to?: string;
    customer_name?: string;
    customer_phone?: string;
    portal_id?: string;
    customer_mode?: "Online" | "Offline";
    bank_name?: string;
    site_name?: string;
  } | null;
}

export const AddTransactionDialog = ({
  userId,
  open,
  onOpenChange,
  onSuccess,
  initialData,
  isStaff = false,
}: AddTransactionDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [cardTypes, setCardTypes] = useState<CardTypeOption[]>([]);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [txTypes, setTxTypes] = useState<TransactionTypeOption[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);

  // Order & Ranking Dialog state for quick adjustments
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderModalKey, setOrderModalKey] = useState<DropdownOrderingKey>("recipients");
  const [orderModalTitle, setOrderModalTitle] = useState("");
  const [orderModalItems, setOrderModalItems] = useState<{ id: string; name: string }[]>([]);

  const handleOpenOrderModal = (
    key: DropdownOrderingKey,
    title: string,
    items: { id: string; name: string }[]
  ) => {
    setOrderModalKey(key);
    setOrderModalTitle(title);
    setOrderModalItems(items);
    setOrderModalOpen(true);
  };

  useEffect(() => {
    const updateDropdowns = () => {
      setCardTypes(settingsService.getCardTypes());
      setRecipients(settingsService.getRecipients());
      setTxTypes(settingsService.getTransactionTypes());
      setBanks(settingsService.getBanks());
      setSites(settingsService.getSites());
    };
    updateDropdowns();
    return settingsService.subscribe(updateDropdowns);
  }, []);

  const [formData, setFormData] = useState({
    amount: "",
    transaction_type: "" as "" | "withdrawal" | "repayment",
    card_type: "",
    commission_percent: "",
    site_fee_percent: "",
    imps_charges: "",
    sent_to: "",
    customer_name: "",
    customer_phone: "",
    customer_mode: "Offline" as "Online" | "Offline",
    bank_name: "",
    site_name: "",
    transaction_date: new Date(),
  });

  const [customerValue, setCustomerValue] = useState<CustomerValue | null>(null);

  const [isCommissionManual, setIsCommissionManual] = useState(false);
  const [isSiteFeeManual, setIsSiteFeeManual] = useState(false);
  const [isImpsManual, setIsImpsManual] = useState(false);
  const [recommendationInfo, setRecommendationInfo] = useState<{
    commission: number | null;
    siteFee: number | null;
    impsCharges?: number | null;
    confidence: number;
    source: string;
    explanation?: string;
  } | null>(null);

  // Track the AI-predicted values at the moment they were set (for acceptance tracking)
  const [aiPredictedValues, setAiPredictedValues] = useState<{
    commission: number | null;
    siteFee: number | null;
    impsCharges: number | null;
    source: string;
    confidence: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      transactionLearningService.init();
    }
  }, [open]);

  // Helper to query and apply transaction fee recommendations based on historical learning
  const applyLearningRecommendation = (
    txType = formData.transaction_type,
    cType = formData.card_type,
    recipient = formData.sent_to,
    bank = formData.bank_name,
    mode = formData.customer_mode,
    cust = customerValue,
    manualComm = isCommissionManual,
    manualFee = isSiteFeeManual,
    manualImps = isImpsManual,
    amountVal = formData.amount ? parseFloat(formData.amount) : undefined
  ) => {
    if (!cType && !txType) return;

    const rec = transactionLearningService.getRecommendation({
      cardType: cType,
      transactionType: txType,
      sentTo: recipient,
      bankName: bank,
      customerMode: mode,
      customerName: cust?.name || undefined,
      customerId: cust?.id || undefined,
      amount: amountVal && !isNaN(amountVal) && amountVal > 0 ? amountVal : undefined,
    });

    if (rec.source !== "none") {
      setFormData((prev) => {
        const next = { ...prev };
        if (!manualComm && rec.commission !== null) {
          next.commission_percent = rec.commission > 0 ? rec.commission.toString() : "";
        }
        if (!manualFee && rec.siteFee !== null) {
          next.site_fee_percent = rec.siteFee > 0 ? rec.siteFee.toString() : "";
        }
        if (!manualImps && rec.impsCharges !== null && rec.impsCharges !== undefined) {
          next.imps_charges = rec.impsCharges > 0 ? rec.impsCharges.toString() : "0";
        }
        return next;
      });
      setRecommendationInfo(rec);

      // Snapshot AI-predicted values for acceptance tracking
      setAiPredictedValues({
        commission: rec.commission,
        siteFee: rec.siteFee,
        impsCharges: rec.impsCharges ?? 0,
        source: rec.source,
        confidence: rec.confidence,
      });
    } else {
      setRecommendationInfo(rec);
      setAiPredictedValues({
        commission: null,
        siteFee: null,
        impsCharges: null,
        source: "none",
        confidence: 0,
      });
    }
  };

  // Handler for clicking a saved card chip: auto-fills all fields (including sent_to) & triggers pure model prediction
  const handleSelectCustomerCard = (card: CustomerSavedCard) => {
    const tType = (card.transaction_type?.toLowerCase() === "repayment" ? "repayment" : "withdrawal") as "withdrawal" | "repayment";
    const cType = card.card_type || formData.card_type;
    const cMode = (card.customer_mode === "Online" || card.customer_mode === "Offline" ? card.customer_mode : "Offline") as "Online" | "Offline";
    const bName = card.bank_name || formData.bank_name;

    // Auto-fill sent_to: from card.sent_to, or lookup from recent transaction history for this card, or fallback to current sent_to
    const resolvedSentTo =
      card.sent_to ||
      transactionLearningService.getSentToForCard({
        bankName: bName,
        cardType: cType,
        customerId: customerValue?.id || undefined,
        customerName: customerValue?.name || undefined,
      }) ||
      formData.sent_to;

    settingsService.recordDropdownSelection("transactionTypes", tType);
    if (cType) settingsService.recordDropdownSelection("cardTypes", cType);
    if (bName) settingsService.recordDropdownSelection("banks", bName);
    if (resolvedSentTo) settingsService.recordDropdownSelection("recipients", resolvedSentTo);

    // Reset manual flags so prediction values are cleanly auto-filled
    setIsCommissionManual(false);
    setIsSiteFeeManual(false);
    setIsImpsManual(false);

    setFormData((prev) => ({
      ...prev,
      transaction_type: tType,
      card_type: cType,
      customer_mode: cMode,
      bank_name: bName,
      sent_to: resolvedSentTo || prev.sent_to,
    }));

    // Auto-predict rates for the newly selected card using pure prediction values (never customer's previous rates)
    applyLearningRecommendation(
      tType,
      cType,
      resolvedSentTo,
      bName,
      cMode,
      customerValue,
      false,
      false,
      false,
      formData.amount ? parseFloat(formData.amount) : undefined
    );

    toast({
      title: "Card Selected 💳",
      description: `${bName} (${cType})${resolvedSentTo ? ` • Sent to: ${resolvedSentTo}` : ""} auto-filled with predicted rates.`,
    });
  };

  useEffect(() => {
    if (initialData && open) {
      setFormData((prev) => ({
        ...prev,
        amount: initialData.amount !== undefined && initialData.amount !== null ? String(initialData.amount) : prev.amount,
        transaction_type: initialData.transaction_type || prev.transaction_type,
        card_type: initialData.card_type || prev.card_type,
        commission_percent:
          initialData.commission_percent !== undefined &&
          initialData.commission_percent !== null &&
          Number(initialData.commission_percent) > 0
            ? String(initialData.commission_percent)
            : "",
        site_fee_percent: initialData.site_fee_percent !== undefined ? String(initialData.site_fee_percent) : prev.site_fee_percent,
        imps_charges:
          (initialData as any).imps_charges !== undefined && (initialData as any).imps_charges !== null
            ? String((initialData as any).imps_charges)
            : prev.imps_charges,
        sent_to: initialData.sent_to || prev.sent_to,
        customer_name: initialData.customer_name || prev.customer_name,
        customer_phone: initialData.customer_phone || prev.customer_phone,
        customer_mode: initialData.customer_mode || prev.customer_mode || "Offline",
        bank_name: initialData.bank_name || prev.bank_name || "",
        site_name: (initialData as any).site_name || prev.site_name || "",
      }));

      if (initialData.customer_name || initialData.customer_phone || (initialData as any).customer_id) {
        setCustomerValue({
          id: (initialData as any).customer_id || null,
          name: initialData.customer_name || "",
          phone: initialData.customer_phone || "",
          isNew: !(initialData as any).customer_id,
        });
      }
    }
  }, [initialData, open]);

  // Calculate commission amount
  const commissionAmount = useMemo(() => {
    const amount = parseFloat(formData.amount);
    const percent = parseFloat(formData.commission_percent);
    if (!isNaN(amount) && !isNaN(percent) && amount > 0 && percent > 0) {
      return (amount * percent) / 100;
    }
    return 0;
  }, [formData.amount, formData.commission_percent]);

  // Calculate site fee amount
  const siteFeeAmount = useMemo(() => {
    const amount = parseFloat(formData.amount);
    const percent = parseFloat(formData.site_fee_percent);
    if (!isNaN(amount) && !isNaN(percent) && amount > 0 && percent > 0) {
      return (amount * percent) / 100;
    }
    return 0;
  }, [formData.amount, formData.site_fee_percent]);

  // Calculate IMPS / NEFT charges amount
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

  const resetForm = () => {
    setFormData({
      amount: "",
      transaction_type: "",
      card_type: "",
      commission_percent: "",
      site_fee_percent: "",
      imps_charges: "",
      sent_to: "",
      customer_name: "",
      customer_phone: "",
      customer_mode: "Offline",
      bank_name: "",
      site_name: "",
      transaction_date: new Date(),
    });
    setCustomerValue(null);
    setIsCommissionManual(false);
    setIsSiteFeeManual(false);
    setIsImpsManual(false);
    setRecommendationInfo(null);
    setAiPredictedValues(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!formData.transaction_type) {
      toast({
        title: "Error",
        description: "Please select a transaction type",
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

    if (!formData.sent_to) {
      toast({
        title: "Error",
        description: "Please select who this is sent to",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    let portalId = "";
    const { data: existingPortals } = await supabase
      .from("portals")
      .select("id, name")
      .eq("name", formData.sent_to);

    if (existingPortals && existingPortals.length > 0) {
      portalId = existingPortals[0].id;
    } else {
      const { data: newPortal } = await supabase
        .from("portals")
        .insert({
          name: formData.sent_to,
          default_commission_rate: parseFloat(formData.commission_percent) || 0,
          default_site_fee: 0,
          is_active: true,
        })
        .select();
      if (newPortal && newPortal.length > 0) {
        portalId = newPortal[0].id;
      }
    }

    const commPercent = parseFloat(formData.commission_percent) || 0;

    let customerId: string | null = null;
    let customerName: string | null = null;
    let customerPhone: string | null = null;

    if (customerValue && (customerValue.name?.trim() || customerValue.phone?.trim())) {
      customerName = customerValue.name.trim() || null;
      customerPhone = customerValue.phone.trim() || null;

      if (customerValue.id) {
        customerId = customerValue.id;
        // Asynchronously update existing customer record with latest phone/name
        customerService.updateCustomer(customerValue.id, {
          name: customerValue.name,
          phone: customerValue.phone,
        }).catch((err) => console.warn("Failed to update customer details:", err));
      } else {
        // Create new customer record in customers table first
        const { data: newCust, error: custErr } = await customerService.createCustomer(
          userId,
          customerValue.name || "Customer",
          customerValue.phone || null
        );
        if (!custErr && newCust) {
          customerId = newCust.id;
        } else if (custErr) {
          console.warn("Could not create customer record:", custErr);
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
        sent_to: formData.sent_to,
      }).catch((err) => console.warn("Failed to save customer card:", err));
    }

    let notesStr = `Sent to: ${formData.sent_to} | Mode: ${formData.customer_mode}${
      formData.site_name ? ` | Site: ${formData.site_name}` : ""
    }${
      formData.bank_name ? ` | Bank: ${formData.bank_name}` : ""
    } | Commission: ${commPercent}%${
      formData.site_fee_percent ? ` | Site Fee: ${formData.site_fee_percent}%` : ""
    }${
      impsChargesAmount > 0 ? ` | IMPS Charges: ₹${impsChargesAmount}` : ""
    }`;
    if (customerName) {
      notesStr += ` | Customer: ${customerName}`;
    }
    if (customerPhone) {
      notesStr += ` | Phone: ${customerPhone}`;
    }

    const transactionId = crypto.randomUUID();

    const payload = {
      id: transactionId,
      user_id: userId,
      portal_id: portalId,
      card_type: formData.card_type,
      transaction_type: formData.transaction_type.toLowerCase(),
      amount: parseFloat(formData.amount),
      commission: commissionAmount,
      commission_percent: commPercent,
      site_fee: siteFeeAmount,
      site_fee_percent: parseFloat(formData.site_fee_percent) || 0,
      imps_charges: impsChargesAmount,
      transaction_date: formData.transaction_date.toISOString(),
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_mode: formData.customer_mode,
      bank_name: formData.bank_name || null,
      site_name: formData.site_name || null,
      notes: notesStr,
    };

    const { error } = await supabase.from("transactions").insert(payload);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const addedDate = formData.transaction_date;

      // Close dialog, reset form, and notify parent IMMEDIATELY
      resetForm();
      onOpenChange(false);
      onSuccess?.(addedDate);

      toast({
        title: "Success",
        description: "Transaction added successfully",
      });

      // Execute background logging and tracking safely without blocking UI
      try {
        // Ingest newly added transaction into learning engine immediately
        transactionLearningService.recordNewTransaction({
          card_type: formData.card_type,
          transaction_type: formData.transaction_type,
          sent_to: formData.sent_to,
          bank_name: formData.bank_name,
          customer_mode: formData.customer_mode,
          customer_name: customerName || undefined,
          customer_id: customerId || undefined,
          amount: parseFloat(formData.amount),
          commission_percent: parseFloat(formData.commission_percent) || 0,
          site_fee_percent: parseFloat(formData.site_fee_percent) || 0,
          imps_charges: impsChargesAmount,
          transaction_date: formData.transaction_date,
        });

        // Track prediction outcome for every transaction (fire-and-forget)
        const actualComm = parseFloat(formData.commission_percent) || 0;
        const actualFee = parseFloat(formData.site_fee_percent) || 0;
        const hasPrediction = Boolean(aiPredictedValues && aiPredictedValues.source !== "none");
        const predictedComm = hasPrediction ? aiPredictedValues?.commission ?? 0 : actualComm;
        const predictedFee = hasPrediction ? aiPredictedValues?.siteFee ?? 0 : actualFee;
        const commAccepted = hasPrediction ? Math.abs(actualComm - predictedComm) < 0.01 : true;
        const feeAccepted = hasPrediction ? Math.abs(actualFee - predictedFee) < 0.01 : true;

        predictionTrackingService.recordPrediction({
          transactionId,
          amount: parseFloat(formData.amount) || 0,
          profit,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          portalName: formData.sent_to,
          notes: notesStr,
          commissionAccepted: commAccepted,
          siteFeeAccepted: feeAccepted,
          predictedCommission: predictedComm,
          predictedSiteFee: predictedFee,
          actualCommission: actualComm,
          actualSiteFee: actualFee,
          predictionSource: hasPrediction ? aiPredictedValues!.source : "none",
          predictionConfidence: hasPrediction ? aiPredictedValues!.confidence : 0,
          cardType: formData.card_type,
          transactionType: formData.transaction_type,
          sentTo: formData.sent_to,
          bankName: formData.bank_name || undefined,
          customerMode: formData.customer_mode,
        }).catch(() => {
          // Silent — tracking should never break the main flow
        });

        // Closed-loop active learning: immediately penalize rejected prediction in-memory
        if (hasPrediction && (!commAccepted || !feeAccepted)) {
          transactionLearningService.recordOverrideFeedback({
            cardType: formData.card_type,
            transactionType: formData.transaction_type,
            sentTo: formData.sent_to,
            bankName: formData.bank_name || undefined,
            customerMode: formData.customer_mode,
            actualCommission: actualComm,
            actualSiteFee: actualFee,
            predictedCommission: predictedComm,
            predictedSiteFee: predictedFee,
            timestamp: Date.now(),
          });
        }

        const commPct = parseFloat(formData.commission_percent) || 0;
        const feePct = parseFloat(formData.site_fee_percent) || 0;
        activityLogService.log(
          "transaction.created",
          "transaction",
          `Added ${formData.transaction_type} of ₹${parseFloat(formData.amount).toLocaleString("en-IN")} to ${formData.sent_to} (${formData.card_type}, ${formData.customer_mode}${formData.site_name ? `, Site: ${formData.site_name}` : ""}${formData.bank_name ? `, Bank: ${formData.bank_name}` : ""}${commPct ? `, Commission: ${commPct}%` : ""}${feePct ? `, Site Fee: ${feePct}%` : ""}${customerName ? `, Customer: ${customerName}` : ""})`,
          {
            amount: parseFloat(formData.amount),
            card_type: formData.card_type,
            transaction_type: formData.transaction_type,
            sent_to: formData.sent_to,
            customer_mode: formData.customer_mode,
            bank_name: formData.bank_name,
            site_name: formData.site_name,
            commission_percent: commPct,
            site_fee_percent: feePct,
            customer_name: customerName,
            customer_phone: customerPhone,
          }
        );

        // Track dropdown selections for confirmed transaction
        if (formData.sent_to) settingsService.recordDropdownSelection("recipients", formData.sent_to);
        if (formData.site_name) settingsService.recordDropdownSelection("sites", formData.site_name);
        if (formData.bank_name) settingsService.recordDropdownSelection("banks", formData.bank_name);
        if (formData.card_type) settingsService.recordDropdownSelection("cardTypes", formData.card_type);
        if (formData.transaction_type) settingsService.recordDropdownSelection("transactionTypes", formData.transaction_type);

        // Fire-and-forget WhatsApp receipt if customer has a phone number
        const receiptPhone = customerPhone ? formatPhoneForWhatsApp(customerPhone) : null;
        const waSettings = (settingsService.getSettings() as any).whatsapp;
        const waEnabled = waSettings?.enabled !== false;

        if (receiptPhone && waEnabled && customerName) {
          whatsappService.sendReceipt({
            customerName,
            phone: customerPhone!,
            userId,
            customerId: customerId || undefined,
            transaction: {
              amount: parseFloat(formData.amount),
              portalName: formData.sent_to,
              transactionDate: formData.transaction_date.toISOString(),
              transactionType: formData.transaction_type,
              commission: commissionAmount,
              cardType: formData.card_type,
            },
          }).then((result) => {
            if (result.success) {
              toast({
                title: "WhatsApp ✅",
                description: `Receipt sent to ${customerName} on WhatsApp`,
              });
            }
          }).catch(() => {
            // Silent — transaction was already saved
          });
        }
      } catch (postErr) {
        console.warn("Post-transaction processing error (non-fatal):", postErr);
      }
    }
  };

  const hasEnteredCommission = Boolean(formData.amount && parseFloat(formData.amount) > 0);

  const isCommissionAutoLearned = Boolean(
    recommendationInfo &&
      !isCommissionManual &&
      recommendationInfo.commission !== null &&
      formData.commission_percent
  );

  const isSiteFeeAutoLearned = Boolean(
    recommendationInfo &&
      !isSiteFeeManual &&
      recommendationInfo.siteFee !== null &&
      formData.site_fee_percent
  );

  const isImpsAutoLearned = Boolean(
    recommendationInfo &&
      !isImpsManual &&
      recommendationInfo.impsCharges !== null &&
      recommendationInfo.impsCharges !== undefined &&
      formData.imps_charges
  );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/50 shrink-0 text-left">
          <DialogTitle className="text-lg font-bold">Add Transaction</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add a new transaction manually.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3.5 sleek-scrollbar">
            {/* 1. Customer Details & Saved Cards (TOP for all transactions) */}
            <div className="bg-muted/30 border border-border/70 rounded-xl p-3 space-y-2">
              <CustomerCombobox
                userId={userId}
                value={customerValue}
                onChange={(val) => {
                  setCustomerValue(val);
                  if (val) {
                    applyLearningRecommendation(
                      formData.transaction_type,
                      formData.card_type,
                      formData.sent_to,
                      formData.bank_name,
                      formData.customer_mode,
                      val,
                      isCommissionManual,
                      isSiteFeeManual,
                      isImpsManual,
                      formData.amount ? parseFloat(formData.amount) : undefined
                    );
                  }
                }}
                onSelectCard={handleSelectCustomerCard}
                selectedCard={{
                  bank_name: formData.bank_name,
                  card_type: formData.card_type,
                }}
                disabled={isLoading}
              />
            </div>

            {/* 2. Date & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tx-date">Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="tx-date"
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
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/80" align="start">
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
                          setFormData({ ...formData, transaction_date: adjustedDate });
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
                        setFormData({ ...formData, transaction_date: new Date() });
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
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, amount: val }));
                  const num = parseFloat(val);
                  if (!isNaN(num) && num > 0) {
                    applyLearningRecommendation(
                      formData.transaction_type,
                      formData.card_type,
                      formData.sent_to,
                      formData.bank_name,
                      formData.customer_mode,
                      customerValue,
                      isCommissionManual,
                      isSiteFeeManual,
                      num
                    );
                  }
                }}
                required
              />
            </div>
          </div>

          {/* 2. Repayment or Withdrawals & 3. Card Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="type">Transaction Type</Label>
                <button
                  type="button"
                  onClick={() => handleOpenOrderModal("transactionTypes", "Transaction Types", txTypes)}
                  className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors px-1 py-0.5 rounded hover:bg-muted/50"
                  title="Reorder or change ranking mode"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  <span>Order</span>
                </button>
              </div>
              <Select
                value={formData.transaction_type}
                onValueChange={(val) => {
                  const newType = val as "withdrawal" | "repayment";
                  settingsService.recordDropdownSelection("transactionTypes", newType);
                  setFormData((prev) => ({
                    ...prev,
                    transaction_type: newType,
                  }));
                  applyLearningRecommendation(
                    newType,
                    formData.card_type,
                    formData.sent_to,
                    formData.bank_name,
                    formData.customer_mode,
                    customerValue
                  );
                }}
                required
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {txTypes.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="card_type">Card Type</Label>
                <button
                  type="button"
                  onClick={() => handleOpenOrderModal("cardTypes", "Card Types", cardTypes)}
                  className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors px-1 py-0.5 rounded hover:bg-muted/50"
                  title="Reorder or change ranking mode"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  <span>Order</span>
                </button>
              </div>
              <Select
                value={formData.card_type}
                onValueChange={(val) => {
                  settingsService.recordDropdownSelection("cardTypes", val);
                  setFormData((prev) => ({
                    ...prev,
                    card_type: val,
                  }));
                  applyLearningRecommendation(
                    formData.transaction_type,
                    val,
                    formData.sent_to,
                    formData.bank_name,
                    formData.customer_mode,
                    customerValue
                  );
                }}
                required
              >
                <SelectTrigger id="card_type">
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {cardTypes.map((card) => (
                    <SelectItem key={card.id} value={card.name}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 4. Site, Customer Mode & Bank Credit Card */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="site_name"
                  className="text-xs sm:text-sm font-medium truncate block"
                >
                  Site <span className="text-[10px] font-normal text-muted-foreground"><span className="hidden sm:inline">(Optional)</span><span className="sm:hidden">(Opt)</span></span>
                </Label>
                <button
                  type="button"
                  onClick={() => handleOpenOrderModal("sites", "Sites Dropdown", sites)}
                  className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors px-1 py-0.5 rounded hover:bg-muted/50"
                  title="Reorder or change ranking mode"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  <span>Order</span>
                </button>
              </div>
              <Select
                value={formData.site_name || "none"}
                onValueChange={(val) => {
                  if (val && val !== "none") {
                    settingsService.recordDropdownSelection("sites", val);
                  }
                  setFormData((prev) => ({ ...prev, site_name: val === "none" ? "" : val }));
                }}
              >
                <SelectTrigger id="site_name">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">None / Direct</SelectItem>
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
                htmlFor="customer_mode"
                className="text-xs sm:text-sm font-medium truncate block"
              >
                Customer Mode
              </Label>
              <Select
                value={formData.customer_mode}
                onValueChange={(val: "Online" | "Offline") => {
                  setFormData((prev) => ({ ...prev, customer_mode: val }));
                  applyLearningRecommendation(
                    formData.transaction_type,
                    formData.card_type,
                    formData.sent_to,
                    formData.bank_name,
                    val,
                    customerValue
                  );
                }}
              >
                <SelectTrigger id="customer_mode">
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
            <div className="flex items-center justify-between">
              <Label
                htmlFor="bank_name"
                className="text-xs sm:text-sm font-medium truncate block"
              >
                Bank Credit Card <span className="text-[10px] font-normal text-muted-foreground"><span className="hidden sm:inline">(Optional)</span><span className="sm:hidden">(Opt)</span></span>
              </Label>
              <button
                type="button"
                onClick={() => handleOpenOrderModal("banks", "Bank Credit Cards", banks)}
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors px-1 py-0.5 rounded hover:bg-muted/50"
                title="Reorder or change ranking mode"
              >
                <ArrowUpDown className="h-3 w-3" />
                <span>Order</span>
              </button>
            </div>
            <Select
              value={formData.bank_name}
              onValueChange={(val) => {
                if (val) {
                  settingsService.recordDropdownSelection("banks", val);
                }
                setFormData((prev) => ({ ...prev, bank_name: val }));
                applyLearningRecommendation(
                  formData.transaction_type,
                  formData.card_type,
                  formData.sent_to,
                  val,
                  formData.customer_mode,
                  customerValue
                );
              }}
            >
              <SelectTrigger id="bank_name">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Commission (%), Site Fee (%) & IMPS/NEFT Charges (₹) - Single row on all devices */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              <Label
                htmlFor="commission_percent"
                className="text-[11px] sm:text-xs font-semibold text-foreground/90 truncate block"
                title="Commission (%)"
              >
                <span className="sm:hidden">Comm %</span>
                <span className="hidden sm:inline">Commission (%)</span>
              </Label>
              <div className="relative">
                <Input
                  id="commission_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="2.0"
                  className={`h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl ${
                    isCommissionAutoLearned
                      ? "border-primary/50 bg-primary/[0.03] pr-6 sm:pr-8"
                      : ""
                  }`}
                  value={formData.commission_percent}
                  onChange={(e) => {
                    setIsCommissionManual(true);
                    setFormData({
                      ...formData,
                      commission_percent: e.target.value,
                    });
                  }}
                />
                {isCommissionAutoLearned && (
                  <div
                    className="absolute right-1.5 sm:right-2.5 inset-y-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 animate-in fade-in"
                    title={recommendationInfo?.explanation || "AI Auto-learned"}
                  >
                    <AiIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse block" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              <Label
                htmlFor="site_fee_percent"
                className="text-[11px] sm:text-xs font-semibold text-foreground/90 truncate block"
                title="Site Fee (%) (Optional)"
              >
                <span className="sm:hidden">Fee %</span>
                <span className="hidden sm:inline">Site Fee (%)</span>{" "}
                <span className="text-[9px] sm:text-[10px] font-normal text-muted-foreground">(Opt)</span>
              </Label>
              <div className="relative">
                <Input
                  id="site_fee_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.5"
                  className={`h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl ${
                    isSiteFeeAutoLearned
                      ? "border-primary/50 bg-primary/[0.03] pr-6 sm:pr-8"
                      : ""
                  }`}
                  value={formData.site_fee_percent}
                  onChange={(e) => {
                    setIsSiteFeeManual(true);
                    setFormData({
                      ...formData,
                      site_fee_percent: e.target.value,
                    });
                  }}
                />
                {isSiteFeeAutoLearned && (
                  <div
                    className="absolute right-1.5 sm:right-2.5 inset-y-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 animate-in fade-in"
                    title={recommendationInfo?.explanation || "AI Auto-learned"}
                  >
                    <AiIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse block" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              <Label
                htmlFor="imps_charges"
                className="text-[11px] sm:text-xs font-semibold text-foreground/90 truncate block"
                title="IMPS / NEFT (₹) (Optional)"
              >
                <span className="sm:hidden">IMPS ₹</span>
                <span className="hidden sm:inline">IMPS/NEFT (₹)</span>{" "}
                <span className="text-[9px] sm:text-[10px] font-normal text-muted-foreground">(Opt)</span>
              </Label>
              <div className="relative">
                <Input
                  id="imps_charges"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className={`h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl ${
                    isImpsAutoLearned
                      ? "border-primary/50 bg-primary/[0.03] pr-6 sm:pr-8"
                      : ""
                  }`}
                  value={formData.imps_charges}
                  onChange={(e) => {
                    setIsImpsManual(true);
                    setFormData({
                      ...formData,
                      imps_charges: e.target.value,
                    });
                  }}
                />
                {isImpsAutoLearned && (
                  <div
                    className="absolute right-1.5 sm:right-2.5 inset-y-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 animate-in fade-in"
                    title={recommendationInfo?.explanation || "AI Auto-learned"}
                  >
                    <AiIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse block" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 6. Auto display profit when commission percentage is entered (hidden for staff) */}
          {!isStaff && hasEnteredCommission && (
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

              {/* Badges: Volume Calibration & Margin (Dedicated wrap row with no text truncation) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {recommendationInfo?.isVolumeAdjusted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 whitespace-nowrap shadow-2xs">
                    <SlidersHorizontal className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-500 shrink-0" />
                    <span>Volume calibrated</span>
                  </span>
                )}
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

          {/* 8. Sent to (Portals / Recipients) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sent_to">Sent To</Label>
              <button
                type="button"
                onClick={() => handleOpenOrderModal("recipients", "Sent To (Portals / Persons)", recipients)}
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors px-1 py-0.5 rounded hover:bg-muted/50"
                title="Reorder or change ranking mode"
              >
                <ArrowUpDown className="h-3 w-3" />
                <span>Order</span>
              </button>
            </div>
            <Select
              value={formData.sent_to}
              onValueChange={(val) => {
                if (val) {
                  settingsService.recordDropdownSelection("recipients", val);
                }
                setFormData((prev) => ({ ...prev, sent_to: val }));
                applyLearningRecommendation(
                  formData.transaction_type,
                  formData.card_type,
                  val,
                  formData.bank_name,
                  formData.customer_mode,
                  customerValue
                );
              }}
              required
            >
              <SelectTrigger id="sent_to">
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {recipients.map((rec) => (
                  <SelectItem key={rec.id} value={rec.name}>
                    {rec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          </div>

          {/* Action Buttons (Fixed at bottom) */}
          <div className="px-5 py-3 border-t border-border/50 bg-muted/20 shrink-0 flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Transaction"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Dropdown Order & Ranking Dialog */}
    <ManageDropdownOrderDialog
      open={orderModalOpen}
      onOpenChange={setOrderModalOpen}
      dropdownKey={orderModalKey}
      title={orderModalTitle}
      items={orderModalItems}
      onApplied={() => {
        setCardTypes(settingsService.getCardTypes());
        setRecipients(settingsService.getRecipients());
        setTxTypes(settingsService.getTransactionTypes());
        setBanks(settingsService.getBanks());
        setSites(settingsService.getSites());
      }}
    />
  </>
  );
};
