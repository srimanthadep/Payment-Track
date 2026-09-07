// Central reactive settings store for dropdown options across Expenses and Transactions with Supabase Database persistence
import { supabase } from "@/integrations/supabase/client";

export interface ExpenseCategoryOption {
  id: string;
  name: string;
  color: string; // Tailwind color or hex
  description?: string;
  isDefault?: boolean;
}

export interface PaymentMethodOption {
  id: string;
  name: string;
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

export interface AppSettings {
  expenseCategories: ExpenseCategoryOption[];
  expensePaymentMethods: PaymentMethodOption[];
  expensePayees: string[];
  transactionCardTypes: CardTypeOption[];
  transactionRecipients: RecipientOption[];
  transactionTypes: TransactionTypeOption[];
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

export const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "cash", name: "Cash", isDefault: true },
  { id: "upi", name: "UPI / GPay / PhonePe", isDefault: true },
  { id: "bank_transfer", name: "Bank Transfer / NEFT / IMPS", isDefault: true },
  { id: "card", name: "Credit / Debit Card", isDefault: true },
  { id: "cheque", name: "Cheque", isDefault: true },
];

export const DEFAULT_PAYEES: string[] = [
  "Upender",
  "Chummi",
  "Electricity Board (TSSPDCL/TG)",
  "Shop Owner",
  "Petrol Pump",
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

const SETTINGS_STORAGE_KEY_PREFIX = "payment_track_custom_settings_u_";

type SettingsListener = (settings: AppSettings) => void;
const listeners: Set<SettingsListener> = new Set();

class SettingsService {
  private settings: AppSettings;
  private currentUserId: string | null = null;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.initDatabaseSync();
  }

  private getDefaultSettings(): AppSettings {
    return {
      expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
      expensePaymentMethods: [...DEFAULT_PAYMENT_METHODS],
      expensePayees: [...DEFAULT_PAYEES],
      transactionCardTypes: [...DEFAULT_CARD_TYPES],
      transactionRecipients: [...DEFAULT_RECIPIENTS],
      transactionTypes: [...DEFAULT_TRANSACTION_TYPES],
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
          expensePaymentMethods: parsed.expensePaymentMethods?.length ? parsed.expensePaymentMethods : DEFAULT_PAYMENT_METHODS,
          expensePayees: parsed.expensePayees?.length ? parsed.expensePayees : DEFAULT_PAYEES,
          transactionCardTypes: cards,
          transactionRecipients: parsed.transactionRecipients?.length ? parsed.transactionRecipients : DEFAULT_RECIPIENTS,
          transactionTypes: parsed.transactionTypes?.length ? parsed.transactionTypes : DEFAULT_TRANSACTION_TYPES,
        };
      }
    } catch (e) {
      console.warn("Failed to load custom settings cache", e);
    }

    return this.getDefaultSettings();
  }

  private async initDatabaseSync() {
    // Check for user session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      this.currentUserId = session.user.id;
      this.settings = this.loadLocalCache(session.user.id);
      await this.loadFromDatabase(session.user.id);
    }

    // Subscribe to auth state changes
    supabase.auth.onAuthStateChange(async (_, newSession) => {
      const userId = newSession?.user?.id;
      if (userId && userId !== this.currentUserId) {
        this.currentUserId = userId;
        this.settings = this.loadLocalCache(userId);
        await this.loadFromDatabase(userId);
      } else if (!userId) {
        this.currentUserId = null;
        this.settings = this.getDefaultSettings();
        this.notifyListeners();
      }
    });
  }

  public async loadFromDatabase(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("settings")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not fetch app_settings from Supabase:", error.message);
        return;
      }

      if (data && data.settings && typeof data.settings === "object") {
        const parsed = data.settings as any;
        this.settings = {
          expenseCategories: parsed.expenseCategories || [...DEFAULT_EXPENSE_CATEGORIES],
          expensePaymentMethods: parsed.expensePaymentMethods || [...DEFAULT_PAYMENT_METHODS],
          expensePayees: parsed.expensePayees || [...DEFAULT_PAYEES],
          transactionCardTypes: parsed.transactionCardTypes || [...DEFAULT_CARD_TYPES],
          transactionRecipients: parsed.transactionRecipients || [...DEFAULT_RECIPIENTS],
          transactionTypes: parsed.transactionTypes || [...DEFAULT_TRANSACTION_TYPES],
        };
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
        .from("app_settings")
        .upsert(
          {
            user_id: userId,
            settings: this.settings as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.warn("Supabase app_settings upsert error:", error.message);
      }
    } catch (err) {
      console.warn("Failed to persist app_settings to Supabase:", err);
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
    return () => {
      listeners.delete(listener);
    };
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  // --- Expense Categories ---
  public getExpenseCategories(): ExpenseCategoryOption[] {
    return this.settings.expenseCategories;
  }

  public addExpenseCategory(category: { name: string; color?: string; description?: string }): ExpenseCategoryOption {
    const id = category.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now();
    const newCategory: ExpenseCategoryOption = {
      id,
      name: category.name.trim(),
      color: category.color || "bg-primary/15 text-primary border-primary/30",
      description: category.description,
      isDefault: false,
    };
    this.settings.expenseCategories = [...this.settings.expenseCategories, newCategory];
    this.saveAndPersist();
    return newCategory;
  }

  public updateExpenseCategory(id: string, updates: Partial<ExpenseCategoryOption>): void {
    this.settings.expenseCategories = this.settings.expenseCategories.map((cat) =>
      cat.id === id ? { ...cat, ...updates } : cat
    );
    this.saveAndPersist();
  }

  public deleteExpenseCategory(id: string): void {
    this.settings.expenseCategories = this.settings.expenseCategories.filter((cat) => cat.id !== id);
    this.saveAndPersist();
  }

  // --- Payment Methods ---
  public getPaymentMethods(): PaymentMethodOption[] {
    return this.settings.expensePaymentMethods;
  }

  public addPaymentMethod(name: string): PaymentMethodOption {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now();
    const newMethod: PaymentMethodOption = { id, name: name.trim(), isDefault: false };
    this.settings.expensePaymentMethods = [...this.settings.expensePaymentMethods, newMethod];
    this.saveAndPersist();
    return newMethod;
  }

  public updatePaymentMethod(id: string, name: string): void {
    this.settings.expensePaymentMethods = this.settings.expensePaymentMethods.map((m) =>
      m.id === id ? { ...m, name: name.trim() } : m
    );
    this.saveAndPersist();
  }

  public deletePaymentMethod(id: string): void {
    this.settings.expensePaymentMethods = this.settings.expensePaymentMethods.filter((m) => m.id !== id);
    this.saveAndPersist();
  }

  // --- Payees / Workers ---
  public getPayees(): string[] {
    return this.settings.expensePayees;
  }

  public addPayee(name: string): void {
    const trimmed = name.trim();
    if (trimmed && !this.settings.expensePayees.includes(trimmed)) {
      this.settings.expensePayees = [...this.settings.expensePayees, trimmed];
      this.saveAndPersist();
    }
  }

  public deletePayee(name: string): void {
    this.settings.expensePayees = this.settings.expensePayees.filter((p) => p !== name);
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

  public updateCardType(id: string, updates: Partial<CardTypeOption>): void {
    this.settings.transactionCardTypes = this.settings.transactionCardTypes.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    this.saveAndPersist();
  }

  public deleteCardType(id: string): void {
    this.settings.transactionCardTypes = this.settings.transactionCardTypes.filter((c) => c.id !== id);
    this.saveAndPersist();
  }

  // --- Transaction Recipients (Sent To) ---
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
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const newType: TransactionTypeOption = { id, name: id, label: label.trim(), isDefault: false };
    this.settings.transactionTypes = [...this.settings.transactionTypes, newType];
    this.saveAndPersist();
    return newType;
  }

  public deleteTransactionType(id: string): void {
    this.settings.transactionTypes = this.settings.transactionTypes.filter((t) => t.id !== id);
    this.saveAndPersist();
  }

  // --- Reset to Defaults ---
  public resetToDefaults(): void {
    this.settings = {
      expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
      expensePaymentMethods: [...DEFAULT_PAYMENT_METHODS],
      expensePayees: [...DEFAULT_PAYEES],
      transactionCardTypes: [...DEFAULT_CARD_TYPES],
      transactionRecipients: [...DEFAULT_RECIPIENTS],
      transactionTypes: [...DEFAULT_TRANSACTION_TYPES],
    };
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
          expensePaymentMethods: parsed.expensePaymentMethods || [...DEFAULT_PAYMENT_METHODS],
          expensePayees: parsed.expensePayees || [...DEFAULT_PAYEES],
          transactionCardTypes: parsed.transactionCardTypes || [...DEFAULT_CARD_TYPES],
          transactionRecipients: parsed.transactionRecipients || [...DEFAULT_RECIPIENTS],
          transactionTypes: parsed.transactionTypes || [...DEFAULT_TRANSACTION_TYPES],
        };
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
