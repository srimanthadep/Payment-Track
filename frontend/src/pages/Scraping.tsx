import { DashboardLayout } from "@/components/DashboardLayout";
import { ScrapingConfigList } from "@/components/scraping/ScrapingConfigList";
import { AddScrapingConfigDialog } from "@/components/scraping/AddScrapingConfigDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

const Scraping = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Website Scraping</h1>
            <p className="text-muted-foreground">
              Configure automatic data extraction from payment websites
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
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
