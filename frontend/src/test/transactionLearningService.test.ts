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

  it('Prediction never depends on customer-specific previous percentage; always predicts standard pattern rates', () => {
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
      // Special customer "Varun" previously had a 1.9% one-time negotiated rate
      {
        id: '3',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        bank_name: 'axis bank',
        customer_mode: 'regular',
        customer_name: 'Varun',
        customer_id: 'cust-varun',
        commission_percent: 1.9,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 25000,
      },
    ];

    service.setRecordsForTesting(records);

    // Query for Varun: Even though Varun had a 1.9% rate previously, prediction must NEVER depend on Varun's previous rate
    const recVarun = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'bharath',
      bankName: 'axis bank',
      customerMode: 'regular',
      customerName: 'Varun',
      customerId: 'cust-varun',
    });

    // Should predict standard pattern rate 2.0%, not 1.9%
    expect(recVarun.source).toBe('card_tx_portal_bank_mode');
    expect(recVarun.commission).toBe(2.0);
    expect(recVarun.siteFee).toBe(1.55);

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

  it('getSentToForCard: Resolves last used sent_to portal for card from history', () => {
    const records: HistoricalTransactionRecord[] = [
      {
        id: '1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'upender',
        bank_name: 'sbi',
        customer_name: 'Varun',
        customer_id: 'c-varun',
        commission_percent: 2.0,
        site_fee_percent: 1.5,
        transaction_date: new Date('2026-03-01'),
        amount: 20000,
      },
      {
        id: '2',
        card_type: 'rupay',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        bank_name: 'hdfc',
        customer_name: 'Other',
        commission_percent: 2.0,
        site_fee_percent: 0.5,
        transaction_date: new Date('2026-03-02'),
        amount: 10000,
      },
    ];

    service.setRecordsForTesting(records);

    // 1. Matches customer-specific card usage
    const sentToVarun = service.getSentToForCard({
      bankName: 'sbi',
      cardType: 'visa',
      customerId: 'c-varun',
    });
    expect(sentToVarun).toBe('upender');

    // 2. Matches general bank and card usage
    const sentToHdfc = service.getSentToForCard({
      bankName: 'hdfc',
      cardType: 'rupay',
    });
    expect(sentToHdfc).toBe('bharath');

    // 3. Unknown card returns null
    const sentToUnknown = service.getSentToForCard({
      bankName: 'icici',
      cardType: 'amex',
    });
    expect(sentToUnknown).toBeNull();
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

  it('Amount Slabs: Recommends different rates for small vs bulk ticket sizes', () => {
    const records: HistoricalTransactionRecord[] = [
      // Small retail transactions: ₹10,000 - ₹20,000 at 2.4% commission / 1.55% fee
      {
        id: '1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'upender',
        commission_percent: 2.4,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 10000,
      },
      {
        id: '2',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'upender',
        commission_percent: 2.4,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 15000,
      },
      // Large bulk transactions: ₹1,50,000 - ₹2,50,000 negotiated at 1.8% commission / 1.55% fee
      {
        id: '3',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'upender',
        commission_percent: 1.8,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 180000,
      },
      {
        id: '4',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'upender',
        commission_percent: 1.8,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 200000,
      },
    ];

    service.setRecordsForTesting(records);

    // Query for small amount: ₹12,000
    const recSmall = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'upender',
      amount: 12000,
    });
    expect(recSmall.commission).toBe(2.4);
    expect(recSmall.isVolumeAdjusted).toBe(true);

    // Query for large amount: ₹190,000
    const recLarge = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'upender',
      amount: 190000,
    });
    expect(recLarge.commission).toBe(1.8);
    expect(recLarge.isVolumeAdjusted).toBe(true);
  });

  it('Joint 2D Rate-Pairing: Prevents negative margin combinations', () => {
    const records: HistoricalTransactionRecord[] = [
      // Portal A transaction: Comm 2.0% / Fee 1.55% (Margin +0.45%)
      {
        id: '1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'portal-a',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 50000,
      },
      // Portal B transaction: Comm 2.8% / Fee 2.40% (Margin +0.40%)
      {
        id: '2',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'portal-a',
        commission_percent: 2.8,
        site_fee_percent: 2.4,
        transaction_date: new Date(),
        amount: 50000,
      },
    ];

    service.setRecordsForTesting(records);

    const rec = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'portal-a',
    });

    // Recommended margin must be positive
    expect(rec.margin).toBeGreaterThanOrEqual(0);
    // Must select one of the valid paired combinations, not mismatched 2.0% comm / 2.40% fee (-0.40%)
    const validPairs = [
      { comm: 2.0, fee: 1.55 },
      { comm: 2.8, fee: 2.4 },
    ];
    const isMatched = validPairs.some(
      (p) => Math.abs(rec.commission! - p.comm) <= 0.05 && Math.abs(rec.siteFee! - p.fee) <= 0.05
    );
    expect(isMatched).toBe(true);
  });

  it('Closed-Loop Override Feedback: User override immediately penalizes rejected rate', () => {
    const records: HistoricalTransactionRecord[] = [
      {
        id: '1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'portal-x',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 25000,
      },
      {
        id: '2',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'portal-x',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 25000,
      },
      {
        id: '3',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'portal-x',
        commission_percent: 2.3,
        site_fee_percent: 1.55,
        transaction_date: new Date(),
        amount: 25000,
      },
    ];

    service.setRecordsForTesting(records);

    // Initial prediction should be 2.0 (has 2 vs 1 votes)
    const initialRec = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'portal-x',
    });
    expect(initialRec.commission).toBe(2.0);

    // Now simulate user overriding the 2.0% recommendation to 2.3%
    service.recordOverrideFeedback({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'portal-x',
      predictedCommission: 2.0,
      predictedSiteFee: 1.55,
      actualCommission: 2.3,
      actualSiteFee: 1.55,
      timestamp: Date.now(),
    });

    // Second prediction should immediately flip to 2.3% due to reinforcement penalty on 2.0%
    const updatedRec = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'portal-x',
    });
    expect(updatedRec.commission).toBe(2.3);
  });

  it('Bayesian Shrinkage: Leverages single match (N=1) instead of discarding', () => {
    const records: HistoricalTransactionRecord[] = [
      // Only 1 record for this specific bank and mode on Upender
      {
        id: '1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'upender',
        bank_name: 'kotak',
        customer_mode: 'regular',
        commission_percent: 2.6,
        site_fee_percent: 2.1,
        transaction_date: new Date(),
        amount: 30000,
      },
    ];

    service.setRecordsForTesting(records);

    const rec = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'upender',
      bankName: 'kotak',
      customerMode: 'regular',
    });

    // Should NOT fall back to global baseline or none; should identify the bank+mode match
    expect(rec.source).toBe('card_tx_portal_bank_mode');
    expect(rec.commission).toBe(2.6);
    expect(rec.siteFee).toBe(2.1);
    expect(rec.confidence).toBeGreaterThanOrEqual(0.3);
  });

  it('Learns and predicts IMPS/NEFT charges accurately from historical records', () => {
    const records: HistoricalTransactionRecord[] = [
      {
        id: '1',
        card_type: 'rupay',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        bank_name: 'hdfc',
        customer_mode: 'normal',
        commission_percent: 2.0,
        site_fee_percent: 0.5,
        imps_charges: 5,
        transaction_date: new Date(),
        amount: 20000,
      },
      {
        id: '2',
        card_type: 'rupay',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        bank_name: 'hdfc',
        customer_mode: 'normal',
        commission_percent: 2.0,
        site_fee_percent: 0.5,
        imps_charges: 5,
        transaction_date: new Date(),
        amount: 25000,
      },
    ];

    service.setRecordsForTesting(records);

    const rec = service.getRecommendation({
      cardType: 'rupay',
      transactionType: 'withdrawal',
      sentTo: 'bharath',
      bankName: 'hdfc',
      customerMode: 'normal',
    });

    expect(rec.impsCharges).toBe(5);
    expect(rec.commission).toBe(2.0);
    expect(rec.siteFee).toBe(0.5);
  });

  it('Site-Aware Cascade: Accurately differentiates site fee and IMPS when site_name differs', () => {
    const records: HistoricalTransactionRecord[] = [
      // Finkeda gateway: site fee 1.55%, IMPS ₹0
      {
        id: 'f1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'chummi',
        site_name: 'Finkeda',
        bank_name: 'hdfc',
        customer_mode: 'offline',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        imps_charges: 0,
        transaction_date: new Date(),
        amount: 50000,
      },
      {
        id: 'f2',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'chummi',
        site_name: 'Finkeda',
        bank_name: 'hdfc',
        customer_mode: 'offline',
        commission_percent: 2.0,
        site_fee_percent: 1.55,
        imps_charges: 0,
        transaction_date: new Date(),
        amount: 40000,
      },
      // Indyapay gateway: site fee 2.29%, IMPS ₹5
      {
        id: 'i1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'chummi',
        site_name: 'Indyapay',
        bank_name: 'hdfc',
        customer_mode: 'offline',
        commission_percent: 2.0,
        site_fee_percent: 2.29,
        imps_charges: 5,
        transaction_date: new Date(),
        amount: 50000,
      },
      {
        id: 'i2',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'chummi',
        site_name: 'Indyapay',
        bank_name: 'hdfc',
        customer_mode: 'offline',
        commission_percent: 2.0,
        site_fee_percent: 2.29,
        imps_charges: 5,
        transaction_date: new Date(),
        amount: 45000,
      },
    ];

    service.setRecordsForTesting(records);

    // Query with Finkeda
    const recFinkeda = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'chummi',
      siteName: 'Finkeda',
      bankName: 'hdfc',
      customerMode: 'offline',
    });

    expect(recFinkeda.source).toBe('site_card_tx_portal_bank_mode');
    expect(recFinkeda.siteFee).toBe(1.55);
    expect(recFinkeda.impsCharges).toBe(0);

    // Query with Indyapay
    const recIndyapay = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'chummi',
      siteName: 'Indyapay',
      bankName: 'hdfc',
      customerMode: 'offline',
    });

    expect(recIndyapay.source).toBe('site_card_tx_portal_bank_mode');
    expect(recIndyapay.siteFee).toBe(2.29);
    expect(recIndyapay.impsCharges).toBe(5);
  });

  it('Closed-Loop Active Learning: Override feedback instantly adapts model for that site', () => {
    const records: HistoricalTransactionRecord[] = [
      {
        id: '1',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        site_name: 'Indyapay',
        commission_percent: 2.0,
        site_fee_percent: 1.70,
        imps_charges: 0,
        transaction_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        amount: 50000,
      },
      {
        id: '2',
        card_type: 'visa',
        transaction_type: 'withdrawal',
        sent_to: 'bharath',
        site_name: 'Indyapay',
        commission_percent: 2.0,
        site_fee_percent: 2.00,
        imps_charges: 0,
        transaction_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        amount: 50000,
      },
    ];

    service.setRecordsForTesting(records);

    // Simulate user overriding 1.70% to 2.00% with IMPS 5 on Indyapay
    service.recordOverrideFeedback({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'bharath',
      siteName: 'Indyapay',
      actualCommission: 2.0,
      actualSiteFee: 2.00,
      actualImps: 5,
      predictedCommission: 2.0,
      predictedSiteFee: 1.70,
      predictedImps: 0,
      commissionAccepted: true,
      siteFeeAccepted: false,
      impsAccepted: false,
      timestamp: Date.now(),
    });

    const rec = service.getRecommendation({
      cardType: 'visa',
      transactionType: 'withdrawal',
      sentTo: 'bharath',
      siteName: 'Indyapay',
    });

    expect(rec.siteFee).toBe(2.00);
    expect(rec.impsCharges).toBe(5);
  });
});
