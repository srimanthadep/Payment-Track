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
import { HandCoins, Loader2 } from "lucide-react";

interface AddDueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    borrower_name: string;
    borrower_contact?: string | null;
    principal_amount: number;
    date_given: string;
    expected_return_date?: string | null;
    notes?: string | null;
  }) => Promise<void>;
}

export const AddDueDialog = ({ open, onOpenChange, onCreate }: AddDueDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    borrower_name: "",
    borrower_contact: "",
    principal_amount: "",
    date_given: new Date().toISOString().slice(0, 10),
    expected_return_date: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      borrower_name: "",
      borrower_contact: "",
      principal_amount: "",
      date_given: new Date().toISOString().slice(0, 10),
      expected_return_date: "",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const principalAmount = Number(formData.principal_amount || 0);
    if (!formData.borrower_name.trim() || principalAmount <= 0) return;

    setIsLoading(true);
    await onCreate({
      borrower_name: formData.borrower_name.trim(),
      borrower_contact: formData.borrower_contact.trim() || null,
      principal_amount: principalAmount,
      date_given: new Date(formData.date_given).toISOString(),
      expected_return_date: formData.expected_return_date
        ? new Date(formData.expected_return_date).toISOString()
        : null,
      notes: formData.notes.trim() || null,
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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Add Due</DialogTitle>
              <DialogDescription>Record a new loan you have given.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Borrower Name *
              </Label>
              <Input
                value={formData.borrower_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, borrower_name: e.target.value }))}
                className="h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contact
              </Label>
              <Input
                value={formData.borrower_contact}
                onChange={(e) => setFormData((prev) => ({ ...prev, borrower_contact: e.target.value }))}
                className="h-10"
                placeholder="Phone / UPI / note"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Principal (₹) *
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.principal_amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, principal_amount: e.target.value }))}
                className="h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date Given *
              </Label>
              <Input
                type="date"
                value={formData.date_given}
                onChange={(e) => setFormData((prev) => ({ ...prev, date_given: e.target.value }))}
                className="h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expected Return
              </Label>
              <Input
                type="date"
                value={formData.expected_return_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, expected_return_date: e.target.value }))}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="resize-none"
              rows={3}
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
                "Save Due"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
