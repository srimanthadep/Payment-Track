import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { format, eachDayOfInterval, startOfDay, endOfDay, isSameDay } from "date-fns";

export interface DailyTargetDayData {
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // dd MMM yyyy
  dayName: string; // Mon, Tue, etc.
  txCount: number;
  totalAmount: number;
  commission: number;
  siteFee: number;
  profit: number;
  target: number;
  percentAchieved: number;
  status: "Achieved" | "On Track" | "Needs Attention" | "No Activity";
}

export interface DailyTargetExportResult {
  days: DailyTargetDayData[];
  totals: {
    totalDays: number;
    daysAchieved: number;
    totalTxCount: number;
    totalAmount: number;
    totalCommission: number;
    totalSiteFee: number;
    totalProfit: number;
    totalTarget: number;
    avgDailyProfit: number;
    overallPercent: number;
  };
}

const formatNumber = (val: number, decimals: number = 0): string => {
  return Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatCurrency = (val: number, decimals: number = 0): string => {
  return `Rs. ${formatNumber(val, decimals)}`;
};

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

/**
 * Fetch and aggregate Chummi portal daily target data for a given date range
 */
export async function fetchDailyTargetData(
  userId: string,
  startDate: Date,
  endDate: Date,
  dailyTarget: number = 5000
): Promise<DailyTargetExportResult> {
  // 1. Resolve Self / Chummi portal ID
  const { data: portalData } = await supabase
    .from("portals")
    .select("id, name")
    .or("name.ilike.%self%,name.ilike.%chummi%")
    .limit(1)
    .maybeSingle();

  const chummiPortalId = portalData?.id;

  const rangeStart = startOfDay(startDate);
  const rangeEnd = endOfDay(endDate);

  // 2. Fetch all transactions for this user within range
  let query = supabase
    .from("transactions")
    .select("amount, commission, site_fee, profit, transaction_date, portal_id")
    .eq("user_id", userId)
    .gte("transaction_date", rangeStart.toISOString())
    .lte("transaction_date", rangeEnd.toISOString())
    .order("transaction_date", { ascending: true });

  if (chummiPortalId) {
    query = query.eq("portal_id", chummiPortalId);
  }

  const { data: txns, error } = await query;
  if (error) {
    console.error("Error fetching daily target transactions:", error);
    throw new Error(error.message || "Failed to fetch transactions");
  }

  // 3. Generate all days in interval (newest first for reporting)
  const allDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).reverse();

  const days: DailyTargetDayData[] = allDays.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const formattedDate = format(day, "dd MMM yyyy");
    const dayName = format(day, "EEE");

    // Filter transactions on this day
    const dayTxns = (txns || []).filter((t) => {
      const tDate = new Date(t.transaction_date);
      return isSameDay(tDate, day);
    });

    const txCount = dayTxns.length;
    const totalAmount = dayTxns.reduce((s, t) => s + Number(t.amount || 0), 0);
    const commission = dayTxns.reduce((s, t) => s + Number(t.commission || 0), 0);
    const siteFee = dayTxns.reduce((s, t) => s + Number(t.site_fee || 0), 0);
    const profit = dayTxns.reduce(
      (s, t) =>
        s +
        (t.profit !== undefined && t.profit !== null
          ? Number(t.profit)
          : Number(t.commission || 0) - Number(t.site_fee || 0)),
      0
    );

    const percentAchieved = dailyTarget > 0 ? (profit / dailyTarget) * 100 : 0;

    let status: DailyTargetDayData["status"] = "No Activity";
    if (profit >= dailyTarget) {
      status = "Achieved";
    } else if (profit >= dailyTarget * 0.5) {
      status = "On Track";
    } else if (txCount > 0) {
      status = "Needs Attention";
    }

    return {
      dateStr,
      formattedDate,
      dayName,
      txCount,
      totalAmount,
      commission,
      siteFee,
      profit,
      target: dailyTarget,
      percentAchieved,
      status,
    };
  });

  const totalDays = days.length;
  const daysAchieved = days.filter((d) => d.profit >= dailyTarget).length;
  const totalTxCount = days.reduce((s, d) => s + d.txCount, 0);
  const totalAmount = days.reduce((s, d) => s + d.totalAmount, 0);
  const totalCommission = days.reduce((s, d) => s + d.commission, 0);
  const totalSiteFee = days.reduce((s, d) => s + d.siteFee, 0);
  const totalProfit = days.reduce((s, d) => s + d.profit, 0);
  const totalTarget = totalDays * dailyTarget;
  const avgDailyProfit = totalDays > 0 ? totalProfit / totalDays : 0;
  const overallPercent = totalTarget > 0 ? (totalProfit / totalTarget) * 100 : 0;

  return {
    days,
    totals: {
      totalDays,
      daysAchieved,
      totalTxCount,
      totalAmount,
      totalCommission,
      totalSiteFee,
      totalProfit,
      totalTarget,
      avgDailyProfit,
      overallPercent,
    },
  };
}

/**
 * Export daily target performance to an Excel (.xlsx) spreadsheet
 */
export function exportDailyTargetToExcel(
  result: DailyTargetExportResult,
  filename?: string
): void {
  const { days, totals } = result;

  const data = days.map((d, idx) => ({
    "S.No": idx + 1,
    Date: d.formattedDate,
    Day: d.dayName,
    "Transactions Count": d.txCount,
    "Turnover Amount (₹)": Math.round(d.totalAmount),
    "Commission (₹)": Math.round(d.commission),
    "Site Fee (₹)": Math.round(d.siteFee),
    "Net Profit (₹)": Math.round(d.profit),
    "Daily Target (₹)": d.target,
    "Achievement %": `${d.percentAchieved.toFixed(1)}%`,
    Status: d.status,
  }));

  // Append Total / Summary row
  data.push({
    "S.No": "" as any,
    Date: `TOTAL (${totals.totalDays} Days)`,
    Day: `${totals.daysAchieved} Achieved`,
    "Transactions Count": totals.totalTxCount,
    "Turnover Amount (₹)": Math.round(totals.totalAmount),
    "Commission (₹)": Math.round(totals.totalCommission),
    "Site Fee (₹)": Math.round(totals.totalSiteFee),
    "Net Profit (₹)": Math.round(totals.totalProfit),
    "Daily Target (₹)": totals.totalTarget,
    "Achievement %": `${totals.overallPercent.toFixed(1)}%`,
    Status: totals.overallPercent >= 100 ? "Goal Met" : "In Progress",
  });

  const ws = XLSX.utils.json_to_sheet(data);

  ws["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 14 }, // Date
    { wch: 8 },  // Day
    { wch: 18 }, // Tx Count
    { wch: 20 }, // Turnover
    { wch: 16 }, // Commission
    { wch: 14 }, // Site Fee
    { wch: 16 }, // Net Profit
    { wch: 16 }, // Target
    { wch: 15 }, // Achievement %
    { wch: 16 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Daily Targets");

  const defaultName = `Self-Daily-Targets-${days[days.length - 1]?.dateStr || "start"}_to_${days[0]?.dateStr || "end"}.xlsx`;
  XLSX.writeFile(wb, filename || defaultName);
}

/**
 * Export daily target performance to a beautifully styled, executive-grade PDF
 */
export async function exportDailyTargetToPDF(
  result: DailyTargetExportResult,
  options?: {
    businessName?: string;
    userName?: string;
    filename?: string;
  }
): Promise<void> {
  const { days, totals } = result;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 269mm

  // Fetch logo (circle logo first, fallback to standard logo)
  let logoBase64 = await getImageBase64("/logo-circle.png");
  if (!logoBase64) logoBase64 = await getImageBase64("/logo.png");

  // Executive Top Banner (Slate 900)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, "F");

  // Emerald accent line under header
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 26, pageWidth, 1.2, "F");

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, 3.5, 19, 19);
    } catch (e) {
      console.warn("Could not render logo in PDF", e);
    }
  }

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT TRACKER — DAILY TARGET PERFORMANCE REPORT", margin + 24, 10.5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("PORTAL: SELF PORTAL  •  EXECUTIVE FINANCIAL AUDIT LEDGER", margin + 24, 16.5);

  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  const dateRangeText = `Reporting Period: ${days[days.length - 1]?.formattedDate || "-"} to ${days[0]?.formattedDate || "-"}  (${totals.totalDays} Days Aggregated)`;
  doc.text(dateRangeText, margin + 24, 21.5);

  // Header Right Metadata
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, pageWidth - margin, 10.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("STATUS: AUDITED FINANCIAL LEDGER", pageWidth - margin, 16.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(`Daily Benchmark: Rs. ${Number(days[0]?.target || 5000).toLocaleString("en-IN")}/day`, pageWidth - margin, 21.5, { align: "right" });

  // Executive Metric Summary Cards (4 blocks across content width)
  const cardY = 32;
  const cardHeight = 22;
  const cardGap = 4;
  const cardWidth = (contentWidth - 3 * cardGap) / 4; // ~64.25mm each

  const metrics = [
    {
      label: "TOTAL NET PROFIT",
      val: `Rs. ${formatNumber(totals.totalProfit)}`,
      sub: `Target: Rs. ${formatNumber(totals.totalTarget)} (${totals.overallPercent.toFixed(1)}% Goal)`,
      color: totals.totalProfit >= totals.totalTarget ? [16, 185, 129] : [245, 158, 11],
    },
    {
      label: "TARGET ACHIEVEMENT RATE",
      val: `${totals.overallPercent.toFixed(1)}%`,
      sub: `${totals.daysAchieved} of ${totals.totalDays} Days Met Daily Target`,
      color: totals.overallPercent >= 100 ? [16, 185, 129] : [59, 130, 246],
    },
    {
      label: "DAILY AVERAGE PROFIT",
      val: `Rs. ${formatNumber(totals.avgDailyProfit)} / day`,
      sub: `Benchmark Goal: Rs. ${formatNumber(days[0]?.target || 5000)} / day`,
      color: totals.avgDailyProfit >= 5000 ? [16, 185, 129] : [139, 92, 246],
    },
    {
      label: "TOTAL TURNOVER VOLUME",
      val: `Rs. ${formatNumber(totals.totalAmount)}`,
      sub: `${totals.totalTxCount} Total Transactions Processed`,
      color: [99, 102, 241],
    },
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (cardWidth + cardGap);
    // Background card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 1.5, 1.5, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 1.5, 1.5, "S");

    // Top accent indicator bar
    doc.setFillColor(m.color[0], m.color[1], m.color[2]);
    doc.rect(x, cardY, cardWidth, 1.8, "F");

    // Text inside card
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3.5, cardY + 6.8);

    doc.setFontSize(12.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, x + 3.5, cardY + 13.8);

    doc.setFontSize(6.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(m.sub, x + 3.5, cardY + 18.8);
  });

  // Table Data
  const tableData = days.map((d, index) => [
    (index + 1).toString(),
    `${d.formattedDate} (${d.dayName})`,
    d.txCount.toString(),
    formatNumber(d.totalAmount),
    formatNumber(d.commission),
    formatNumber(d.siteFee),
    formatNumber(d.profit),
    formatNumber(d.target),
    `${d.percentAchieved.toFixed(1)}%`,
    d.status,
  ]);

  autoTable(doc, {
    startY: cardY + cardHeight + 5,
    margin: { top: 14, left: margin, right: margin, bottom: 14 },
    head: [
      [
        "#",
        "Date",
        "Txns",
        "Turnover (Rs.)",
        "Commission (Rs.)",
        "Site Fee (Rs.)",
        "Net Profit (Rs.)",
        "Target (Rs.)",
        "Achieved %",
        "Status",
      ],
    ],
    body: tableData,
    foot: [
      [
        "",
        `Total (${totals.totalDays} Days)`,
        totals.totalTxCount.toString(),
        formatNumber(totals.totalAmount),
        formatNumber(totals.totalCommission),
        formatNumber(totals.totalSiteFee),
        formatNumber(totals.totalProfit),
        formatNumber(totals.totalTarget),
        `${totals.overallPercent.toFixed(1)}%`,
        totals.overallPercent >= 100 ? "Goal Met" : "In Progress",
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
      font: "helvetica",
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      lineColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      lineColor: [15, 23, 42],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", cellWidth: 40 },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "right", cellWidth: 34 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 24 },
      6: { halign: "right", cellWidth: 30, fontStyle: "bold" },
      7: { halign: "right", cellWidth: 28 },
      8: { halign: "center", cellWidth: 28 },
      9: { halign: "center", cellWidth: 33 },
    },
    didParseCell: (data) => {
      // Highlight Net Profit column in body
      if (data.section === "body" && data.column.index === 6) {
        const rowData = days[data.row.index];
        data.cell.styles.fontStyle = "bold";
        if (rowData && rowData.profit >= rowData.target) {
          data.cell.styles.textColor = [21, 128, 61]; // emerald-700
          data.cell.styles.fillColor = [240, 253, 244]; // emerald-50
        } else if (rowData && rowData.profit > 0) {
          data.cell.styles.textColor = [180, 83, 9]; // amber-700
        } else {
          data.cell.styles.textColor = [220, 38, 38]; // red-600
          data.cell.styles.fillColor = [254, 242, 242]; // red-50
        }
      }

      // Status pill badge styling in body
      if (data.section === "body" && data.column.index === 9) {
        const text = data.cell.text[0];
        data.cell.styles.fontStyle = "bold";
        if (text === "Achieved") {
          data.cell.styles.fillColor = [240, 253, 244]; // emerald-50
          data.cell.styles.textColor = [21, 128, 61];   // emerald-700
        } else if (text === "On Track") {
          data.cell.styles.fillColor = [239, 246, 255]; // blue-50
          data.cell.styles.textColor = [29, 78, 216];   // blue-700
        } else if (text === "Needs Attention") {
          data.cell.styles.fillColor = [254, 243, 199]; // amber-100
          data.cell.styles.textColor = [180, 83, 9];    // amber-700
        } else {
          data.cell.styles.fillColor = [241, 245, 249]; // slate-100
          data.cell.styles.textColor = [100, 116, 139]; // slate-500
        }
      }

      // Footer styling
      if (data.section === "foot") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [15, 23, 42];
        data.cell.styles.textColor = [255, 255, 255];
        if (data.column.index === 6) {
          data.cell.styles.textColor = [74, 222, 128]; // green-400
        }
        if (data.column.index === 9) {
          data.cell.styles.textColor = totals.overallPercent >= 100 ? [74, 222, 128] : [251, 191, 36];
        }
      }
    },
  });

  // Footer & Page numbering on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pHeight = doc.internal.pageSize.getHeight();
    const pWidth = doc.internal.pageSize.getWidth();

    // Footer rule line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pHeight - 8, pWidth - margin, pHeight - 8);

    // Footer text
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Payment Tracker  •  Self Portal Daily Target & Financial Performance  •  Strictly Confidential",
      margin,
      pHeight - 4.5
    );

    doc.text(`Page ${i} of ${totalPages}`, pWidth - margin, pHeight - 4.5, { align: "right" });
  }

  const defaultName = `Self-Daily-Targets-${days[days.length - 1]?.dateStr || "start"}_to_${days[0]?.dateStr || "end"}.pdf`;
  doc.save(options?.filename || defaultName);
}
