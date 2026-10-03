import { describe, it, expect, beforeEach } from 'vitest';
import {
  TransactionLearningService,
  type HistoricalTransactionRecord,
} from '@/services/transactionLearningService';

describe('TransactionLearningService - 5-Tier Hierarchical Bayesian Cascade', () => {
  let service: TransactionLearningService;

  beforeEach(() => {
    service = new TransactionLearningService();
  });

  it('Tier 0: Recommends personalized recurring customer rate over terminal rate', () => {
    const records: HistoricalTransactionRecord[] = [
      // Standard terminal rate for Axis Bank on Bharath portal: 2.0% comm / 1.55% fee
      {
        id: '1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        bank_name: 'axis bank',
        customer_mode: 'regular',
        customer_name: 'Random User',
        customer_id: 'cust-1',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 50000,
      },
      {
        id: '2',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        bank_name: 'axis bank',
        customer_mode: 'regular',
        customer_name: 'Random User 2',
        customer_id: 'cust-2',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 50000,
      },
      // Special customer "Varun" negotiated rate: 1.9% comm / 1.55% fee
      {
        id: '3',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        bank_name: 'axis bank',
        customer_mode: 'chummi',
        customer_name: 'Varun',
        customer_id: 'cust-varun',
        commission_percent: 1.9,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 25000,
      },
      {
        id: '4',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        bank_name: 'axis bank',
        customer_mode: 'chummi',
        customer_name: 'Varun',
        customer_id: 'cust-varun',
        commission_percent: 1.9,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 30000,
      },
    ];

    service.setRecordsForTesting(records);

    // Query for Varun
    const recVarun = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'bharath',
      bankName: 'axis bank',
      customerMode: 'chummi',
      customerName: 'Varun',
      customerId: 'cust-varun',
    });

    expect(recVarun.source).toBe('customer_history');
    expect(recVarun.commission).toBe(1.9);
    expect(recVarun.siteFee).toBe(1.55);
    expect(recVarun.confidence).toBeGreaterThanOrEqual(0.7);

    // Query for generic customer on same terminal
    const recGeneric = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'bharath',
      bankName: 'axis bank',
      customerMode: 'regular',
      customerName: 'Someone Else',
    });

    expect(recGeneric.source).toBe('card_tx_portal_bank_mode');
    expect(recGeneric.commission).toBe(2.0);
    expect(recGeneric.siteFee).toBe(1.55);
  });

  it('Tier 1: Distinguishes rates by bank and mode on the same portal', () => {
    const records: HistoricalTransactionRecord[] = [
      // Axis Bank on Upender: 2.0% comm / 1.55% fee
      {
        id: '1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'upender',
        bank_name: 'axis bank',
        customer_mode: 'regular',
        customer_name: 'A',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 20000,
      },
      {
        id: '2',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'upender',
        bank_name: 'axis bank',
        customer_mode: 'regular',
        customer_name: 'B',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 20000,
      },
      // ICICI Bank on Upender: 2.7% comm / 2.4% fee
      {
        id: '3',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'upender',
        bank_name: 'icici bank',
        customer_mode: 'regular',
        customer_name: 'C',
        commission_percent: 2.7,
        site_fee_percent: 2.4,
        transaction_date: new Date(),
        amount: 20000,
      },
      {
        id: '4',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'upender',
        bank_name: 'icici bank',
        customer_mode: 'regular',
        customer_name: 'D',
        commission_percent: 2.7,
        site_fee_percent: 2.4,
        transaction_date: new Date(),
        amount: 20000,
      },
    ];

    service.setRecordsForTesting(records);

    const recAxis = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'upender',
      bankName: 'axis bank',
      customerMode: 'regular',
    });
    expect(recAxis.commission).toBe(2.0);
    expect(recAxis.siteFee).toBe(1.55);

    const recICICI = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'upender',
      bankName: 'icici bank',
      customerMode: 'regular',
    });
    expect(recICICI.commission).toBe(2.7);
    expect(recICICI.siteFee).toBe(2.4);
  });

  it('Tier 3 & 4: Falls back gracefully to portal or card+tx when bank is unknown', () => {
    const records: HistoricalTransactionRecord[] = [
      {
        id: '1',
        card_type: 'master',
        transaction_type: 'repayment',
        sent_to: 'chummi',
        bank_name: 'sbi',
        customer_mode: 'regular',
        commission_percent: 2.3,
        site_fee_percent: 1.5,
        transaction_date: new Date(),
        amount: 15000,
      },
      {
        id: '2',
        card_type: 'master',
        transaction_type: 'repayment',
        sent_to: 'chummi',
        bank_name: 'hdfc',
        customer_mode: 'regular',
        commission_percent: 2.3,
        site_fee_percent: 1.5,
        transaction_date: new Date(),
        amount: 25000,
      },
    ];

    service.setRecordsForTesting(records);

    // Query with no bank specified
    const rec = service.getRecommendation({
      cardType: 'master',
      transactionType: 'repayment',
      sentTo: 'chummi',
    });

    expect(rec.source).toBe('card_tx_portal');
    expect(rec.commission).toBe(2.3);
    expect(rec.siteFee).toBe(1.5);
  });

  it('Handles floating-point division drift smoothly via KDE tolerance window', () => {
    // Odd amount transactions causing floating noise (e.g. 2.70001% vs 2.7%)
    const records: HistoricalTransactionRecord[] = [
      {
        id: '1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        commission_percent: 2.7001,
        site_fee_percent: 2.4002,
        transaction_date: new Date(),
        amount: 89997,
      },
      {
        id: '2',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        commission_percent: 2.6999,
        site_fee_percent: 2.3998,
        transaction_date: new Date(),
        amount: 45001,
      },
      {
        id: '3',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        commission_percent: 2.7,
        site_fee_percent: 2.4,
        transaction_date: new Date(),
        amount: 50000,
      },
    ];

    service.setRecordsForTesting(records);

    const rec = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'bharath',
    });

    // Should resolve to the modal center 2.7% and 2.4% within tolerance
    expect(Math.abs(rec.commission - 2.7)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(rec.siteFee - 2.4)).toBeLessThanOrEqual(0.05);
    expect(rec.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('Calculates LOOCV backtest metrics correctly', () => {
    const records: HistoricalTransactionRecord[] = [
      {
        id: '1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 10000,
      },
      {
        id: '2',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 20000,
      },
      {
        id: '3',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 30000,
      },
    ];

    service.setRecordsForTesting(records);

    const backtest = service.runBacktest();
    expect(backtest.totalEvaluated).toBe(3);
    expect(backtest.commissionAccuracy).toBe(100);
    expect(backtest.siteFeeAccuracy).toBe(100);
    expect(backtest.bothAccuracy).toBe(100);
  });
});
