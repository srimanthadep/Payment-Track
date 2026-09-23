import { describe, it, expect, vi } from "vitest";
import { dateSyncService } from "@/services/dateSyncService";

describe("dateSyncService", () => {
  it("subscribes and receives date updates", () => {
    const listener = vi.fn();
    const unsubscribe = dateSyncService.subscribe(listener);

    const testDate = new Date(2026, 8, 15); // 15 Sep 2026
    dateSyncService.setActiveDate(testDate, "daily", "test");

    expect(listener).toHaveBeenCalledWith(testDate, "daily", "test");
    expect(dateSyncService.getActiveDate()?.getDate()).toBe(15);

    unsubscribe();
  });

  it("does not notify if the same date and period are set", () => {
    const listener = vi.fn();
    const testDate = new Date(2026, 8, 20);
    dateSyncService.setActiveDate(testDate, "daily", "test");

    const unsubscribe = dateSyncService.subscribe(listener);

    // Set same date again
    const sameDate = new Date(2026, 8, 20);
    dateSyncService.setActiveDate(sameDate, "daily", "test");

    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("resets to today correctly", () => {
    const listener = vi.fn();
    const unsubscribe = dateSyncService.subscribe(listener);

    dateSyncService.resetToToday("test");

    expect(listener).toHaveBeenCalled();
    const active = dateSyncService.getActiveDate();
    const today = new Date();
    expect(active?.getDate()).toBe(today.getDate());
    expect(active?.getMonth()).toBe(today.getMonth());

    unsubscribe();
  });
});
