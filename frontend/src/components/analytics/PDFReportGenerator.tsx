import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Loader2 } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import jsPDF from "jspdf";

interface PDFReportGeneratorProps {
  userId: string;
}

interface TransactionRow {
  amount: number;
  commission: number;
  site_fee: number;
  profit: number | null;
  transaction_type: string;
  card_type: string | null;
  transaction_date: string;
  portals?: { name: string } | null;
}

interface ExpenseRow {
  amount: number;
  category: string;
  expense_date: string;
  paid_to: string | null;
}

export const PDFReportGenerator = ({ userId }: PDFReportGeneratorProps) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");

  const getPeriodRange = (
    period: string
  ): { start: Date; end: Date; label: string } => {
    const now = new Date();
    switch (period) {
      case "this_month":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: format(now, "MMMM yyyy"),
        };
      case "last_month":
        return {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1)),
          label: format(subMonths(now, 1), "MMMM yyyy"),
        };
      case "this_week":
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
          label: `Week of ${format(startOfWeek(now, { weekStartsOn: 1 }), "dd MMM yyyy")}`,
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: format(now, "MMMM yyyy"),
        };
    }
  };

  const formatINR = (n: number) =>
    `Rs. ${Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const { start, end, label } = getPeriodRange(selectedPeriod);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      // Fetch transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, commission, site_fee, profit, transaction_type, card_type, transaction_date, portals(name)")
        .eq("user_id", userId)
        .gte("transaction_date", startStr)
        .lte("transaction_date", endStr)
        .order("transaction_date", { ascending: true });

      // Fetch expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, category, expense_date, paid_to")
        .eq("user_id", userId)
        .gte("expense_date", startStr)
        .lte("expense_date", endStr)
        .order("expense_date", { ascending: true });

      // Fetch profile
      const { data: { user } } = await supabase.auth.getUser();
      const businessName = user?.user_metadata?.full_name || user?.user_metadata?.name || "Payment Tracker";

      const txns = (transactions as TransactionRow[]) || [];
      const exps = (expenses as ExpenseRow[]) || [];

      // Calculate summary
      const totalWithdrawals = txns
        .filter((t) => t.transaction_type === "withdrawal")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const totalRepayments = txns
        .filter((t) => t.transaction_type === "repayment")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const totalCommissions = txns.reduce(
        (s, t) => s + Number(t.commission || 0),
        0
      );
      const totalSiteFees = txns.reduce(
        (s, t) => s + Number(t.site_fee || 0),
        0
      );
      const netRevenue = totalCommissions - totalSiteFees;
      const totalExpenses = exps.reduce(
        (s, e) => s + Number(e.amount || 0),
        0
      );
      const netProfit = netRevenue - totalExpenses;

      // Portal breakdown
      const portalMap: Record<
        string,
        { volume: number; commission: number; siteFee: number; count: number }
      > = {};
      txns.forEach((t) => {
        const name = (t.portals as any)?.name || "Unknown";
        if (!portalMap[name])
          portalMap[name] = { volume: 0, commission: 0, siteFee: 0, count: 0 };
        portalMap[name].volume += Number(t.amount || 0);
        portalMap[name].commission += Number(t.commission || 0);
        portalMap[name].siteFee += Number(t.site_fee || 0);
        portalMap[name].count += 1;
      });

      // Card type breakdown
      const cardMap: Record<string, { count: number; volume: number }> = {};
      txns.forEach((t) => {
        const card = t.card_type || "Unknown";
        if (!cardMap[card]) cardMap[card] = { count: 0, volume: 0 };
        cardMap[card].count += 1;
        cardMap[card].volume += Number(t.amount || 0);
      });

      // Expense category breakdown
      const expCatMap: Record<string, number> = {};
      exps.forEach((e) => {
        expCatMap[e.category] = (expCatMap[e.category] || 0) + Number(e.amount || 0);
      });

      // --- Generate PDF ---
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Helper functions
      const addText = (
        text: string,
        x: number,
        yPos: number,
        opts?: { size?: number; style?: string; color?: number[]; align?: "left" | "center" | "right" }
      ) => {
        doc.setFontSize(opts?.size || 10);
        doc.setFont("helvetica", opts?.style || "normal");
        if (opts?.color) doc.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
        else doc.setTextColor(50, 50, 50);
        doc.text(text, x, yPos, { align: opts?.align || "left" });
      };

      const addLine = (yPos: number, color?: number[]) => {
        doc.setDrawColor(color?.[0] || 220, color?.[1] || 220, color?.[2] || 220);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, pageWidth - margin, yPos);
      };

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = margin;
        }
      };

      // === PAGE 1: HEADER & SUMMARY ===

      // Header bar
      doc.setFillColor(30, 58, 138); // Deep blue
      doc.rect(0, 0, pageWidth, 35, "F");

      addText("Payment Tracker", margin, 14, {
        size: 20,
        style: "bold",
        color: [255, 255, 255],
      });
      addText(`${label} Report`, margin, 22, {
        size: 11,
        color: [200, 210, 255],
      });
      addText(businessName, margin, 29, {
        size: 9,
        color: [180, 190, 240],
      });
      addText(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, pageWidth - margin, 29, {
        size: 8,
        color: [180, 190, 240],
        align: "right",
      });

      y = 48;

      // Summary section title
      addText("FINANCIAL SUMMARY", margin, y, {
        size: 12,
        style: "bold",
        color: [30, 58, 138],
      });
      y += 8;
      addLine(y);
      y += 8;

      // Summary grid (2 columns)
      const summaryItems = [
        { label: "Total Withdrawals", value: formatINR(totalWithdrawals) },
        { label: "Total Repayments", value: formatINR(totalRepayments) },
        { label: "Total Commissions", value: formatINR(totalCommissions) },
        { label: "Total Site Fees", value: formatINR(totalSiteFees) },
        { label: "Net Revenue", value: formatINR(netRevenue) },
        { label: "Total Expenses", value: formatINR(totalExpenses) },
        { label: "Transaction Count", value: txns.length.toString() },
        { label: "Expense Count", value: exps.length.toString() },
      ];

      const colWidth = contentWidth / 2;
      summaryItems.forEach((item, i) => {
        const col = i % 2;
        const x = margin + col * colWidth;
        if (i > 0 && col === 0) y += 12;

        addText(item.label, x, y, { size: 9, color: [120, 120, 120] });
        addText(item.value, x, y + 5, { size: 11, style: "bold" });
      });

      y += 20;
      addLine(y);
      y += 4;

      // Net Profit highlight
      const profitColor =
        netProfit >= 0 ? [16, 185, 129] : [239, 68, 68]; // green or red
      doc.setFillColor(profitColor[0], profitColor[1], profitColor[2]);
      doc.roundedRect(margin, y, contentWidth, 18, 3, 3, "F");
      addText("NET PROFIT", margin + 8, y + 8, {
        size: 10,
        style: "bold",
        color: [255, 255, 255],
      });
      addText(formatINR(netProfit), pageWidth - margin - 8, y + 8, {
        size: 14,
        style: "bold",
        color: [255, 255, 255],
        align: "right",
      });

      y += 30;

      // === PORTAL BREAKDOWN TABLE ===
      checkPageBreak(60);
      addText("PORTAL-WISE BREAKDOWN", margin, y, {
        size: 12,
        style: "bold",
        color: [30, 58, 138],
      });
      y += 8;

      // Table header
      doc.setFillColor(240, 242, 245);
      doc.rect(margin, y, contentWidth, 8, "F");
      addText("Portal", margin + 3, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
      addText("Txns", margin + 55, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
      addText("Volume", margin + 75, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
      addText("Commission", margin + 110, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
      addText("Net", margin + 150, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
      y += 10;

      Object.entries(portalMap)
        .sort((a, b) => b[1].volume - a[1].volume)
        .forEach(([name, data], i) => {
          checkPageBreak(8);
          if (i % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 3, contentWidth, 8, "F");
          }
          addText(name.substring(0, 18), margin + 3, y + 2, { size: 8 });
          addText(data.count.toString(), margin + 55, y + 2, { size: 8 });
          addText(formatINR(data.volume), margin + 75, y + 2, { size: 8 });
          addText(formatINR(data.commission), margin + 110, y + 2, { size: 8 });
          addText(formatINR(data.commission - data.siteFee), margin + 150, y + 2, { size: 8 });
          y += 8;
        });

      y += 8;

      // === CARD TYPE BREAKDOWN ===
      checkPageBreak(40);
      addText("CARD TYPE DISTRIBUTION", margin, y, {
        size: 12,
        style: "bold",
        color: [30, 58, 138],
      });
      y += 8;

      doc.setFillColor(240, 242, 245);
      doc.rect(margin, y, contentWidth, 8, "F");
      addText("Card Type", margin + 3, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
      addText("Transactions", margin + 60, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
      addText("Volume", margin + 110, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
      addText("% Share", margin + 150, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
      y += 10;

      const totalVolume = txns.reduce(
        (s, t) => s + Number(t.amount || 0),
        0
      );
      Object.entries(cardMap)
        .sort((a, b) => b[1].volume - a[1].volume)
        .forEach(([card, data], i) => {
          checkPageBreak(8);
          if (i % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 3, contentWidth, 8, "F");
          }
          const pct =
            totalVolume > 0 ? ((data.volume / totalVolume) * 100).toFixed(1) : "0";
          addText(card, margin + 3, y + 2, { size: 8 });
          addText(data.count.toString(), margin + 60, y + 2, { size: 8 });
          addText(formatINR(data.volume), margin + 110, y + 2, { size: 8 });
          addText(`${pct}%`, margin + 150, y + 2, { size: 8 });
          y += 8;
        });

      y += 8;

      // === EXPENSE CATEGORY BREAKDOWN ===
      if (Object.keys(expCatMap).length > 0) {
        checkPageBreak(40);
        addText("EXPENSE CATEGORIES", margin, y, {
          size: 12,
          style: "bold",
          color: [30, 58, 138],
        });
        y += 8;

        doc.setFillColor(240, 242, 245);
        doc.rect(margin, y, contentWidth, 8, "F");
        addText("Category", margin + 3, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
        addText("Amount", margin + 100, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
        addText("% of Total", margin + 150, y + 5.5, { size: 8, style: "bold", color: [80, 80, 80] });
        y += 10;

        Object.entries(expCatMap)
          .sort((a, b) => b[1] - a[1])
          .forEach(([cat, amount], i) => {
            checkPageBreak(8);
            if (i % 2 === 0) {
              doc.setFillColor(248, 250, 252);
              doc.rect(margin, y - 3, contentWidth, 8, "F");
            }
            const pct =
              totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : "0";
            addText(cat, margin + 3, y + 2, { size: 8 });
            addText(formatINR(amount), margin + 100, y + 2, { size: 8 });
            addText(`${pct}%`, margin + 150, y + 2, { size: 8 });
            y += 8;
          });
      }

      // Footer on last page
      const pageHeight = doc.internal.pageSize.getHeight();
      addLine(pageHeight - 15, [200, 200, 200]);
      addText(
        "Generated by Payment Tracker • Confidential",
        pageWidth / 2,
        pageHeight - 10,
        { size: 7, color: [160, 160, 160], align: "center" }
      );

      // Save
      const fileName = `PaymentTracker_Report_${label.replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);

      toast({
        title: "📄 Report Downloaded!",
        description: `${fileName} saved successfully`,
      });
      setDialogOpen(false);
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-8"
        onClick={() => setDialogOpen(true)}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Download Report</span>
        <span className="sm:hidden">PDF</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Generate PDF Report
            </DialogTitle>
            <DialogDescription>
              Download a professional PDF report with all your financial data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Report Period</Label>
              <Select
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">
                    This Month ({format(new Date(), "MMMM yyyy")})
                  </SelectItem>
                  <SelectItem value="last_month">
                    Last Month ({format(subMonths(new Date(), 1), "MMMM yyyy")})
                  </SelectItem>
                  <SelectItem value="this_week">
                    This Week
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium">Report includes:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✅ Financial summary (revenue, expenses, profit)</li>
                <li>✅ Portal-wise breakdown table</li>
                <li>✅ Card type distribution</li>
                <li>✅ Expense category breakdown</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={generatePDF}
                disabled={isGenerating}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
