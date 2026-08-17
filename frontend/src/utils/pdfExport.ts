import jsPDF from "jspdf";
import "jspdf-autotable";

export interface PDFTransaction {
  id: string;
  portal_id?: string;
  transaction_type: string;
  amount: number;
  commission: number;
  site_fee: number;
  profit?: number;
  transaction_date: string;
  reference_number?: string | null;
  status: string;
  card_type?: string | null;
  portals: {
    name: string;
  };
}

interface PDFExportProps {
  transactions: PDFTransaction[];
  dateRange?: { from: Date | null; to: Date | null };
}

export const exportToPDF = ({ transactions, dateRange }: PDFExportProps) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(18);
  doc.text("Transaction Report", pageWidth / 2, 20, { align: "center" });

  // Date range if provided
  if (dateRange?.from || dateRange?.to) {
    doc.setFontSize(10);
    const dateText =
      dateRange.from && dateRange.to
        ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
        : dateRange.from
        ? `From: ${dateRange.from.toLocaleDateString()}`
        : `To: ${dateRange.to?.toLocaleDateString()}`;
    doc.text(dateText, pageWidth / 2, 30, { align: "center" });
  }

  // Summary stats
  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalCommission = transactions.reduce((sum, t) => sum + Number(t.commission || 0), 0);
  const totalProfit = transactions.reduce(
    (sum, t) => sum + (t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0)),
    0
  );

  doc.setFontSize(12);
  doc.text(`Total Transactions: ${transactions.length}`, 14, 45);
  doc.text(`Total Amount: ₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 14, 52);
  doc.text(`Total Commission: ₹${totalCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 14, 59);
  doc.text(`Total Profit: ₹${totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 14, 66);

  // Table data
  const tableData = transactions.map((t) => {
    const profitVal = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
    return [
      new Date(t.transaction_date).toLocaleDateString("en-IN"),
      t.portals?.name || "N/A",
      t.transaction_type || "N/A",
      `₹${Number(t.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `₹${Number(t.commission || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `₹${Number(t.site_fee || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `₹${profitVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      t.status || "Completed",
    ];
  });

  // Add table
  (doc as any).autoTable({
    head: [["Date", "Portal", "Type", "Amount", "Commission", "Site Fee", "Profit", "Status"]],
    body: tableData,
    startY: 75,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // Footer
  doc.setFontSize(8);
  doc.text(
    `Generated on: ${new Date().toLocaleString("en-IN")}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Save PDF
  doc.save(`transactions-report-${new Date().toISOString().split("T")[0]}.pdf`);
};
