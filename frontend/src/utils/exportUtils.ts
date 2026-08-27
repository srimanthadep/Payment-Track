import * as XLSX from "xlsx";
import { getCardTypeDisplayName, type CardType } from "./commissionCalculator";

export interface ExportTransaction {
  transaction_date: string;
  portals: { name: string };
  transaction_type: string;
  card_type: string | null;
  amount: number;
  commission: number;
  site_fee: number;
  profit?: number;
  reference_number?: string | null;
  status: string;
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const escapeCSV = (val: string | number | null | undefined): string => {
  const str = String(val ?? "");
  // Escape if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Export transactions as a properly escaped CSV file
 */
export const exportTransactionsToCSV = (
  transactions: ExportTransaction[],
  filename?: string
): void => {
  const headers = [
    "S.No",
    "Date & Time",
    "Portal",
    "Type",
    "Card Type",
    "Amount",
    "Commission",
    "Site Fee",
    "Profit",
    "Reference",
    "Status",
  ];

  const rows = transactions.map((t, index) => {
    const profit =
      t.profit !== undefined
        ? Number(t.profit)
        : Number(t.commission || 0) - Number(t.site_fee || 0);

    return [
      escapeCSV(index + 1),
      escapeCSV(formatDate(t.transaction_date)),
      escapeCSV(t.portals?.name || "General"),
      escapeCSV(t.transaction_type || "Withdrawal"),
      escapeCSV(t.card_type ? getCardTypeDisplayName(t.card_type as CardType) : "-"),
      escapeCSV(Number(t.amount || 0).toFixed(2)),
      escapeCSV(Number(t.commission || 0).toFixed(2)),
      escapeCSV(Number(t.site_fee || 0).toFixed(2)),
      escapeCSV(profit.toFixed(2)),
      escapeCSV(t.reference_number || ""),
      escapeCSV(t.status || "Completed"),
    ];
  });

  // Totals row
  const totalAmount = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalComm = transactions.reduce((s, t) => s + Number(t.commission || 0), 0);
  const totalFee = transactions.reduce((s, t) => s + Number(t.site_fee || 0), 0);
  const totalProfit = transactions.reduce((s, t) => {
    const p = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
    return s + p;
  }, 0);

  rows.push([
    "",
    `Total (${transactions.length})`,
    "",
    "",
    "",
    totalAmount.toFixed(2),
    totalComm.toFixed(2),
    totalFee.toFixed(2),
    totalProfit.toFixed(2),
    "",
    "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // Add BOM for UTF-8 encoding (Excel compatibility)
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `PaymentTracker-Transactions-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Export transactions as an Excel (.xlsx) file with formatted headers and summary
 */
export const exportTransactionsToExcel = (
  transactions: ExportTransaction[],
  filename?: string
): void => {
  // Build data rows
  const data = transactions.map((t, index) => {
    const profit =
      t.profit !== undefined
        ? Number(t.profit)
        : Number(t.commission || 0) - Number(t.site_fee || 0);

    return {
      "S.No": index + 1,
      "Date & Time": formatDate(t.transaction_date),
      Portal: t.portals?.name || "General",
      Type: t.transaction_type || "Withdrawal",
      "Card Type": t.card_type ? getCardTypeDisplayName(t.card_type as CardType) : "-",
      Amount: Number(t.amount || 0),
      Commission: Number(t.commission || 0),
      "Site Fee": Number(t.site_fee || 0),
      Profit: profit,
      Reference: t.reference_number || "",
      Status: t.status || "Completed",
    };
  });

  // Totals row
  const totalAmount = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalComm = transactions.reduce((s, t) => s + Number(t.commission || 0), 0);
  const totalFee = transactions.reduce((s, t) => s + Number(t.site_fee || 0), 0);
  const totalProfit = transactions.reduce((s, t) => {
    const p = t.profit !== undefined ? Number(t.profit) : Number(t.commission || 0) - Number(t.site_fee || 0);
    return s + p;
  }, 0);

  data.push({
    "S.No": "" as any,
    "Date & Time": `Total (${transactions.length})`,
    Portal: "",
    Type: "",
    "Card Type": "",
    Amount: totalAmount,
    Commission: totalComm,
    "Site Fee": totalFee,
    Profit: totalProfit,
    Reference: "",
    Status: "",
  });

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 6 },   // S.No
    { wch: 22 },  // Date & Time
    { wch: 14 },  // Portal
    { wch: 12 },  // Type
    { wch: 16 },  // Card Type
    { wch: 14 },  // Amount
    { wch: 14 },  // Commission
    { wch: 12 },  // Site Fee
    { wch: 14 },  // Profit
    { wch: 16 },  // Reference
    { wch: 12 },  // Status
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");

  // Download
  XLSX.writeFile(
    wb,
    filename || `PaymentTracker-Transactions-${new Date().toISOString().split("T")[0]}.xlsx`
  );
};
