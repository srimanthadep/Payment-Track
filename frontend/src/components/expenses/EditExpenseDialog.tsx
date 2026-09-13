import { useState, useEffect } from "react";
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
import { Loader2, Calendar as CalendarIcon, Edit3 } from "lucide-react";
import { format, isToday } from "date-fns";
import { expensesService, Expense } from "@/services/expensesService";
import { settingsService, ExpenseCategoryOption } from "@/services/settingsService";
import { activityLogService } from "@/services/activityLogService";

interface EditExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export const EditExpenseDialog = ({
  expense,
  open,
  onOpenChange,
  onUpdated,
}: EditExpenseDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [categories, setCategories] = useState<ExpenseCategoryOption[]>([]);

  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    expense_date: new Date(),
    notes: "",
  });

  useEffect(() => {
    const updateDropdowns = () => {
      setCategories(settingsService.getExpenseCategories());
    };

    updateDropdowns();
    return settingsService.subscribe(updateDropdowns);
  }, []);

  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        category: expense.category,
        expense_date: new Date(expense.expense_date),
        notes: expense.notes || "",
      });
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid expense amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await expensesService.updateExpense(
      expense.id,
      {
        category: formData.category,
        amount: amt,
        expense_date: formData.expense_date.toISOString(),
        notes: formData.notes.trim() || null,
      },
      expense.user_id
    );

    setIsLoading(false);

    if (error) {
      toast({
        title: "Update Failed",
        description: error,
        variant: "destructive",
      });
    } else {
      activityLogService.log(
        "expense.updated",
        "expense",
        `Updated expense: ₹${amt.toLocaleString("en-IN")} for ${formData.category}`,
        {
          expense_id: expense.id,
          old_amount: expense.amount,
          new_amount: amt,
          category: formData.category,
        }
      );
      toast({
        title: "Expense Updated",
        description: "Expense details updated successfully",
      });
      onOpenChange(false);
      onUpdated();
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Edit Expense</DialogTitle>
              <DialogDescription>
                Modify expense amount, category or details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-exp-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Amount (₹) *
              </Label>
              <Input
                id="edit-exp-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 5000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="font-medium text-base h-10"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-exp-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
                required
              >
                <SelectTrigger id="edit-exp-category" className="h-10">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expense Date */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-exp-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Expense Date *
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="edit-exp-date"
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-medium h-10 px-3 border-input bg-background"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">
                    {isToday(formData.expense_date)
                      ? `Today (${format(formData.expense_date, "dd MMM")})`
                      : format(formData.expense_date, "dd MMM yyyy")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/80" align="start">
                <div className="p-1">
                  <Calendar
                    mode="single"
                    selected={formData.expense_date}
                    onSelect={(date) => {
                      if (date) {
                        setFormData({ ...formData, expense_date: date });
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    className="rounded-xl"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-exp-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes / Description (Optional)
            </Label>
            <Textarea
              id="edit-exp-notes"
              placeholder="e.g. Notes about this expense..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-6 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
