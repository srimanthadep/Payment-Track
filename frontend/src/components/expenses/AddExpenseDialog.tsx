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
import { Loader2, Calendar as CalendarIcon, Wallet } from "lucide-react";
import { format, isToday } from "date-fns";
import { expensesService } from "@/services/expensesService";
import { settingsService, ExpenseCategoryOption } from "@/services/settingsService";
import { activityLogService } from "@/services/activityLogService";

interface AddExpenseDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddExpenseDialog = ({
  userId,
  open,
  onOpenChange,
  onSuccess,
}: AddExpenseDialogProps) => {
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
      const cats = settingsService.getExpenseCategories();
      setCategories(cats);

      if (!formData.category && cats.length > 0) {
        setFormData((prev) => ({ ...prev, category: cats[0].name }));
      }
    };

    updateDropdowns();
    return settingsService.subscribe(updateDropdowns);
  }, []);

  const resetForm = () => {
    setFormData({
      amount: "",
      category: categories.length > 0 ? categories[0].name : "Worker Salary",
      expense_date: new Date(),
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid expense amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Category Required",
        description: "Please select an expense category",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await expensesService.createExpense({
      user_id: userId,
      category: formData.category,
      amount: amt,
      expense_date: formData.expense_date.toISOString(),
      notes: formData.notes.trim() || null,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    } else {
      activityLogService.log(
        "expense.created",
        "expense",
        `Added expense: ₹${amt.toLocaleString("en-IN")} for ${formData.category}`,
        {
          amount: amt,
          category: formData.category,
        }
      );
      toast({
        title: "Expense Added",
        description: `₹${amt.toLocaleString("en-IN")} recorded under ${formData.category}`,
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-[520px] rounded-2xl overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Add Expense</DialogTitle>
              <DialogDescription>
                Record an operational or business expense
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Amount (₹) *
              </Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 5000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="font-medium text-base h-10 rounded-xl"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
                required
              >
                <SelectTrigger id="exp-category" className="h-10 rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-xl">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      <span className="font-medium">{cat.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expense Date */}
          <div className="space-y-1.5">
            <Label htmlFor="exp-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Expense Date *
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="exp-date"
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-medium h-10 px-3 border-input bg-background rounded-xl"
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
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData({ ...formData, expense_date: new Date() });
                      setCalendarOpen(false);
                    }}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    Set Today
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes / Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="exp-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes / Description (Optional)
            </Label>
            <Textarea
              id="exp-notes"
              placeholder="e.g. 50L Petrol for delivery bike, Monthly advance..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="resize-none rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="px-6 font-semibold rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Expense"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
