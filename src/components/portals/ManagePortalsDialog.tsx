import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ManagePortalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Portal {
  id: string;
  name: string;
  default_commission_rate: number;
  default_site_fee: number;
  is_active: boolean;
}

interface PortalRate {
  id: string;
  portal_id: string;
  card_type: string;
  rate_percent: number;
}

export const ManagePortalsDialog = ({ open, onOpenChange }: ManagePortalsDialogProps) => {
  const { toast } = useToast();
  const [portals, setPortals] = useState<Portal[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<Portal | null>(null);
  const [form, setForm] = useState({ name: "", default_commission_rate: "", default_site_fee: "" });
  const [rates, setRates] = useState<PortalRate[]>([]);
  const [rateForm, setRateForm] = useState({ card_type: "", rate_percent: "" });
  const [ratesSupported, setRatesSupported] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const load = async () => {
    let query = supabase.from("portals").select("*").order("created_at", { ascending: false });
    if (!showInactive) {
      query = query.eq("is_active", true);
    }
    const { data, error } = await query;
    if (error) {
      toast({ title: "Error", description: "Failed to load portals", variant: "destructive" });
      return;
    }
    setPortals((data as unknown as Portal[]) || []);
  };

  useEffect(() => {
    if (open) load();
  }, [open, showInactive]);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", default_commission_rate: "", default_site_fee: "" });
    setRates([]);
    setRateForm({ card_type: "", rate_percent: "" });
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", description: "Enter a portal name", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const payload = {
      name: form.name,
      default_commission_rate: parseFloat(form.default_commission_rate || "0"),
      default_site_fee: parseFloat(form.default_site_fee || "0"),
      is_active: true,
    };
    const query = editing
      ? supabase.from("portals").update(payload).eq("id", editing.id)
      : supabase.from("portals").upsert(payload, { onConflict: "name" });
    const { error } = await query;
    setIsSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: editing ? "Portal updated" : "Portal added or reactivated" });
    await load();
    resetForm();
  };

  const remove = async (id: string) => {
    // Always perform soft-delete to avoid RLS issues
    const { error } = await supabase.from("portals").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Removed", description: "Portal deactivated" });
    await load();
  };

  const loadRates = async (portalId: string) => {
    const { data, error } = await supabase.from("portal_rates").select("*").eq("portal_id", portalId).order("card_type");
    if (error) { setRatesSupported(false); setRates([]); return; }
    setRatesSupported(true);
    setRates((data as unknown as PortalRate[]) || []);
  };

  const addOrUpdateRate = async () => {
    if (!editing) return;
    const payload = {
      portal_id: editing.id,
      card_type: rateForm.card_type,
      rate_percent: parseFloat(rateForm.rate_percent || "0"),
    };
    const existing = rates.find((r) => r.card_type === payload.card_type);
    const query = existing
      ? supabase.from("portal_rates").update({ rate_percent: payload.rate_percent }).eq("id", existing.id)
      : supabase.from("portal_rates").insert(payload);
    const { error } = await query;
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setRateForm({ card_type: "", rate_percent: "" });
    await loadRates(editing.id);
    toast({ title: "Saved", description: "Rate saved" });
  };

  const deleteRate = async (id: string) => {
    const { error } = await supabase.from("portal_rates").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (editing) await loadRates(editing.id);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Portals</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Only active portals are shown</div>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-inactive">Show inactive</Label>
              <input id="show-inactive" type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="portal-name">Name</Label>
              <Input id="portal-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-commission">Default Commission %</Label>
              <Input id="portal-commission" type="number" step="0.01" value={form.default_commission_rate}
                     onChange={(e) => setForm({ ...form, default_commission_rate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-sitefee">Default Site Fee ₹</Label>
              <Input id="portal-sitefee" type="number" step="0.01" value={form.default_site_fee}
                     onChange={(e) => setForm({ ...form, default_site_fee: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={isSaving}>{editing ? "Update" : "Add"} Portal</Button>
            {editing && (
              <Button variant="outline" onClick={resetForm}>Cancel Edit</Button>
            )}
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Commission %</TableHead>
                  <TableHead className="text-right">Site Fee ₹</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portals.map((p) => (
                  <Fragment key={p.id}>
                  <TableRow>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right">{p.default_commission_rate?.toFixed?.(2) ?? p.default_commission_rate}</TableCell>
                    <TableCell className="text-right">{p.default_site_fee?.toFixed?.(2) ?? p.default_site_fee}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="outline" onClick={async () => { setEditing(p); setForm({ name: p.name, default_commission_rate: String(p.default_commission_rate ?? 0), default_site_fee: String(p.default_site_fee ?? 0) }); await loadRates(p.id); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => remove(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {ratesSupported && editing?.id === p.id && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <div className="p-3 bg-muted/30 rounded-md space-y-3">
                          <div className="font-medium">Card Type Rates</div>
                          <div className="grid grid-cols-3 gap-3">
                            <Input placeholder="e.g. Normal VISA" value={rateForm.card_type} onChange={(e) => setRateForm({ ...rateForm, card_type: e.target.value })} />
                            <Input placeholder="Rate %" type="number" step="0.01" value={rateForm.rate_percent} onChange={(e) => setRateForm({ ...rateForm, rate_percent: e.target.value })} />
                            <Button onClick={addOrUpdateRate}>Save Rate</Button>
                          </div>
                          <div className="border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Card Type</TableHead>
                                  <TableHead className="text-right">Rate %</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rates.map((r) => (
                                  <TableRow key={r.id}>
                                    <TableCell>{r.card_type}</TableCell>
                                    <TableCell className="text-right">{r.rate_percent}</TableCell>
                                    <TableCell className="text-right"><Button size="sm" variant="destructive" onClick={() => deleteRate(r.id)}>Delete</Button></TableCell>
                                  </TableRow>
                                ))}
                                {rates.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No rates yet.</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                ))}
                {portals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No portals yet. Add one above.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManagePortalsDialog;

