import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { customerService, CustomerRecord } from "@/services/customerService";
import { whatsappService, formatPhoneForWhatsApp } from "@/services/whatsappService";
import { settingsService } from "@/services/settingsService";
import { UserPlus, Loader2, Phone, User as UserIcon, MessageCircle } from "lucide-react";

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: (customer: CustomerRecord) => void;
}

export const AddCustomerDialog = ({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: AddCustomerDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: "Validation Error",
        description: "Please enter customer name.",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "You must be signed in to add a customer.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await customerService.createCustomer(
        userId,
        trimmedName,
        phone.trim() || null
      );

      if (error) {
        toast({
          title: "Failed to Add Customer",
          description: error.message || "An error occurred while saving customer.",
          variant: "destructive",
        });
        return;
      }

      // Fire-and-forget WhatsApp welcome message if phone exists and WhatsApp is enabled
      const waPhone = formatPhoneForWhatsApp(phone.trim());
      const waSettings = (settingsService.getSettings() as any).whatsapp;
      const waEnabled = waSettings?.enabled !== false; // default to true

      if (waPhone && waEnabled && data) {
        whatsappService.sendWelcome({
          customerName: trimmedName,
          phone: phone.trim(),
          userId,
          customerId: data.id,
        }).then((result) => {
          if (result.success) {
            toast({
              title: "WhatsApp ✅",
              description: `Welcome message sent to ${trimmedName} on WhatsApp`,
            });
          }
        }).catch(() => {
          // Silent — customer was already created
        });
      }

      toast({
        title: "Customer Added",
        description: `Customer "${trimmedName}" was added successfully.`,
      });

      setName("");
      setPhone("");
      onOpenChange(false);
      if (data && onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      console.error("Error creating customer:", err);
      toast({
        title: "Error",
        description: "Unexpected error creating customer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 shadow-2xl">
        <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 text-primary border border-primary/25 shadow-xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Add New Customer
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Quickly register a customer profile with name and contact details
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 1. Customer Name */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-name" className="text-xs font-semibold flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Customer Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="customer-name"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-sm"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {/* 2. Phone Number */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-phone" className="text-xs font-semibold flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Phone Number <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
            </Label>
            <Input
              id="customer-phone"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 text-sm"
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Add Customer</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
