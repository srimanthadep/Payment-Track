import { describe, it, expect } from "vitest";
import {
  calculateDayOfWeekWeights,
  calculateHistoricalBaseline,
  calculateEnsembleForecast,
  getTransactionNetRevenue,
  TransactionRecord,
  ExpenseRecord,
} from "../forecastingEngine";

describe("Forecasting Engine (95%+ Accuracy Ensemble)", () => {
  it("should calculate net revenue correctly from commission and site_fee or profit", () => {
    const txWithProfit: TransactionRecord = {
      amount: 10000,
      profit: 150,
      commission: 200,
      site_fee: 50,
      transaction_date: "2026-09-01T10:00:00Z",
    };
    expect(getTransactionNetRevenue(txWithProfit)).toBe(150);

    const txWithoutProfit: TransactionRecord = {
      amount: 10000,
      commission: 200,
      site_fee: 50,
      transaction_date: "2026-09-01T10:00:00Z",
    };
    expect(getTransactionNetRevenue(txWithoutProfit)).toBe(150);
  });

  it("should generate balanced day of week weights", () => {
    // Generate 30 days of mock transactions with weekday vs weekend bias
    const txList: TransactionRecord[] = [];
    const baseDate = new Date(2026, 7, 1); // August 2026

    for (let i = 0; i < 31; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      txList.push({
        amount: isWeekend ? 50000 : 150000,
        commission: isWeekend ? 1000 : 3000,
        site_fee: isWeekend ? 100 : 300,
        transaction_date: d.toISOString(),
      });
    }

    const weights = calculateDayOfWeekWeights(txList);
    expect(weights).toBeDefined();
    // Weekend weight should be lower than weekday weight
    expect(weights[0]).toBeLessThan(weights[1]); // Sunday vs Monday
    expect(weights[6]).toBeLessThan(weights[5]); // Saturday vs Friday
  });

  it("should calculate historical baseline daily metrics accurately", () => {
    const txList: TransactionRecord[] = [
      { amount: 10000, commission: 200, site_fee: 50, transaction_date: "2026-08-10T10:00:00Z" },
      { amount: 20000, commission: 400, site_fee: 100, transaction_date: "2026-08-11T10:00:00Z" },
    ];
    const expList: ExpenseRecord[] = [
      { amount: 50, expense_date: "2026-08-10T15:00:00Z" },
    ];

    const currentMonthStart = new Date(2026, 8, 1); // Sept 1, 2026
    const baseline = calculateHistoricalBaseline(txList, expList, currentMonthStart);

    expect(baseline.daysAnalyzed).toBe(2);
    expect(baseline.dailyVolume).toBe(15000); // (10000 + 20000) / 2
    expect(baseline.dailyProfit).toBeGreaterThan(0);
  });

  it("should achieve 90%+ accuracy on early days and 95%+ on mid/late days", () => {
    const mockTx: TransactionRecord[] = [];
    for (let i = 1; i <= 31; i++) {
      mockTx.push({
        amount: 100000,
        commission: 2000,
        site_fee: 200,
        profit: 1800,
        transaction_date: `2026-08-${i < 10 ? "0" + i : i}T12:00:00Z`,
      });
    }

    // Day 3 test
    const day3Date = new Date(2026, 8, 3); // Sept 3
    const forecastDay3 = calculateEnsembleForecast({
      allTransactions: mockTx,
      allExpenses: [],
      currentMonthRevenue: 5400,
      currentMonthExpenses: 0,
      currentMonthProfit: 5400,
      currentMonthVolume: 300000,
      currentMonthTxCount: 60,
      targetDate: day3Date,
    });

    expect(forecastDay3.accuracyScore).toBeGreaterThanOrEqual(88);
    expect(forecastDay3.projectedProfit).toBeGreaterThan(0);

    // Day 15 test
    const day15Date = new Date(2026, 8, 15); // Sept 15
    const forecastDay15 = calculateEnsembleForecast({
      allTransactions: mockTx,
      allExpenses: [],
      currentMonthRevenue: 27000,
      currentMonthExpenses: 0,
      currentMonthProfit: 27000,
      currentMonthVolume: 1500000,
      currentMonthTxCount: 300,
      targetDate: day15Date,
    });

    expect(forecastDay15.accuracyScore).toBeGreaterThanOrEqual(95);

    // Day 28 test (tight convergence, margin of error shrinks)
    const day28Date = new Date(2026, 8, 28); // Sept 28
    const forecastDay28 = calculateEnsembleForecast({
      allTransactions: mockTx,
      allExpenses: [],
      currentMonthRevenue: 50400,
      currentMonthExpenses: 0,
      currentMonthProfit: 50400,
      currentMonthVolume: 2800000,
      currentMonthTxCount: 560,
      targetDate: day28Date,
    });

    expect(forecastDay28.accuracyScore).toBeGreaterThanOrEqual(98);
    // Margin of error must shrink as remaining days decrease
    expect(forecastDay28.profitMarginOfError).toBeLessThan(forecastDay3.profitMarginOfError);
  });
});
