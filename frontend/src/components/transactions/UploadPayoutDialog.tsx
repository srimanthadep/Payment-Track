import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud } from "lucide-react";

// We parse CSV with Papa if available, otherwise simple fallback
// and Excel with SheetJS (xlsx). These libs are added as dependencies.
// Use dynamic imports to avoid build errors if dependencies aren't installed yet

interface UploadPayoutDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ParsedRow = {
  portal?: string;
  transaction_type?: string; // withdrawal | repayment
  amount?: number;
  commission?: number; // user's commission (optional)
  site_fee?: number; // website commission/charges
  transaction_date?: string; // ISO or parseable
  reference_number?: string;
};

export const UploadPayoutDialog = ({ userId, open, onOpenChange }: UploadPayoutDialogProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [portalsByName, setPortalsByName] = useState<Record<string, { id: string; defaultCommissionRate: number }>>({});

  useEffect(() => {
    if (!open) return;
    const loadPortals = async () => {
      const { data, error } = await supabase.from("portals").select("id,name,default_commission_rate").eq("is_active", true);
      if (error) return;
      const map: Record<string, { id: string; defaultCommissionRate: number }> = {};
      (data || []).forEach((p: any) => { map[(p.name || "").toLowerCase()] = { id: p.id, defaultCommissionRate: Number(p.default_commission_rate || 0) }; });
      setPortalsByName(map);
    };
    loadPortals();
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const loadViaCdn = async (url: string, globalVar: string): Promise<any> => {
    // If already present, reuse
    // @ts-ignore
    if ((window as any)[globalVar]) return (window as any)[globalVar];
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${url}`));
      document.head.appendChild(s);
    });
    // @ts-ignore
    return (window as any)[globalVar];
  };

  const dynamicImport = async (specifier: string): Promise<any | null> => {
    try {
      // Use eval to avoid Vite pre-bundling resolution
      // eslint-disable-next-line no-eval
      const mod = await (0, eval)(`import('${specifier}')`);
      return mod;
    } catch {
      return null;
    }
  };

  const parseFile = async (): Promise<ParsedRow[]> => {
    if (!file) return [];
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "csv") {
      const text = await file.text();
      let Papa: any = (await dynamicImport('papaparse'))?.default;
      if (!Papa) {
        Papa = await loadViaCdn("https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js", "Papa");
      }
      if (!Papa) { toast({ title: "Missing parser", description: "Unable to load CSV parser", variant: "destructive" }); return []; }
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = (result.data as any[]).map((r) => normalizeRow(r));
      return rows;
    }
    // Excel
    let XLSX: any = await dynamicImport('xlsx');
    if (!XLSX) {
      XLSX = await loadViaCdn("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", "XLSX");
    }
    if (!XLSX) { toast({ title: "XLSX not supported", description: "Unable to load Excel parser", variant: "destructive" }); return []; }
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
    return json.map((r) => normalizeRow(r));
  };

  const normalizeRow = (r: any): ParsedRow => {
    // Try common header names, case-insensitive
    const get = (keys: string[]): any => {
      const lower = Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]));
      for (const k of keys) {
        const v = lower[k.toLowerCase()];
        if (v !== undefined) return v;
      }
      return undefined;
    };

    const amountRaw = get(["amount", "net_amount", "payout", "value"]);
    // map "commission/fee/charges" from CSV to site_fee (website commission)
    const siteFeeRaw = get(["site_fee", "sitefee", "commission", "fee", "charges"]);
    // optional separate field for user's commission, if present
    const commissionRaw = get(["my_commission", "user_commission", "our_commission"]);
    const dateRaw = get(["transaction_date", "date", "payout_date"]);
    const typeRaw = String(get(["transaction_type", "type"]) ?? "withdrawal").toLowerCase();
    const statusRaw = String(get(["status"]) ?? "completed").toLowerCase();

    return {
      portal: String(get(["portal", "site", "gateway"]) ?? "Other").trim(),
      transaction_type: typeRaw === "repayment" ? "repayment" : "withdrawal",
      amount: toNum(amountRaw),
      commission: toNum(commissionRaw) ?? 0,
      site_fee: toNum(siteFeeRaw) ?? 0,
      transaction_date: parseDate(dateRaw),
      reference_number: String(get(["reference", "reference_number", "ref"]) ?? "").trim() || undefined,
    };
  };

  const toNum = (v: any): number | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(String(v).replace(/[,\s]/g, ""));
    return isNaN(n) ? undefined : n;
  };

  const parseDate = (v: any): string | undefined => {
    if (!v) return undefined;
    const d = new Date(v);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  };

  const ensurePortal = async (name: string): Promise<{ id: string; defaultCommissionRate: number } | null> => {
    const key = name.toLowerCase();
    if (portalsByName[key]) return portalsByName[key];
    // Create minimal portal if missing
    const { data, error } = await supabase
      .from("portals")
      .insert({ name, default_commission_rate: 0, default_site_fee: 0, is_active: true })
      .select("id,name,default_commission_rate")
      .single();
    if (error) return null;
    const record = { id: data.id as string, defaultCommissionRate: Number(data.default_commission_rate || 0) };
    setPortalsByName({ ...portalsByName, [key]: record });
    return record;
  };

  const handleImport = async () => {
    if (!file) { toast({ title: "No file", description: "Choose a CSV or XLSX file", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
      const rows = await parseFile();
      // Map and insert in batches
      const batch: any[] = [];
      for (const row of rows) {
        const portalName = row.portal?.trim() || "Other";
        const portal = await ensurePortal(portalName);
        if (!portal || !row.amount) continue;
        const computedCommission = row.commission != null
          ? row.commission
          : Number(((row.amount * (portal.defaultCommissionRate || 0)) / 100).toFixed(2));
        batch.push({
          user_id: userId,
          portal_id: portal.id,
          transaction_type: row.transaction_type || "withdrawal",
          amount: row.amount,
          commission: computedCommission ?? 0,
          site_fee: row.site_fee ?? 0,
          transaction_date: row.transaction_date || new Date().toISOString(),
          reference_number: row.reference_number || null,
        });
      }
      if (batch.length === 0) {
        toast({ title: "No transactions", description: "Could not find valid rows in the file" });
        setIsLoading(false);
        return;
      }
      // Insert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < batch.length; i += chunkSize) {
        const chunk = batch.slice(i, i + chunkSize);
        const { error } = await supabase.from("transactions").insert(chunk);
        if (error) throw error;
      }
      toast({ title: "Imported", description: `Imported ${batch.length} transactions` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to import file", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Import Payout Report</DialogTitle>
          <DialogDescription>Upload a CSV or Excel (XLSX) file. We’ll parse rows and create transactions.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Choose file</Label>
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">Expected headers include: portal/site, type, amount, commission, site_fee, date, reference. We auto-detect common names.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={isLoading || !file}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Importing...</> : <><UploadCloud className="h-4 w-4 mr-2"/>Import</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadPayoutDialog;

