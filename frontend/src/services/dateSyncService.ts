export type DateSyncListener = (
  date: Date | null,
  period: string,
  source: string
) => void;

class DateSyncService {
  private activeDate: Date | null = new Date();
  private activePeriod: string = "daily";
  private listeners: Set<DateSyncListener> = new Set();

  getActiveDate(): Date | null {
    return this.activeDate;
  }

  getActivePeriod(): string {
    return this.activePeriod;
  }

  setActiveDate(
    date: Date | null,
    period: string = "daily",
    source: string = "default"
  ) {
    const isSameDate =
      (this.activeDate === null && date === null) ||
      (this.activeDate !== null &&
        date !== null &&
        this.activeDate.getFullYear() === date.getFullYear() &&
        this.activeDate.getMonth() === date.getMonth() &&
        this.activeDate.getDate() === date.getDate());

    const isSamePeriod = this.activePeriod === period;

    if (isSameDate && isSamePeriod) {
      return;
    }

    this.activeDate = date;
    this.activePeriod = period;
    this.notify(source);
  }

  resetToToday(source: string = "default") {
    this.setActiveDate(new Date(), "daily", source);
  }

  subscribe(listener: DateSyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(source: string) {
    this.listeners.forEach((listener) => {
      try {
        listener(this.activeDate, this.activePeriod, source);
      } catch (e) {
        console.error("Error in dateSync listener:", e);
      }
    });
  }
}

export const dateSyncService = new DateSyncService();
