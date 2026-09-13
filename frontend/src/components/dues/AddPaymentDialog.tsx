import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wallet } from "lucide-react";
import { Due } from "@/hooks/useDues";

interface AddPaymentDialogProps {
  due: Due | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { amount: number; date: string; method: string; notes?: string }) => Promise<void>;
}

export const AddPaymentDialog = ({ due, open, onOpenChange, onSubmit }: AddPaymentDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    method: "Cash",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      method: "Cash",
      notes: "",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formData.amount || 0);
    if (amount <= 0) return;

    setIsLoading(true);
    await onSubmit({
      amount,
      date: new Date(formData.date).toISOString(),
      method: formData.method.trim() || "Cash",
      notes: formData.notes.trim() || "",
    });
    setIsLoading(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Add Payment</DialogTitle>
              <DialogDescription>
                {due ? `Record a repayment for ${due.borrower_name}.` : "Record repayment entry."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Amount (₹) *
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                className="h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Date *
              </Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                className="h-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Method
            </Label>
            <Input
              value={formData.method}
              onChange={(e) => setFormData((prev) => ({ ...prev, method: e.target.value }))}
              className="h-10"
              placeholder="Cash / UPI / Bank Transfer"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </Label>
            <Textarea
              rows={2}
              className="resize-none"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="px-6 font-semibold">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
