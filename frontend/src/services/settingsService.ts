import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { themeService } from "@/services/themeService";

export interface ExpenseCategoryOption {
  id: string;
  name: string;
  color: string; // Tailwind color or hex
  description?: string;
  isDefault?: boolean;
}

export interface CardTypeOption {
  id: string;
  name: string;
  withdrawRate?: number;
  repayRate?: number;
  isDefault?: boolean;
}

export interface RecipientOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface TransactionTypeOption {
  id: string;
  name: string;
  label: string;
  isDefault?: boolean;
}

export interface BankOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface SiteOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface WhatsAppSettings {
  enabled: boolean;
  welcomeMessage?: string;
}

export type DropdownSortMode = "manual" | "automatic";

export interface DropdownOrderingConfig {
  mode: DropdownSortMode;
  manualOrder?: string[];
  selectionCounts?: Record<string, number>;
  lastSelectedAt?: Record<string, string>;
}

export interface DropdownOrderSettings {
  recipients?: DropdownOrderingConfig;
  sites?: DropdownOrderingConfig;
  banks?: DropdownOrderingConfig;
  cardTypes?: DropdownOrderingConfig;
  transactionTypes?: DropdownOrderingConfig;
  expenseCategories?: DropdownOrderingConfig;
  [key: string]: DropdownOrderingConfig | undefined;
}

export interface AppSettings {
  expenseCategories: ExpenseCategoryOption[];
  transactionCardTypes: CardTypeOption[];
  transactionRecipients: RecipientOption[];
  transactionTypes: TransactionTypeOption[];
  banks: BankOption[];
  sites: SiteOption[];
  theme: string;
  hiddenPortals?: string[];
  whatsapp?: WhatsAppSettings;
  dropdownOrdering?: DropdownOrderSettings;
}

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryOption[] = [
  { id: "worker_salary", name: "Worker Salary", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800", isDefault: true },
  { id: "worker_expenses", name: "Worker Expenses", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800", isDefault: true },
  { id: "petrol_expenses", name: "Petrol Expenses", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", isDefault: true },
  { id: "current_bill", name: "Current Bill", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800", isDefault: true },
  { id: "shop_rent", name: "Shop Rent", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800", isDefault: true },
  { id: "shop_expenses", name: "Shop Expenses", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", isDefault: true },
  { id: "others", name: "Others", color: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800", isDefault: true },
];

export const DEFAULT_CARD_TYPES: CardTypeOption[] = [
  { id: "rupay", name: "RuPay", withdrawRate: 0, repayRate: 0, isDefault: true },
  { id: "visa", name: "Visa", withdrawRate: 0, repayRate: 0, isDefault: true },
  { id: "mastercard", name: "Mastercard", withdrawRate: 0, repayRate: 0, isDefault: true },
  { id: "business_card", name: "Business Card", withdrawRate: 0, repayRate: 0, isDefault: true },
  { id: "au_cards", name: "AU Cards", withdrawRate: 0, repayRate: 0, isDefault: true },
  { id: "amex_diners", name: "Amex & Diners", withdrawRate: 0, repayRate: 0, isDefault: true },
  { id: "machine_swiping", name: "Machine Swiping", withdrawRate: 0, repayRate: 0, isDefault: true },
];

export const DEFAULT_RECIPIENTS: RecipientOption[] = [
  { id: "upender", name: "Upender", isDefault: true },
  { id: "self", name: "Self", isDefault: true },
  { id: "bharath", name: "Bharath", isDefault: true },
];

export const DEFAULT_TRANSACTION_TYPES: TransactionTypeOption[] = [
  { id: "withdrawal", name: "withdrawal", label: "Withdrawal", isDefault: true },
  { id: "repayment", name: "repayment", label: "Repayment", isDefault: true },
];

export const DEFAULT_BANKS: BankOption[] = [
  { id: "hdfc", name: "HDFC Bank", isDefault: true },
  { id: "sbi", name: "SBI Card", isDefault: true },
  { id: "icici", name: "ICICI Bank", isDefault: true },
  { id: "axis", name: "Axis Bank", isDefault: true },
  { id: "kotak", name: "Kotak Mahindra Bank", isDefault: true },
  { id: "rbl", name: "RBL Bank", isDefault: true },
  { id: "indusind", name: "IndusInd Bank", isDefault: true },
  { id: "idfc", name: "IDFC FIRST Bank", isDefault: true },
  { id: "yes", name: "Yes Bank", isDefault: true },
  { id: "bank_of_baroda", name: "Bank of Baroda", isDefault: true },
  { id: "standard_chartered", name: "Standard Chartered", isDefault: true },
  { id: "other", name: "Other", isDefault: true },
];

export const DEFAULT_SITES: SiteOption[] = [
  { id: "finkeda", name: "Finkeda", isDefault: true },
  { id: "indyapay", name: "Indyapay", isDefault: true },
  { id: "bankpay", name: "BankPay", isDefault: true },
  { id: "greenpay", name: "GreenPay", isDefault: true },
  { id: "twallet", name: "TWallet", isDefault: true },
  { id: "bankit", name: "Bankit", isDefault: true },
  { id: "dmtpay", name: "DmtPay", isDefault: true },
];

const SETTINGS_STORAGE_KEY_PREFIX = "payment_track_custom_settings_u_";

type SettingsListener = (settings: AppSettings) => void;
const listeners: Set<SettingsListener> = new Set();

class SettingsService {
  private settings: AppSettings;
  private currentUserId: string | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private lastSelectionTimestamp: number = 0;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.initDatabaseSync();
  }

  private getDefaultSettings(): AppSettings {
    return {
      expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
      transactionCardTypes: [...DEFAULT_CARD_TYPES],
      transactionRecipients: [...DEFAULT_RECIPIENTS],
      transactionTypes: [...DEFAULT_TRANSACTION_TYPES],
      banks: [...DEFAULT_BANKS],
      sites: [...DEFAULT_SITES],
      theme: "ocean",
      hiddenPortals: [],
      whatsapp: { enabled: true },
      dropdownOrdering: {},
    };
  }

  private getCacheKey(userId?: string | null): string {
    const id = userId || this.currentUserId || "default";
    return `${SETTINGS_STORAGE_KEY_PREFIX}${id}`;
  }

  private loadLocalCache(userId?: string | null): AppSettings {
    try {
      const stored = localStorage.getItem(this.getCacheKey(userId));
      if (stored) {
        const parsed = JSON.parse(stored);
        const cards = parsed.transactionCardTypes?.length
          ? parsed.transactionCardTypes.map((c: CardTypeOption) => ({
              ...c,
              withdrawRate: c.withdrawRate !== undefined ? c.withdrawRate : 0,
              repayRate: c.repayRate !== undefined ? c.repayRate : 0,
            }))
          : DEFAULT_CARD_TYPES;

        const rawRecipients = parsed.transactionRecipients?.length ? parsed.transactionRecipients : DEFAULT_RECIPIENTS;
        const recipients = rawRecipients.map((r: RecipientOption) =>
          r.name.toLowerCase() === "bharat" ? { ...r, id: "bharath", name: "Bharath" } : r
        );

        return {
          expenseCategories: parsed.expenseCategories?.length ? parsed.expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
          transactionCardTypes: cards,
          transactionRecipients: recipients,
          transactionTypes: parsed.transactionTypes?.length ? parsed.transactionTypes : DEFAULT_TRANSACTION_TYPES,
          banks: parsed.banks?.length ? parsed.banks : DEFAULT_BANKS,
          sites: parsed.sites?.length ? parsed.sites : DEFAULT_SITES,
          theme: parsed.theme || "ocean",
          hiddenPortals: Array.isArray(parsed.hiddenPortals) ? parsed.hiddenPortals : [],
          whatsapp: parsed.whatsapp || { enabled: true },
          dropdownOrdering: (parsed.dropdownOrdering && typeof parsed.dropdownOrdering === "object") ? parsed.dropdownOrdering : {},
        };
      }
    } catch (e) {
      console.warn("Failed to load custom settings cache", e);
    }

    return this.getDefaultSettings();
  }

  private subscribeToRealtime(userId: string): void {
    this.unsubscribeFromRealtime();

    this.realtimeChannel = supabase
      .channel(`profile-settings-sync-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          const newSettings = payload.new?.settings;
          if (newSettings && typeof newSettings === "object") {
            const newTheme = newSettings.theme || this.settings.theme || "ocean";
            const rawRecipients = newSettings.transactionRecipients || this.settings.transactionRecipients;
            const recipients = rawRecipients.map((r: RecipientOption) =>
              r.name.toLowerCase() === "bharat" ? { ...r, id: "bharath", name: "Bharath" } : r
            );

            this.settings = {
              expenseCategories: newSettings.expenseCategories || this.settings.expenseCategories,
              transactionCardTypes: newSettings.transactionCardTypes || this.settings.transactionCardTypes,
              transactionRecipients: recipients,
              transactionTypes: newSettings.transactionTypes || this.settings.transactionTypes,
              banks: newSettings.banks || this.settings.banks || DEFAULT_BANKS,
              sites: newSettings.sites || this.settings.sites || DEFAULT_SITES,
              theme: newTheme,
              hiddenPortals: Array.isArray(newSettings.hiddenPortals)
                ? newSettings.hiddenPortals
                : this.settings.hiddenPortals || [],
              whatsapp: newSettings.whatsapp || this.settings.whatsapp || { enabled: true },
              dropdownOrdering: newSettings.dropdownOrdering || this.settings.dropdownOrdering || {},
            };
            themeService.setAccent(newTheme);
            this.saveLocalCache();
            this.notifyListeners();
          }
        }
      )
      .subscribe();
  }

  private unsubscribeFromRealtime(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  private async initDatabaseSync() {
    // Check for user session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      this.currentUserId = session.user.id;
      this.settings = this.loadLocalCache(session.user.id);
      themeService.setAccent(this.settings.theme || "ocean");
      this.subscribeToRealtime(session.user.id);
      await this.loadFromDatabase(session.user.id);
    }

    // Subscribe to auth state changes
    supabase.auth.onAuthStateChange(async (_, newSession) => {
      const userId = newSession?.user?.id;
      if (userId && userId !== this.currentUserId) {
        this.currentUserId = userId;
        this.settings = this.loadLocalCache(userId);
        themeService.setAccent(this.settings.theme || "ocean");
        this.subscribeToRealtime(userId);
        await this.loadFromDatabase(userId);
      } else if (!userId) {
        this.unsubscribeFromRealtime();
        this.currentUserId = null;
        this.settings = this.getDefaultSettings();
        themeService.setAccent("ocean");
        this.notifyListeners();
      }
    });
  }

  public async loadFromDatabase(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("settings")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not fetch settings from profiles:", error.message);
        return;
      }

      if (data && data.settings && typeof data.settings === "object") {
        const parsed = data.settings as any;
        const currentTheme = parsed.theme || this.settings.theme || "ocean";
        const rawRecipients = parsed.transactionRecipients || [...DEFAULT_RECIPIENTS];
        const recipients = rawRecipients.map((r: RecipientOption) =>
          r.name.toLowerCase() === "bharat" ? { ...r, id: "bharath", name: "Bharath" } : r
        );

        this.settings = {
          expenseCategories: parsed.expenseCategories || [...DEFAULT_EXPENSE_CATEGORIES],
          transactionCardTypes: parsed.transactionCardTypes || [...DEFAULT_CARD_TYPES],
          transactionRecipients: recipients,
          transactionTypes: parsed.transactionTypes || [...DEFAULT_TRANSACTION_TYPES],
          banks: parsed.banks || [...DEFAULT_BANKS],
          sites: parsed.sites || [...DEFAULT_SITES],
          theme: currentTheme,
          hiddenPortals: Array.isArray(parsed.hiddenPortals) ? parsed.hiddenPortals : [],
          whatsapp: parsed.whatsapp || { enabled: true },
          dropdownOrdering: (parsed.dropdownOrdering && typeof parsed.dropdownOrdering === "object") ? parsed.dropdownOrdering : {},
        };
        themeService.setAccent(currentTheme);
        this.saveLocalCache();
        this.notifyListeners();

        // Auto-bootstrap ordering frequency stats from existing transactions if empty
        if (!this.hasAnySelectionCounts()) {
          this.bootstrapFromHistory(userId);
        }
      } else {
        // First time user: save clean default settings to database
        this.settings = this.getDefaultSettings();
        await this.persistToDatabase(userId);
        this.saveLocalCache();
        this.notifyListeners();
      }
    } catch (err) {
      console.warn("Failed to load settings from database:", err);
    }
  }

  private saveLocalCache(): void {
    try {
      localStorage.setItem(this.getCacheKey(), JSON.stringify(this.settings));
      this.notifyListeners();
    } catch (e) {
      console.error("Failed to save settings cache", e);
    }
  }

  private async persistToDatabase(targetUserId?: string): Promise<void> {
    const userId = targetUserId || this.currentUserId;
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          settings: this.settings as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.warn("Supabase profiles.settings update error:", error.message);
      }
    } catch (err) {
      console.warn("Failed to persist settings to profiles:", err);
    }
  }

  private saveAndPersist(): void {
    this.saveLocalCache();
    this.persistToDatabase();
  }

  private notifyListeners(): void {
    listeners.forEach((listener) => {
      try {
        listener(this.getSettings());
      } catch (err) {
        console.error("Error in settings listener:", err);
      }
    });
  }

  public subscribe(listener: SettingsListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  public getSettings(ordered: boolean = true): AppSettings {
    const sort = <T extends { id?: string; name?: string; label?: string }>(key: string, items: T[]) =>
      ordered ? this.sortOptions(key, items) : [...items];

    return {
      expenseCategories: sort("expenseCategories", this.settings.expenseCategories),
      transactionCardTypes: sort("cardTypes", this.settings.transactionCardTypes),
      transactionRecipients: sort("recipients", this.settings.transactionRecipients),
      transactionTypes: sort("transactionTypes", this.settings.transactionTypes),
      banks: sort("banks", this.settings.banks || DEFAULT_BANKS),
      sites: sort("sites", this.settings.sites || DEFAULT_SITES),
      theme: this.settings.theme || "ocean",
      hiddenPortals: [...(this.settings.hiddenPortals || [])],
      whatsapp: { ...(this.settings.whatsapp || { enabled: true }) },
      dropdownOrdering: { ...(this.settings.dropdownOrdering || {}) },
    };
  }

  private persistDebounceTimer: any = null;

  private debouncedPersistToDatabase(): void {
    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
    }
    this.persistDebounceTimer = setTimeout(() => {
      this.persistToDatabase();
      this.persistDebounceTimer = null;
    }, 1500);
  }

  // --- Sorting & Frequency-Based Ordering Engine ---
  public sortOptions<T extends { id?: string; name?: string; label?: string }>(
    dropdownKey: string,
    items: T[]
  ): T[] {
    if (!items || items.length <= 1) return items ? [...items] : [];
    const config = this.settings.dropdownOrdering?.[dropdownKey];
    if (!config) return [...items];

    if (config.mode === "automatic") {
      const counts = config.selectionCounts || {};
      const timestamps = config.lastSelectedAt || {};

      // Map items to their initial index for deterministic tertiary tie-breaking
      const initialIndexMap = new Map<any, number>();
      items.forEach((item, idx) => {
        initialIndexMap.set(item.id ?? item.name ?? item, idx);
      });

      const getItemCount = (item: any) => {
        let maxCount = 0;
        if (item.id && counts[item.id] !== undefined) {
          maxCount = Math.max(maxCount, counts[item.id]);
        }
        if (item.name && counts[item.name] !== undefined) {
          maxCount = Math.max(maxCount, counts[item.name]);
        }
        const lowerName = item.name?.toLowerCase();
        const lowerId = item.id?.toLowerCase();
        for (const [k, v] of Object.entries(counts)) {
          const lk = k.toLowerCase();
          if (lk === lowerName || lk === lowerId) {
            maxCount = Math.max(maxCount, v);
          }
        }
        return maxCount;
      };

      const getItemTime = (item: any) => {
        let maxTime = 0;
        if (item.id && timestamps[item.id]) {
          maxTime = Math.max(maxTime, new Date(timestamps[item.id]).getTime());
        }
        if (item.name && timestamps[item.name]) {
          maxTime = Math.max(maxTime, new Date(timestamps[item.name]).getTime());
        }
        const lowerName = item.name?.toLowerCase();
        const lowerId = item.id?.toLowerCase();
        for (const [k, v] of Object.entries(timestamps)) {
          const lk = k.toLowerCase();
          if (lk === lowerName || lk === lowerId) {
            maxTime = Math.max(maxTime, new Date(v).getTime());
          }
        }
        return maxTime;
      };

      return [...items].sort((a, b) => {
        const countA = getItemCount(a);
        const countB = getItemCount(b);

        // 1. Primary: Frequency of selection (highest first)
        if (countB !== countA) {
          return countB - countA;
        }

        // 2. Secondary: Recency (most recently used first among equals)
        const timeA = getItemTime(a);
        const timeB = getItemTime(b);
        if (timeB !== timeA) {
          return timeB - timeA;
        }

        // 3. Tertiary: Stable initial list index (no random reshuffling)
        const idxA = initialIndexMap.get(a.id ?? a.name ?? a) ?? 9999;
        const idxB = initialIndexMap.get(b.id ?? b.name ?? b) ?? 9999;
        return idxA - idxB;
      });
    }

    // Manual drag-and-drop mode
    if (config.manualOrder && config.manualOrder.length > 0) {
      const orderMap = new Map<string, number>();
      config.manualOrder.forEach((val, idx) => {
        orderMap.set(val, idx);
      });

      return [...items].sort((a, b) => {
        const keyA = a.id ?? a.name ?? "";
        const keyB = b.id ?? b.name ?? "";
        const idxA = orderMap.has(keyA) ? orderMap.get(keyA)! : (a.name && orderMap.has(a.name) ? orderMap.get(a.name)! : 9999);
        const idxB = orderMap.has(keyB) ? orderMap.get(keyB)! : (b.name && orderMap.has(b.name) ? orderMap.get(b.name)! : 9999);
        return idxA - idxB;
      });
    }

    return [...items];
  }

  public getDropdownOrderingConfig(dropdownKey: string): DropdownOrderingConfig {
    const config = this.settings.dropdownOrdering?.[dropdownKey];
    return {
      mode: config?.mode || "manual",
      manualOrder: config?.manualOrder ? [...config.manualOrder] : [],
      selectionCounts: { ...(config?.selectionCounts || {}) },
      lastSelectedAt: { ...(config?.lastSelectedAt || {}) },
    };
  }

  public setDropdownOrderingConfig(
    dropdownKey: string,
    updates: Partial<DropdownOrderingConfig>
  ): void {
    const current = this.getDropdownOrderingConfig(dropdownKey);
    const updated: DropdownOrderingConfig = {
      ...current,
      ...updates,
      mode: updates.mode || current.mode || "manual",
      manualOrder: updates.manualOrder !== undefined ? updates.manualOrder : current.manualOrder,
      selectionCounts: updates.selectionCounts !== undefined ? updates.selectionCounts : current.selectionCounts,
      lastSelectedAt: updates.lastSelectedAt !== undefined ? updates.lastSelectedAt : current.lastSelectedAt,
    };

    this.settings.dropdownOrdering = {
      ...(this.settings.dropdownOrdering || {}),
      [dropdownKey]: updated,
    };

    this.saveAndPersist();
  }

  public recordDropdownSelection(dropdownKey: string, itemKey: string): void {
    if (!dropdownKey || !itemKey || itemKey === "none") return;
    const currentSettings = this.settings.dropdownOrdering || {};
    const config = currentSettings[dropdownKey] || {
      mode: "manual",
      manualOrder: [],
      selectionCounts: {},
      lastSelectedAt: {},
    };

    const counts = { ...(config.selectionCounts || {}) };
    const timestamps = { ...(config.lastSelectedAt || {}) };

    const nowTime = Math.max(Date.now(), (this.lastSelectionTimestamp || 0) + 1);
    this.lastSelectionTimestamp = nowTime;
    const nowIso = new Date(nowTime).toISOString();

    // Increment itemKey count
    counts[itemKey] = (counts[itemKey] || 0) + 1;
    timestamps[itemKey] = nowIso;

    // Check if itemKey matches an item in lookupList, and sync its alternate key (id <-> name)
    const lookupList =
      dropdownKey === "banks"
        ? this.settings.banks
        : dropdownKey === "sites"
        ? this.settings.sites
        : dropdownKey === "recipients"
        ? this.settings.transactionRecipients
        : dropdownKey === "cardTypes"
        ? this.settings.transactionCardTypes
        : dropdownKey === "transactionTypes"
        ? this.settings.transactionTypes
        : dropdownKey === "expenseCategories"
        ? this.settings.expenseCategories
        : undefined;

    if (lookupList) {
      const matched = lookupList.find(
        (it: any) =>
          it.id === itemKey ||
          (it.name && it.name.toLowerCase() === itemKey.toLowerCase()) ||
          (it.label && it.label.toLowerCase() === itemKey.toLowerCase())
      );
      if (matched) {
        const altKey = matched.id === itemKey ? matched.name : matched.id;
        if (altKey && altKey !== itemKey) {
          counts[altKey] = (counts[altKey] || 0) + 1;
          timestamps[altKey] = nowIso;
        }
      }
    }

    const updatedConfig: DropdownOrderingConfig = {
      ...config,
      selectionCounts: counts,
      lastSelectedAt: timestamps,
    };

    this.settings.dropdownOrdering = {
      ...currentSettings,
      [dropdownKey]: updatedConfig,
    };

    this.saveLocalCache();
    this.debouncedPersistToDatabase();

    // If automatic mode is active, notify subscribers so open views re-rank immediately
    if (config.mode === "automatic") {
      this.notifyListeners();
    }
  }

  public resetDropdownOrder(dropdownKey: string): void {
    const current = this.getDropdownOrderingConfig(dropdownKey);
    this.setDropdownOrderingConfig(dropdownKey, {
      ...current,
      manualOrder: [],
      mode: "manual",
    });
  }

  public resetDropdownCounts(dropdownKey: string): void {
    const current = this.getDropdownOrderingConfig(dropdownKey);
    this.setDropdownOrderingConfig(dropdownKey, {
      ...current,
      selectionCounts: {},
      lastSelectedAt: {},
    });
  }

  public hasAnySelectionCounts(): boolean {
    const d = this.settings.dropdownOrdering;
    if (!d) return false;
    for (const key of Object.keys(d)) {
      const counts = d[key]?.selectionCounts;
      if (counts && Object.values(counts).some((v) => v > 0)) {
        return true;
      }
    }
    return false;
  }

  public async bootstrapFromHistory(targetUserId?: string): Promise<boolean> {
    const userId = targetUserId || this.currentUserId;
    try {
      // 1. Fetch transactions
      const { data: txList, error: txError } = await supabase
        .from("transactions")
        .select(`
          card_type,
          transaction_type,
          bank_name,
          site_name,
          transaction_date,
          portal_id,
          portals ( name )
        `)
        .order("transaction_date", { ascending: false });

      if (txError) {
        console.warn("Could not fetch historical transactions for dropdown ordering stats:", txError);
        return false;
      }

      // 2. Fetch expenses
      const { data: expList, error: expError } = await supabase
        .from("expenses")
        .select("category, expense_date")
        .order("expense_date", { ascending: false });

      if (expError) {
        console.warn("Could not fetch historical expenses for dropdown ordering stats:", expError);
      }

      const currentOrdering = { ...(this.settings.dropdownOrdering || {}) };

      const aggregateField = (
        key: DropdownOrderingKey,
        records: Array<{ value?: string | null; date?: string | null }>
      ) => {
        const config = currentOrdering[key] || {
          mode: "manual",
          manualOrder: [],
          selectionCounts: {},
          lastSelectedAt: {},
        };
        const counts: Record<string, number> = {};
        const timestamps: Record<string, string> = {};

        for (const rec of records) {
          const val = rec.value?.trim();
          if (!val || val === "none") continue;

          counts[val] = (counts[val] || 0) + 1;

          if (rec.date) {
            const existingTime = timestamps[val] ? new Date(timestamps[val]).getTime() : 0;
            const newTime = new Date(rec.date).getTime();
            if (newTime > existingTime) {
              timestamps[val] = rec.date;
            }
          }
        }

        currentOrdering[key] = {
          ...config,
          selectionCounts: counts,
          lastSelectedAt: timestamps,
        };
      };

      aggregateField(
        "cardTypes",
        (txList || []).map((t) => ({ value: t.card_type, date: t.transaction_date }))
      );

      aggregateField(
        "recipients",
        (txList || []).map((t) => ({
          value: (t.portals as any)?.name || t.portal_id,
          date: t.transaction_date,
        }))
      );

      aggregateField(
        "banks",
        (txList || []).map((t) => ({ value: t.bank_name, date: t.transaction_date }))
      );

      aggregateField(
        "transactionTypes",
        (txList || []).map((t) => ({ value: t.transaction_type, date: t.transaction_date }))
      );

      aggregateField(
        "sites",
        (txList || []).map((t) => ({ value: t.site_name, date: t.transaction_date }))
      );

      aggregateField(
        "expenseCategories",
        (expList || []).map((e) => ({ value: e.category, date: e.expense_date }))
      );

      this.settings.dropdownOrdering = currentOrdering;
      this.saveLocalCache();
      if (userId) {
        await this.persistToDatabase(userId);
      }
      this.notifyListeners();
      return true;
    } catch (e) {
      console.error("Failed to bootstrap dropdown ordering from history:", e);
      return false;
    }
  }

  // --- Theme ---
  public getTheme(): string {
    return this.settings.theme || "ocean";
  }

  public setTheme(themeId: string): void {
    this.settings.theme = themeId;
    themeService.setAccent(themeId);
    this.saveAndPersist();
  }

  // --- Expense Categories ---
  public getExpenseCategories(ordered: boolean = true): ExpenseCategoryOption[] {
    const list = this.settings.expenseCategories;
    return ordered ? this.sortOptions("expenseCategories", list) : [...list];
  }

  public addExpenseCategory(category: Omit<ExpenseCategoryOption, "id" | "isDefault">): ExpenseCategoryOption {
    const id = category.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now();
    const newCategory: ExpenseCategoryOption = {
      ...category,
      id,
      isDefault: false,
    };
    this.settings.expenseCategories = [...this.settings.expenseCategories, newCategory];
    this.saveAndPersist();
    return newCategory;
  }

  public updateExpenseCategory(id: string, updates: Partial<Omit<ExpenseCategoryOption, "id" | "isDefault">>): void {
    this.settings.expenseCategories = this.settings.expenseCategories.map((cat) =>
      cat.id === id ? { ...cat, ...updates } : cat
    );
    this.saveAndPersist();
  }

  public deleteExpenseCategory(id: string): void {
    this.settings.expenseCategories = this.settings.expenseCategories.filter((cat) => cat.id !== id);
    this.saveAndPersist();
  }

  // --- Card Types ---
  public getCardTypes(ordered: boolean = true): CardTypeOption[] {
    const list = this.settings.transactionCardTypes;
    return ordered ? this.sortOptions("cardTypes", list) : [...list];
  }

  public addCardType(card: { name: string; withdrawRate?: number; repayRate?: number } | string): CardTypeOption {
    const cardName = typeof card === "string" ? card.trim() : card.name.trim();
    const wRate = typeof card === "object" && card.withdrawRate !== undefined ? card.withdrawRate : 0;
    const rRate = typeof card === "object" && card.repayRate !== undefined ? card.repayRate : 0;
    const id = cardName.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now();
    const newCard: CardTypeOption = {
      id,
      name: cardName,
      withdrawRate: wRate,
      repayRate: rRate,
      isDefault: false,
    };
    this.settings.transactionCardTypes = [...this.settings.transactionCardTypes, newCard];
    this.saveAndPersist();
    return newCard;
  }

  public updateCardType(id: string, updates: Partial<{ name: string; withdrawRate: number; repayRate: number }>): void {
    this.settings.transactionCardTypes = this.settings.transactionCardTypes.map((card) =>
      card.id === id
        ? {
            ...card,
            ...updates,
            name: updates.name ? updates.name.trim() : card.name,
          }
        : card
    );
    this.saveAndPersist();
  }

  public deleteCardType(id: string): void {
    this.settings.transactionCardTypes = this.settings.transactionCardTypes.filter((c) => c.id !== id);
    this.saveAndPersist();
  }

  // --- Bank Credit Cards ---
  public getBanks(ordered: boolean = true): BankOption[] {
    const list = this.settings.banks || DEFAULT_BANKS;
    return ordered ? this.sortOptions("banks", list) : [...list];
  }

  public addBank(name: string): BankOption {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now();
    const newBank: BankOption = { id, name: name.trim(), isDefault: false };
    this.settings.banks = [...(this.settings.banks || DEFAULT_BANKS), newBank];
    this.saveAndPersist();
    return newBank;
  }

  public updateBank(id: string, name: string): void {
    const current = this.settings.banks || DEFAULT_BANKS;
    this.settings.banks = current.map((b) =>
      b.id === id ? { ...b, name: name.trim() } : b
    );
    this.saveAndPersist();
  }

  public deleteBank(id: string): void {
    const current = this.settings.banks || DEFAULT_BANKS;
    this.settings.banks = current.filter((b) => b.id !== id);
    this.saveAndPersist();
  }

  public resetBanks(): void {
    this.settings.banks = [...DEFAULT_BANKS];
    this.saveAndPersist();
  }

  // --- Sites Dropdown Options ---
  public getSites(ordered: boolean = true): SiteOption[] {
    const list = this.settings.sites || DEFAULT_SITES;
    return ordered ? this.sortOptions("sites", list) : [...list];
  }

  public addSite(name: string): SiteOption {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now();
    const newSite: SiteOption = { id, name: name.trim(), isDefault: false };
    const current = this.settings.sites || DEFAULT_SITES;
    this.settings.sites = [...current, newSite];
    this.saveAndPersist();
    return newSite;
  }

  public updateSite(id: string, name: string): void {
    const current = this.settings.sites || DEFAULT_SITES;
    this.settings.sites = current.map((s) =>
      s.id === id ? { ...s, name: name.trim() } : s
    );
    this.saveAndPersist();
  }

  public deleteSite(id: string): void {
    const current = this.settings.sites || DEFAULT_SITES;
    this.settings.sites = current.filter((s) => s.id !== id);
    this.saveAndPersist();
  }

  public resetSites(): void {
    this.settings.sites = [...DEFAULT_SITES];
    this.saveAndPersist();
  }

  // --- Transaction Recipients ---
  public getRecipients(ordered: boolean = true): RecipientOption[] {
    const list = this.settings.transactionRecipients;
    return ordered ? this.sortOptions("recipients", list) : [...list];
  }

  public addRecipient(name: string): RecipientOption {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now();
    const newRecipient: RecipientOption = { id, name: name.trim(), isDefault: false };
    this.settings.transactionRecipients = [...this.settings.transactionRecipients, newRecipient];
    this.saveAndPersist();
    return newRecipient;
  }

  public updateRecipient(id: string, name: string): void {
    this.settings.transactionRecipients = this.settings.transactionRecipients.map((r) =>
      r.id === id ? { ...r, name: name.trim() } : r
    );
    this.saveAndPersist();
  }

  public deleteRecipient(id: string): void {
    this.settings.transactionRecipients = this.settings.transactionRecipients.filter((r) => r.id !== id);
    this.saveAndPersist();
  }

  // --- Transaction Types ---
  public getTransactionTypes(ordered: boolean = true): TransactionTypeOption[] {
    const list = this.settings.transactionTypes;
    return ordered ? this.sortOptions("transactionTypes", list) : [...list];
  }

  public addTransactionType(name: string, label: string): TransactionTypeOption {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now();
    const newType: TransactionTypeOption = { id, name: name.trim(), label: label.trim(), isDefault: false };
    this.settings.transactionTypes = [...this.settings.transactionTypes, newType];
    this.saveAndPersist();
    return newType;
  }

  public deleteTransactionType(id: string): void {
    this.settings.transactionTypes = this.settings.transactionTypes.filter((t) => t.id !== id);
    this.saveAndPersist();
  }

  // --- Portal Comparison Chart Visibility ---
  public getHiddenPortals(): string[] {
    return [...(this.settings.hiddenPortals || [])];
  }

  public isPortalHidden(portalIdentifier: string): boolean {
    if (!portalIdentifier) return false;
    const hidden = this.settings.hiddenPortals || [];
    const lower = portalIdentifier.toLowerCase();
    return hidden.some((h) => h.toLowerCase() === lower);
  }

  public setPortalHidden(portalIdentifier: string, hidden: boolean): void {
    if (!portalIdentifier) return;
    const current = this.settings.hiddenPortals || [];
    const lower = portalIdentifier.toLowerCase();
    let updated: string[];

    if (hidden) {
      if (!current.some((h) => h.toLowerCase() === lower)) {
        updated = [...current, portalIdentifier];
      } else {
        return;
      }
    } else {
      updated = current.filter((h) => h.toLowerCase() !== lower);
    }

    this.settings.hiddenPortals = updated;
    this.saveAndPersist();
  }

  public setAllPortalsVisibility(portalIdentifiers: string[], visible: boolean): void {
    if (visible) {
      this.settings.hiddenPortals = [];
    } else {
      this.settings.hiddenPortals = [...new Set(portalIdentifiers)];
    }
    this.saveAndPersist();
  }

  // --- WhatsApp Settings ---
  public getWhatsAppSettings(): WhatsAppSettings {
    return { ...(this.settings.whatsapp || { enabled: true }) };
  }

  public isWhatsAppEnabled(): boolean {
    return this.settings.whatsapp?.enabled !== false;
  }

  public setWhatsAppEnabled(enabled: boolean): void {
    this.settings.whatsapp = {
      ...(this.settings.whatsapp || { enabled: true }),
      enabled,
    };
    this.saveAndPersist();
  }

  public setWhatsAppWelcomeMessage(message: string): void {
    this.settings.whatsapp = {
      ...(this.settings.whatsapp || { enabled: true }),
      welcomeMessage: message,
    };
    this.saveAndPersist();
  }

  // --- Reset to Defaults ---
  public resetToDefaults(): void {
    this.settings = {
      expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
      transactionCardTypes: [...DEFAULT_CARD_TYPES],
      transactionRecipients: [...DEFAULT_RECIPIENTS],
      transactionTypes: [...DEFAULT_TRANSACTION_TYPES],
      banks: [...DEFAULT_BANKS],
      sites: [...DEFAULT_SITES],
      theme: "ocean",
      hiddenPortals: [],
      whatsapp: { enabled: true },
      dropdownOrdering: {},
    };
    themeService.setAccent("ocean");
    this.saveAndPersist();
  }

  public exportSettingsJson(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  public importSettingsJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === "object") {
        this.settings = {
          expenseCategories: parsed.expenseCategories || [...DEFAULT_EXPENSE_CATEGORIES],
          transactionCardTypes: parsed.transactionCardTypes || [...DEFAULT_CARD_TYPES],
          transactionRecipients: parsed.transactionRecipients || [...DEFAULT_RECIPIENTS],
          transactionTypes: parsed.transactionTypes || [...DEFAULT_TRANSACTION_TYPES],
          banks: parsed.banks || [...DEFAULT_BANKS],
          sites: parsed.sites || [...DEFAULT_SITES],
          theme: parsed.theme || this.settings.theme || "ocean",
          hiddenPortals: Array.isArray(parsed.hiddenPortals) ? parsed.hiddenPortals : [],
          whatsapp: parsed.whatsapp || this.settings.whatsapp || { enabled: true },
          dropdownOrdering: (parsed.dropdownOrdering && typeof parsed.dropdownOrdering === "object") ? parsed.dropdownOrdering : {},
        };
        if (this.settings.theme) {
          themeService.setAccent(this.settings.theme);
        }
        this.saveAndPersist();
        return true;
      }
    } catch (e) {
      console.error("Failed to import settings JSON", e);
    }
    return false;
  }
}

export const settingsService = new SettingsService();
