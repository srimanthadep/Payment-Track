import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PredictionEvent {
  id?: string;
  transactionId?: string;
  amount?: number;
  profit?: number;
  customerName?: string;
  customerPhone?: string;
  portalName?: string;
  notes?: string;
  commissionAmount?: number;
  siteFeeAmount?: number;
  /** Was the AI-predicted commission used as-is? */
  commissionAccepted: boolean;
  /** Was the AI-predicted site fee used as-is? */
  siteFeeAccepted: boolean;
  /** The AI-predicted commission % */
  predictedCommission: number;
  /** The AI-predicted site fee % */
  predictedSiteFee: number;
  /** The final submitted commission % */
  actualCommission: number;
  /** The final submitted site fee % */
  actualSiteFee: number;
  /** The prediction source tier */
  predictionSource: string;
  /** Confidence score 0-1 */
  predictionConfidence: number;
  /** Context keys */
  cardType: string;
  transactionType: string;
  sentTo: string;
  bankName?: string;
  customerMode?: string;
  createdAt?: string;
}

export interface PredictionStats {
  totalPredictions: number;
  totalAccepted: number;         // Both commission & fee accepted
  totalOverridden: number;       // At least one changed
  commissionAcceptedCount: number;
  commissionOverriddenCount: number;
  siteFeeAcceptedCount: number;
  siteFeeOverriddenCount: number;
  acceptanceRate: number;        // 0-100%
  commissionAcceptanceRate: number;
  siteFeeAcceptanceRate: number;
  /** Recent events for the activity feed */
  recentEvents: PredictionEvent[];
  /** By source tier breakdown */
  bySource: Record<string, { accepted: number; overridden: number; total: number }>;
}

// ─── Service ───────────────────────────────────────────────────────────────

class PredictionTrackingService {
  /**
   * Record a prediction outcome. Called at transaction form submit time.
   * Attempts to insert into the dedicated `prediction_tracking` table.
   * Falls back to `activity_logs` if the table does not exist yet.
   */
  async recordPrediction(event: PredictionEvent): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const bothAccepted = event.commissionAccepted && event.siteFeeAccepted;
      const status = bothAccepted ? "accepted" : "overridden";

      // 1. Primary: Try inserting into dedicated prediction_tracking table
      const { error: dedicatedError } = await supabase
        .from("prediction_tracking")
        .insert({
          user_id: user.id,
          transaction_id: event.transactionId || null,
          amount: event.amount !== undefined ? event.amount : 0,
          profit: event.profit !== undefined ? event.profit : 0,
          customer_name: event.customerName || null,
          customer_phone: event.customerPhone || null,
          portal_name: event.portalName || null,
          notes: event.notes || null,
          commission_accepted: event.commissionAccepted,
          site_fee_accepted: event.siteFeeAccepted,
          both_accepted: bothAccepted,
          predicted_commission: event.predictedCommission,
          predicted_site_fee: event.predictedSiteFee,
          actual_commission: event.actualCommission,
          actual_site_fee: event.actualSiteFee,
          prediction_source: event.predictionSource,
          prediction_confidence: event.predictionConfidence,
          card_type: event.cardType,
          transaction_type: event.transactionType,
          sent_to: event.sentTo,
          bank_name: event.bankName || null,
          customer_mode: event.customerMode || null,
        });

      // 2. Fallback: If prediction_tracking table doesn't exist yet, write to activity_logs
      if (dedicatedError) {
        const description = bothAccepted
          ? `AI prediction accepted: Commission ${event.predictedCommission}%, Site Fee ${event.predictedSiteFee}% (${event.predictionSource}, ${Math.round(event.predictionConfidence * 100)}% confidence)`
          : `AI prediction overridden: Commission ${event.predictedCommission}%→${event.actualCommission}%, Site Fee ${event.predictedSiteFee}%→${event.actualSiteFee}% (${event.predictionSource})`;

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: `prediction.${status}`,
          category: "transaction",
          description,
          metadata: {
            prediction_event: true,
            transaction_id: event.transactionId || null,
            amount: event.amount !== undefined ? event.amount : 0,
            profit: event.profit !== undefined ? event.profit : 0,
            customer_name: event.customerName || null,
            customer_phone: event.customerPhone || null,
            portal_name: event.portalName || null,
            notes: event.notes || null,
            commission_accepted: event.commissionAccepted,
            site_fee_accepted: event.siteFeeAccepted,
            predicted_commission: event.predictedCommission,
            predicted_site_fee: event.predictedSiteFee,
            actual_commission: event.actualCommission,
            actual_site_fee: event.actualSiteFee,
            prediction_source: event.predictionSource,
            prediction_confidence: event.predictionConfidence,
            card_type: event.cardType,
            transaction_type: event.transactionType,
            sent_to: event.sentTo,
            bank_name: event.bankName || null,
            customer_mode: event.customerMode || null,
            both_accepted: bothAccepted,
          },
        });
      }
    } catch {
      // Silent — tracking must never break the main flow
    }
  }

  /**
   * Fetch aggregated prediction stats.
   * First queries the dedicated `prediction_tracking` table.
   * If not available or empty, queries `activity_logs` as fallback.
   */
  async getStats(): Promise<PredictionStats> {
    const empty: PredictionStats = {
      totalPredictions: 0,
      totalAccepted: 0,
      totalOverridden: 0,
      commissionAcceptedCount: 0,
      commissionOverriddenCount: 0,
      siteFeeAcceptedCount: 0,
      siteFeeOverriddenCount: 0,
      acceptanceRate: 0,
      commissionAcceptanceRate: 0,
      siteFeeAcceptanceRate: 0,
      recentEvents: [],
      bySource: {},
    };

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return empty;

      // 1. Try querying dedicated prediction_tracking table
      const { data: dedicatedData, error: dedicatedError } = await supabase
        .from("prediction_tracking")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!dedicatedError && dedicatedData && dedicatedData.length > 0) {
        return this.aggregateDedicatedRows(dedicatedData);
      }

      // 2. Fallback: Query activity_logs
      const { data: activityData, error: activityError } = await supabase
        .from("activity_logs")
        .select("metadata, created_at")
        .eq("user_id", user.id)
        .or("action.eq.prediction.accepted,action.eq.prediction.overridden")
        .order("created_at", { ascending: false });

      if (activityError || !activityData) return empty;

      const predictionLogs = activityData.filter(
        (row: any) => row.metadata && row.metadata.prediction_event === true
      );

      if (predictionLogs.length === 0) return empty;

      return this.aggregateActivityRows(predictionLogs);
    } catch {
      return empty;
    }
  }

  private aggregateDedicatedRows(rows: any[]): PredictionStats {
    let totalAccepted = 0;
    let totalOverridden = 0;
    let commAccepted = 0;
    let commOverridden = 0;
    let feeAccepted = 0;
    let feeOverridden = 0;
    const bySource: Record<string, { accepted: number; overridden: number; total: number }> = {};
    const recentEvents: PredictionEvent[] = [];

    for (const r of rows) {
      const bothAccepted = r.both_accepted === true;
      if (bothAccepted) totalAccepted++;
      else totalOverridden++;

      if (r.commission_accepted) commAccepted++;
      else commOverridden++;

      if (r.site_fee_accepted) feeAccepted++;
      else feeOverridden++;

      const src = r.prediction_source || "unknown";
      if (!bySource[src]) bySource[src] = { accepted: 0, overridden: 0, total: 0 };
      bySource[src].total++;
      if (bothAccepted) bySource[src].accepted++;
      else bySource[src].overridden++;

      if (recentEvents.length < 20) {
        recentEvents.push({
          id: r.id,
          transactionId: r.transaction_id || undefined,
          amount: r.amount !== null && r.amount !== undefined ? Number(r.amount) : undefined,
          profit: r.profit !== null && r.profit !== undefined ? Number(r.profit) : undefined,
          customerName: r.customer_name || undefined,
          customerPhone: r.customer_phone || undefined,
          portalName: r.portal_name || undefined,
          notes: r.notes || undefined,
          commissionAccepted: r.commission_accepted,
          siteFeeAccepted: r.site_fee_accepted,
          predictedCommission: Number(r.predicted_commission),
          predictedSiteFee: Number(r.predicted_site_fee),
          actualCommission: Number(r.actual_commission),
          actualSiteFee: Number(r.actual_site_fee),
          predictionSource: r.prediction_source,
          predictionConfidence: Number(r.prediction_confidence),
          cardType: r.card_type,
          transactionType: r.transaction_type,
          sentTo: r.sent_to,
          bankName: r.bank_name || undefined,
          customerMode: r.customer_mode || undefined,
          createdAt: r.created_at,
        });
      }
    }

    const total = rows.length;
    return {
      totalPredictions: total,
      totalAccepted,
      totalOverridden,
      commissionAcceptedCount: commAccepted,
      commissionOverriddenCount: commOverridden,
      siteFeeAcceptedCount: feeAccepted,
      siteFeeOverriddenCount: feeOverridden,
      acceptanceRate: total > 0 ? Math.round((totalAccepted / total) * 1000) / 10 : 0,
      commissionAcceptanceRate: total > 0 ? Math.round((commAccepted / total) * 1000) / 10 : 0,
      siteFeeAcceptanceRate: total > 0 ? Math.round((feeAccepted / total) * 1000) / 10 : 0,
      recentEvents,
      bySource,
    };
  }

  private aggregateActivityRows(rows: any[]): PredictionStats {
    let totalAccepted = 0;
    let totalOverridden = 0;
    let commAccepted = 0;
    let commOverridden = 0;
    let feeAccepted = 0;
    let feeOverridden = 0;
    const bySource: Record<string, { accepted: number; overridden: number; total: number }> = {};
    const recentEvents: PredictionEvent[] = [];

    for (const row of rows) {
      const m = row.metadata as any;
      const bothAccepted = m.both_accepted === true;
      if (bothAccepted) totalAccepted++;
      else totalOverridden++;

      if (m.commission_accepted) commAccepted++;
      else commOverridden++;

      if (m.site_fee_accepted) feeAccepted++;
      else feeOverridden++;

      const src = m.prediction_source || "unknown";
      if (!bySource[src]) bySource[src] = { accepted: 0, overridden: 0, total: 0 };
      bySource[src].total++;
      if (bothAccepted) bySource[src].accepted++;
      else bySource[src].overridden++;

      if (recentEvents.length < 20) {
        recentEvents.push({
          commissionAccepted: m.commission_accepted,
          siteFeeAccepted: m.site_fee_accepted,
          predictedCommission: m.predicted_commission,
          predictedSiteFee: m.predicted_site_fee,
          actualCommission: m.actual_commission,
          actualSiteFee: m.actual_site_fee,
          predictionSource: m.prediction_source,
          predictionConfidence: m.prediction_confidence,
          cardType: m.card_type,
          transactionType: m.transaction_type,
          sentTo: m.sent_to,
          bankName: m.bank_name || undefined,
          customerMode: m.customer_mode || undefined,
          createdAt: row.created_at,
        });
      }
    }

    const total = rows.length;
    return {
      totalPredictions: total,
      totalAccepted,
      totalOverridden,
      commissionAcceptedCount: commAccepted,
      commissionOverriddenCount: commOverridden,
      siteFeeAcceptedCount: feeAccepted,
      siteFeeOverriddenCount: feeOverridden,
      acceptanceRate: total > 0 ? Math.round((totalAccepted / total) * 1000) / 10 : 0,
      commissionAcceptanceRate: total > 0 ? Math.round((commAccepted / total) * 1000) / 10 : 0,
      siteFeeAcceptanceRate: total > 0 ? Math.round((feeAccepted / total) * 1000) / 10 : 0,
      recentEvents,
      bySource,
    };
  }

  /**
   * Fetch all prediction tracking events with full context for the dedicated tracker page
   */
  async getAllEvents(limit = 200): Promise<PredictionEvent[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      // 1. Primary: dedicated table
      const { data: dedicatedData, error: dedicatedError } = await supabase
        .from("prediction_tracking")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!dedicatedError && dedicatedData && dedicatedData.length > 0) {
        return dedicatedData.map((r) => ({
          id: r.id,
          transactionId: r.transaction_id || undefined,
          amount: r.amount !== null && r.amount !== undefined ? Number(r.amount) : undefined,
          profit: r.profit !== null && r.profit !== undefined ? Number(r.profit) : undefined,
          customerName: r.customer_name || undefined,
          customerPhone: r.customer_phone || undefined,
          portalName: r.portal_name || undefined,
          notes: r.notes || undefined,
          commissionAccepted: r.commission_accepted,
          siteFeeAccepted: r.site_fee_accepted,
          predictedCommission: Number(r.predicted_commission),
          predictedSiteFee: Number(r.predicted_site_fee),
          actualCommission: Number(r.actual_commission),
          actualSiteFee: Number(r.actual_site_fee),
          predictionSource: r.prediction_source,
          predictionConfidence: Number(r.prediction_confidence),
          cardType: r.card_type,
          transactionType: r.transaction_type,
          sentTo: r.sent_to,
          bankName: r.bank_name || undefined,
          customerMode: r.customer_mode || undefined,
          createdAt: r.created_at,
        }));
      }

      // 2. Fallback: activity_logs
      const { data: activityData, error: activityError } = await supabase
        .from("activity_logs")
        .select("id, metadata, created_at")
        .eq("user_id", user.id)
        .or("action.eq.prediction.accepted,action.eq.prediction.overridden")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (activityError || !activityData) return [];

      return activityData
        .filter((row: any) => row.metadata?.prediction_event === true)
        .map((row: any) => {
          const m = row.metadata;
          return {
            id: row.id,
            commissionAccepted: m.commission_accepted,
            siteFeeAccepted: m.site_fee_accepted,
            predictedCommission: Number(m.predicted_commission),
            predictedSiteFee: Number(m.predicted_site_fee),
            actualCommission: Number(m.actual_commission),
            actualSiteFee: Number(m.actual_site_fee),
            predictionSource: m.prediction_source,
            predictionConfidence: Number(m.prediction_confidence),
            cardType: m.card_type,
            transactionType: m.transaction_type,
            sentTo: m.sent_to,
            bankName: m.bank_name || undefined,
            customerMode: m.customer_mode || undefined,
            createdAt: row.created_at,
          };
        });
    } catch {
      return [];
    }
  }

  /**
   * Delete prediction tracking record(s) linked to one or more transaction IDs.
   * Called whenever a transaction is deleted from the transactions or admin page.
   */
  async deletePredictionsByTransactionId(transactionIdOrIds: string | string[]): Promise<void> {
    try {
      const ids = (Array.isArray(transactionIdOrIds) ? transactionIdOrIds : [transactionIdOrIds])
        .filter(Boolean) as string[];
      if (ids.length === 0) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Delete from dedicated prediction_tracking table
      let query = supabase.from("prediction_tracking").delete().in("transaction_id", ids);
      if (user) {
        query = query.eq("user_id", user.id);
      }
      const { error: dedicatedError } = await query;
      if (dedicatedError) {
        console.warn("Could not delete from prediction_tracking:", dedicatedError.message);
      }

      // 2. Also clean up any fallback prediction logs in activity_logs
      if (user) {
        try {
          for (const txId of ids) {
            await supabase
              .from("activity_logs")
              .delete()
              .eq("user_id", user.id)
              .contains("metadata", { transaction_id: txId });
          }
        } catch {
          // ignore fallback delete errors
        }
      }
    } catch (err) {
      console.error("Error deleting prediction tracking records:", err);
    }
  }

  /**
   * Delete a single prediction record by its own event ID.
   */
  async deletePredictionById(id: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // 1. Try dedicated table
      const { error: dedicatedError } = await supabase
        .from("prediction_tracking")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (!dedicatedError) return true;

      // 2. Fallback to activity_logs
      const { error: activityError } = await supabase
        .from("activity_logs")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      return !activityError;
    } catch {
      return false;
    }
  }
}

export const predictionTrackingService = new PredictionTrackingService();
