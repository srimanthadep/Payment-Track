import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { invokeBackendApi } from "@/integrations/backend/api";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export const AddUserDialog = ({ open, onOpenChange, onCreated }: AddUserDialogProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user" as "user" | "staff" | "admin",
  });
  const [saving, setSaving] = useState(false);

  const createUser = async () => {
    if (!form.email || !form.password) {
      toast({ title: "Email and password required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        make_admin: form.role === "admin",
        make_staff: form.role === "staff",
      };

      const { data, error } = await invokeBackendApi("admin-create-user", payload);
      if (error) throw error;
      toast({ title: "User created", description: `Role: ${form.role.toUpperCase()} (ID: ${data?.id || "Created"})` });
      onOpenChange(false);
      onCreated?.();
      setForm({ email: "", password: "", full_name: "", role: "user" });
    } catch (e) {
      const error = e as Error;
      toast({ title: "Failed", description: error.message || "Could not create user", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new user</DialogTitle>
          <DialogDescription>Create a user account and set their role and permissions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Account Role</Label>
            <Select
              value={form.role}
              onValueChange={(val: "user" | "staff" | "admin") => setForm({ ...form, role: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Regular User (Full standard access)</SelectItem>
                <SelectItem value="staff">Staff (Restricted: Transactions, Expenses & Customers only)</SelectItem>
                <SelectItem value="admin">Admin (Full administrative access)</SelectItem>
              </SelectContent>
            </Select>
            {form.role === "staff" && (
              <p className="text-[11px] text-amber-500 font-medium mt-1">
                Staff users cannot view profits, site fees, commission columns, edit/delete actions, or export data. They are restricted to Transactions, Expenses, and Customers.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={createUser} disabled={saving}>Create User</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;

