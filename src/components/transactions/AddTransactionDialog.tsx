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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  calculateCommission,
  getCardTypesForTransaction,
  getCardTypeDisplayNameWithRate,
  type CardType,
} from "@/utils/commissionCalculator";

interface AddTransactionDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalsRefreshKey?: number;
}

interface Portal {
  id: string;
  name: string;
  default_commission_rate: number;
  default_site_fee: number;
}

export const AddTransactionDialog = ({
  userId,
  open,
  onOpenChange,
  portalsRefreshKey,
}: AddTransactionDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [portals, setPortals] = useState<Portal[]>([]);
  
  const [formData, setFormData] = useState({
    portal_id: "",
    card_type: "" as CardType | "",
    transaction_type: "withdrawal" as "withdrawal" | "repayment",
    amount: "",
    commission: "",
    site_fee: "",
    reference_number: "",
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
  }, [portalsRefreshKey]);

  // No rates fetching

  const handlePortalChange = (portalId: string) => {
    const portal = portals.find((p) => p.id === portalId);
    if (portal) {
      const next = {
        ...formData,
        portal_id: portalId,
        // Only set site_fee if it's empty, otherwise keep user's value
        site_fee: formData.site_fee || portal.default_site_fee.toString(),
      };
      // Recalculate commission if amount and card type are set
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
    // Recalculate commission if amount is set
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
      card_type: "" as CardType | "", // Reset card type when transaction type changes
    };
    // Recalculate commission if amount and card type are set
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
    // Recalculate commission if card type is set
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
    
    if (!formData.card_type) {
      toast({
        title: "Error",
        description: "Please select a card type",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    interface TransactionPayload {
      user_id: string;
      portal_id: string;
      card_type: string;
      transaction_type: string;
      amount: number;
      commission: number;
      site_fee: number;
      reference_number: string | null;
      status: string;
      transaction_date?: string;
    }

    const basePayload: TransactionPayload = {
      user_id: userId,
      portal_id: formData.portal_id,
      card_type: formData.card_type,
      transaction_type: formData.transaction_type,
      amount: parseFloat(formData.amount),
      commission: parseFloat(formData.commission),
      site_fee: formData.site_fee ? parseFloat(formData.site_fee) : 0,
      reference_number: formData.reference_number || null,
      status: "completed",
    };

    const { error } = await supabase.from("transactions").insert(basePayload);

    // No retry needed

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
      
      setFormData({
        portal_id: "",
        card_type: "" as CardType | "",
        transaction_type: "withdrawal",
        amount: "",
        commission: "",
        site_fee: "",
        reference_number: "",
      });
      
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Add a new transaction manually.
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
                {getCardTypesForTransaction(formData.transaction_type).map((cardType) => (
                  <SelectItem key={cardType} value={cardType}>
                    {getCardTypeDisplayNameWithRate(cardType, formData.transaction_type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
