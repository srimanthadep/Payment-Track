import { supabase } from "@/integrations/supabase/client";

export interface RatePair {
  commission: number;
  siteFee: number;
  margin: number;
}

export interface OverrideRecord {
  cardType?: string;
  transactionType?: string;
  sentTo?: string;
  bankName?: string;
  customerMode?: string;
  actualCommission: number;
  actualSiteFee: number;
  predictedCommission: number;
  predictedSiteFee: number;
  timestamp: number;
}

export interface TransactionFeeRecommendation {
  commission: number | null;
  siteFee: number | null;
  margin?: number | null;
  impsCharges?: number | null;
  confidence: number; // 0.0 to 1.0
  source:
    | "customer_history"
    | "card_tx_portal_bank_mode"
    | "card_tx_portal_bank"
    | "card_tx_portal"
    | "card_tx"
    | "card"
    | "global_baseline"
    | "none";
  sampleCount: number;
  explanation?: string;
  isVolumeAdjusted?: boolean;
}

export interface HistoricalTransactionRecord {
  id: string;
  card_type: string;
  transaction_type: string;
  sent_to: string;
  bank_name?: string;
  customer_mode?: string;
  customer_name?: string;
  customer_id?: string;
  commission_percent: number;
  site_fee_percent: number;
  imps_charges?: number;
  transaction_date: Date;
  amount: number;
}

// Normalizer helpers
const normalize = (str?: string | null): string => {
  return (str || "").trim().toLowerCase();
};

const CARD_ALIAS_MAP: Record<string, string> = {
  normal_visa: "visa",
  hdfc_visa: "visa",
  visa: "visa",
  normal_rupay: "rupay",
  hdfc_rupay: "rupay",
  rupay: "rupay",
  normal_master: "mastercard",
  hdfc_master: "mastercard",
  mastercard: "mastercard",
  master: "mastercard",
  all_master_cards: "mastercard",
  hdfc_business: "business card",
  all_business_cards: "business card",
  business: "business card",
  "business card": "business card",
  au_card: "au cards",
  "au cards": "au cards",
  amex_diners: "amex & diners",
  "amex & diners": "amex & diners",
  machine_swiping: "machine swiping",
  "machine swiping": "machine swiping",
};

export const normalizeCardType = (card?: string | null): string => {
  if (!card) return "";
  const raw = card.trim().toLowerCase();
  const slug = raw.replace(/[\s_-]+/g, "_");
  return CARD_ALIAS_MAP[slug] || CARD_ALIAS_MAP[raw] || raw;
};

/**
 * Intelligent Transaction Learning Service
 * 
 * Uses a 5-Tier Hierarchical Bayesian Cascade with Kernel Density Estimation (KDE),
 * 30-day Recency Weighting, Bank-Sensitivity, and Recurring Customer Memory.
 */
export class TransactionLearningService {
  private records: HistoricalTransactionRecord[] = [];
  private overrides: OverrideRecord[] = [];
  private isInitialized = false;
  private loadPromise: Promise<void> | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();

    // Re-index whenever user signs in or auth token updates
    if (typeof window !== "undefined") {
      supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          this.fetchAndIndexTransactions();
        }
      });
    }
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.records.length > 0) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.fetchAndIndexTransactions().finally(() => {
      this.loadPromise = null;
    });
    await this.loadPromise;
  }

  /**
   * Loads all historical transactions from Supabase
   */
  public async fetchAndIndexTransactions(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          card_type,
          transaction_type,
          amount,
          commission,
          commission_percent,
          site_fee,
          site_fee_percent,
          imps_charges,
          notes,
          bank_name,
          customer_mode,
          customer_name,
          customer_id,
          transaction_date,
          portal_id,
          portals ( name )
        `)
        .order("transaction_date", { ascending: false });

      if (error) {
        // Do not crash or permanently mark initialized on RLS/auth errors
        return;
      }

      if (!data || data.length === 0) {
        this.records = [];
        this.isInitialized = true;
        return;
      }

      this.records = data
        .map((row: any) => this.parseRecord(row))
        .filter((r): r is HistoricalTransactionRecord => r !== null);

      // Load recent negative feedback overrides for closed-loop active learning
      try {
        const { data: overrideData } = await supabase
          .from("prediction_tracking")
          .select("*")
          .eq("both_accepted", false)
          .order("created_at", { ascending: false })
          .limit(40);

        if (overrideData && overrideData.length > 0) {
          this.overrides = overrideData.map((row: any) => ({
            cardType: row.card_type,
            transactionType: row.transaction_type,
            sentTo: row.sent_to,
            bankName: row.bank_name,
            customerMode: row.customer_mode,
            actualCommission: Number(row.actual_commission),
            actualSiteFee: Number(row.actual_site_fee),
            predictedCommission: Number(row.predicted_commission),
            predictedSiteFee: Number(row.predicted_site_fee),
            timestamp: new Date(row.created_at).getTime(),
          }));
        }
      } catch {
        // Non-breaking fallback
      }

      this.isInitialized = true;
      this.notifyListeners();
    } catch (err) {
      // Graceful fallback
    }
  }

  /**
   * Parse a raw transaction database row into a structured record
   */
  private parseRecord(row: any): HistoricalTransactionRecord | null {
    const cardType = (row.card_type || "").trim();
    const txType = (row.transaction_type || "").trim();
    const amount = Number(row.amount) || 0;
    const notes = row.notes || "";

    // Determine Sent To / Portal Name
    let sentTo = "";
    if (row.portals && row.portals.name) {
      sentTo = row.portals.name.trim();
    } else if (notes) {
      const sentToMatch = notes.match(/Sent to:\s*([^|]+)/i);
      if (sentToMatch && sentToMatch[1]) {
        sentTo = sentToMatch[1].trim();
      }
    }

    if (!cardType || !txType) return null;

    // Determine Bank Name
    let bankName = (row.bank_name || "").trim();
    if (!bankName && notes) {
      const bm = notes.match(/Bank:\s*([^|]+)/i);
      if (bm && bm[1]) bankName = bm[1].trim();
    }

    // Determine Customer Mode
    let customerMode = (row.customer_mode || "").trim();
    if (!customerMode && notes) {
      const mm = notes.match(/Mode:\s*([^|]+)/i);
      if (mm && mm[1]) customerMode = mm[1].trim();
    }

    // Determine Customer Name & ID
    let customerName = (row.customer_name || "").trim();
    if (!customerName && notes) {
      const cm = notes.match(/Customer:\s*([^|]+)/i);
      if (cm && cm[1]) customerName = cm[1].trim();
    }
    const customerId = (row.customer_id || "").trim();

    // Extract Commission %
    let commPercent: number | null = null;
    if (row.commission_percent !== undefined && row.commission_percent !== null) {
      commPercent = Number(row.commission_percent);
    } else {
      const commMatch = notes.match(/Commission:\s*([0-9.]+)/i);
      if (commMatch && commMatch[1]) {
        commPercent = parseFloat(commMatch[1]);
      } else if (amount > 0 && row.commission !== undefined && row.commission !== null) {
        commPercent = Math.round(((Number(row.commission) / amount) * 100) * 100) / 100;
      }
    }

    // Extract Site Fee %
    let siteFeePercent: number | null = null;
    if (row.site_fee_percent !== undefined && row.site_fee_percent !== null) {
      siteFeePercent = Number(row.site_fee_percent);
    } else {
      const feeMatch = notes.match(/Site Fee:\s*([0-9.]+)/i);
      if (feeMatch && feeMatch[1]) {
        siteFeePercent = parseFloat(feeMatch[1]);
      } else if (amount > 0 && row.site_fee !== undefined && row.site_fee !== null) {
        siteFeePercent = Math.round(((Number(row.site_fee) / amount) * 100) * 100) / 100;
      }
    }

    // Extract IMPS / NEFT Charges
    let impsCharges = 0;
    if (row.imps_charges !== undefined && row.imps_charges !== null) {
      impsCharges = Number(row.imps_charges);
    } else if (notes) {
      const impsMatch = notes.match(/IMPS(?:\s*\/\s*NEFT)?(?:\s*Charges)?:\s*([0-9.]+)/i);
      if (impsMatch && impsMatch[1]) {
        impsCharges = parseFloat(impsMatch[1]);
      }
    }

    const txDate = row.transaction_date ? new Date(row.transaction_date) : new Date();

    return {
      id: row.id,
      card_type: normalizeCardType(cardType),
      transaction_type: txType,
      sent_to: sentTo,
      bank_name: bankName,
      customer_mode: customerMode,
      customer_name: customerName,
      customer_id: customerId,
      commission_percent: commPercent ?? 0,
      site_fee_percent: siteFeePercent ?? 0,
      imps_charges: impsCharges,
      transaction_date: txDate,
      amount,
    };
  }

  /**
   * Incremental learning: immediately ingests a newly added transaction
   */
  public recordNewTransaction(tx: {
    id?: string;
    card_type: string;
    transaction_type: string;
    sent_to: string;
    bank_name?: string;
    customer_mode?: string;
    customer_name?: string;
    customer_id?: string;
    amount: number;
    commission_percent: number;
    site_fee_percent: number;
    imps_charges?: number;
    transaction_date?: Date;
  }) {
    const record: HistoricalTransactionRecord = {
      id: tx.id || `local-${Date.now()}`,
      card_type: normalizeCardType(tx.card_type),
      transaction_type: tx.transaction_type.trim(),
      sent_to: tx.sent_to.trim(),
      bank_name: (tx.bank_name || "").trim(),
      customer_mode: (tx.customer_mode || "").trim(),
      customer_name: (tx.customer_name || "").trim(),
      customer_id: (tx.customer_id || "").trim(),
      commission_percent: Number(tx.commission_percent) || 0,
      site_fee_percent: Number(tx.site_fee_percent) || 0,
      imps_charges: Number(tx.imps_charges) || 0,
      transaction_date: tx.transaction_date || new Date(),
      amount: Number(tx.amount) || 0,
    };

    // Prepend so latest is first
    this.records.unshift(record);
    this.notifyListeners();
  }

  /**
   * Directly sets records for isolated unit and backtest testing
   */
  public setRecordsForTesting(records: HistoricalTransactionRecord[]) {
    this.records = [...records];
    this.isInitialized = true;
  }

  public recordOverrideFeedback(override: OverrideRecord) {
    this.overrides.unshift(override);
    if (this.overrides.length > 50) this.overrides.pop();
  }

  public setOverridesForTesting(overrides: OverrideRecord[]) {
    this.overrides = [...overrides];
  }

  private getOverrideAdjustment(
    candComm: number,
    candFee: number,
    card?: string,
    tx?: string,
    portal?: string
  ): number {
    if (this.overrides.length === 0) return 0;
    const now = Date.now();
    let adjustment = 0;

    for (const o of this.overrides) {
      // Overrides older than 14 days decay to 0
      const ageDays = (now - o.timestamp) / (1000 * 60 * 60 * 24);
      if (ageDays > 14) continue;
      const decay = Math.max(0, 1 - ageDays / 14);

      // Context matching (if card/tx specified in override, ensure compatibility)
      if (o.cardType && card && normalizeCardType(o.cardType) !== card) continue;
      if (o.transactionType && tx && normalize(o.transactionType) !== tx) continue;
      if (o.sentTo && portal && normalize(o.sentTo) !== portal) continue;

      // If this candidate matches what the user manually selected, boost it
      const isActual = Math.abs(candComm - o.actualCommission) <= 0.05 && Math.abs(candFee - o.actualSiteFee) <= 0.05;
      if (isActual) {
        adjustment += 1.5 * decay;
      }

      // If this candidate matches what the user rejected, penalize it
      const isRejected = Math.abs(candComm - o.predictedCommission) <= 0.05 && Math.abs(candFee - o.predictedSiteFee) <= 0.05;
      if (isRejected && !isActual) {
        adjustment -= 1.2 * decay;
      }
    }

    return adjustment;
  }

  /**
   * Joint 2D Kernel Density Estimation (KDE) over coupled (Commission, Site Fee) pairs
   * with 30-day exponential time decay, Amount-Slab proximity weighting, and Margin protection.
   */
  private evaluateKernelDensity(
    matches: HistoricalTransactionRecord[],
    sourceName: TransactionFeeRecommendation["source"],
    minConfidence = 0.25,
    queryAmount?: number,
    context?: { card?: string; tx?: string; portal?: string }
  ): TransactionFeeRecommendation | null {
    if (matches.length === 0) return null;

    const now = Date.now();
    // 30-day half-life: decayFactorPerDay = ln(2) / 30 = 0.0231
    const decayFactorPerDay = 0.0231;
    const tolerance = 0.08; // 2D Euclidean distance window (covers dx=0.05, dy=0.05)

    // Build unique coupled candidate pairs from observed transactions
    const pairMap = new Map<string, RatePair>();
    for (const m of matches) {
      const comm = Math.round(m.commission_percent * 100) / 100;
      const fee = Math.round(m.site_fee_percent * 100) / 100;
      const key = `${comm.toFixed(2)}_${fee.toFixed(2)}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, {
          commission: comm,
          siteFee: fee,
          margin: Math.round((comm - fee) * 100) / 100,
        });
      }
    }
    const candidatePairs = Array.from(pairMap.values());

    let totalWeight = 0;
    const weights = matches.map((rec) => {
      // 1. Recency decay weight
      const daysDiff = Math.max(0, (now - rec.transaction_date.getTime()) / (1000 * 60 * 60 * 24));
      const recencyW = Math.exp(-decayFactorPerDay * daysDiff);

      // 2. Amount-slab proximity weight
      let amountW = 1.0;
      if (queryAmount && queryAmount > 0 && rec.amount > 0) {
        const logDiff = Math.abs(Math.log(rec.amount) - Math.log(queryAmount));
        // sigma = 1.2 smoothly downweights large ticket disparities
        amountW = Math.exp(-0.5 * Math.pow(logDiff / 1.2, 2));
      }

      const w = recencyW * amountW;
      totalWeight += w;
      return { rec, w };
    });

    let bestPair: RatePair | null = null;
    let maxPairWeight = -Infinity;

    for (const cand of candidatePairs) {
      // Margin safeguard: if margin is negative and it's not a zero-commission transfer, penalize
      const isNegativeMargin = cand.margin < -0.01 && cand.commission > 0;
      let score = 0;

      for (const { rec, w } of weights) {
        const dComm = rec.commission_percent - cand.commission;
        const dFee = rec.site_fee_percent - cand.siteFee;
        const dist = Math.sqrt(dComm * dComm + dFee * dFee);

        if (dist <= tolerance) {
          score += w;
        }
      }

      // Heavily discount negative margin combinations to protect business
      if (isNegativeMargin) {
        score *= 0.1;
      }

      // Closed-loop override reinforcement
      const feedbackAdj = this.getOverrideAdjustment(
        cand.commission,
        cand.siteFee,
        context?.card,
        context?.tx,
        context?.portal
      );
      score += feedbackAdj;

      if (score > maxPairWeight) {
        maxPairWeight = score;
        bestPair = cand;
      }
    }

    if (!bestPair || maxPairWeight <= 0) return null;

    const sampleCount = matches.length;
    // Bayesian credibility shrinkage: sampleCount / (sampleCount + 1.5)
    const sampleCredibility = sampleCount / (sampleCount + 1.5);
    const dominance = totalWeight > 0 ? Math.max(0, Math.min(1.0, maxPairWeight / totalWeight)) : 0;
    const confidence = Math.min(0.99, Math.round(sampleCredibility * dominance * 100) / 100);

    if (sampleCount === 1 && sourceName !== "customer_history" && confidence < minConfidence) {
      return null;
    }

    const hasVolumeSlab = queryAmount && queryAmount > 0;
    let explanation = `Based on ${sampleCount} past transaction${sampleCount > 1 ? "s" : ""} (${Math.round(dominance * 100)}% pattern match)`;
    if (sourceName === "customer_history") {
      explanation = `Client recurring rate (${sampleCount} past visit${sampleCount > 1 ? "s" : ""})`;
    } else if (sourceName === "card_tx_portal_bank_mode" || sourceName === "card_tx_portal_bank") {
      explanation = `Bank & terminal rate from ${sampleCount} past transaction${sampleCount > 1 ? "s" : ""}`;
    }
    if (hasVolumeSlab) {
      explanation += ` • Calibrated for ₹${Number(queryAmount).toLocaleString("en-IN")}`;
    }

    // Estimate IMPS / NEFT charges from matched records (weighted mode)
    let recommendedImps: number | null = null;
    const impsMap = new Map<number, number>();
    for (const { rec, w } of weights) {
      if (rec.imps_charges !== undefined && rec.imps_charges !== null) {
        const val = Math.round(Number(rec.imps_charges));
        impsMap.set(val, (impsMap.get(val) || 0) + w);
      }
    }
    if (impsMap.size > 0) {
      let maxImpsW = -1;
      for (const [charge, w] of impsMap.entries()) {
        if (w > maxImpsW) {
          maxImpsW = w;
          recommendedImps = charge;
        }
      }
    }

    return {
      commission: bestPair.commission,
      siteFee: bestPair.siteFee,
      margin: bestPair.margin,
      impsCharges: recommendedImps ?? 0,
      confidence,
      source: sourceName,
      sampleCount,
      explanation,
      isVolumeAdjusted: !!hasVolumeSlab,
    };
  }

  private getDynamicBaseline(
    txType: string,
    cardType?: string,
    bankName?: string
  ): { commission: number; siteFee: number } {
    const tx = normalize(txType);
    const matchingTx = this.records.filter((r) => normalize(r.transaction_type) === tx);

    if (matchingTx.length >= 3) {
      const card = normalizeCardType(cardType);
      const cardSubset = card ? matchingTx.filter((r) => normalizeCardType(r.card_type) === card) : [];
      const pool = cardSubset.length >= 3 ? cardSubset : matchingTx;

      const comms = pool.map((r) => r.commission_percent).sort((a, b) => a - b);
      const fees = pool.map((r) => r.site_fee_percent).sort((a, b) => a - b);
      const mid = Math.floor(comms.length / 2);

      return {
        commission: Math.round(comms[mid] * 100) / 100,
        siteFee: Math.round(fees[mid] * 100) / 100,
      };
    }

    // Default empirical fallback if no data in database
    if (tx === "repayment") {
      return { commission: 3.0, siteFee: 0.0 };
    }
    let comm = 2.0;
    let fee = 1.55;
    if (cardType === "rupay") fee = 0.5;
    if (cardType === "visa" && bankName && (bankName.includes("sbi") || bankName.includes("icici"))) {
      comm = 2.7;
    }
    return { commission: comm, siteFee: fee };
  }

  /**
   * Query the learning engine using the 5-Tier Bayesian Cascade with Volume & Shrinkage
   */
  public getRecommendation(params: {
    cardType?: string;
    transactionType?: string;
    sentTo?: string;
    bankName?: string;
    customerMode?: string;
    customerName?: string;
    customerId?: string;
    amount?: number;
  }): TransactionFeeRecommendation {
    const card = normalizeCardType(params.cardType);
    const tx = normalize(params.transactionType);
    const portal = normalize(params.sentTo);
    const bank = normalize(params.bankName);
    const mode = normalize(params.customerMode);
    const custName = normalize(params.customerName);
    const custId = (params.customerId || "").trim();
    const amount = params.amount;
    const context = { card, tx, portal };

    // Prediction model strictly predicts standard pattern rates (Card + Tx + Portal + Bank + Mode).
    // It NEVER depends on a specific customer's previous percentage or negotiated rate.

    // Tier 1: Card + Tx + Portal + Bank + Mode (Highest specificity)
    if (card && tx && portal && bank && mode) {
      const t1Matches = this.records.filter(
        (r) =>
          normalizeCardType(r.card_type) === card &&
          normalize(r.transaction_type) === tx &&
          normalize(r.sent_to) === portal &&
          normalize(r.bank_name) === bank &&
          normalize(r.customer_mode) === mode
      );
      if (t1Matches.length >= 1) {
        const rec = this.evaluateKernelDensity(t1Matches, "card_tx_portal_bank_mode", 0.25, amount, context);
        if (rec) return rec;
      }
    }

    // Tier 2: Card + Tx + Portal + Bank
    if (card && tx && portal && bank) {
      const t2Matches = this.records.filter(
        (r) =>
          normalizeCardType(r.card_type) === card &&
          normalize(r.transaction_type) === tx &&
          normalize(r.sent_to) === portal &&
          normalize(r.bank_name) === bank
      );
      if (t2Matches.length >= 1) {
        const rec = this.evaluateKernelDensity(t2Matches, "card_tx_portal_bank", 0.25, amount, context);
        if (rec) return rec;
      }
    }

    // Tier 3: Card + Tx + Portal
    if (card && tx && portal) {
      const t3Matches = this.records.filter(
        (r) =>
          normalizeCardType(r.card_type) === card &&
          normalize(r.transaction_type) === tx &&
          normalize(r.sent_to) === portal
      );
      if (t3Matches.length >= 1) {
        const rec = this.evaluateKernelDensity(t3Matches, "card_tx_portal", 0.25, amount, context);
        if (rec) return rec;
      }
    }

    // Tier 4: Card + Tx
    if (card && tx) {
      const t4Matches = this.records.filter(
        (r) =>
          normalizeCardType(r.card_type) === card &&
          normalize(r.transaction_type) === tx
      );
      if (t4Matches.length >= 1) {
        const rec = this.evaluateKernelDensity(t4Matches, "card_tx", 0.25, amount, context);
        if (rec) return rec;
      }
    }

    // Tier 5: Card only
    if (card) {
      const t5Matches = this.records.filter((r) => normalizeCardType(r.card_type) === card);
      if (t5Matches.length >= 1) {
        const rec = this.evaluateKernelDensity(t5Matches, "card", 0.35, amount, context);
        if (rec) return rec;
      }
    }

    // Tier 6: Automated Dynamic Empirical Baseline Prior (zero-history cold-start)
    if (tx) {
      const baseline = this.getDynamicBaseline(tx, card, bank);
      const margin = Math.round((baseline.commission - baseline.siteFee) * 100) / 100;
      return {
        commission: baseline.commission,
        siteFee: baseline.siteFee,
        margin,
        impsCharges: 0,
        confidence: 0.5,
        source: "global_baseline",
        sampleCount: 0,
        explanation: `Dynamic empirical baseline for ${tx}`,
      };
    }

    return {
      commission: null,
      siteFee: null,
      margin: null,
      impsCharges: null,
      confidence: 0,
      source: "none",
      sampleCount: 0,
    };
  }

  /**
   * Finds the most recent or frequent `sent_to` portal used for a given bank and card type
   * (optionally filtered by customer) to auto-fill `sent_to` when selecting a saved card.
   */
  public getSentToForCard(params: {
    bankName?: string;
    cardType?: string;
    customerId?: string;
    customerName?: string;
  }): string | null {
    const bank = normalize(params.bankName);
    const card = normalizeCardType(params.cardType);
    const custId = (params.customerId || "").trim();
    const custName = normalize(params.customerName);

    // 1. Try to find recent transaction for this specific customer with this bank & card
    if (bank && (custId || custName)) {
      const custMatch = this.records.find((r) => {
        const matchCust =
          (custId && r.customer_id === custId) ||
          (custName && normalize(r.customer_name) === custName);
        const matchBank = normalize(r.bank_name) === bank;
        const matchCard = !card || normalizeCardType(r.card_type) === card;
        return matchCust && matchBank && matchCard && Boolean(r.sent_to);
      });
      if (custMatch?.sent_to) return custMatch.sent_to;
    }

    // 2. Try to find any transaction for this customer with sent_to
    if (custId || custName) {
      const anyCustMatch = this.records.find((r) => {
        const matchCust =
          (custId && r.customer_id === custId) ||
          (custName && normalize(r.customer_name) === custName);
        return matchCust && Boolean(r.sent_to);
      });
      if (anyCustMatch?.sent_to) return anyCustMatch.sent_to;
    }

    // 3. Fallback to general bank + card match
    if (bank) {
      const bankMatch = this.records.find((r) => {
        const matchBank = normalize(r.bank_name) === bank;
        const matchCard = !card || normalizeCardType(r.card_type) === card;
        return matchBank && matchCard && Boolean(r.sent_to);
      });
      if (bankMatch?.sent_to) return bankMatch.sent_to;
    }

    return null;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error("[LearningService] Listener error:", err);
      }
    }
  }

  public getRecordCount(): number {
    return this.records.length;
  }

  /**
   * Returns top learned transaction patterns grouped by Card + Tx + SentTo + Bank
   */
  public getTopPatterns(limit = 10): PatternSummary[] {
    const groups = new Map<string, HistoricalTransactionRecord[]>();

    for (const r of this.records) {
      if (!r.card_type || !r.transaction_type) continue;
      const bankLabel = r.bank_name ? ` (${r.bank_name})` : "";
      const key = `${r.card_type}|${r.transaction_type}|${r.sent_to || "General"}${bankLabel}`;
      const list = groups.get(key) || [];
      list.push(r);
      groups.set(key, list);
    }

    const summaries: PatternSummary[] = [];

    for (const [key, list] of groups.entries()) {
      if (list.length < 2) continue;

      const [cardType, transactionType, sentToWithBank] = key.split("|");
      const commCounts = new Map<number, number>();
      const feeCounts = new Map<number, number>();

      for (const item of list) {
        commCounts.set(item.commission_percent, (commCounts.get(item.commission_percent) || 0) + 1);
        feeCounts.set(item.site_fee_percent, (feeCounts.get(item.site_fee_percent) || 0) + 1);
      }

      let modalComm = 0;
      let maxCommCount = 0;
      for (const [val, count] of commCounts.entries()) {
        if (count > maxCommCount) {
          maxCommCount = count;
          modalComm = val;
        }
      }

      let modalFee = 0;
      let maxFeeCount = 0;
      for (const [val, count] of feeCounts.entries()) {
        if (count > maxFeeCount) {
          maxFeeCount = count;
          modalFee = val;
        }
      }

      const consistency = Math.round((maxCommCount / list.length) * 100);

      summaries.push({
        cardType,
        transactionType,
        sentTo: sentToWithBank === "General" ? "" : sentToWithBank,
        modalCommission: modalComm,
        modalSiteFee: modalFee,
        sampleCount: list.length,
        consistency,
      });
    }

    summaries.sort((a, b) => b.sampleCount - a.sampleCount);
    return summaries.slice(0, limit);
  }

  /**
   * Leave-One-Out Cross-Validation (LOOCV) backtest across all tiers
   */
  public runBacktest(): BacktestResults {
    const valid = this.records.filter((r) => r.card_type && r.transaction_type);
    if (valid.length === 0) {
      return {
        totalEvaluated: 0,
        commissionAccuracy: 0,
        siteFeeAccuracy: 0,
        bothAccuracy: 0,
        highConfidenceCount: 0,
        highConfidenceCommAccuracy: 0,
        highConfidenceFeeAccuracy: 0,
        tier1Count: 0,
        tier1CommAccuracy: 0,
        tier1FeeAccuracy: 0,
      };
    }

    let totalEvaluated = 0;
    let commCorrect = 0;
    let feeCorrect = 0;
    let bothCorrect = 0;
    let highConfCount = 0;
    let highConfCommCorrect = 0;
    let highConfFeeCorrect = 0;
    let tier1Count = 0;
    let tier1CommCorrect = 0;
    let tier1FeeCorrect = 0;

    for (let i = 0; i < valid.length; i++) {
      const target = valid[i];
      const training = valid.filter((_, idx) => idx !== i);

      const card = normalizeCardType(target.card_type);
      const tx = normalize(target.transaction_type);
      const portal = normalize(target.sent_to);
      const bank = normalize(target.bank_name);
      const mode = normalize(target.customer_mode);
      const custName = normalize(target.customer_name);
      const custId = target.customer_id;

      // 1. Card + Tx + Portal + Bank + Mode
      let matches: HistoricalTransactionRecord[] = [];
      let source: TransactionFeeRecommendation["source"] = "none";

      if (bank && mode) {
        matches = training.filter(
          (r) =>
            normalizeCardType(r.card_type) === card &&
            normalize(r.transaction_type) === tx &&
            normalize(r.sent_to) === portal &&
            normalize(r.bank_name) === bank &&
            normalize(r.customer_mode) === mode
        );
        if (matches.length >= 1) source = "card_tx_portal_bank_mode";
        else matches = [];
      }

      // 3. Card + Tx + Portal + Bank
      if (matches.length === 0 && bank) {
        matches = training.filter(
          (r) =>
            normalizeCardType(r.card_type) === card &&
            normalize(r.transaction_type) === tx &&
            normalize(r.sent_to) === portal &&
            normalize(r.bank_name) === bank
        );
        if (matches.length >= 1) source = "card_tx_portal_bank";
        else matches = [];
      }

      // 4. Card + Tx + Portal
      if (matches.length === 0) {
        matches = training.filter(
          (r) =>
            normalizeCardType(r.card_type) === card &&
            normalize(r.transaction_type) === tx &&
            normalize(r.sent_to) === portal
        );
        if (matches.length > 0) source = "card_tx_portal";
      }

      // 5. Card + Tx
      if (matches.length === 0) {
        matches = training.filter(
          (r) =>
            normalizeCardType(r.card_type) === card &&
            normalize(r.transaction_type) === tx
        );
        if (matches.length > 0) source = "card_tx";
      }

      if (matches.length === 0) continue;

      const rec = this.evaluateKernelDensity(matches, source, 0.2, target.amount, { card, tx, portal });
      if (!rec || rec.commission === null || rec.siteFee === null) continue;

      totalEvaluated++;
      const isCommOk = Math.abs(rec.commission - target.commission_percent) <= 0.05;
      const isFeeOk = Math.abs(rec.siteFee - target.site_fee_percent) <= 0.05;

      if (isCommOk) commCorrect++;
      if (isFeeOk) feeCorrect++;
      if (isCommOk && isFeeOk) bothCorrect++;

      const isTopTier = source === "card_tx_portal_bank_mode" || source === "card_tx_portal_bank" || source === "card_tx_portal";
      if (isTopTier) {
        tier1Count++;
        if (isCommOk) tier1CommCorrect++;
        if (isFeeOk) tier1FeeCorrect++;
      }

      if (rec.confidence >= 0.7) {
        highConfCount++;
        if (isCommOk) highConfCommCorrect++;
        if (isFeeOk) highConfFeeCorrect++;
      }
    }

    return {
      totalEvaluated,
      commissionAccuracy: totalEvaluated > 0 ? Math.round((commCorrect / totalEvaluated) * 1000) / 10 : 0,
      siteFeeAccuracy: totalEvaluated > 0 ? Math.round((feeCorrect / totalEvaluated) * 1000) / 10 : 0,
      bothAccuracy: totalEvaluated > 0 ? Math.round((bothCorrect / totalEvaluated) * 1000) / 10 : 0,
      highConfidenceCount: highConfCount,
      highConfidenceCommAccuracy: highConfCount > 0 ? Math.round((highConfCommCorrect / highConfCount) * 1000) / 10 : 0,
      highConfidenceFeeAccuracy: highConfCount > 0 ? Math.round((highConfFeeCorrect / highConfCount) * 1000) / 10 : 0,
      tier1Count,
      tier1CommAccuracy: tier1Count > 0 ? Math.round((tier1CommCorrect / tier1Count) * 1000) / 10 : 0,
      tier1FeeAccuracy: tier1Count > 0 ? Math.round((tier1FeeCorrect / tier1Count) * 1000) / 10 : 0,
    };
  }
}

export interface PatternSummary {
  cardType: string;
  transactionType: string;
  sentTo: string;
  modalCommission: number;
  modalSiteFee: number;
  sampleCount: number;
  consistency: number;
}

export interface BacktestResults {
  totalEvaluated: number;
  commissionAccuracy: number;
  siteFeeAccuracy: number;
  bothAccuracy: number;
  highConfidenceCount: number;
  highConfidenceCommAccuracy: number;
  highConfidenceFeeAccuracy: number;
  tier1Count: number;
  tier1CommAccuracy: number;
  tier1FeeAccuracy: number;
}

export const transactionLearningService = new TransactionLearningService();


