import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export const AddUserDialog = ({ open, onOpenChange, onCreated }: AddUserDialogProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", make_admin: false });
  const [saving, setSaving] = useState(false);

  const createUser = async () => {
    if (!form.email || !form.password) {
      toast({ title: "Email and password required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: form,
      });
      if (error) throw error;
      toast({ title: "User created", description: `User ID: ${data.id}` });
      onOpenChange(false);
      onCreated?.();
      setForm({ email: "", password: "", full_name: "", make_admin: false });
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
          <DialogDescription>Create a user directly with email and password.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="space-y-1"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="flex items-center gap-2">
            <Checkbox checked={form.make_admin} onCheckedChange={(v) => setForm({ ...form, make_admin: !!v })} />
            <Label>Make admin</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={createUser} disabled={saving}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;

