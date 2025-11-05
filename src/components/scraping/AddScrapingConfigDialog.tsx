import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Portal {
  id: string;
  name: string;
}

interface AddScrapingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddScrapingConfigDialog = ({ open, onOpenChange }: AddScrapingConfigDialogProps) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [portalId, setPortalId] = useState("");
  const [extractionRules, setExtractionRules] = useState("");
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPortals();
    }
  }, [open]);

  const fetchPortals = async () => {
    const { data, error } = await supabase
      .from("portals")
      .select("id, name")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching portals:", error);
      return;
    }

    setPortals(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Parse extraction rules as JSON
      let rules = {};
      if (extractionRules.trim()) {
        try {
          rules = JSON.parse(extractionRules);
        } catch {
          toast({
            title: "Invalid JSON",
            description: "Extraction rules must be valid JSON",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase.from("scraping_configs").insert({
        user_id: user.id,
        name,
        url,
        portal_id: portalId || null,
        extraction_rules: rules,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scraping configuration added",
      });

      // Reset form
      setName("");
      setUrl("");
      setPortalId("");
      setExtractionRules("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding config:", error);
      toast({
        title: "Error",
        description: "Failed to add configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Scraping Configuration</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Configuration Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., PayPal Transactions"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/transactions"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portal">Portal (Optional)</Label>
            <Select value={portalId} onValueChange={setPortalId}>
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
            <Label htmlFor="rules">Extraction Rules (JSON)</Label>
            <Textarea
              id="rules"
              value={extractionRules}
              onChange={(e) => setExtractionRules(e.target.value)}
              placeholder='{"amount": "\\$([0-9.]+)", "reference": "REF-([A-Z0-9]+)"}'
              className="font-mono text-sm"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Define regex patterns to extract data. Example: amount, reference, type
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Configuration"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
