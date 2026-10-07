import { describe, it, expect, beforeEach, vi } from "vitest";
import { settingsService } from "../services/settingsService";

describe("Dropdown Custom Ordering & Frequency Ranking", () => {
  beforeEach(() => {
    // Reset settings in localStorage and service cache
    localStorage.clear();
    // Re-initialize settings
    (settingsService as any).settings = (settingsService as any).getDefaultSettings();
  });

  describe("Manual Ordering", () => {
    it("should respect manual drag-and-drop order for recipients", () => {
      const items = [
        { id: "1", name: "Upender" },
        { id: "2", name: "Bharath" },
        { id: "3", name: "Chummi" },
      ];

      // Initially, no custom order is defined -> preserves original items order
      const initial = settingsService.sortOptions("recipients", items);
      expect(initial.map((i) => i.name)).toEqual(["Upender", "Bharath", "Chummi"]);

      // User reorders: Chummi first, Upender second, Bharath third
      settingsService.setDropdownOrderingConfig("recipients", {
        mode: "manual",
        manualOrder: ["3", "1", "2"],
      });

      const reordered = settingsService.sortOptions("recipients", items);
      expect(reordered.map((i) => i.name)).toEqual(["Chummi", "Upender", "Bharath"]);
    });

    it("should stably append newly added items to the end if not in manualOrder", () => {
      const initialItems = [
        { id: "1", name: "Upender" },
        { id: "2", name: "Bharath" },
      ];

      settingsService.setDropdownOrderingConfig("recipients", {
        mode: "manual",
        manualOrder: ["2", "1"],
      });

      // A new recipient "Deepak" is added later
      const updatedItems = [
        { id: "1", name: "Upender" },
        { id: "2", name: "Bharath" },
        { id: "3", name: "Deepak" },
      ];

      const sorted = settingsService.sortOptions("recipients", updatedItems);
      // "Bharath" and "Upender" in custom order, "Deepak" appended at the end
      expect(sorted.map((i) => i.name)).toEqual(["Bharath", "Upender", "Deepak"]);
    });

    it("should gracefully ignore IDs in manualOrder that no longer exist", () => {
      const items = [
        { id: "1", name: "Upender" },
        { id: "3", name: "Chummi" },
      ];

      // manualOrder has stale ID "deleted_id"
      settingsService.setDropdownOrderingConfig("recipients", {
        mode: "manual",
        manualOrder: ["deleted_id", "3", "1"],
      });

      const sorted = settingsService.sortOptions("recipients", items);
      expect(sorted.map((i) => i.name)).toEqual(["Chummi", "Upender"]);
    });
  });

  describe("Automatic Frequency-Based Ordering", () => {
    it("should sort items by selection count descending in automatic mode", () => {
      const items = [
        { id: "site_1", name: "Finkeda" },
        { id: "site_2", name: "Indyapay" },
        { id: "site_3", name: "BankPay" },
        { id: "site_4", name: "GreenPay" },
      ];

      // Switch sites to automatic mode
      settingsService.setDropdownOrderingConfig("sites", {
        mode: "automatic",
      });

      // Record selections: Indyapay x 5, GreenPay x 3, Finkeda x 1, BankPay x 0
      for (let i = 0; i < 5; i++) {
        settingsService.recordDropdownSelection("sites", "Indyapay");
      }
      for (let i = 0; i < 3; i++) {
        settingsService.recordDropdownSelection("sites", "GreenPay");
      }
      settingsService.recordDropdownSelection("sites", "Finkeda");

      const sorted = settingsService.sortOptions("sites", items);
      expect(sorted.map((i) => i.name)).toEqual([
        "Indyapay", // 5 selections
        "GreenPay", // 3 selections
        "Finkeda",  // 1 selection
        "BankPay",  // 0 selections
      ]);
    });

    it("should tie-break equal frequency counts deterministically by recency and initial index", () => {
      const items = [
        { id: "1", name: "Upender" },
        { id: "2", name: "Bharath" },
        { id: "3", name: "Chummi" },
      ];

      settingsService.setDropdownOrderingConfig("recipients", {
        mode: "automatic",
      });

      // Both Upender and Chummi get 1 selection, but Chummi is selected more recently
      settingsService.recordDropdownSelection("recipients", "Upender");
      // Advance fake timestamp by updating recency
      settingsService.recordDropdownSelection("recipients", "Chummi");

      const sorted = settingsService.sortOptions("recipients", items);
      // Chummi was selected most recently -> ranks ahead of Upender (both count=1)
      // Bharath has 0 counts -> ranks last
      expect(sorted[0].name).toBe("Chummi");
      expect(sorted[1].name).toBe("Upender");
      expect(sorted[2].name).toBe("Bharath");
    });

    it("should record selection counts by ID or name flexibly", () => {
      const actualBanks = settingsService.getBanks();
      const targetBank = actualBanks[1]; // SBI Card or similar default bank

      settingsService.setDropdownOrderingConfig("banks", {
        mode: "automatic",
      });

      // Record by name
      settingsService.recordDropdownSelection("banks", targetBank.name);
      // Record by id
      settingsService.recordDropdownSelection("banks", targetBank.id);

      const config = settingsService.getDropdownOrderingConfig("banks");
      expect(config.selectionCounts[targetBank.id]).toBe(2);
      expect(config.selectionCounts[targetBank.name]).toBe(2);

      const sorted = settingsService.sortOptions("banks", actualBanks);
      expect(sorted[0].name).toBe(targetBank.name);
    });

    it("should dynamically promote Self over Upender as transactions accumulate over time without manual intervention", () => {
      // 1. Setup Sent To / Recipients in automatic mode with initial counts: Upender (413), Self (363), Bharath (215)
      settingsService.setDropdownOrderingConfig("recipients", {
        mode: "automatic",
        selectionCounts: {
          Upender: 413,
          Self: 363,
          Bharath: 215,
        },
      });

      // 2. Initial order should have Upender as #1 on top
      const initialOrder = settingsService.getRecipients();
      expect(initialOrder[0].name).toBe("Upender");
      expect(initialOrder[1].name).toBe("Self");
      expect(initialOrder[2].name).toBe("Bharath");

      // 3. User records 60 new transactions for Self over time
      for (let i = 0; i < 60; i++) {
        settingsService.recordDropdownSelection("recipients", "Self");
      }

      // Self count is now 363 + 60 = 423 (> 413)
      // 4. Without the user doing anything or touching configuration, getRecipients() now automatically places Self on top
      const updatedOrder = settingsService.getRecipients();
      expect(updatedOrder[0].name).toBe("Self");
      expect(updatedOrder[1].name).toBe("Upender");
      expect(updatedOrder[2].name).toBe("Bharath");

      // 5. Verify the mode is still permanently "automatic"
      const currentConfig = settingsService.getDropdownOrderingConfig("recipients");
      expect(currentConfig.mode).toBe("automatic");
    });
  });

  describe("Per-Dropdown Independence", () => {
    it("should maintain independent ordering configs and counts for different dropdowns", () => {
      settingsService.setDropdownOrderingConfig("recipients", {
        mode: "manual",
        manualOrder: ["rec_2", "rec_1"],
      });

      settingsService.setDropdownOrderingConfig("sites", {
        mode: "automatic",
      });

      settingsService.recordDropdownSelection("sites", "Indyapay");

      const recipientsConfig = settingsService.getDropdownOrderingConfig("recipients");
      const sitesConfig = settingsService.getDropdownOrderingConfig("sites");
      const banksConfig = settingsService.getDropdownOrderingConfig("banks");

      expect(recipientsConfig.mode).toBe("manual");
      expect(sitesConfig.mode).toBe("automatic");
      expect(banksConfig.mode).toBe("manual"); // default
      expect(sitesConfig.selectionCounts["Indyapay"]).toBe(1);
      expect(recipientsConfig.selectionCounts["Indyapay"]).toBeUndefined();
    });
  });

  describe("Reset Functionality", () => {
    it("resetDropdownOrder should restore default order while preserving counts", () => {
      settingsService.setDropdownOrderingConfig("recipients", {
        mode: "manual",
        manualOrder: ["3", "2", "1"],
      });
      settingsService.recordDropdownSelection("recipients", "3");

      settingsService.resetDropdownOrder("recipients");

      const config = settingsService.getDropdownOrderingConfig("recipients");
      expect(config.mode).toBe("manual");
      expect(config.manualOrder).toEqual([]);
      expect(config.selectionCounts["3"]).toBe(1);
    });

    it("resetDropdownCounts should clear frequency counts while preserving custom order", () => {
      settingsService.setDropdownOrderingConfig("recipients", {
        mode: "manual",
        manualOrder: ["3", "2", "1"],
      });
      settingsService.recordDropdownSelection("recipients", "3");
      settingsService.recordDropdownSelection("recipients", "2");

      settingsService.resetDropdownCounts("recipients");

      const config = settingsService.getDropdownOrderingConfig("recipients");
      expect(config.manualOrder).toEqual(["3", "2", "1"]);
      expect(config.selectionCounts).toEqual({});
    });
  });
});
