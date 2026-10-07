import { describe, it, expect, beforeEach } from "vitest";
import { settingsService } from "@/services/settingsService";

describe("settingsService - Portal Comparison Chart Visibility", () => {
  beforeEach(() => {
    // Reset to defaults before each test
    settingsService.resetToDefaults();
  });

  it("defaults to an empty hiddenPortals list", () => {
    expect(settingsService.getHiddenPortals()).toEqual([]);
    expect(settingsService.isPortalHidden("Upender")).toBe(false);
    expect(settingsService.isPortalHidden("Self")).toBe(false);
  });

  it("hides and unhides portals accurately (case-insensitive)", () => {
    settingsService.setPortalHidden("Upender", true);
    expect(settingsService.isPortalHidden("Upender")).toBe(true);
    expect(settingsService.isPortalHidden("upender")).toBe(true);
    expect(settingsService.isPortalHidden("UPENDER")).toBe(true);
    expect(settingsService.isPortalHidden("Self")).toBe(false);

    // Unhide
    settingsService.setPortalHidden("upender", false);
    expect(settingsService.isPortalHidden("Upender")).toBe(false);
    expect(settingsService.getHiddenPortals()).toEqual([]);
  });

  it("handles setAllPortalsVisibility correctly", () => {
    const portals = ["Upender", "Self", "Bharath"];
    // Hide all
    settingsService.setAllPortalsVisibility(portals, false);
    expect(settingsService.isPortalHidden("Upender")).toBe(true);
    expect(settingsService.isPortalHidden("Self")).toBe(true);
    expect(settingsService.isPortalHidden("Bharath")).toBe(true);

    // Show all
    settingsService.setAllPortalsVisibility(portals, true);
    expect(settingsService.isPortalHidden("Upender")).toBe(false);
    expect(settingsService.isPortalHidden("Self")).toBe(false);
    expect(settingsService.isPortalHidden("Bharath")).toBe(false);
    expect(settingsService.getHiddenPortals()).toEqual([]);
  });

  it("notifies subscribers when portal visibility changes", () => {
    let capturedSettings: any = null;
    const unsubscribe = settingsService.subscribe((s) => {
      capturedSettings = s;
    });

    settingsService.setPortalHidden("Self", true);
    expect(capturedSettings).not.toBeNull();
    expect(capturedSettings.hiddenPortals).toContain("Self");

    unsubscribe();
  });
});

describe("settingsService - Sites Configuration", () => {
  beforeEach(() => {
    settingsService.resetToDefaults();
  });

  it("contains the 7 predefined default sites", () => {
    const sites = settingsService.getSites();
    expect(sites.length).toBe(7);
    const siteNames = sites.map((s) => s.name);
    expect(siteNames).toEqual([
      "Finkeda",
      "Indyapay",
      "BankPay",
      "GreenPay",
      "TWallet",
      "Bankit",
      "DmtPay",
    ]);
  });

  it("adds, updates, deletes and resets sites properly", () => {
    // Add custom site
    const added = settingsService.addSite("PayTM Payout");
    expect(added.name).toBe("PayTM Payout");
    expect(settingsService.getSites().some((s) => s.name === "PayTM Payout")).toBe(true);

    // Update site
    settingsService.updateSite(added.id, "PayTM Enterprise");
    expect(settingsService.getSites().some((s) => s.name === "PayTM Enterprise")).toBe(true);

    // Delete site
    settingsService.deleteSite(added.id);
    expect(settingsService.getSites().some((s) => s.name === "PayTM Enterprise")).toBe(false);

    // Reset sites
    settingsService.resetSites();
    expect(settingsService.getSites().length).toBe(7);
  });
});

