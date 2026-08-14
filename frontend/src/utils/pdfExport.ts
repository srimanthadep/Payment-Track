import jsPDF from "jspdf";
import "jspdf-autotable";
import { Transaction } from "./TransactionsTable";

interface PDFExportProps {
  transactions: Transaction[];
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
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalCommission = transactions.reduce((sum, t) => sum + t.commission, 0);
  const totalProfit = transactions.reduce((sum, t) => sum + t.commission, 0);

  doc.setFontSize(12);
  doc.text(`Total Transactions: ${transactions.length}`, 14, 45);
  doc.text(`Total Amount: ₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 14, 52);
  doc.text(`Total Commission: ₹${totalCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 14, 59);
  doc.text(`Total Profit: ₹${totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 14, 66);

  // Table data
  const tableData = transactions.map((t) => [
    new Date(t.transaction_date).toLocaleDateString("en-IN"),
    t.portals.name,
    t.transaction_type,
    `₹${t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    `₹${t.commission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    `₹${t.site_fee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    `₹${t.commission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    t.status,
  ]);

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
  const finalY = (doc as any).lastAutoTable.finalY || 75;
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

