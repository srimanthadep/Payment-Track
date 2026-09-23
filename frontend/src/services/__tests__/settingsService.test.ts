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
    expect(settingsService.isPortalHidden("Chummi")).toBe(false);
  });

  it("hides and unhides portals accurately (case-insensitive)", () => {
    settingsService.setPortalHidden("Upender", true);
    expect(settingsService.isPortalHidden("Upender")).toBe(true);
    expect(settingsService.isPortalHidden("upender")).toBe(true);
    expect(settingsService.isPortalHidden("UPENDER")).toBe(true);
    expect(settingsService.isPortalHidden("Chummi")).toBe(false);

    // Unhide
    settingsService.setPortalHidden("upender", false);
    expect(settingsService.isPortalHidden("Upender")).toBe(false);
    expect(settingsService.getHiddenPortals()).toEqual([]);
  });

  it("handles setAllPortalsVisibility correctly", () => {
    const portals = ["Upender", "Chummi", "Bharath"];
    // Hide all
    settingsService.setAllPortalsVisibility(portals, false);
    expect(settingsService.isPortalHidden("Upender")).toBe(true);
    expect(settingsService.isPortalHidden("Chummi")).toBe(true);
    expect(settingsService.isPortalHidden("Bharath")).toBe(true);

    // Show all
    settingsService.setAllPortalsVisibility(portals, true);
    expect(settingsService.isPortalHidden("Upender")).toBe(false);
    expect(settingsService.isPortalHidden("Chummi")).toBe(false);
    expect(settingsService.isPortalHidden("Bharath")).toBe(false);
    expect(settingsService.getHiddenPortals()).toEqual([]);
  });

  it("notifies subscribers when portal visibility changes", () => {
    let capturedSettings: any = null;
    const unsubscribe = settingsService.subscribe((s) => {
      capturedSettings = s;
    });

    settingsService.setPortalHidden("Chummi", true);
    expect(capturedSettings).not.toBeNull();
    expect(capturedSettings.hiddenPortals).toContain("Chummi");

    unsubscribe();
  });
});
