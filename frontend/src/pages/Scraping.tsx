import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ScrapingConfigList } from "@/components/scraping/ScrapingConfigList";
import { AddScrapingConfigDialog } from "@/components/scraping/AddScrapingConfigDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Scraping = () => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Website Scraping</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Configure automatic data extraction from payment websites
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2 text-xs sm:text-sm">
            <Plus className="h-4 w-4" />
            Add Config
          </Button>
        </div>

        <ScrapingConfigList />
        <AddScrapingConfigDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      </div>
    </DashboardLayout>
  );
};

export default Scraping;
