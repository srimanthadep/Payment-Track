import { supabase } from "@/integrations/supabase/client";

export interface TransactionFeeRecommendation {
  commission: number | null;
  siteFee: number | null;
  confidence: number; // 0.0 to 1.0
  source: "card_tx_portal" | "card_tx" | "card" | "portal" | "none";
  sampleCount: number;
  explanation?: string;
}

export interface HistoricalTransactionRecord {
  id: string;
  card_type: string;
  transaction_type: string;
  sent_to: string;
  commission_percent: number;
  site_fee_percent: number;
  transaction_date: Date;
  amount: number;
}

interface ValueWeight {
  value: number;
  weightedScore: number;
  rawCount: number;
}

// Normalizer helpers
const normalize = (str?: string | null): string => {
  return (str || "").trim().toLowerCase();
};

/**
 * Intelligent Transaction Learning Service
 * 
 * Uses Maximum A Posteriori (MAP) with Hierarchical Backoff,
 * Time-Decay Weighting, and Bayesian Confidence Estimation.
 */
class TransactionLearningService {
  private records: HistoricalTransactionRecord[] = [];
  private isInitialized = false;
  private loadPromise: Promise<void> | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.fetchAndIndexTransactions();
    await this.loadPromise;
    this.isInitialized = true;
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
          site_fee,
          notes,
          transaction_date,
          portal_id,
          portals ( name )
        `)
        .order("transaction_date", { ascending: false });

      if (error) {
        console.error("[LearningService] Error fetching historical transactions:", error);
        return;
      }

      if (!data || data.length === 0) {
        this.records = [];
        return;
      }

      this.records = data
        .map((row: any) => this.parseRecord(row))
        .filter((r): r is HistoricalTransactionRecord => r !== null);

      this.notifyListeners();
    } catch (err) {
      console.error("[LearningService] Failed to load transactions:", err);
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

    // Extract Commission %
    let commPercent: number | null = null;
    const commMatch = notes.match(/Commission:\s*([0-9.]+)/i);
    if (commMatch && commMatch[1]) {
      commPercent = parseFloat(commMatch[1]);
    } else if (amount > 0 && row.commission !== undefined && row.commission !== null) {
      commPercent = Math.round(((Number(row.commission) / amount) * 100) * 100) / 100;
    }

    // Extract Site Fee %
    let siteFeePercent: number | null = null;
    const feeMatch = notes.match(/Site Fee:\s*([0-9.]+)/i);
    if (feeMatch && feeMatch[1]) {
      siteFeePercent = parseFloat(feeMatch[1]);
    } else if (amount > 0 && row.site_fee !== undefined && row.site_fee !== null) {
      siteFeePercent = Math.round(((Number(row.site_fee) / amount) * 100) * 100) / 100;
    }

    const txDate = row.transaction_date ? new Date(row.transaction_date) : new Date();

    return {
      id: row.id,
      card_type: cardType,
      transaction_type: txType,
      sent_to: sentTo,
      commission_percent: commPercent ?? 0,
      site_fee_percent: siteFeePercent ?? 0,
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
    amount: number;
    commission_percent: number;
    site_fee_percent: number;
    transaction_date?: Date;
  }) {
    const record: HistoricalTransactionRecord = {
      id: tx.id || `local-${Date.now()}`,
      card_type: tx.card_type.trim(),
      transaction_type: tx.transaction_type.trim(),
      sent_to: tx.sent_to.trim(),
      commission_percent: Number(tx.commission_percent) || 0,
      site_fee_percent: Number(tx.site_fee_percent) || 0,
      transaction_date: tx.transaction_date || new Date(),
      amount: Number(tx.amount) || 0,
    };

    // Prepend so latest is first
    this.records.unshift(record);
    this.notifyListeners();
  }

  /**
   * Query the learning engine for the best recommendation
   * 
   * Priority:
   * 1. Card Type + Transaction Type + Sent To (Highest specificity)
   * 2. Card Type + Transaction Type
   * 3. Card Type
   * 4. None
   */
  public getRecommendation(params: {
    cardType?: string;
    transactionType?: string;
    sentTo?: string;
  }): TransactionFeeRecommendation {
    const card = normalize(params.cardType);
    const tx = normalize(params.transactionType);
    const portal = normalize(params.sentTo);

    if (!card && !tx) {
      return {
        commission: null,
        siteFee: null,
        confidence: 0,
        source: "none",
        sampleCount: 0,
      };
    }

    const now = Date.now();
    // Decay parameter: half-life of 90 days (approx 7.7e-3 per day)
    const decayFactorPerDay = 0.0077;

    // Helper to calculate weighted mode for an array of matches
    const computeBestRate = (
      matches: HistoricalTransactionRecord[],
      sourceName: "card_tx_portal" | "card_tx" | "card" | "portal"
    ): TransactionFeeRecommendation | null => {
      if (matches.length === 0) return null;

      const commWeights = new Map<number, ValueWeight>();
      const feeWeights = new Map<number, ValueWeight>();
      let totalWeight = 0;

      for (const rec of matches) {
        const daysDiff = Math.max(0, (now - rec.transaction_date.getTime()) / (1000 * 60 * 60 * 24));
        const weight = Math.exp(-decayFactorPerDay * daysDiff);
        totalWeight += weight;

        // Commission
        const cVal = Math.round(rec.commission_percent * 100) / 100;
        const cEntry = commWeights.get(cVal) || { value: cVal, weightedScore: 0, rawCount: 0 };
        cEntry.weightedScore += weight;
        cEntry.rawCount += 1;
        commWeights.set(cVal, cEntry);

        // Site Fee
        const sVal = Math.round(rec.site_fee_percent * 100) / 100;
        const sEntry = feeWeights.get(sVal) || { value: sVal, weightedScore: 0, rawCount: 0 };
        sEntry.weightedScore += weight;
        sEntry.rawCount += 1;
        feeWeights.set(sVal, sEntry);
      }

      // Find highest weighted modes
      let bestComm: ValueWeight | null = null;
      for (const entry of commWeights.values()) {
        if (!bestComm || entry.weightedScore > bestComm.weightedScore) {
          bestComm = entry;
        }
      }

      let bestFee: ValueWeight | null = null;
      for (const entry of feeWeights.values()) {
        if (!bestFee || entry.weightedScore > bestFee.weightedScore) {
          bestFee = entry;
        }
      }

      if (!bestComm && !bestFee) return null;

      // Bayesian confidence calculation:
      // sampleCredibility = N / (N + 2)
      // dominance = modalWeight / totalWeight
      const sampleCount = matches.length;
      const sampleCredibility = sampleCount / (sampleCount + 2);
      const commDominance = bestComm && totalWeight > 0 ? (bestComm.weightedScore / totalWeight) : 0;
      const confidence = Math.round(sampleCredibility * commDominance * 100) / 100;

      // Safe threshold: require at least 1 match, but if only 1 match and confidence < 0.35, don't overfit
      if (sampleCount === 1 && commDominance < 0.8) {
        return null;
      }

      return {
        commission: bestComm ? bestComm.value : null,
        siteFee: bestFee ? bestFee.value : null,
        confidence,
        source: sourceName,
        sampleCount,
        explanation: `Based on ${sampleCount} past transactions (${Math.round(commDominance * 100)}% pattern consistency)`,
      };
    };

    // Tier 1: Card Type + Transaction Type + Sent To
    if (card && tx && portal) {
      const tier1Matches = this.records.filter(
        (r) =>
          normalize(r.card_type) === card &&
          normalize(r.transaction_type) === tx &&
          normalize(r.sent_to) === portal
      );
      const tier1Rec = computeBestRate(tier1Matches, "card_tx_portal");
      if (tier1Rec && tier1Rec.confidence >= 0.3) {
        return tier1Rec;
      }
    }

    // Tier 2: Card Type + Transaction Type
    if (card && tx) {
      const tier2Matches = this.records.filter(
        (r) =>
          normalize(r.card_type) === card &&
          normalize(r.transaction_type) === tx
      );
      const tier2Rec = computeBestRate(tier2Matches, "card_tx");
      if (tier2Rec && tier2Rec.confidence >= 0.25) {
        return tier2Rec;
      }
    }

    // Tier 3: Card Type only (if selected)
    if (card) {
      const tier3Matches = this.records.filter(
        (r) => normalize(r.card_type) === card
      );
      const tier3Rec = computeBestRate(tier3Matches, "card");
      if (tier3Rec && tier3Rec.confidence >= 0.4) {
        return tier3Rec;
      }
    }

    return {
      commission: null,
      siteFee: null,
      confidence: 0,
      source: "none",
      sampleCount: 0,
    };
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
   * Returns top learned transaction patterns grouped by Card + Tx + SentTo
   */
  public getTopPatterns(limit = 10): PatternSummary[] {
    const groups = new Map<string, HistoricalTransactionRecord[]>();

    for (const r of this.records) {
      if (!r.card_type || !r.transaction_type) continue;
      const key = `${r.card_type}|${r.transaction_type}|${r.sent_to || "General"}`;
      const list = groups.get(key) || [];
      list.push(r);
      groups.set(key, list);
    }

    const summaries: PatternSummary[] = [];

    for (const [key, list] of groups.entries()) {
      if (list.length < 2) continue; // Only patterns with repeated data

      const [cardType, transactionType, sentTo] = key.split("|");

      // Calculate mode for commission & site fee
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
        sentTo: sentTo === "General" ? "" : sentTo,
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
   * Leave-One-Out Cross-Validation (LOOCV) backtest
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

      const card = normalize(target.card_type);
      const tx = normalize(target.transaction_type);
      const portal = normalize(target.sent_to);

      let matches = training.filter(
        (r) =>
          normalize(r.card_type) === card &&
          normalize(r.transaction_type) === tx &&
          normalize(r.sent_to) === portal
      );
      let isTier1 = true;

      if (matches.length === 0) {
        matches = training.filter(
          (r) =>
            normalize(r.card_type) === card &&
            normalize(r.transaction_type) === tx
        );
        isTier1 = false;
      }

      if (matches.length === 0) continue;

      // Find mode
      const commMap = new Map<number, number>();
      const feeMap = new Map<number, number>();

      for (const m of matches) {
        commMap.set(m.commission_percent, (commMap.get(m.commission_percent) || 0) + 1);
        feeMap.set(m.site_fee_percent, (feeMap.get(m.site_fee_percent) || 0) + 1);
      }

      let pComm = 0;
      let maxC = 0;
      for (const [val, c] of commMap.entries()) {
        if (c > maxC) {
          maxC = c;
          pComm = val;
        }
      }

      let pFee = 0;
      let maxF = 0;
      for (const [val, c] of feeMap.entries()) {
        if (c > maxF) {
          maxF = c;
          pFee = val;
        }
      }

      totalEvaluated++;
      const isCommOk = Math.abs(pComm - target.commission_percent) <= 0.05;
      const isFeeOk = Math.abs(pFee - target.site_fee_percent) <= 0.05;

      if (isCommOk) commCorrect++;
      if (isFeeOk) feeCorrect++;
      if (isCommOk && isFeeOk) bothCorrect++;

      if (isTier1) {
        tier1Count++;
        if (isCommOk) tier1CommCorrect++;
        if (isFeeOk) tier1FeeCorrect++;
      }

      const dominance = maxC / matches.length;
      if (matches.length >= 3 && dominance >= 0.7) {
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

