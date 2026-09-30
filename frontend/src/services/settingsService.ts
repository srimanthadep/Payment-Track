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
  withdrawRate: number;
  repayRate: number;
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

export interface WhatsAppSettings {
  enabled: boolean;
  welcomeMessage?: string;
}

export interface AppSettings {
  expenseCategories: ExpenseCategoryOption[];
  transactionCardTypes: CardTypeOption[];
  transactionRecipients: RecipientOption[];
  transactionTypes: TransactionTypeOption[];
  banks: BankOption[];
  theme: string;
  hiddenPortals?: string[];
  whatsapp?: WhatsAppSettings;
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
  { id: "bharat", name: "Bharat", isDefault: true },
  { id: "chummi", name: "Chummi", isDefault: true },
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

const SETTINGS_STORAGE_KEY_PREFIX = "payment_track_custom_settings_u_";

type SettingsListener = (settings: AppSettings) => void;
const listeners: Set<SettingsListener> = new Set();

class SettingsService {
  private settings: AppSettings;
  private currentUserId: string | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

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
      theme: "ocean",
      hiddenPortals: [],
      whatsapp: { enabled: true },
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

        return {
          expenseCategories: parsed.expenseCategories?.length ? parsed.expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
          transactionCardTypes: cards,
          transactionRecipients: parsed.transactionRecipients?.length ? parsed.transactionRecipients : DEFAULT_RECIPIENTS,
          transactionTypes: parsed.transactionTypes?.length ? parsed.transactionTypes : DEFAULT_TRANSACTION_TYPES,
          banks: parsed.banks?.length ? parsed.banks : DEFAULT_BANKS,
          theme: parsed.theme || "ocean",
          hiddenPortals: Array.isArray(parsed.hiddenPortals) ? parsed.hiddenPortals : [],
          whatsapp: parsed.whatsapp || { enabled: true },
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
            this.settings = {
              expenseCategories: newSettings.expenseCategories || this.settings.expenseCategories,
              transactionCardTypes: newSettings.transactionCardTypes || this.settings.transactionCardTypes,
              transactionRecipients: newSettings.transactionRecipients || this.settings.transactionRecipients,
              transactionTypes: newSettings.transactionTypes || this.settings.transactionTypes,
              banks: newSettings.banks || this.settings.banks || DEFAULT_BANKS,
              theme: newTheme,
              hiddenPortals: Array.isArray(newSettings.hiddenPortals)
                ? newSettings.hiddenPortals
                : this.settings.hiddenPortals || [],
              whatsapp: newSettings.whatsapp || this.settings.whatsapp || { enabled: true },
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
        this.settings = {
          expenseCategories: parsed.expenseCategories || [...DEFAULT_EXPENSE_CATEGORIES],
          transactionCardTypes: parsed.transactionCardTypes || [...DEFAULT_CARD_TYPES],
          transactionRecipients: parsed.transactionRecipients || [...DEFAULT_RECIPIENTS],
          transactionTypes: parsed.transactionTypes || [...DEFAULT_TRANSACTION_TYPES],
          banks: parsed.banks || [...DEFAULT_BANKS],
          theme: currentTheme,
          hiddenPortals: Array.isArray(parsed.hiddenPortals) ? parsed.hiddenPortals : [],
          whatsapp: parsed.whatsapp || { enabled: true },
        };
        themeService.setAccent(currentTheme);
        this.saveLocalCache();
        this.notifyListeners();
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

  public getSettings(): AppSettings {
    return {
      expenseCategories: [...this.settings.expenseCategories],
      transactionCardTypes: [...this.settings.transactionCardTypes],
      transactionRecipients: [...this.settings.transactionRecipients],
      transactionTypes: [...this.settings.transactionTypes],
      banks: [...(this.settings.banks || DEFAULT_BANKS)],
      theme: this.settings.theme || "ocean",
      hiddenPortals: [...(this.settings.hiddenPortals || [])],
      whatsapp: { ...(this.settings.whatsapp || { enabled: true }) },
    };
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
  public getExpenseCategories(): ExpenseCategoryOption[] {
    return this.settings.expenseCategories;
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
  public getCardTypes(): CardTypeOption[] {
    return this.settings.transactionCardTypes;
  }

  public addCardType(card: { name: string; withdrawRate: number; repayRate: number }): CardTypeOption {
    const id = card.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now();
    const newCard: CardTypeOption = {
      id,
      name: card.name.trim(),
      withdrawRate: card.withdrawRate,
      repayRate: card.repayRate,
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
  public getBanks(): BankOption[] {
    return this.settings.banks || [...DEFAULT_BANKS];
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

  // --- Transaction Recipients ---
  public getRecipients(): RecipientOption[] {
    return this.settings.transactionRecipients;
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
  public getTransactionTypes(): TransactionTypeOption[] {
    return this.settings.transactionTypes;
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
      theme: "ocean",
      hiddenPortals: [],
      whatsapp: { enabled: true },
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
          theme: parsed.theme || this.settings.theme || "ocean",
          hiddenPortals: Array.isArray(parsed.hiddenPortals) ? parsed.hiddenPortals : [],
          whatsapp: parsed.whatsapp || this.settings.whatsapp || { enabled: true },
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
