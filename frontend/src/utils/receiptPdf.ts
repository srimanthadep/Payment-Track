import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReceiptData {
  customerName: string;
  customerPhone?: string;
  businessName?: string;
  transaction: {
    id?: string;
    amount: number;
    portalName: string;
    transactionDate: string;
    transactionType: string;
    commission?: number;
    cardType?: string;
    notes?: string;
  };
}

/**
 * Generates a clean, professional single-transaction receipt PDF.
 * Returns the jsPDF instance so caller can .save(), .output('blob'), etc.
 */
export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5", // A5 is perfect for receipts
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 148mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 124mm

  const businessName = data.businessName || "Payment Tracker";
  const tx = data.transaction;
  const txDate = tx.transactionDate
    ? new Date(tx.transactionDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  // Header background banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  // Business Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(businessName, margin, 14);

  // Subtitle / Receipt Badge
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text("Official Payment Receipt", margin, 21);

  // Date on the right
  doc.setFontSize(8);
  doc.text(txDate, pageWidth - margin, 21, { align: "right" });

  let curY = 36;

  // Customer & Meta Info Card
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(margin, curY, contentWidth, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text("BILLED TO", margin + 4, curY + 6);
  doc.text("RECEIPT REF", pageWidth - margin - 4, curY + 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(data.customerName || "Valued Customer", margin + 4, curY + 13);

  const refNo = tx.id ? tx.id.slice(0, 12).toUpperCase() : `TX-${Date.now().toString().slice(-6)}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(refNo, pageWidth - margin - 4, curY + 13, { align: "right" });

  if (data.customerPhone) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Phone: ${data.customerPhone}`, margin + 4, curY + 19);
  }

  curY += 30;

  // Transaction Items Table
  const tableData = [
    ["Portal / Provider", tx.portalName || "Standard"],
    ["Transaction Type", (tx.transactionType || "Transfer").toUpperCase()],
    ["Payment Method", tx.cardType || "Standard Transfer"],
    ["Transaction Amount", `INR ${Number(tx.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
  ];

  if (tx.commission && tx.commission > 0) {
    tableData.push([
      "Service Charge / Fee",
      `INR ${Number(tx.commission).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ]);
  }

  if (tx.notes) {
    tableData.push(["Notes / Remarks", tx.notes]);
  }

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    theme: "plain",
    body: tableData,
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      lineColor: [241, 245, 249],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, textColor: [71, 85, 105] },
      1: { halign: "right", textColor: [15, 23, 42] },
    },
  });

  const lastTable = (doc as any).lastAutoTable;
  curY = lastTable ? lastTable.finalY + 8 : curY + 50;

  // Total Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, curY, contentWidth, 16, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAL AMOUNT", margin + 5, curY + 10.5);

  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129); // Emerald-600
  doc.text(
    `₹${Number(tx.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    pageWidth - margin - 5,
    curY + 10.5,
    { align: "right" }
  );

  curY += 24;

  // Footer notes
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you for your business! This is a system-generated receipt.", pageWidth / 2, curY, {
    align: "center",
  });
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • ${businessName}`,
    pageWidth / 2,
    curY + 4,
    { align: "center" }
  );

  return doc;
}

/**
 * Convenience helper to download the receipt PDF immediately.
 */
export function downloadReceiptPDF(data: ReceiptData) {
  const doc = generateReceiptPDF(data);
  const sanitizedName = (data.customerName || "Customer").replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  doc.save(`Receipt_${sanitizedName}_${dateStr}.pdf`);
}
