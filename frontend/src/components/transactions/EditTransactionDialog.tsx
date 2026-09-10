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
import { settingsService, CardTypeOption } from "@/services/settingsService";
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
    reference_number: string | null;
    status: string;
    transaction_date: string;
    card_type: string | null;
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
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [customerValue, setCustomerValue] = useState<CustomerValue | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    const updateCards = () => {
      setCustomCards(settingsService.getCardTypes());
    };
    updateCards();
    return settingsService.subscribe(updateCards);
  }, []);

  const [formData, setFormData] = useState({
    portal_id: "",
    card_type: "" as CardType | string,
    transaction_type: "withdrawal" as "withdrawal" | "repayment",
    amount: "",
    commission: "",
    site_fee: "",
    status: "completed",
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

      setFormData({
        portal_id: transaction.portal_id,
        card_type: cardType,
        transaction_type: transaction.transaction_type as "withdrawal" | "repayment",
        amount: transaction.amount ? transaction.amount.toString() : "",
        commission:
          transaction.commission && transaction.commission > 0
            ? transaction.commission.toString()
            : "",
        site_fee:
          transaction.site_fee && transaction.site_fee > 0
            ? transaction.site_fee.toString()
            : "",
        status: transaction.status,
        customer_name: custName,
        customer_phone: custPhone,
        transaction_date: transaction.transaction_date
          ? new Date(transaction.transaction_date)
          : new Date(),
      });
    }
  }, [transaction]);

  const commissionAmount = useMemo(() => {
    const comm = parseFloat(formData.commission);
    return isNaN(comm) ? 0 : comm;
  }, [formData.commission]);

  const siteFeeAmount = useMemo(() => {
    const fee = parseFloat(formData.site_fee);
    return isNaN(fee) ? 0 : fee;
  }, [formData.site_fee]);

  const profit = useMemo(() => {
    return commissionAmount - siteFeeAmount;
  }, [commissionAmount, siteFeeAmount]);

  const handlePortalChange = (portalId: string) => {
    const portal = portals.find((p) => p.id === portalId);
    if (portal) {
      const next = {
        ...formData,
        portal_id: portalId,
        site_fee: formData.site_fee || portal.default_site_fee.toString(),
      };
      if (next.amount && next.card_type) {
        const commissionVal = calculateCommission(
          parseFloat(next.amount),
          next.card_type as CardType,
          next.transaction_type
        );
        next.commission = commissionVal.toFixed(2);
      }
      setFormData(next);
    }
  };

  const handleCardTypeChange = (cardType: string) => {
    const next = {
      ...formData,
      card_type: cardType,
    };
    if (next.amount && cardType) {
      const commissionVal = calculateCommission(
        parseFloat(next.amount),
        cardType as CardType,
        next.transaction_type
      );
      if (commissionVal > 0) {
        next.commission = commissionVal.toFixed(2);
      }
    }
    setFormData(next);
  };

  const handleTransactionTypeChange = (transactionType: "withdrawal" | "repayment") => {
    const next = {
      ...formData,
      transaction_type: transactionType,
      card_type: "",
    };
    setFormData(next);
  };

  const handleAmountChange = (amount: string) => {
    const next = {
      ...formData,
      amount,
    };
    if (amount && next.card_type) {
      const commissionVal = calculateCommission(
        parseFloat(amount),
        next.card_type as CardType,
        next.transaction_type
      );
      if (commissionVal > 0) {
        next.commission = commissionVal.toFixed(2);
      }
    }
    setFormData(next);
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

    let notes = transaction.notes || "";
    if (isChummi) {
      let cleanNotes = notes
        .replace(/\s*\|\s*Customer:\s*[^|]+/gi, "")
        .replace(/\s*\|\s*Phone:\s*[^|]+/gi, "")
        .trim();
      if (!cleanNotes && selectedPortal) {
        cleanNotes = `Sent to: ${selectedPortal.name}`;
      }
      if (customerName) {
        cleanNotes += ` | Customer: ${customerName}`;
      }
      if (customerPhone) {
        cleanNotes += ` | Phone: ${customerPhone}`;
      }
      notes = cleanNotes;
    }

    const updatePayload = {
      portal_id: formData.portal_id,
      card_type: formData.card_type,
      transaction_type: formData.transaction_type,
      amount: parseFloat(formData.amount),
      commission: parseFloat(formData.commission || "0"),
      site_fee: formData.site_fee ? parseFloat(formData.site_fee) : 0,
      status: formData.status,
      transaction_date: formData.transaction_date.toISOString(),
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      notes: notes || null,
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
        `Edited transaction — Amount: ₹${parseFloat(formData.amount).toLocaleString("en-IN")}, Type: ${formData.transaction_type}${isChummi && formData.customer_name.trim() ? `, Customer: ${formData.customer_name.trim()}` : ""}`,
        {
          transaction_id: transaction.id,
          old_amount: transaction.amount,
          new_amount: parseFloat(formData.amount),
          transaction_type: formData.transaction_type,
          card_type: formData.card_type,
          customer_name: isChummi ? formData.customer_name.trim() || null : null,
          customer_phone: isChummi ? formData.customer_phone.trim() || null : null,
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

  const hasEnteredCommission = formData.amount && formData.commission;
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
                <SelectContent>
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

          {/* 3. Commission (₹) & Site Fee (₹) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-commission">Commission (₹)</Label>
              <Input
                id="edit-commission"
                type="number"
                step="0.01"
                placeholder="e.g. 600"
                value={formData.commission}
                onChange={(e) =>
                  setFormData({ ...formData, commission: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-site_fee">Site Fee (₹) (Optional)</Label>
              <Input
                id="edit-site_fee"
                type="number"
                step="0.01"
                placeholder="e.g. 0"
                value={formData.site_fee}
                onChange={(e) =>
                  setFormData({ ...formData, site_fee: e.target.value })
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

          {/* 5. Portal & Status */}
          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                required
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional Customer Info for Chummi Portal */}
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

          {/* Action Buttons */}
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
