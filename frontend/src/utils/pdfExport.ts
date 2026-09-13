import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCardTypeDisplayName } from "./commissionCalculator";

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
  status?: string;
  card_type?: string | null;
  portals?: {
    name: string;
  };
}

interface PDFExportProps {
  transactions: PDFTransaction[];
  dateRange?: { from: Date | null; to: Date | null };
  businessName?: string;
  userName?: string;
}

// Helper to convert image URL to base64 for jsPDF embedding
async function getImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Strict currency formatter for INR
const formatINR = (val: number, decimals: number = 2): string => {
  return Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const exportToPDF = async ({
  transactions,
  dateRange,
  businessName = "Payment Tracker",
}: PDFExportProps) => {
  if (!transactions || transactions.length === 0) {
    throw new Error("No transactions available to export");
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  // Try loading logo (fallback chain: /logo-circle.png -> /logo.png -> /icon-192.png)
  let logoBase64 = await getImageBase64("/logo-circle.png");
  if (!logoBase64) logoBase64 = await getImageBase64("/logo.png");
  if (!logoBase64) logoBase64 = await getImageBase64("/icon-192.png");

  // ==========================================
  // CALCULATIONS & FINANCIAL INTELLIGENCE
  // ==========================================
  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalCommission = transactions.reduce((sum, t) => sum + Number(t.commission || 0), 0);
  const totalSiteFee = transactions.reduce((sum, t) => sum + Number(t.site_fee || 0), 0);
  const totalProfit = transactions.reduce(
    (sum, t) =>
      sum +
      (t.profit !== undefined
        ? Number(t.profit)
        : Number(t.commission || 0) - Number(t.site_fee || 0)),
    0
  );

  const avgTxnSize = transactions.length > 0 ? totalAmount / transactions.length : 0;
  const avgProfitPerTxn = transactions.length > 0 ? totalProfit / transactions.length : 0;
  const commissionRate = totalAmount > 0 ? (totalCommission / totalAmount) * 100 : 0;
  const netProfitMargin = totalCommission > 0 ? (totalProfit / totalCommission) * 100 : 0;
  const feeRate = totalCommission > 0 ? (totalSiteFee / totalCommission) * 100 : 0;
  const profitToVol = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

  // Status breakdown
  const completedCount = transactions.filter((t) => (t.status || "completed").toLowerCase() === "completed").length;
  const pendingCount = transactions.filter((t) => t.status && t.status.toLowerCase() === "pending").length;
  const failedCount = transactions.filter((t) => t.status && t.status.toLowerCase() === "failed").length;
  const successRate = transactions.length > 0 ? (completedCount / transactions.length) * 100 : 100;

  // Withdrawals & Repayments breakdown
  const withdrawals = transactions.filter(
    (t) => !t.transaction_type || t.transaction_type.toLowerCase() === "withdrawal"
  );
  const repayments = transactions.filter(
    (t) => t.transaction_type && t.transaction_type.toLowerCase() === "repayment"
  );

  const withdrawalVolume = withdrawals.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const repaymentVolume = repayments.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const withdrawalShare = totalAmount > 0 ? (withdrawalVolume / totalAmount) * 100 : 0;
  const repaymentShare = totalAmount > 0 ? (repaymentVolume / totalAmount) * 100 : 0;
  const netCapitalFlow = withdrawalVolume - repaymentVolume;

  // Highest / Lowest Withdrawals
  let maxWithdrawal = withdrawals.length > 0 ? withdrawals[0] : null;
  let minWithdrawal = withdrawals.length > 0 ? withdrawals[0] : null;
  withdrawals.forEach((t) => {
    const amt = Number(t.amount || 0);
    if (!maxWithdrawal || amt > Number(maxWithdrawal.amount || 0)) maxWithdrawal = t;
    if (!minWithdrawal || amt < Number(minWithdrawal.amount || 0)) minWithdrawal = t;
  });

  // Highest / Lowest Repayments
  let maxRepayment = repayments.length > 0 ? repayments[0] : null;
  let minRepayment = repayments.length > 0 ? repayments[0] : null;
  repayments.forEach((t) => {
    const amt = Number(t.amount || 0);
    if (!maxRepayment || amt > Number(maxRepayment.amount || 0)) maxRepayment = t;
    if (!minRepayment || amt < Number(minRepayment.amount || 0)) minRepayment = t;
  });

  // Highest / Lowest Profits
  let maxProfitTxn = transactions[0];
  let minProfitTxn = transactions[0];
  transactions.forEach((t) => {
    const p = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
    const maxP = maxProfitTxn.profit !== undefined ? Number(maxProfitTxn.profit) : Number(maxProfitTxn.commission || 0) - Number(maxProfitTxn.site_fee || 0);
    const minP = minProfitTxn.profit !== undefined ? Number(minProfitTxn.profit) : Number(minProfitTxn.commission || 0) - Number(minProfitTxn.site_fee || 0);
    if (p > maxP) maxProfitTxn = t;
    if (p < minP) minProfitTxn = t;
  });

  const maxProfitVal = maxProfitTxn ? (maxProfitTxn.profit !== undefined ? Number(maxProfitTxn.profit) : Number(maxProfitTxn.commission || 0) - Number(maxProfitTxn.site_fee || 0)) : 0;
  const minProfitVal = minProfitTxn ? (minProfitTxn.profit !== undefined ? Number(minProfitTxn.profit) : Number(minProfitTxn.commission || 0) - Number(minProfitTxn.site_fee || 0)) : 0;

  // Day-by-Day Peak Velocity Aggregation
  const dayMap = new Map<string, { volume: number; profit: number; count: number }>();
  transactions.forEach((t) => {
    const d = new Date(t.transaction_date);
    const dayKey = isNaN(d.getTime())
      ? "Unknown Date"
      : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const curr = dayMap.get(dayKey) || { volume: 0, profit: 0, count: 0 };
    const pVal = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
    curr.volume += Number(t.amount || 0);
    curr.profit += pVal;
    curr.count += 1;
    dayMap.set(dayKey, curr);
  });

  let peakDayName = "-";
  let peakDayVolume = 0;
  let peakProfitDayName = "-";
  let peakProfitDayProfit = 0;
  dayMap.forEach((val, key) => {
    if (val.volume > peakDayVolume) {
      peakDayVolume = val.volume;
      peakDayName = key;
    }
    if (val.profit > peakProfitDayProfit) {
      peakProfitDayProfit = val.profit;
      peakProfitDayName = key;
    }
  });

  const activeDaysCount = Math.max(dayMap.size, 1);
  const avgDailyVolume = totalAmount / activeDaysCount;
  const avgDailyProfit = totalProfit / activeDaysCount;

  // Portal Breakdown Map
  const portalMap = new Map<string, { count: number; amount: number; commission: number; site_fee: number; profit: number }>();
  transactions.forEach((t) => {
    const pName = t.portals?.name || "General";
    const curr = portalMap.get(pName) || { count: 0, amount: 0, commission: 0, site_fee: 0, profit: 0 };
    const pVal = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
    curr.count += 1;
    curr.amount += Number(t.amount || 0);
    curr.commission += Number(t.commission || 0);
    curr.site_fee += Number(t.site_fee || 0);
    curr.profit += pVal;
    portalMap.set(pName, curr);
  });

  // Card Type Breakdown Map
  const cardMap = new Map<string, { count: number; amount: number; commission: number; site_fee: number; profit: number }>();
  transactions.forEach((t) => {
    const cName = t.card_type ? getCardTypeDisplayName(t.card_type) : "Other Cards";
    const curr = cardMap.get(cName) || { count: 0, amount: 0, commission: 0, site_fee: 0, profit: 0 };
    const pVal = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
    curr.count += 1;
    curr.amount += Number(t.amount || 0);
    curr.commission += Number(t.commission || 0);
    curr.site_fee += Number(t.site_fee || 0);
    curr.profit += pVal;
    cardMap.set(cName, curr);
  });

  // Find top portal and top card network
  let topPortalName = "-";
  let topPortalProfit = 0;
  let topPortalShare = 0;
  portalMap.forEach((val, key) => {
    if (val.profit > topPortalProfit) {
      topPortalProfit = val.profit;
      topPortalName = key;
      topPortalShare = totalProfit > 0 ? (val.profit / totalProfit) * 100 : 0;
    }
  });

  let topCardName = "-";
  let topCardVolume = 0;
  let topCardShare = 0;
  cardMap.forEach((val, key) => {
    if (val.amount > topCardVolume) {
      topCardVolume = val.amount;
      topCardName = key;
      topCardShare = totalAmount > 0 ? (val.amount / totalAmount) * 100 : 0;
    }
  });

  // ==========================================
  // PAGE 1: EXECUTIVE FINANCIAL INTELLIGENCE
  // ==========================================

  // Top Dark Accent Line
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 2.5, "F");

  // Header Area
  const headerY = 7;
  const logoSize = 13;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, headerY, logoSize, logoSize, undefined, "FAST");
    } catch {
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(margin, headerY, logoSize, logoSize, 2, 2, "F");
    }
  }

  // Titles next to logo
  const titleX = margin + logoSize + 3.5;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12.5);
  doc.setFont("helvetica", "bold");
  doc.text(businessName.toUpperCase(), titleX, headerY + 5.2);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.2);
  doc.setFont("helvetica", "normal");
  doc.text("Executive Financial Intelligence & Settlement Statement", titleX, headerY + 9.8);

  // Right-aligned Metadata Box
  const metaRightX = pageWidth - margin;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.8);
  doc.setFont("helvetica", "bold");
  const reportDateStr = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(reportDateStr, metaRightX, headerY + 5.2, { align: "right" });

  const docRef = `PT-${Date.now().toString(36).toUpperCase()}`;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.text(`Doc Ref: ${docRef}`, metaRightX, headerY + 9.8, { align: "right" });

  // Divider Line
  let currentY = 22.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 3;

  // Period & Scope Context Banner
  let periodText = "Period: All Historical Records";
  if (dateRange?.from || dateRange?.to) {
    periodText =
      dateRange.from && dateRange.to
        ? `Period: ${dateRange.from.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}  to  ${dateRange.to.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
        : dateRange.from
        ? `Period: From ${dateRange.from.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} onwards`
        : `Period: Up to ${dateRange.to?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 5.5, 1, 1, "FD");
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.text(periodText, margin + 3, currentY + 3.8);

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Total: ${transactions.length} Txns | Success Rate: ${successRate.toFixed(1)}% | Portals: ${portalMap.size} | Networks: ${cardMap.size}`,
    pageWidth - margin - 3,
    currentY + 3.8,
    { align: "right" }
  );

  currentY += 7.5;

  // ==========================================
  // SECTION 1: 4 TOP KPI SCORECARD TILES
  // ==========================================
  const cardGap = 2.5;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 15;

  // KPI 1: Volume
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.2, 1.2, "FD");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL VOLUME", margin + 2.5, currentY + 4);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(`Rs. ${formatINR(totalAmount)}`, margin + 2.5, currentY + 9.5);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Daily Avg: Rs. ${formatINR(avgDailyVolume, 0)}`, margin + 2.5, currentY + 13.2);

  // KPI 2: Commission
  const card2X = margin + cardWidth + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 1.2, 1.2, "FD");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "bold");
  doc.text("GROSS COMMISSION", card2X + 2.5, currentY + 4);
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(8.5);
  doc.text(`Rs. ${formatINR(totalCommission)}`, card2X + 2.5, currentY + 9.5);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Avg Yield: ${commissionRate.toFixed(2)}%`, card2X + 2.5, currentY + 13.2);

  // KPI 3: Site Fee
  const card3X = margin + (cardWidth + cardGap) * 2;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 1.2, 1.2, "FD");
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "bold");
  doc.text("PORTAL / SITE FEE", card3X + 2.5, currentY + 4);
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(8.5);
  doc.text(`Rs. ${formatINR(totalSiteFee)}`, card3X + 2.5, currentY + 9.5);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Cost Ratio: ${feeRate.toFixed(1)}%`, card3X + 2.5, currentY + 13.2);

  // KPI 4: Net Profit
  const card4X = margin + (cardWidth + cardGap) * 3;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(card4X, currentY, cardWidth, cardHeight, 1.2, 1.2, "FD");
  doc.setTextColor(21, 128, 61);
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "bold");
  doc.text("NET PROFIT", card4X + 2.5, currentY + 4);
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(8.8);
  doc.text(`Rs. ${formatINR(totalProfit)}`, card4X + 2.5, currentY + 9.5);
  doc.setTextColor(21, 128, 61);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Retention: ${netProfitMargin.toFixed(1)}%`, card4X + 2.5, currentY + 13.2);

  currentY += cardHeight + 4.5;

  // ==========================================
  // SECTION 2: SIDE-BY-SIDE ANALYTICS BREAKDOWN TABLES
  // ==========================================
  const halfTableWidth = (contentWidth - 4) / 2; // 91mm each

  // Title Headers
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("PORTAL PERFORMANCE BREAKDOWN", margin, currentY);
  doc.text("CARD TYPE / NETWORK BREAKDOWN", margin + halfTableWidth + 4, currentY);
  currentY += 2;

  // Prepare Portal Table Data & Footer (Profit Share)
  const portalTableData = Array.from(portalMap.entries())
    .sort((a, b) => b[1].profit - a[1].profit)
    .map(([name, stat]) => [
      name,
      stat.count.toString(),
      formatINR(stat.amount, 0),
      formatINR(stat.profit, 2),
      `${totalProfit > 0 ? ((stat.profit / totalProfit) * 100).toFixed(1) : "0"}%`,
    ]);

  const portalTableFoot = [
    [
      "Total",
      transactions.length.toString(),
      formatINR(totalAmount, 0),
      formatINR(totalProfit, 2),
      "100%",
    ],
  ];

  // Prepare Card Type Table Data & Footer (Volume Share)
  const cardTableData = Array.from(cardMap.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([name, stat]) => [
      name,
      stat.count.toString(),
      formatINR(stat.amount, 0),
      formatINR(stat.profit, 2),
      `${totalAmount > 0 ? ((stat.amount / totalAmount) * 100).toFixed(1) : "0"}%`,
    ]);

  const cardTableFoot = [
    [
      "Total",
      transactions.length.toString(),
      formatINR(totalAmount, 0),
      formatINR(totalProfit, 2),
      "100%",
    ],
  ];

  // Render Portal Table (Left)
  autoTable(doc, {
    head: [["Portal", "Txns", "Volume (Rs)", "Profit (Rs)", "Share"]],
    body: portalTableData,
    foot: portalTableFoot,
    startY: currentY,
    tableWidth: halfTableWidth,
    margin: { left: margin },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 6,
      cellPadding: { top: 1, bottom: 1, left: 1, right: 1 },
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 6,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 27, fontStyle: "bold" },
      1: { halign: "center", cellWidth: 10 },
      2: { halign: "right", cellWidth: 24 },
      3: { halign: "right", cellWidth: 20, fontStyle: "bold", textColor: [22, 163, 74] },
      4: { halign: "center", cellWidth: 10 },
    },
  });

  const portalTableEndY = (doc as any).lastAutoTable.finalY;

  // Render Card Table (Right)
  autoTable(doc, {
    head: [["Card Network", "Txns", "Volume (Rs)", "Profit (Rs)", "Share"]],
    body: cardTableData,
    foot: cardTableFoot,
    startY: currentY,
    tableWidth: halfTableWidth,
    margin: { left: margin + halfTableWidth + 4 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 6,
      cellPadding: { top: 1, bottom: 1, left: 1, right: 1 },
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 6,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 27, fontStyle: "bold" },
      1: { halign: "center", cellWidth: 10 },
      2: { halign: "right", cellWidth: 24 },
      3: { halign: "right", cellWidth: 20, fontStyle: "bold", textColor: [22, 163, 74] },
      4: { halign: "center", cellWidth: 10 },
    },
  });

  const cardTableEndY = (doc as any).lastAutoTable.finalY;
  currentY = Math.max(portalTableEndY, cardTableEndY) + 4.5;

  // ==========================================
  // SECTION 3: TRANSACTION EXTREMES & FINANCIAL VELOCITY (4 Box Grid)
  // ==========================================
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("TRANSACTION EXTREMES & FINANCIAL VELOCITY", margin, currentY);
  currentY += 2;

  const extremeBoxWidth = (contentWidth - 4) / 2; // 91mm each
  const extremeBoxHeight = 31;

  // Box 1: Withdrawal Extremes (Top Left)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, extremeBoxWidth, extremeBoxHeight, 1.2, 1.2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("WITHDRAWAL ACTIVITY & RANGE", margin + 3, currentY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Highest Withdrawal:", margin + 3, currentY + 9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  const maxWText = maxWithdrawal
    ? `Rs. ${formatINR(Number(maxWithdrawal.amount || 0))} (${maxWithdrawal.portals?.name || "Portal"})`
    : "N/A";
  doc.text(maxWText, margin + 31, currentY + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Lowest Withdrawal:", margin + 3, currentY + 15);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  const minWText = minWithdrawal
    ? `Rs. ${formatINR(Number(minWithdrawal.amount || 0))} (${minWithdrawal.portals?.name || "Portal"})`
    : "N/A";
  doc.text(minWText, margin + 31, currentY + 15);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Volume & Outflow Share:", margin + 3, currentY + 20.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`${withdrawals.length} Txns • Rs. ${formatINR(withdrawalVolume)} (${withdrawalShare.toFixed(1)}%)`, margin + 31, currentY + 20.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Avg Withdrawal Size:", margin + 3, currentY + 26);
  doc.setTextColor(37, 99, 235);
  doc.setFont("helvetica", "bold");
  const avgW = withdrawals.length > 0 ? withdrawalVolume / withdrawals.length : 0;
  doc.text(`Rs. ${formatINR(avgW)}`, margin + 31, currentY + 26);

  // Box 2: Repayment Extremes (Top Right)
  const repBoxX = margin + extremeBoxWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(repBoxX, currentY, extremeBoxWidth, extremeBoxHeight, 1.2, 1.2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("REPAYMENT ACTIVITY & RANGE", repBoxX + 3, currentY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Highest Repayment:", repBoxX + 3, currentY + 9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  const maxRText = maxRepayment
    ? `Rs. ${formatINR(Number(maxRepayment.amount || 0))} (${maxRepayment.portals?.name || "Portal"})`
    : "No repayments";
  doc.text(maxRText, repBoxX + 31, currentY + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Lowest Repayment:", repBoxX + 3, currentY + 15);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  const minRText = minRepayment
    ? `Rs. ${formatINR(Number(minRepayment.amount || 0))} (${minRepayment.portals?.name || "Portal"})`
    : "No repayments";
  doc.text(minRText, repBoxX + 31, currentY + 15);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Volume & Inflow Share:", repBoxX + 3, currentY + 20.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`${repayments.length} Txns • Rs. ${formatINR(repaymentVolume)} (${repaymentShare.toFixed(1)}%)`, repBoxX + 31, currentY + 20.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Avg Repayment Size:", repBoxX + 3, currentY + 26);
  doc.setTextColor(37, 99, 235);
  doc.setFont("helvetica", "bold");
  const avgR = repayments.length > 0 ? repaymentVolume / repayments.length : 0;
  doc.text(`Rs. ${formatINR(avgR)}`, repBoxX + 31, currentY + 26);

  currentY += extremeBoxHeight + 3;

  // Box 3: Profitability Extremes (Bottom Left)
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, currentY, extremeBoxWidth, extremeBoxHeight, 1.2, 1.2, "FD");

  doc.setTextColor(21, 128, 61);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("PROFITABILITY & YIELD METRICS", margin + 3, currentY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text("Highest Single Profit:", margin + 3, currentY + 9.5);
  doc.setTextColor(22, 163, 74);
  doc.setFont("helvetica", "bold");
  const maxPText = maxProfitTxn
    ? `Rs. ${formatINR(maxProfitVal)} (${maxProfitTxn.portals?.name || "Portal"})`
    : "N/A";
  doc.text(maxPText, margin + 31, currentY + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Lowest Single Profit:", margin + 3, currentY + 15);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  const minPText = minProfitTxn
    ? `Rs. ${formatINR(minProfitVal)} (${minProfitTxn.portals?.name || "Portal"})`
    : "N/A";
  doc.text(minPText, margin + 31, currentY + 15);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Avg Profit / Transaction:", margin + 3, currentY + 20.5);
  doc.setTextColor(22, 163, 74);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${formatINR(avgProfitPerTxn)} (Daily Avg: Rs. ${formatINR(avgDailyProfit, 0)})`, margin + 31, currentY + 20.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Net Profit / Vol Ratio:", margin + 3, currentY + 26);
  doc.setTextColor(21, 128, 61);
  doc.setFont("helvetica", "bold");
  doc.text(`${profitToVol.toFixed(2)}% net profit margin on volume`, margin + 31, currentY + 26);

  // Box 4: Cash Flow & Peak Velocity (Bottom Right)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(repBoxX, currentY, extremeBoxWidth, extremeBoxHeight, 1.2, 1.2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("CASH FLOW & PEAK VELOCITY", repBoxX + 3, currentY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Peak Volume Day:", repBoxX + 3, currentY + 9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`${peakDayName} (Rs. ${formatINR(peakDayVolume, 0)})`, repBoxX + 31, currentY + 9.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Peak Profit Day:", repBoxX + 3, currentY + 15);
  doc.setTextColor(22, 163, 74);
  doc.setFont("helvetica", "bold");
  doc.text(`${peakProfitDayName} (Rs. ${formatINR(peakProfitDayProfit, 0)})`, repBoxX + 31, currentY + 15);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Net Capital Movement:", repBoxX + 3, currentY + 20.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${formatINR(netCapitalFlow)} (Net Outflow)`, repBoxX + 31, currentY + 20.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Fee Retention Rate:", repBoxX + 3, currentY + 26);
  doc.setTextColor(22, 163, 74);
  doc.setFont("helvetica", "bold");
  doc.text(`${netProfitMargin.toFixed(1)}% retained after platform fees`, repBoxX + 31, currentY + 26);

  currentY += extremeBoxHeight + 3;

  // ==========================================
  // SECTION 4: STRATEGIC TAKEAWAYS CALLOUT
  // ==========================================
  const calloutHeight = 7.5;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, calloutHeight, 1.2, 1.2, "FD");
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE TAKEAWAYS:", margin + 3, currentY + 4.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const narrative = `${topCardName} led volume (${topCardShare.toFixed(1)}%) • ${topPortalName} top profit (${topPortalShare.toFixed(1)}%) • Avg Ticket: Rs. ${formatINR(avgTxnSize, 0)} • Retention: ${netProfitMargin.toFixed(1)}%`;
  doc.text(narrative, margin + 33, currentY + 4.8);

  currentY += calloutHeight + 3;

  // ==========================================
  // SECTION 5: AUDIT TRAIL, SECURITY & SIGN-OFF BLOCK
  // ==========================================
  const auditBoxHeight = 15.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, auditBoxHeight, 1.2, 1.2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("FINANCIAL SETTLEMENT AUDIT & VERIFICATION", margin + 3.5, currentY + 4.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  doc.setTextColor(100, 116, 139);
  const checksum = `PT-CHK-${Math.abs(Math.floor(totalAmount ^ totalProfit ^ transactions.length)).toString(16).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  doc.text(`System Security Checksum: ${checksum}`, margin + 3.5, currentY + 8.6);
  doc.text(`Settlement Health: ${completedCount} Verified / ${transactions.length} Total (${successRate.toFixed(1)}% Operational Reliability)`, margin + 3.5, currentY + 12.5);

  // Right Sign-Off Block (centered nicely)
  const signWidth = 50;
  const signX = pageWidth - margin - signWidth - 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(signX, currentY + 9.5, pageWidth - margin - 3, currentY + 9.5);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(5.5);
  doc.text("Authorized Signatory / Controller", signX + signWidth / 2, currentY + 13, { align: "center" });

  // Footer for Page 1
  const footerY = pageHeight - 6.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

  doc.setFontSize(5.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Payment Tracker Enterprise Financial Analytics • Generated Electronically", margin, footerY);

  // ==========================================
  // PAGE 2 ONWARDS: DETAILED TRANSACTION LEDGER
  // ==========================================
  doc.addPage();

  // Page 2 Mini Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 2.5, "F");

  let ledgerY = 8;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ITEMIZED TRANSACTION STATEMENT", margin, ledgerY + 4);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.text(`Complete verified ledger of all ${transactions.length} transactions across portals`, margin, ledgerY + 7.8);

  doc.text(`Doc Ref: ${docRef}`, pageWidth - margin, ledgerY + 4, { align: "right" });
  doc.text(`Report Period: ${periodText.replace("Period: ", "")}`, pageWidth - margin, ledgerY + 7.8, { align: "right" });

  ledgerY += 11;

  // Prepare Itemized Table Data
  const tableData = transactions.map((t, index) => {
    const profitVal =
      t.profit !== undefined
        ? Number(t.profit)
        : Number(t.commission || 0) - Number(t.site_fee || 0);

    const cardTypeName = t.card_type ? getCardTypeDisplayName(t.card_type) : "-";

    const d = new Date(t.transaction_date);
    const dateFormatted = isNaN(d.getTime())
      ? "-"
      : `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;

    const statusFormatted = t.status
      ? t.status.charAt(0).toUpperCase() + t.status.slice(1).toLowerCase()
      : "Completed";

    return [
      (index + 1).toString(),
      dateFormatted,
      t.portals?.name || "General",
      t.transaction_type ? t.transaction_type.charAt(0).toUpperCase() + t.transaction_type.slice(1) : "Withdrawal",
      cardTypeName,
      formatINR(Number(t.amount || 0)),
      formatINR(Number(t.commission || 0)),
      formatINR(Number(t.site_fee || 0)),
      formatINR(Number(profitVal)),
    ];
  });

  // Table Totals Footer row (shown ONLY on last page)
  const tableFoot = [
    [
      "",
      `Total (${transactions.length})`,
      "",
      "",
      "",
      formatINR(totalAmount),
      formatINR(totalCommission),
      formatINR(totalSiteFee),
      formatINR(totalProfit),
    ],
  ];

  // Render Itemized Table using autoTable
  autoTable(doc, {
    head: [["S.No", "Date & Time", "Portal", "Type", "Card", "Amount (Rs)", "Comm (Rs)", "Fee (Rs)", "Profit (Rs)"]],
    body: tableData,
    foot: tableFoot,
    showFoot: "lastPage",
    startY: ledgerY,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 6.8,
      cellPadding: { top: 1.8, bottom: 1.8, left: 1.2, right: 1.2 },
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900 Navy
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.8,
      halign: "left",
      cellPadding: { top: 2, bottom: 2, left: 1.2, right: 1.2 },
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 6.8,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      cellPadding: { top: 2, bottom: 2, left: 1.2, right: 1.2 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 9 },  // S.No
      1: { halign: "left", cellWidth: 25 },    // Date & Time
      2: { halign: "left", cellWidth: 20 },    // Portal
      3: { halign: "left", cellWidth: 22 },    // Type
      4: { halign: "left", cellWidth: 20 },    // Card
      5: { halign: "right", cellWidth: 26 },   // Amount
      6: { halign: "right", cellWidth: 20, textColor: [22, 163, 74] }, // Comm
      7: { halign: "right", cellWidth: 18, textColor: [220, 38, 38] }, // Fee
      8: { halign: "right", cellWidth: 22, fontStyle: "bold", textColor: [22, 163, 74] }, // Profit
    },
    margin: { left: margin, right: margin, bottom: 14 },
    didDrawPage: () => {
      const pageFooterY = pageHeight - 6.5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, pageFooterY - 2, pageWidth - margin, pageFooterY - 2);

      doc.setFontSize(5.8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("Payment Tracker Enterprise Financial Analytics • Confidential Ledger", margin, pageFooterY);
    },
  });

  // Final Pass: Update total page counts across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageFooterY = pageHeight - 6.5;
    doc.setFontSize(5.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageFooterY, { align: "right" });
  }

  // Save and Download PDF
  const dateSlug = new Date().toISOString().split("T")[0];
  doc.save(`PaymentTracker-Financial-Report-${dateSlug}.pdf`);
};
