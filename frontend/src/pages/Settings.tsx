import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Sliders,
  Wallet,
  Receipt,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  settingsService,
  AppSettings,
  ExpenseCategoryOption,
  PaymentMethodOption,
  CardTypeOption,
  RecipientOption,
  TransactionTypeOption,
} from "@/services/settingsService";

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
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());

  // Expense Modals
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryOption | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState(COLOR_PRESETS[0].class);

  const [paymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethodOption | null>(null);
  const [paymentMethodName, setPaymentMethodName] = useState("");

  const [payeeInput, setPayeeInput] = useState("");

  // Transaction Modals
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<RecipientOption | null>(null);
  const [recipientName, setRecipientName] = useState("");

  const [cardTypeModalOpen, setCardTypeModalOpen] = useState(false);
  const [editingCardType, setEditingCardType] = useState<CardTypeOption | null>(null);
  const [cardTypeName, setCardTypeName] = useState("");
  const [cardWithdrawRate, setCardWithdrawRate] = useState("0");
  const [cardRepayRate, setCardRepayRate] = useState("0");

  const [transactionTypeModalOpen, setTransactionTypeModalOpen] = useState(false);
  const [editingTxType, setEditingTxType] = useState<TransactionTypeOption | null>(null);
  const [txTypeLabel, setTxTypeLabel] = useState("");

  // Reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

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

  // --- Payment Method Handlers ---
  const handleSavePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethodName.trim()) return;

    if (editingPaymentMethod) {
      settingsService.updatePaymentMethod(editingPaymentMethod.id, paymentMethodName.trim());
      toast({ title: "Updated", description: "Payment method updated" });
    } else {
      settingsService.addPaymentMethod(paymentMethodName.trim());
      toast({ title: "Added", description: `Payment method "${paymentMethodName}" added` });
    }
    setPaymentMethodModalOpen(false);
    setEditingPaymentMethod(null);
    setPaymentMethodName("");
  };

  // --- Payee Handlers ---
  const handleAddPayee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payeeInput.trim()) return;
    settingsService.addPayee(payeeInput.trim());
    toast({ title: "Payee Added", description: `"${payeeInput}" added to auto-fill list` });
    setPayeeInput("");
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

    const wRate = parseFloat(cardWithdrawRate) || 0;
    const rRate = parseFloat(cardRepayRate) || 0;

    if (editingCardType) {
      settingsService.updateCardType(editingCardType.id, {
        name: cardTypeName.trim(),
        withdrawRate: wRate,
        repayRate: rRate,
      });
      toast({ title: "Updated", description: `Card "${cardTypeName}" updated` });
    } else {
      settingsService.addCardType({
        name: cardTypeName.trim(),
        withdrawRate: wRate,
        repayRate: rRate,
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
        className="space-y-6 max-w-6xl mx-auto"
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

          <div className="flex items-center gap-2">
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
        <Tabs defaultValue="expenses" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full sm:w-[450px] p-1 bg-muted/60">
            <TabsTrigger value="expenses" className="gap-2 text-xs sm:text-sm font-semibold">
              <Wallet className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2 text-xs sm:text-sm font-semibold">
              <Receipt className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="backup" className="gap-2 text-xs sm:text-sm font-semibold">
              <RotateCcw className="h-4 w-4" />
              Backup & Reset
            </TabsTrigger>
          </TabsList>

          {/* ===================== TAB 1: EXPENSE SETTINGS ===================== */}
          <TabsContent value="expenses" className="space-y-6">
            {/* 1. Expense Categories */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    Expense Categories Dropdown
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
                  className="h-8 text-xs gap-1"
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

            {/* 2. Expense Payment Methods */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Payment Methods Dropdown
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Payment modes used to pay expenses (Cash, UPI, Bank Transfer, etc.)
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPaymentMethod(null);
                    setPaymentMethodName("");
                    setPaymentMethodModalOpen(true);
                  }}
                  className="h-8 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Method
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {settings.expensePaymentMethods.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm font-medium">{m.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingPaymentMethod(m);
                            setPaymentMethodName(m.name);
                            setPaymentMethodModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive"
                          onClick={() => {
                            if (settings.expensePaymentMethods.length <= 1) {
                              toast({
                                title: "Cannot Delete",
                                description: "At least 1 payment method required",
                                variant: "destructive",
                              });
                              return;
                            }
                            settingsService.deletePaymentMethod(m.id);
                            toast({ title: "Deleted", description: `"${m.name}" removed` });
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
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    "Sent To" (Portals / Persons) Dropdown
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
                  className="h-8 text-xs gap-1"
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{rec.name}</span>
                        {rec.isDefault && (
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
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

            {/* 2. Card Types & Commission Rates */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Card Types & Commission Rates Dropdown
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Card types with their respective default withdraw and repay commission percentages
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      settings.transactionCardTypes.forEach((c) => {
                        settingsService.updateCardType(c.id, { withdrawRate: 0, repayRate: 0 });
                      });
                      toast({ title: "Rates Reset", description: "All card rates set to 0%" });
                    }}
                    className="h-8 text-xs"
                  >
                    Set All to 0%
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCardType(null);
                      setCardTypeName("");
                      setCardWithdrawRate("0");
                      setCardRepayRate("0");
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
                      className="p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{card.name}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingCardType(card);
                              setCardTypeName(card.name);
                              setCardWithdrawRate(card.withdrawRate.toString());
                              setCardRepayRate(card.repayRate.toString());
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

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <span>Withdraw: <b className="text-foreground">{card.withdrawRate}%</b></span>
                        <span>Repay: <b className="text-foreground">{card.repayRate}%</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 3. Transaction Types */}
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    Transaction Types Dropdown
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
                  className="h-8 text-xs gap-1"
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

      {/* Payment Method Modal */}
      <Dialog open={paymentMethodModalOpen} onOpenChange={setPaymentMethodModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingPaymentMethod ? "Edit Method" : "Add Payment Method"}</DialogTitle>
            <DialogDescription>Add a new expense payment method</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePaymentMethod} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="pm-name" className="text-xs font-semibold">Method Name *</Label>
              <Input
                id="pm-name"
                placeholder="e.g. Petrol Card, PhonePe Scanner..."
                value={paymentMethodName}
                onChange={(e) => setPaymentMethodName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setPaymentMethodModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Method
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

      {/* Card Type Modal */}
      <Dialog open={cardTypeModalOpen} onOpenChange={setCardTypeModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingCardType ? "Edit Card Type" : "Add Card Type"}</DialogTitle>
            <DialogDescription>Configure card type name and default commission rates</DialogDescription>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ct-wrate" className="text-xs font-semibold">Withdraw Rate (%)</Label>
                <Input
                  id="ct-wrate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={cardWithdrawRate}
                  onChange={(e) => setCardWithdrawRate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-rrate" className="text-xs font-semibold">Repay Rate (%)</Label>
                <Input
                  id="ct-rrate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={cardRepayRate}
                  onChange={(e) => setCardRepayRate(e.target.value)}
                />
              </div>
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
