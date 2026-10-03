import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Tag,
  CreditCard,
  User,
  CheckCircle2,
  DollarSign,
  Download,
  Upload,
  ArrowRight,
  Wallet,
  Receipt,
  BrainCircuit,
  Sliders,
  PieChart,
  Eye,
  EyeOff,
  MessageCircle,
} from "lucide-react";
import { AiIcon } from "@/components/icons/AiIcon";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { LearningInsightsCard } from "@/components/settings/LearningInsightsCard";
import {
  settingsService,
  AppSettings,
  ExpenseCategoryOption,
  CardTypeOption,
  RecipientOption,
  TransactionTypeOption,
  BankOption,
  WhatsAppSettings,
} from "@/services/settingsService";
import { whatsappService } from "@/services/whatsappService";
import { ProfileSettings } from "@/components/settings/ProfileSettings";

const COLOR_PRESETS = [
  { name: "Blue", class: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  { name: "Indigo", class: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800" },
  { name: "Amber", class: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  { name: "Yellow", class: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" },
  { name: "Purple", class: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
  { name: "Emerald", class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  { name: "Rose", class: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
  { name: "Cyan", class: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800" },
  { name: "Zinc", class: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800" },
];

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isStaff, isLoading: isRoleLoading } = useRole();

  useEffect(() => {
    if (!isRoleLoading && isStaff) {
      navigate("/transactions", { replace: true });
    }
  }, [isStaff, isRoleLoading, navigate]);

  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());

  // Expense Modals
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryOption | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState(COLOR_PRESETS[0].class);


  // Transaction Modals
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<RecipientOption | null>(null);
  const [recipientName, setRecipientName] = useState("");

  const [cardTypeModalOpen, setCardTypeModalOpen] = useState(false);
  const [editingCardType, setEditingCardType] = useState<CardTypeOption | null>(null);
  const [cardTypeName, setCardTypeName] = useState("");

  const [transactionTypeModalOpen, setTransactionTypeModalOpen] = useState(false);
  const [editingTxType, setEditingTxType] = useState<TransactionTypeOption | null>(null);
  const [txTypeLabel, setTxTypeLabel] = useState("");

  // Bank Modals
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankOption | null>(null);
  const [bankName, setBankName] = useState("");

  // Reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Portal Comparison Chart Visibility State
  const [portalsList, setPortalsList] = useState<Array<{ id: string; name: string }>>([]);
  const [isPortalsLoading, setIsPortalsLoading] = useState(true);

  const loadPortals = useCallback(async () => {
    setIsPortalsLoading(true);
    try {
      const { data } = await supabase
        .from("portals")
        .select("id, name, is_active")
        .order("name", { ascending: true });

      const dbPortals = (data || []).map((p) => ({ id: p.id, name: p.name }));
      const knownNames = new Set(dbPortals.map((p) => p.name.toLowerCase()));
      const extraFromRecipients = (settings.transactionRecipients || [])
        .filter((r) => !knownNames.has(r.name.toLowerCase()))
        .map((r) => ({ id: r.id, name: r.name }));

      setPortalsList([...dbPortals, ...extraFromRecipients]);
    } catch (err) {
      console.error("Failed to load portals list:", err);
    } finally {
      setIsPortalsLoading(false);
    }
  }, [settings.transactionRecipients]);

  useEffect(() => {
    loadPortals();
  }, [loadPortals]);

  useEffect(() => {
    const update = (s: AppSettings) => setSettings(s);
    return settingsService.subscribe(update);
  }, []);

  // --- Category Handlers ---
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    if (editingCategory) {
      settingsService.updateExpenseCategory(editingCategory.id, {
        name: categoryName.trim(),
        color: categoryColor,
      });
      toast({ title: "Updated", description: `Category "${categoryName}" updated` });
    } else {
      settingsService.addExpenseCategory({
        name: categoryName.trim(),
        color: categoryColor,
      });
      toast({ title: "Added", description: `Category "${categoryName}" added to Expenses dropdown` });
    }
    setCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryName("");
  };


  // --- Recipient Handlers ---
  const handleSaveRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) return;

    if (editingRecipient) {
      settingsService.updateRecipient(editingRecipient.id, recipientName.trim());
      toast({ title: "Updated", description: "Recipient updated" });
    } else {
      settingsService.addRecipient(recipientName.trim());
      toast({ title: "Added", description: `Recipient "${recipientName}" added to Sent To dropdown` });
    }
    setRecipientModalOpen(false);
    setEditingRecipient(null);
    setRecipientName("");
  };

  // --- Card Type Handlers ---
  const handleSaveCardType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardTypeName.trim()) return;

    if (editingCardType) {
      settingsService.updateCardType(editingCardType.id, {
        name: cardTypeName.trim(),
      });
      toast({ title: "Updated", description: `Card "${cardTypeName}" updated` });
    } else {
      settingsService.addCardType({
        name: cardTypeName.trim(),
      });
      toast({ title: "Added", description: `Card "${cardTypeName}" added to Card Type dropdown` });
    }
    setCardTypeModalOpen(false);
    setEditingCardType(null);
    setCardTypeName("");
  };

  // --- Transaction Type Handlers ---
  const handleSaveTxType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTypeLabel.trim()) return;

    settingsService.addTransactionType(txTypeLabel.trim(), txTypeLabel.trim());
    toast({ title: "Added", description: `Type "${txTypeLabel}" added` });
    setTransactionTypeModalOpen(false);
    setTxTypeLabel("");
  };

  // --- Bank Handlers ---
  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) return;

    if (editingBank) {
      settingsService.updateBank(editingBank.id, bankName.trim());
      toast({ title: "Updated", description: `Bank "${bankName}" updated` });
    } else {
      settingsService.addBank(bankName.trim());
      toast({ title: "Added", description: `Bank "${bankName}" added to Credit Card Banks dropdown` });
    }
    setBankModalOpen(false);
    setEditingBank(null);
    setBankName("");
  };

  // --- Reset Handlers ---
  const handleResetDefaults = () => {
    settingsService.resetToDefaults();
    setResetDialogOpen(false);
    toast({ title: "Reset Complete", description: "All dropdown lists restored to default configuration" });
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 max-w-6xl mx-auto pb-24 sm:pb-12"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                Settings
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Preferences
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage dropdown menus, expense categories, card commission rates, and portals
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              className="text-xs sm:text-sm h-9 gap-1.5 shadow-xs hover:bg-muted/80"
            >
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
              Restore Defaults
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <div className="overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-none">
            <TabsList className="inline-flex sm:grid sm:grid-cols-6 w-max sm:w-[860px] p-1 bg-muted/60 h-auto min-w-full sm:min-w-0 gap-1 sm:gap-0">
              <TabsTrigger
                value="profile"
                className="flex items-center justify-center gap-1.5 py-2 px-3 sm:px-2 text-xs sm:text-sm font-semibold h-9 shrink-0 sm:shrink"
              >
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value="expenses"
                className="flex items-center justify-center gap-1.5 py-2 px-3 sm:px-2 text-xs sm:text-sm font-semibold h-9 shrink-0 sm:shrink"
              >
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                <span>Expenses</span>
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="flex items-center justify-center gap-1.5 py-2 px-3 sm:px-2 text-xs sm:text-sm font-semibold h-9 shrink-0 sm:shrink"
              >
                <Receipt className="h-3.5 w-3.5 shrink-0" />
                <span>Tx Config</span>
              </TabsTrigger>
              <TabsTrigger
                value="ai-learning"
                className="flex items-center justify-center gap-1.5 py-2 px-3 sm:px-2 text-xs sm:text-sm font-semibold h-9 shrink-0 sm:shrink"
              >
                <AiIcon className="h-3.5 w-3.5 shrink-0" />
                <span>AI Learning</span>
              </TabsTrigger>
              <TabsTrigger
                value="backup"
                className="flex items-center justify-center gap-1.5 py-2 px-3 sm:px-2 text-xs sm:text-sm font-semibold h-9 shrink-0 sm:shrink"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span>Backup</span>
              </TabsTrigger>
              <TabsTrigger
                value="whatsapp"
                className="flex items-center justify-center gap-1.5 py-2 px-3 sm:px-2 text-xs sm:text-sm font-semibold h-9 shrink-0 sm:shrink"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                <span>WhatsApp</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ===================== TAB 0: PROFILE & ACCOUNT SETTINGS ===================== */}
          <TabsContent value="profile" className="space-y-6">
            <ProfileSettings />
          </TabsContent>

          {/* ===================== TAB 1: EXPENSE SETTINGS ===================== */}
          <TabsContent value="expenses" className="space-y-6">
            {/* 1. Expense Categories */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div className="space-y-0.5">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary shrink-0" />
                    <span>Expense Categories Dropdown</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Categories available when adding or filtering expenses
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryName("");
                    setCategoryColor(COLOR_PRESETS[0].class);
                    setCategoryModalOpen(true);
                  }}
                  className="h-8 text-xs gap-1 self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Category
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {settings.expenseCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`font-semibold border text-xs px-2.5 py-0.5 rounded-md ${cat.color}`}
                        >
                          {cat.name}
                        </Badge>
                        {cat.isDefault && (
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryName(cat.name);
                            setCategoryColor(cat.color);
                            setCategoryModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive"
                          onClick={() => {
                            if (settings.expenseCategories.length <= 1) {
                              toast({
                                title: "Cannot Delete",
                                description: "You must keep at least 1 expense category",
                                variant: "destructive",
                              });
                              return;
                            }
                            settingsService.deleteExpenseCategory(cat.id);
                            toast({ title: "Deleted", description: `"${cat.name}" removed` });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* ===================== TAB 2: TRANSACTION SETTINGS ===================== */}
          <TabsContent value="transactions" className="space-y-6">
            {/* 1. Sent To / Recipients */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div className="space-y-0.5">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <span>"Sent To" (Portals / Persons) Dropdown</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Options for who transactions are sent to (Upender, Chummi, etc.)
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingRecipient(null);
                    setRecipientName("");
                    setRecipientModalOpen(true);
                  }}
                  className="h-8 text-xs gap-1 self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Recipient
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {settings.transactionRecipients.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-sm font-semibold truncate">{rec.name}</span>
                        {rec.isDefault && (
                          <span className="text-[10px] text-muted-foreground uppercase font-medium shrink-0 bg-muted/80 px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingRecipient(rec);
                            setRecipientName(rec.name);
                            setRecipientModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive"
                          onClick={() => {
                            if (settings.transactionRecipients.length <= 1) {
                              toast({
                                title: "Cannot Delete",
                                description: "At least 1 recipient required",
                                variant: "destructive",
                              });
                              return;
                            }
                            settingsService.deleteRecipient(rec.id);
                            toast({ title: "Deleted", description: `"${rec.name}" removed` });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 2. Bank Credit Cards Dropdown */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div className="space-y-0.5">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary shrink-0" />
                    <span>Bank Credit Cards Dropdown</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure available credit card issuing banks (HDFC, SBI Card, ICICI, Axis, Kotak, etc.)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      settingsService.resetBanks();
                      toast({ title: "Restored", description: "Banks reset to standard bank presets." });
                    }}
                    className="h-8 text-xs gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingBank(null);
                      setBankName("");
                      setBankModalOpen(true);
                    }}
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Bank
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(settings.banks || []).map((bank) => (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-sm font-semibold truncate">{bank.name}</span>
                        {bank.isDefault && (
                          <span className="text-[10px] text-muted-foreground uppercase font-medium shrink-0 bg-muted/80 px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingBank(bank);
                            setBankName(bank.name);
                            setBankModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive"
                          onClick={() => {
                            if ((settings.banks || []).length <= 1) {
                              toast({
                                title: "Cannot Delete",
                                description: "At least 1 bank option is required",
                                variant: "destructive",
                              });
                              return;
                            }
                            settingsService.deleteBank(bank.id);
                            toast({ title: "Deleted", description: `"${bank.name}" removed` });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 3. Portal Comparison Chart Visibility */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div className="space-y-0.5">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-primary shrink-0" />
                    <span>Portal Comparison Chart Visibility</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose which portals are displayed in the Portal Comparison Chart on the Dashboard
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => {
                      settingsService.setAllPortalsVisibility([], true);
                      toast({
                        title: "All Portals Visible",
                        description: "All portals will now appear in the Portal Comparison Chart.",
                      });
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Show All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const allNames = portalsList.map((p) => p.name);
                      settingsService.setAllPortalsVisibility(allNames, false);
                      toast({
                        title: "All Portals Hidden",
                        description: "All portals are now hidden from the Portal Comparison Chart.",
                      });
                    }}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isPortalsLoading ? (
                  <div className="h-24 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  </div>
                ) : portalsList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No portals found. Portals will appear here once added or used in transactions.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {portalsList.map((portal) => {
                      const isHidden =
                        settingsService.isPortalHidden(portal.name) ||
                        settingsService.isPortalHidden(portal.id);
                      return (
                        <div
                          key={portal.id}
                          className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                isHidden
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-primary/10 text-primary"
                              )}
                            >
                              {portal.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate text-foreground">
                                {portal.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isHidden ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 bg-muted/60 text-muted-foreground border-border font-medium gap-1"
                                  >
                                    <EyeOff className="h-2.5 w-2.5" />
                                    Hidden
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium gap-1"
                                  >
                                    <Eye className="h-2.5 w-2.5" />
                                    Visible
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={!isHidden}
                            onCheckedChange={(checked) => {
                              settingsService.setPortalHidden(portal.name, !checked);
                              settingsService.setPortalHidden(portal.id, !checked);
                              toast({
                                title: checked ? "Portal Visible" : "Portal Hidden",
                                description: `"${portal.name}" is now ${
                                  checked ? "visible in" : "hidden from"
                                } the Portal Comparison Chart.`,
                              });
                            }}
                            aria-label={`Toggle visibility of ${portal.name}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Card Types */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div className="space-y-0.5">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary shrink-0" />
                    <span>Card Types Dropdown</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Card types available for credit card transactions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCardType(null);
                      setCardTypeName("");
                      setCardTypeModalOpen(true);
                    }}
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Card Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {settings.transactionCardTypes.map((card) => (
                    <div
                      key={card.id}
                      className="p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors flex items-center justify-between"
                    >
                      <span className="font-bold text-sm truncate mr-2">{card.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingCardType(card);
                            setCardTypeName(card.name);
                            setCardTypeModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive"
                          onClick={() => {
                            if (settings.transactionCardTypes.length <= 1) {
                              toast({
                                title: "Cannot Delete",
                                description: "At least 1 card type required",
                                variant: "destructive",
                              });
                              return;
                            }
                            settingsService.deleteCardType(card.id);
                            toast({ title: "Deleted", description: `"${card.name}" removed` });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 4. Transaction Types */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <div className="space-y-0.5">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary shrink-0" />
                    <span>Transaction Types Dropdown</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Types available (Withdrawal, Repayment, etc.)
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTxType(null);
                    setTxTypeLabel("");
                    setTransactionTypeModalOpen(true);
                  }}
                  className="h-8 text-xs gap-1 self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Type
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {settings.transactionTypes.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold capitalize">{t.label}</span>
                        {t.isDefault && (
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Default</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/70 hover:text-destructive"
                        onClick={() => {
                          if (settings.transactionTypes.length <= 1) {
                            toast({
                              title: "Cannot Delete",
                              description: "At least 1 transaction type required",
                              variant: "destructive",
                            });
                            return;
                          }
                          settingsService.deleteTransactionType(t.id);
                          toast({ title: "Deleted", description: `"${t.label}" removed` });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== TAB: AI LEARNING & ACCURACY ===================== */}
          <TabsContent value="ai-learning" className="space-y-6">
            <LearningInsightsCard />
          </TabsContent>

          {/* ===================== TAB 3: BACKUP & RESET ===================== */}
          <TabsContent value="backup" className="space-y-6">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  Settings Backup & Reset
                </CardTitle>
                <CardDescription className="text-xs">
                  Export your dropdown preferences or restore original defaults
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                    <h4 className="font-semibold text-sm">Export Configuration</h4>
                    <p className="text-xs text-muted-foreground">
                      Save a JSON backup of all customized categories, card types, and dropdown entries.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        const json = settingsService.exportSettingsJson();
                        const blob = new Blob([json], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `payment-track-settings-${Date.now()}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: "Exported", description: "Settings backup downloaded" });
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download JSON
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                    <h4 className="font-semibold text-sm text-destructive">Restore Defaults</h4>
                    <p className="text-xs text-muted-foreground">
                      Reset all dropdown options (Expense categories, Card types, Sent-To list) back to factory presets.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => setResetDialogOpen(true)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset to Factory Defaults
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== TAB 5: WHATSAPP INTEGRATION ===================== */}
          <TabsContent value="whatsapp" className="space-y-6">
            {/* WhatsApp Toggle Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-green-600 shrink-0" />
                      <span>WhatsApp Integration</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Automatically send welcome messages and transaction receipts via WhatsApp
                    </CardDescription>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={settings.whatsapp?.enabled !== false}
                    onCheckedChange={(checked) => {
                      settingsService.setWhatsAppEnabled(checked);
                      toast({
                        title: checked ? "WhatsApp Enabled" : "WhatsApp Disabled",
                        description: checked
                          ? "Customers will receive WhatsApp messages automatically"
                          : "WhatsApp messages are paused",
                      });
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Indicator */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    settings.whatsapp?.enabled !== false ? "bg-green-500 animate-pulse" : "bg-zinc-400"
                  )} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {settings.whatsapp?.enabled !== false ? "Active" : "Paused"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {settings.whatsapp?.enabled !== false
                        ? "Welcome messages & receipts are being sent"
                        : "No WhatsApp messages will be sent"}
                    </p>
                  </div>
                </div>

                {/* Features list */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What gets sent automatically</p>
                  <div className="grid gap-2">
                    <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-green-500/5 border border-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Welcome Message</p>
                        <p className="text-xs text-muted-foreground">Sent when you add a new customer with a phone number</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-green-500/5 border border-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Transaction Receipt</p>
                        <p className="text-xs text-muted-foreground">Sent when you record a transaction for a customer with a phone number</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Preview */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Welcome Message Preview</p>
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 font-mono text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
                    {`👋 Welcome, [Customer Name]!

Thank you for choosing [Your Business]. 🎉

We'll send your transaction receipts directly here on WhatsApp for your convenience.

For any queries, feel free to reach out!
— [Your Business]`}
                  </div>
                </div>

                {/* Setup Notice */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Setup Required:</strong> WhatsApp Cloud API credentials must be configured on the backend server.
                    Add <code className="bg-amber-500/10 px-1 py-0.5 rounded text-[10px]">WHATSAPP_PHONE_NUMBER_ID</code> and <code className="bg-amber-500/10 px-1 py-0.5 rounded text-[10px]">WHATSAPP_ACCESS_TOKEN</code> to your backend environment variables.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* --- MODALS --- */}

      {/* Category Modal */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Expense Category"}</DialogTitle>
            <DialogDescription>
              Name and style for this expense dropdown option
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name" className="text-xs font-semibold">Category Name *</Label>
              <Input
                id="cat-name"
                placeholder="e.g. WiFi & Internet, Marketing..."
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Badge Color Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setCategoryColor(p.class)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all text-center truncate ${p.class} ${
                      categoryColor === p.class ? "ring-2 ring-primary ring-offset-1 font-bold" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recipient Modal */}
      <Dialog open={recipientModalOpen} onOpenChange={setRecipientModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingRecipient ? "Edit Recipient" : "Add 'Sent To' Recipient"}</DialogTitle>
            <DialogDescription>Add a person or portal to the Sent To dropdown</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRecipient} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rec-name" className="text-xs font-semibold">Recipient Name *</Label>
              <Input
                id="rec-name"
                placeholder="e.g. Upender, Chummi, Shop Vendor..."
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setRecipientModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Recipient
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bank Modal */}
      <Dialog open={bankModalOpen} onOpenChange={setBankModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingBank ? "Edit Bank" : "Add Credit Card Bank"}</DialogTitle>
            <DialogDescription>Add or update a bank in the credit card bank dropdown</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBank} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="bank-input-name" className="text-xs font-semibold">Bank Name *</Label>
              <Input
                id="bank-input-name"
                placeholder="e.g. HDFC Bank, SBI Card, ICICI Bank..."
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setBankModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Bank
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Card Type Modal */}
      <Dialog open={cardTypeModalOpen} onOpenChange={setCardTypeModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingCardType ? "Edit Card Type" : "Add Card Type"}</DialogTitle>
            <DialogDescription>Enter the name for this card type</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCardType} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ct-name" className="text-xs font-semibold">Card Name *</Label>
              <Input
                id="ct-name"
                placeholder="e.g. Kotak Platinum, Diners Club..."
                value={cardTypeName}
                onChange={(e) => setCardTypeName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setCardTypeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Card Type
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Type Modal */}
      <Dialog open={transactionTypeModalOpen} onOpenChange={setTransactionTypeModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Transaction Type</DialogTitle>
            <DialogDescription>Add a new transaction category option</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTxType} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="tt-label" className="text-xs font-semibold">Type Name *</Label>
              <Input
                id="tt-label"
                placeholder="e.g. Payout, Refund, Cash Advance..."
                value={txTypeLabel}
                onChange={(e) => setTxTypeLabel(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setTransactionTypeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Type
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Factory Presets?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all default dropdown options (Expenses categories, Payment methods, Card types, Sent-To recipients).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetDefaults}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Restore Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Settings;
