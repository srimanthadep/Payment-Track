import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Play } from "lucide-react";

interface Template {
  id: string;
  name: string;
  portal_id: string;
  transaction_type: string;
  amount: number | null;
  commission: number | null;
  site_fee: number | null;
  portals: {
    name: string;
  };
}

interface TransactionTemplatesProps {
  userId: string;
  onUseTemplate: (template: Template) => void;
}

export const TransactionTemplates = ({ userId, onUseTemplate }: TransactionTemplatesProps) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [portals, setPortals] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    portal_id: "",
    transaction_type: "withdrawal",
    amount: "",
    commission: "",
    site_fee: "",
  });

  useEffect(() => {
    fetchTemplates();
    fetchPortals();
  }, [userId]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("transaction_templates")
        .select(`
          *,
          portals (
            name
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPortals = async () => {
    const { data } = await supabase
      .from("portals")
      .select("id, name")
      .eq("is_active", true);
    if (data) setPortals(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("transaction_templates").insert({
        user_id: userId,
        name: formData.name,
        portal_id: formData.portal_id,
        transaction_type: formData.transaction_type,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        commission: formData.commission ? parseFloat(formData.commission) : null,
        site_fee: formData.site_fee ? parseFloat(formData.site_fee) : null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template created successfully",
      });

      setDialogOpen(false);
      setFormData({
        name: "",
        portal_id: "",
        transaction_type: "withdrawal",
        amount: "",
        commission: "",
        site_fee: "",
      });
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("transaction_templates")
        .delete()
        .eq("id", templateId);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleUseTemplate = (template: Template) => {
    onUseTemplate(template);
    toast({
      title: "Template Applied",
      description: "Template data loaded. Fill in remaining details.",
    });
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground text-sm">Loading templates...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Templates</h3>
        <Button onClick={() => setDialogOpen(true)} size="sm" variant="outline" className="h-8 text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground border rounded-lg">
          No templates. Create one for quick transaction entry!
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs truncate">{template.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {template.portals.name} • {template.transaction_type}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleUseTemplate(template)}
                  className="h-7 w-7"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(template.id)}
                  className="h-7 w-7 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>Save a transaction as a template for quick reuse</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Monthly PayMama Withdrawal"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Portal</Label>
                <Select
                  value={formData.portal_id}
                  onValueChange={(value) => setFormData({ ...formData, portal_id: value })}
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
                <Label>Type</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, transaction_type: value })
                  }
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
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Commission (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.commission}
                  onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Site Fee (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.site_fee}
                  onChange={(e) => setFormData({ ...formData, site_fee: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Template</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

