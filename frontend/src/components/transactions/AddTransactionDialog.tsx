import { useState, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddTransactionDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalsRefreshKey?: number;
}

export const AddTransactionDialog = ({
  userId,
  open,
  onOpenChange,
}: AddTransactionDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    amount: "",
    transaction_type: "" as "" | "withdrawal" | "repayment",
    card_type: "",
    commission_percent: "",
    site_fee_percent: "",
    sent_to: "",
    reference_number: "",
    transaction_date: getTodayString(),
  });

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
      transaction_date: getTodayString(),
    });
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

    if (!formData.commission_percent || parseFloat(formData.commission_percent) <= 0) {
      toast({
        title: "Error",
        description: "Please enter commission percentage",
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
          default_commission_rate: parseFloat(formData.commission_percent),
          default_site_fee: 0,
          is_active: true,
        })
        .select();
      if (newPortal && newPortal.length > 0) {
        portalId = newPortal[0].id;
      }
    }

    const txDate = formData.transaction_date
      ? new Date(formData.transaction_date).toISOString()
      : new Date().toISOString();

    const payload = {
      user_id: userId,
      portal_id: portalId,
      card_type: formData.card_type,
      transaction_type: formData.transaction_type.toLowerCase(),
      amount: parseFloat(formData.amount),
      commission: commissionAmount,
      site_fee: siteFeeAmount,
      transaction_date: txDate,
      reference_number: formData.reference_number || null,
      status: "completed",
      notes: `Sent to: ${formData.sent_to} | Commission: ${formData.commission_percent}%${
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
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
      resetForm();
      onOpenChange(false);
    }
  };

  const hasEnteredCommission = formData.amount && formData.commission_percent;

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
              <Input
                id="tx-date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) =>
                  setFormData({ ...formData, transaction_date: e.target.value })
                }
                required
              />
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
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    transaction_type: val as "withdrawal" | "repayment",
                  })
                }
                required
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
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
                onValueChange={(val) =>
                  setFormData({ ...formData, card_type: val })
                }
                required
              >
                <SelectTrigger id="card_type">
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
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 4. Commission (%) & 5. Site Fee (%) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commission_percent">Commission (%)</Label>
              <Input
                id="commission_percent"
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

            <div className="space-y-2">
              <Label htmlFor="site_fee_percent">Site Fee (%) (Optional)</Label>
              <Input
                id="site_fee_percent"
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

          {/* 7. Sent to (Upender or Chummi) */}
          <div className="space-y-2">
            <Label htmlFor="sent_to">Sent To</Label>
            <Select
              value={formData.sent_to}
              onValueChange={(val) =>
                setFormData({ ...formData, sent_to: val })
              }
              required
            >
              <SelectTrigger id="sent_to">
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Upender">Upender</SelectItem>
                <SelectItem value="Chummi">Chummi</SelectItem>
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
