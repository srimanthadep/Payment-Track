import { useState, useEffect } from "react";
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

interface EditTransactionDialogProps {
  transaction: {
    id: string;
    portal_id: string;
    transaction_type: string;
    amount: number;
    commission: number;
    site_fee: number;
    reference_number: string | null;
    status: string;
    transaction_date: string;
    card_type: string | null;
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

  const [formData, setFormData] = useState({
    portal_id: "",
    card_type: "" as CardType | "",
    transaction_type: "withdrawal" as "withdrawal" | "repayment",
    amount: "",
    commission: "",
    site_fee: "",
    reference_number: "",
    status: "completed",
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
      let cardType = (transaction.card_type as CardType) || ("" as CardType | "");
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

      setFormData({
        portal_id: transaction.portal_id,
        card_type: cardType,
        transaction_type: transaction.transaction_type as "withdrawal" | "repayment",
        amount: transaction.amount.toString(),
        commission: transaction.commission.toString(),
        site_fee: transaction.site_fee.toString(),
        reference_number: transaction.reference_number || "",
        status: transaction.status,
        transaction_date: transaction.transaction_date
          ? new Date(transaction.transaction_date)
          : new Date(),
      });
    }
  }, [transaction]);

  const handlePortalChange = (portalId: string) => {
    const portal = portals.find((p) => p.id === portalId);
    if (portal) {
      const next = {
        ...formData,
        portal_id: portalId,
        site_fee: formData.site_fee || portal.default_site_fee.toString(),
      };
      if (next.amount && next.card_type) {
        const commissionAmount = calculateCommission(
          parseFloat(next.amount),
          next.card_type,
          next.transaction_type
        );
        next.commission = commissionAmount.toFixed(2);
      }
      setFormData(next);
    }
  };

  const handleCardTypeChange = (cardType: CardType) => {
    const next = {
      ...formData,
      card_type: cardType,
    };
    if (next.amount && cardType) {
      const commissionAmount = calculateCommission(
        parseFloat(next.amount),
        cardType,
        next.transaction_type
      );
      next.commission = commissionAmount.toFixed(2);
    }
    setFormData(next);
  };

  const handleTransactionTypeChange = (transactionType: "withdrawal" | "repayment") => {
    const next = {
      ...formData,
      transaction_type: transactionType,
      card_type: "" as CardType | "",
    };
    if (next.amount && next.card_type) {
      const commissionAmount = calculateCommission(
        parseFloat(next.amount),
        next.card_type,
        transactionType
      );
      next.commission = commissionAmount.toFixed(2);
    }
    setFormData(next);
  };

  const handleAmountChange = (amount: string) => {
    const next = {
      ...formData,
      amount,
    };
    if (amount && next.card_type) {
      const commissionAmount = calculateCommission(
        parseFloat(amount),
        next.card_type,
        next.transaction_type
      );
      next.commission = commissionAmount.toFixed(2);
    } else {
      next.commission = "";
    }
    setFormData(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    if (!formData.card_type) {
      toast({
        title: "Error",
        description: "Please select a card type",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const updatePayload = {
      portal_id: formData.portal_id,
      card_type: formData.card_type,
      transaction_type: formData.transaction_type,
      amount: parseFloat(formData.amount),
      commission: parseFloat(formData.commission),
      site_fee: formData.site_fee ? parseFloat(formData.site_fee) : 0,
      reference_number: formData.reference_number || null,
      status: formData.status,
      transaction_date: formData.transaction_date.toISOString(),
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
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update transaction details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portal">Portal</Label>
            <Select
              value={formData.portal_id}
              onValueChange={handlePortalChange}
              required
            >
              <SelectTrigger>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={handleTransactionTypeChange}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="repayment">Repayment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="card_type">Card Type</Label>
              <Select
                value={formData.card_type}
                onValueChange={handleCardTypeChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent>
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Date Popover Calendar */}
            <div className="space-y-2">
              <Label htmlFor="edit-tx-date">Transaction Date</Label>
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
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/80" align="start">
                  <div className="p-1">
                    <Calendar
                      mode="single"
                      selected={formData.transaction_date}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, transaction_date: date });
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commission">Commission (₹)</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                value={formData.commission}
                onChange={(e) =>
                  setFormData({ ...formData, commission: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_fee">Site Fee (₹) (Optional)</Label>
              <Input
                id="site_fee"
                type="number"
                step="0.01"
                value={formData.site_fee}
                onChange={(e) =>
                  setFormData({ ...formData, site_fee: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference Number (Optional)</Label>
            <Input
              id="reference"
              type="text"
              value={formData.reference_number}
              onChange={(e) =>
                setFormData({ ...formData, reference_number: e.target.value })
              }
            />
          </div>

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
