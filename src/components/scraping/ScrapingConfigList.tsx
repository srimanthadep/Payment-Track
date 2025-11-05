import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScrapingConfig {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  last_scraped_at: string;
  portals: {
    name: string;
  };
}

export const ScrapingConfigList = () => {
  const [configs, setConfigs] = useState<ScrapingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("scraping_configs")
        .select("*, portals(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error("Error fetching configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const runScraper = async (configId: string) => {
    setRunningId(configId);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-website", {
        body: { configId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Website scraped successfully",
      });

      fetchConfigs();
    } catch (error) {
      console.error("Error running scraper:", error);
      toast({
        title: "Error",
        description: "Failed to scrape website",
        variant: "destructive",
      });
    } finally {
      setRunningId(null);
    }
  };

  const deleteConfig = async (configId: string) => {
    try {
      const { error } = await supabase
        .from("scraping_configs")
        .delete()
        .eq("id", configId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Configuration deleted",
      });

      fetchConfigs();
    } catch (error) {
      console.error("Error deleting config:", error);
      toast({
        title: "Error",
        description: "Failed to delete configuration",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading configurations...</p>;
  }

  if (configs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scraping configurations yet. Add one to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>Portal</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Scraped</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {configs.map((config) => (
          <TableRow key={config.id}>
            <TableCell className="font-medium">{config.name}</TableCell>
            <TableCell className="max-w-xs truncate">{config.url}</TableCell>
            <TableCell>{config.portals?.name || "-"}</TableCell>
            <TableCell>
              <Badge variant={config.is_active ? "default" : "secondary"}>
                {config.is_active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              {config.last_scraped_at
                ? new Date(config.last_scraped_at).toLocaleString()
                : "Never"}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => runScraper(config.id)}
                  disabled={runningId === config.id}
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteConfig(config.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
