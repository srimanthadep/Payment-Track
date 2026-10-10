import { describe, it, expect, vi, beforeEach } from "vitest";
import { predictionTrackingService, PredictionEvent } from "@/services/predictionTrackingService";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    },
  };
});

describe("predictionTrackingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates stats correctly from dedicated prediction_tracking rows", async () => {
    const mockUser = { id: "test-user-123" };
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });

    const mockRows = [
      {
        id: "1",
        user_id: mockUser.id,
        site_name: "Finkeda",
        commission_accepted: true,
        site_fee_accepted: true,
        imps_accepted: true,
        both_accepted: true,
        all_accepted: true,
        predicted_commission: 2.0,
        predicted_site_fee: 1.0,
        predicted_imps: 0,
        actual_commission: 2.0,
        actual_site_fee: 1.0,
        actual_imps: 0,
        prediction_source: "site_card_tx",
        prediction_confidence: 0.9,
        card_type: "Visa",
        transaction_type: "SWIPE",
        sent_to: "Portal A",
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        user_id: mockUser.id,
        site_name: "Indyapay",
        commission_accepted: false,
        site_fee_accepted: true,
        imps_accepted: false,
        both_accepted: false,
        all_accepted: false,
        predicted_commission: 2.0,
        predicted_site_fee: 1.0,
        predicted_imps: 0,
        actual_commission: 2.5,
        actual_site_fee: 1.0,
        actual_imps: 5,
        prediction_source: "site_card_tx",
        prediction_confidence: 0.8,
        card_type: "Visa",
        transaction_type: "SWIPE",
        sent_to: "Portal A",
        created_at: new Date().toISOString(),
      },
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
        }),
      }),
    });

    const stats = await predictionTrackingService.getStats();

    expect(stats.totalPredictions).toBe(2);
    expect(stats.totalAccepted).toBe(1);
    expect(stats.totalOverridden).toBe(1);
    expect(stats.commissionAcceptedCount).toBe(1);
    expect(stats.commissionOverriddenCount).toBe(1);
    expect(stats.siteFeeAcceptedCount).toBe(2);
    expect(stats.siteFeeOverriddenCount).toBe(0);
    expect(stats.impsAcceptedCount).toBe(1);
    expect(stats.impsOverriddenCount).toBe(1);
    expect(stats.impsAcceptanceRate).toBe(50);
    expect(stats.acceptanceRate).toBe(50);
    expect(stats.commissionAcceptanceRate).toBe(50);
    expect(stats.siteFeeAcceptanceRate).toBe(100);
    expect(stats.bySource["site_card_tx"].accepted).toBe(1);
    expect(stats.bySource["site_card_tx"].overridden).toBe(1);
  });

  it("deletes predictions by transactionId", async () => {
    const mockUser = { id: "test-user-123" };
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });

    const mockDelete = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      delete: mockDelete.mockReturnValue({
        in: mockIn.mockReturnValue({
          eq: mockEq,
        }),
      }),
    });

    await predictionTrackingService.deletePredictionsByTransactionId("tx-999");

    expect(supabase.from).toHaveBeenCalledWith("prediction_tracking");
    expect(mockIn).toHaveBeenCalledWith("transaction_id", ["tx-999"]);
    expect(mockEq).toHaveBeenCalledWith("user_id", "test-user-123");
  });

  it("deletes a single prediction by event id", async () => {
    const mockUser = { id: "test-user-123" };
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });

    const mockDelete = vi.fn().mockReturnThis();
    const mockEqId = vi.fn().mockReturnThis();
    const mockEqUser = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockReturnValue({
      delete: mockDelete.mockReturnValue({
        eq: mockEqId.mockReturnValue({
          eq: mockEqUser,
        }),
      }),
    });

    const success = await predictionTrackingService.deletePredictionById("event-123");

    expect(supabase.from).toHaveBeenCalledWith("prediction_tracking");
    expect(mockEqId).toHaveBeenCalledWith("id", "event-123");
    expect(success).toBe(true);
  });
});
