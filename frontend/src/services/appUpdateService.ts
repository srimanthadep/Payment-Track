// ============================================================================
// Real-Time App Update Service
// Detects new deployments pushed to GitHub and automatically alerts/reloads clients
// ============================================================================

export interface VersionInfo {
  buildTime: string;
  builtAt: string;
}

type UpdateListener = (hasUpdate: boolean, versionInfo?: VersionInfo) => void;

class AppUpdateService {
  private localBuildTime: string = typeof __APP_BUILD_TIME__ !== "undefined" ? __APP_BUILD_TIME__ : "";
  private remoteVersionInfo: VersionInfo | null = null;
  private hasUpdate: boolean = false;
  private listeners: Set<UpdateListener> = new Set();
  private pollIntervalId: any = null;
  private isChecking: boolean = false;
  private hasPromptedDismiss: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private init() {
    // Check initial version after short delay so initial render completes
    setTimeout(() => {
      this.checkForUpdates();
    }, 4000);

    // Poll periodically every 30 seconds
    this.pollIntervalId = setInterval(() => {
      this.checkForUpdates();
    }, 30 * 1000);

    // Immediate check when user tabs back or focuses window
    window.addEventListener("focus", () => {
      this.checkForUpdates();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.checkForUpdates();
      }
    });

    // Check when network comes back online
    window.addEventListener("online", () => {
      this.checkForUpdates();
    });
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    // Fire immediately with current state
    listener(this.hasUpdate, this.remoteVersionInfo || undefined);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getLocalBuildTime(): string {
    return this.localBuildTime;
  }

  public getRemoteVersionInfo(): VersionInfo | null {
    return this.remoteVersionInfo;
  }

  public isUpdateAvailable(): boolean {
    return this.hasUpdate;
  }

  public dismissPromptForNow(): void {
    this.hasPromptedDismiss = true;
    // Remind again after 5 minutes if still not updated
    setTimeout(() => {
      this.hasPromptedDismiss = false;
      this.notifyListeners();
    }, 5 * 60 * 1000);
  }

  public isDismissed(): boolean {
    return this.hasPromptedDismiss;
  }

  /**
   * Query the server for the latest version.json
   */
  public async checkForUpdates(): Promise<boolean> {
    if (typeof window === "undefined" || this.isChecking) return this.hasUpdate;

    this.isChecking = true;
    try {
      // Use query param and no-store to bypass all browser, CDN, and proxy caches
      const response = await fetch(`/version.json?_t=${Date.now()}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return this.hasUpdate;
      }

      const remoteData = (await response.json()) as VersionInfo;
      if (!remoteData || !remoteData.buildTime) {
        return this.hasUpdate;
      }

      // If localBuildTime is empty (e.g., local dev mode), record the initial build
      if (!this.localBuildTime) {
        this.localBuildTime = remoteData.buildTime;
        return false;
      }

      // If build times differ, a new deployment has landed on the server!
      if (remoteData.buildTime !== this.localBuildTime) {
        this.remoteVersionInfo = remoteData;
        this.hasUpdate = true;
        this.notifyListeners();
        return true;
      }

      return false;
    } catch {
      // Offline or network error — silent fail
      return this.hasUpdate;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Apply update: purge caches, signal service worker, and reload cleanly
   */
  public async applyUpdate(): Promise<void> {
    try {
      // 1. Tell all registered service workers to skip waiting and activate immediately
      if ("serviceWorker" in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.update().catch(() => {});
            if (reg.waiting) {
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          }
        } catch {
          // Continue
        }
      }

      // 2. Clear browser CacheStorage to eliminate stale cached bundles
      if ("caches" in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        } catch {
          // Continue
        }
      }
    } finally {
      // 3. Hard reload to load fresh assets immediately
      window.location.reload();
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.hasUpdate, this.remoteVersionInfo || undefined);
      } catch (e) {
        console.error("Error in update listener:", e);
      }
    }
  }
}

export const appUpdateService = new AppUpdateService();
