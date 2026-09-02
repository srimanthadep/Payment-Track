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
import { Loader2, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { format, isToday } from "date-fns";
import {
  settingsService,
  CardTypeOption,
  RecipientOption,
  TransactionTypeOption,
} from "@/services/settingsService";
import { transactionLearningService } from "@/services/transactionLearningService";
import { activityLogService } from "@/services/activityLogService";

interface AddTransactionDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalsRefreshKey?: number;
  onSuccess?: (addedDate?: Date) => void;
  initialData?: {
    amount?: string | number;
    transaction_type?: "withdrawal" | "repayment" | "";
    card_type?: string;
    commission_percent?: string | number;
    site_fee_percent?: string | number;
    sent_to?: string;
    portal_id?: string;
  } | null;
}

export const AddTransactionDialog = ({
  userId,
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: AddTransactionDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [cardTypes, setCardTypes] = useState<CardTypeOption[]>([]);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [txTypes, setTxTypes] = useState<TransactionTypeOption[]>([]);

  useEffect(() => {
    const updateDropdowns = () => {
      setCardTypes(settingsService.getCardTypes());
      setRecipients(settingsService.getRecipients());
      setTxTypes(settingsService.getTransactionTypes());
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
    sent_to: "",
    reference_number: "",
    transaction_date: new Date(),
  });

  const [isCommissionManual, setIsCommissionManual] = useState(false);
  const [isSiteFeeManual, setIsSiteFeeManual] = useState(false);
  const [recommendationInfo, setRecommendationInfo] = useState<{
    commission: number | null;
    siteFee: number | null;
    confidence: number;
    source: string;
    explanation?: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      transactionLearningService.init();
    }
  }, [open]);

  // Helper to query and apply transaction fee recommendations based on historical learning
  const applyLearningRecommendation = (
    txType: string,
    cType: string,
    recipient: string,
    manualComm = isCommissionManual,
    manualFee = isSiteFeeManual
  ) => {
    if (!cType && !txType) return;

    const rec = transactionLearningService.getRecommendation({
      cardType: cType,
      transactionType: txType,
      sentTo: recipient,
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
        return next;
      });
      setRecommendationInfo(rec);
    }
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
        sent_to: initialData.sent_to || prev.sent_to,
      }));
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

  // Auto calculate profit
  const profit = useMemo(() => {
    return commissionAmount - siteFeeAmount;
  }, [commissionAmount, siteFeeAmount]);

  const resetForm = () => {
    setFormData({
      amount: "",
      transaction_type: "",
      card_type: "",
      commission_percent: "",
      site_fee_percent: "",
      sent_to: "",
      reference_number: "",
      transaction_date: new Date(),
    });
    setIsCommissionManual(false);
    setIsSiteFeeManual(false);
    setRecommendationInfo(null);
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
    const payload = {
      user_id: userId,
      portal_id: portalId,
      card_type: formData.card_type,
      transaction_type: formData.transaction_type.toLowerCase(),
      amount: parseFloat(formData.amount),
      commission: commissionAmount,
      site_fee: siteFeeAmount,
      transaction_date: formData.transaction_date.toISOString(),
      reference_number: formData.reference_number || null,
      status: "completed",
      notes: `Sent to: ${formData.sent_to} | Commission: ${commPercent}%${
        formData.site_fee_percent ? ` | Site Fee: ${formData.site_fee_percent}%` : ""
      }`,
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
      // Ingest newly added transaction into learning engine immediately
      transactionLearningService.recordNewTransaction({
        card_type: formData.card_type,
        transaction_type: formData.transaction_type,
        sent_to: formData.sent_to,
        amount: parseFloat(formData.amount),
        commission_percent: parseFloat(formData.commission_percent) || 0,
        site_fee_percent: parseFloat(formData.site_fee_percent) || 0,
        transaction_date: formData.transaction_date,
      });

      const commPct = parseFloat(formData.commission_percent) || 0;
      const feePct = parseFloat(formData.site_fee_percent) || 0;
      activityLogService.log(
        "transaction.created",
        "transaction",
        `Added ${formData.transaction_type} of ₹${parseFloat(formData.amount).toLocaleString("en-IN")} to ${formData.sent_to} (${formData.card_type}${commPct ? `, Commission: ${commPct}%` : ""}${feePct ? `, Site Fee: ${feePct}%` : ""})`,
        {
          amount: parseFloat(formData.amount),
          card_type: formData.card_type,
          transaction_type: formData.transaction_type,
          sent_to: formData.sent_to,
          commission_percent: commPct,
          site_fee_percent: feePct,
          reference_number: formData.reference_number || null,
        }
      );

      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.(addedDate);
    }
  };

  const hasEnteredCommission = Boolean(formData.amount && parseFloat(formData.amount) > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Add a new transaction manually.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Date & Amount */}
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
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* 2. Repayment or Withdrawals & 3. Card Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(val) => {
                  const newType = val as "withdrawal" | "repayment";
                  setFormData((prev) => ({
                    ...prev,
                    transaction_type: newType,
                  }));
                  applyLearningRecommendation(newType, formData.card_type, formData.sent_to);
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
              <Label htmlFor="card_type">Card Type</Label>
              <Select
                value={formData.card_type}
                onValueChange={(val) => {
                  setFormData((prev) => ({
                    ...prev,
                    card_type: val,
                  }));
                  applyLearningRecommendation(formData.transaction_type, val, formData.sent_to);
                }}
                required
              >
                <SelectTrigger id="card_type">
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {cardTypes.map((card) => {
                    const rate =
                      formData.transaction_type === "repayment"
                        ? card.repayRate
                        : card.withdrawRate;
                    const label =
                      rate && rate > 0 ? `${card.name} (${rate}%)` : card.name;
                    return (
                      <SelectItem key={card.id} value={card.name}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 4. Commission (%) & 5. Site Fee (%) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="commission_percent">Commission (%)</Label>
                {recommendationInfo && !isCommissionManual && recommendationInfo.commission !== null && formData.commission_percent && (
                  <span
                    className="text-[10px] font-semibold text-primary inline-flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded-full"
                    title={recommendationInfo.explanation}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Auto-learned
                  </span>
                )}
              </div>
              <Input
                id="commission_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 2.0"
                value={formData.commission_percent}
                onChange={(e) => {
                  setIsCommissionManual(true);
                  setFormData({
                    ...formData,
                    commission_percent: e.target.value,
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="site_fee_percent">Site Fee (%) (Optional)</Label>
                {recommendationInfo && !isSiteFeeManual && recommendationInfo.siteFee !== null && formData.site_fee_percent && (
                  <span
                    className="text-[10px] font-semibold text-primary inline-flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded-full"
                    title={recommendationInfo.explanation}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Auto-learned
                  </span>
                )}
              </div>
              <Input
                id="site_fee_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 0.5"
                value={formData.site_fee_percent}
                onChange={(e) => {
                  setIsSiteFeeManual(true);
                  setFormData({
                    ...formData,
                    site_fee_percent: e.target.value,
                  });
                }}
              />
            </div>
          </div>

          {/* 6. Auto display profit when commission percentage is entered */}
          {hasEnteredCommission && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-muted-foreground">Estimated Profit</span>
                <span
                  className={`text-base font-bold ${
                    profit >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  ₹{profit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-0.5 border-t border-border/50">
                <span>Commission: ₹{commissionAmount.toFixed(2)}</span>
                {siteFeeAmount > 0 ? (
                  <span>Site Fee: ₹{siteFeeAmount.toFixed(2)}</span>
                ) : (
                  <span>Site Fee: ₹0.00</span>
                )}
              </div>
            </div>
          )}

          {/* 7. Sent to (Portals / Recipients) */}
          <div className="space-y-2">
            <Label htmlFor="sent_to">Sent To</Label>
            <Select
              value={formData.sent_to}
              onValueChange={(val) => {
                setFormData((prev) => ({ ...prev, sent_to: val }));
                applyLearningRecommendation(formData.transaction_type, formData.card_type, val);
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

          {/* 8. Reference Number (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference Number (Optional)</Label>
            <Input
              id="reference"
              type="text"
              placeholder="e.g. TXN123456"
              value={formData.reference_number}
              onChange={(e) =>
                setFormData({ ...formData, reference_number: e.target.value })
              }
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
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
  );
};
