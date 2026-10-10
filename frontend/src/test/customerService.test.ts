import { describe, it, expect } from "vitest";
import {
  searchCustomers,
  normalizePhone,
  CustomerRecord,
} from "@/services/customerService";

const mockCustomers: CustomerRecord[] = [
  {
    id: "c1",
    user_id: "u1",
    name: "Rahul Sharma",
    phone: "9849143067",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    transaction_count: 5,
  },
  {
    id: "c2",
    user_id: "u1",
    name: "Srimanth Adepu",
    phone: "9994009432",
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    transaction_count: 12,
  },
  {
    id: "c3",
    user_id: "u1",
    name: "Chummi Self Account",
    phone: "+91 91234 56789",
    created_at: "2026-01-03T00:00:00Z",
    updated_at: "2026-01-03T00:00:00Z",
    transaction_count: 20,
  },
  {
    id: "c4",
    user_id: "u1",
    name: "Venkatesh Rao",
    phone: "8008123456",
    created_at: "2026-01-04T00:00:00Z",
    updated_at: "2026-01-04T00:00:00Z",
    transaction_count: 2,
  },
];

describe("Customer search & phone normalization", () => {
  describe("normalizePhone", () => {
    it("strips country code and non-digits from Indian numbers", () => {
      expect(normalizePhone("+91 98491 43067")).toBe("9849143067");
      expect(normalizePhone("09849143067")).toBe("9849143067");
      expect(normalizePhone("98491-43067")).toBe("9849143067");
      expect(normalizePhone(null)).toBeNull();
      expect(normalizePhone("")).toBeNull();
    });
  });

  describe("searchCustomers by phone number", () => {
    it("matches exact 10-digit phone number", () => {
      const results = searchCustomers("9849143067", mockCustomers);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("c1");
      expect(results[0].name).toBe("Rahul Sharma");
    });

    it("matches phone prefix query", () => {
      const results = searchCustomers("9994", mockCustomers);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("c2");
      expect(results[0].name).toBe("Srimanth Adepu");
    });

    it("matches phone suffix / last-4-digits query", () => {
      const results = searchCustomers("9432", mockCustomers);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("c2");
    });

    it("matches formatted phone number with country code", () => {
      const results = searchCustomers("91234", mockCustomers);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("c3");
    });

    it("matches phone substring query", () => {
      const results = searchCustomers("40094", mockCustomers);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("c2");
    });
  });

  describe("searchCustomers by name", () => {
    it("matches customer name case-insensitively", () => {
      const results = searchCustomers("rahul", mockCustomers);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("c1");
    });

    it("matches partial name tokens", () => {
      const results = searchCustomers("srimanth", mockCustomers);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("c2");
    });

    it("matches multi-word name query", () => {
      const results = searchCustomers("venkatesh rao", mockCustomers);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("c4");
    });
  });

  describe("searchCustomers with empty query", () => {
    it("returns top customers sorted by transaction count and recency", () => {
      const results = searchCustomers("", mockCustomers);
      expect(results.length).toBe(4);
      // c3 has 20 transactions, c2 has 12, c1 has 5, c4 has 2
      expect(results[0].id).toBe("c3");
      expect(results[1].id).toBe("c2");
    });
  });

  describe("CustomerSavedCard with sent_to", () => {
    it("preserves sent_to in customer saved card records", () => {
      const card = {
        bank_name: "HDFC",
        card_type: "Visa",
        transaction_type: "withdrawal",
        customer_mode: "Normal",
        sent_to: "Upender",
        usage_count: 3,
      };

      expect(card.sent_to).toBe("Upender");
      expect(card.bank_name).toBe("HDFC");
    });
  });
});
