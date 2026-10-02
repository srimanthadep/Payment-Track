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
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { format, isToday } from "date-fns";
import {
  calculateCommission,
  getCardTypesForTransaction,
  getCardTypeDisplayNameWithRate,
  type CardType,
} from "@/utils/commissionCalculator";
import { settingsService, CardTypeOption, BankOption } from "@/services/settingsService";
import { activityLogService } from "@/services/activityLogService";
import { CustomerCombobox, CustomerValue } from "@/components/customers/CustomerCombobox";
import { customerService } from "@/services/customerService";

interface EditTransactionDialogProps {
  transaction: {
    id: string;
    user_id?: string;
    portal_id: string;
    transaction_type: string;
    amount: number;
    commission: number;
    site_fee: number;
    profit?: number;
    reference_number?: string | null;
    status?: string;
    transaction_date: string;
    card_type: string | null;
    customer_mode?: string | null;
    bank_name?: string | null;
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
    customer_mode: "Offline" as "Online" | "Offline",
    bank_name: "",
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

      // Check notes for explicitly saved percentages: "Commission: 2.7%" / "Site Fee: 2.31%"
      if (transaction.notes) {
        const commMatch = transaction.notes.match(/Commission:\s*([\d.]+)%/i);
        const feeMatch = transaction.notes.match(/Site Fee:\s*([\d.]+)%/i);
        if (commMatch) commPct = commMatch[1];
        if (feeMatch) feePct = feeMatch[1];
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

      setFormData({
        portal_id: transaction.portal_id || "",
        card_type: cardType,
        transaction_type: (transaction.transaction_type?.toLowerCase() === "repayment" ? "repayment" : "withdrawal") as "withdrawal" | "repayment",
        amount: transaction.amount ? transaction.amount.toString() : "",
        commission_percent: commPct,
        site_fee_percent: feePct,
        customer_mode: custMode,
        bank_name: bank,
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

  // Auto calculate profit
  const profit = useMemo(() => {
    return commissionAmount - siteFeeAmount;
  }, [commissionAmount, siteFeeAmount]);

  const handlePortalChange = (portalId: string) => {
    const portal = portals.find((p) => p.id === portalId);
    setFormData((prev) => ({
      ...prev,
      portal_id: portalId,
      site_fee_percent: prev.site_fee_percent || (portal?.default_site_fee ? portal.default_site_fee.toString() : ""),
    }));
  };

  const handleCardTypeChange = (cardType: string) => {
    const cardOpt = customCards.find((c) => c.name.toLowerCase() === cardType.toLowerCase());
    const defaultRate = formData.transaction_type === "repayment" ? cardOpt?.repayRate : cardOpt?.withdrawRate;
    setFormData((prev) => ({
      ...prev,
      card_type: cardType,
      commission_percent: defaultRate && defaultRate > 0 ? defaultRate.toString() : prev.commission_percent,
    }));
  };

  const handleTransactionTypeChange = (transactionType: "withdrawal" | "repayment") => {
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
    const isChummi = selectedPortal?.name?.trim().toLowerCase() === "chummi";

    let customerId: string | null = null;
    let customerName: string | null = null;
    let customerPhone: string | null = null;

    if (isChummi && customerValue && (customerValue.name.trim() || customerValue.phone.trim())) {
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

    const commPercent = parseFloat(formData.commission_percent) || 0;
    const feePercent = parseFloat(formData.site_fee_percent) || 0;
    const commAmount = (parseFloat(formData.amount) * commPercent) / 100;
    const feeAmount = (parseFloat(formData.amount) * feePercent) / 100;
    const profitAmount = commAmount - feeAmount;

    let notesStr = `Sent to: ${selectedPortal?.name || "Portal"} | Mode: ${formData.customer_mode}${
      formData.bank_name ? ` | Bank: ${formData.bank_name}` : ""
    } | Commission: ${commPercent}%${
      formData.site_fee_percent ? ` | Site Fee: ${formData.site_fee_percent}%` : ""
    }`;
    if (isChummi) {
      if (customerName) {
        notesStr += ` | Customer: ${customerName}`;
      }
      if (customerPhone) {
        notesStr += ` | Phone: ${customerPhone}`;
      }
    }

    const updatePayload = {
      portal_id: formData.portal_id,
      card_type: formData.card_type,
      transaction_type: formData.transaction_type.toLowerCase(),
      amount: parseFloat(formData.amount),
      commission: commAmount,
      site_fee: feeAmount,
      profit: profitAmount,
      transaction_date: formData.transaction_date.toISOString(),
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_mode: formData.customer_mode,
      bank_name: formData.bank_name || null,
      notes: notesStr,
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
      activityLogService.log(
        "transaction.updated",
        "transaction",
        `Edited transaction — Amount: ₹${parseFloat(formData.amount).toLocaleString("en-IN")}, Type: ${formData.transaction_type}, Mode: ${formData.customer_mode}${formData.bank_name ? `, Bank: ${formData.bank_name}` : ""}${commPercent ? `, Commission: ${commPercent}%` : ""}${feePercent ? `, Site Fee: ${feePercent}%` : ""}${isChummi && customerName ? `, Customer: ${customerName}` : ""}`,
        {
          transaction_id: transaction.id,
          old_amount: transaction.amount,
          new_amount: parseFloat(formData.amount),
          transaction_type: formData.transaction_type,
          card_type: formData.card_type,
          customer_mode: formData.customer_mode,
          bank_name: formData.bank_name,
          commission_percent: commPercent,
          site_fee_percent: feePercent,
          customer_name: isChummi ? customerName : null,
          customer_phone: isChummi ? customerPhone : null,
        }
      );
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
      onUpdated();
      onOpenChange(false);
    }
  };

  if (!transaction) return null;

  const hasEnteredCommission = Boolean(formData.amount && formData.commission_percent);
  const selectedPortal = portals.find((p) => p.id === formData.portal_id);
  const isChummi = selectedPortal?.name?.trim().toLowerCase() === "chummi";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update transaction details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Date & Amount (Side-by-side grid, matching Add Transaction) */}
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
                  <SelectItem value="RuPay">RuPay</SelectItem>
                  <SelectItem value="Visa">Visa</SelectItem>
                  <SelectItem value="Mastercard">Mastercard</SelectItem>
                  <SelectItem value="Business Card">Business Card</SelectItem>
                  <SelectItem value="AU Cards">AU Cards</SelectItem>
                  <SelectItem value="Amex & Diners">Amex & Diners</SelectItem>
                  <SelectItem value="Machine Swiping">Machine Swiping</SelectItem>
                  {customCards
                    .filter(
                      (c) =>
                        ![
                          "rupay",
                          "visa",
                          "mastercard",
                          "business card",
                          "au cards",
                          "amex & diners",
                          "machine swiping",
                        ].includes(c.name.toLowerCase())
                    )
                    .map((c) => {
                      const rate =
                        formData.transaction_type === "repayment"
                          ? c.repayRate
                          : c.withdrawRate;
                      const label =
                        rate && rate > 0 ? `${c.name} (${rate}%)` : c.name;
                      return (
                        <SelectItem key={c.id} value={c.name}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  {getCardTypesForTransaction(formData.transaction_type).map(
                    (cardType) => (
                      <SelectItem key={cardType} value={cardType}>
                        {getCardTypeDisplayNameWithRate(
                          cardType,
                          formData.transaction_type
                        )}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. Commission (%) & Site Fee (%) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label
                htmlFor="edit-commission_percent"
                className="text-xs sm:text-sm font-medium truncate block"
              >
                Commission (%)
              </Label>
              <Input
                id="edit-commission_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 2.0"
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

            <div className="space-y-1.5 sm:space-y-2">
              <Label
                htmlFor="edit-site_fee_percent"
                className="text-xs sm:text-sm font-medium truncate block"
              >
                Site Fee (%) <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="edit-site_fee_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 0.5"
                value={formData.site_fee_percent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    site_fee_percent: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* 4. Estimated Profit summary box */}
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
                <span>Site Fee: ₹{siteFeeAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* 5. Portal */}
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

          {/* 6. Customer Mode (Online/Offline) & Bank Credit Card */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-customer_mode" className="text-xs sm:text-sm font-medium">
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

            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-bank_name" className="text-xs sm:text-sm font-medium">
                  Bank Credit Card
                </Label>
                <span className="text-[10px] text-muted-foreground">(Optional)</span>
              </div>
              <Select
                value={formData.bank_name || "none"}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, bank_name: val === "none" ? "" : val }))
                }
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
          </div>

          {/* 7. Conditional Customer Info for Chummi Portal */}
          {isChummi && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <CustomerCombobox
                userId={transaction.user_id || currentUserId}
                value={customerValue}
                onChange={setCustomerValue}
                disabled={isLoading}
              />
            </div>
          )}

          {/* 8. Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
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
