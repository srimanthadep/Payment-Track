import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowRight,
  Filter,
  CreditCard,
  Building2,
  Smartphone,
  Send,
  Zap,
  Check,
  AlertCircle,
  Percent,
  Eye,
  FileText,
  User,
  Phone,
  MessageCircle,
  Copy,
  IndianRupee,
  Layers,
  ChevronRight,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { AiIcon } from "@/components/icons/AiIcon";
import { useToast } from "@/hooks/use-toast";
import { predictionTrackingService, PredictionEvent, PredictionStats } from "@/services/predictionTrackingService";
import { format } from "date-fns";

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  none: { label: "No Prediction", color: "bg-muted text-muted-foreground border-border" },
  customer_history: { label: "Customer Memory", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20" },
  site_card_tx_portal_bank_mode: { label: "Site + Full Context", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" },
  site_card_tx_bank: { label: "Site + Bank", color: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20" },
  site_card_tx: { label: "Site + Card", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20" },
  site_tx: { label: "Site + Tx Type", color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20" },
  site_default: { label: "Site Base Rate", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  card_tx_portal_bank_mode: { label: "Full Context Match", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  card_tx_portal_bank: { label: "Bank + Portal", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20" },
  card_tx_portal: { label: "Portal Match", color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20" },
  card_tx: { label: "Card + Type", color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20" },
  card: { label: "Card Only", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20" },
  global_baseline: { label: "Baseline Default", color: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20" },
};

const formatINR = (val?: number | null) => {
  if (val === undefined || val === null) return "—";
  return `₹${Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(Number(val)) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function AiTracker() {
  const { toast } = useToast();
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [events, setEvents] = useState<PredictionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<PredictionEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<PredictionEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, eventsData] = await Promise.all([
        predictionTrackingService.getStats(),
        predictionTrackingService.getAllEvents(300),
      ]);
      setStats(statsData);
      setEvents(eventsData);
    } catch {
      toast({
        title: "Error loading prediction tracking",
        description: "Could not fetch prediction history.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData().then(() => {
      toast({
        title: "Refreshed",
        description: "AI prediction tracker data updated",
      });
    });
  };

  const handleOpenDetail = (ev: PredictionEvent) => {
    setSelectedEvent(ev);
    setDetailOpen(true);
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    toast({ title: "Copied", description: "Phone number copied to clipboard" });
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleDeleteClick = (ev: PredictionEvent) => {
    setEventToDelete(ev);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      if (eventToDelete.id) {
        await predictionTrackingService.deletePredictionById(eventToDelete.id);
      }
      if (eventToDelete.transactionId) {
        await predictionTrackingService.deletePredictionsByTransactionId(eventToDelete.transactionId);
      }
      toast({
        title: "Prediction Deleted",
        description: "The AI tracker record has been removed.",
      });
      setDeleteConfirmOpen(false);
      setDetailOpen(false);
      setEventToDelete(null);
      await loadData();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete prediction record.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const isImpsAccepted = ev.impsAccepted ?? true;
      const allAccepted = ev.allAccepted ?? (ev.commissionAccepted && ev.siteFeeAccepted && isImpsAccepted);
      
      // Status filter
      if (statusFilter === "accepted" && !allAccepted) return false;
      if (statusFilter === "overridden" && allAccepted) return false;
      if (statusFilter === "commission_changed" && ev.commissionAccepted) return false;
      if (statusFilter === "site_fee_changed" && ev.siteFeeAccepted) return false;
      if (statusFilter === "imps_changed" && isImpsAccepted) return false;

      // Source filter
      if (sourceFilter !== "all" && ev.predictionSource !== sourceFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const cardMatch = ev.cardType.toLowerCase().includes(query);
        const txMatch = ev.transactionType.toLowerCase().includes(query);
        const sentMatch = ev.sentTo.toLowerCase().includes(query);
        const siteMatch = ev.siteName?.toLowerCase().includes(query) || false;
        const bankMatch = ev.bankName?.toLowerCase().includes(query) || false;
        const modeMatch = ev.customerMode?.toLowerCase().includes(query) || false;
        const tierMatch = ev.predictionSource.toLowerCase().includes(query);
        const amountMatch = ev.amount?.toString().includes(query) || false;
        const customerMatch = ev.customerName?.toLowerCase().includes(query) || false;
        const phoneMatch = ev.customerPhone?.toLowerCase().includes(query) || false;
        const portalMatch = ev.portalName?.toLowerCase().includes(query) || false;
        const notesMatch = ev.notes?.toLowerCase().includes(query) || false;
        
        if (
          !cardMatch &&
          !txMatch &&
          !sentMatch &&
          !siteMatch &&
          !bankMatch &&
          !modeMatch &&
          !tierMatch &&
          !amountMatch &&
          !customerMatch &&
          !phoneMatch &&
          !portalMatch &&
          !notesMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [events, statusFilter, sourceFilter, searchQuery]);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-12">
        {/* Page Header */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-2.5">
                <AiIcon className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">AI Tracker</h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-1.5 h-8 text-xs sm:hidden shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Audit every transaction: inspect full transaction details, check accepted AI suggestions, and view exact rate changes
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top Metric Cards - 2-col on Mobile, 5-col on Desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
          <Card className="border shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1.5 sm:pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-[11px] sm:text-xs font-medium truncate">Total Predictions</CardDescription>
                <AiIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold mt-1">
                {stats?.totalPredictions.toLocaleString() || 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate sm:whitespace-normal">
                Automated AI defaulting
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1.5 sm:pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-[11px] sm:text-xs font-medium truncate">Overall Acceptance</CardDescription>
                <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  {stats?.allAcceptanceRate ?? stats?.acceptanceRate ?? 0}%
                </CardTitle>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  ({stats?.allAcceptedCount ?? stats?.totalAccepted ?? 0}/{stats?.totalPredictions || 0})
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <Progress value={stats?.allAcceptanceRate ?? stats?.acceptanceRate ?? 0} className="h-1.5 sm:h-2 mt-1" />
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1.5 sm:pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-[11px] sm:text-xs font-medium truncate">Commission Match</CardDescription>
                <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  {stats?.commissionAcceptanceRate || 0}%
                </CardTitle>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  ({stats?.commissionAcceptedCount || 0}/{stats?.totalPredictions || 0})
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <Progress value={stats?.commissionAcceptanceRate || 0} className="h-1.5 sm:h-2 mt-1" />
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1.5 sm:pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-[11px] sm:text-xs font-medium truncate">Site Fee Match</CardDescription>
                <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  {stats?.siteFeeAcceptanceRate || 0}%
                </CardTitle>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  ({stats?.siteFeeAcceptedCount || 0}/{stats?.totalPredictions || 0})
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <Progress value={stats?.siteFeeAcceptanceRate || 0} className="h-1.5 sm:h-2 mt-1" />
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="p-3 sm:p-4 pb-1.5 sm:pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-[11px] sm:text-xs font-medium truncate">IMPS Match</CardDescription>
                <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  {stats?.impsAcceptanceRate ?? 100}%
                </CardTitle>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  ({stats?.impsAcceptedCount ?? 0}/{stats?.totalPredictions || 0})
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <Progress value={stats?.impsAcceptanceRate ?? 100} className="h-1.5 sm:h-2 mt-1" />
            </CardContent>
          </Card>
        </div>

        {/* Ledger Table Section */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="p-3.5 sm:p-5 border-b space-y-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <AiIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <CardTitle className="text-base sm:text-lg font-bold">Transaction Predictions Ledger</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Showing {filteredEvents.length} of {events.length} tracked events. Click any transaction to inspect entire details.
              </CardDescription>
            </div>

            {/* Responsive Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              {/* Full-width Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search amount, customer, portal, card, bank..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm bg-background w-full"
                />
              </div>

              {/* 50/50 Grid on Mobile, Flex on Desktop */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-[160px]">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Outcomes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Outcomes</SelectItem>
                      <SelectItem value="accepted">Accepted (100%)</SelectItem>
                      <SelectItem value="overridden">Overridden</SelectItem>
                      <SelectItem value="commission_changed">Commission Changed</SelectItem>
                      <SelectItem value="site_fee_changed">Site Fee Changed</SelectItem>
                      <SelectItem value="imps_changed">IMPS Changed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-[175px]">
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All AI Tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex items-center gap-1.5">
                          <AiIcon className="h-3 w-3 shrink-0" />
                          <span>All AI Tiers</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="customer_history">Customer Memory</SelectItem>
                      <SelectItem value="site_card_tx_portal_bank_mode">Site + Full Context</SelectItem>
                      <SelectItem value="site_card_tx_bank">Site + Bank</SelectItem>
                      <SelectItem value="site_card_tx">Site + Card</SelectItem>
                      <SelectItem value="site_tx">Site + Tx Type</SelectItem>
                      <SelectItem value="site_default">Site Base Rate</SelectItem>
                      <SelectItem value="card_tx_portal_bank_mode">Full Context Match</SelectItem>
                      <SelectItem value="card_tx_portal_bank">Bank + Portal</SelectItem>
                      <SelectItem value="card_tx_portal">Portal Match</SelectItem>
                      <SelectItem value="card_tx">Card + Type</SelectItem>
                      <SelectItem value="card">Card Only</SelectItem>
                      <SelectItem value="global_baseline">Baseline Default</SelectItem>
                      <SelectItem value="none">No Prediction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 sm:p-0">
            {isLoading ? (
              <div className="p-8 sm:p-12 text-center text-xs sm:text-sm text-muted-foreground">
                <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mx-auto mb-2 text-primary" />
                Loading prediction events...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <AiIcon className="h-8 w-8 sm:h-9 sm:w-9 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground text-sm">No prediction records found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {events.length === 0
                    ? "Predictions will appear here automatically as you add transactions using the Add Transaction dialog."
                    : "No transactions match your current search or filter criteria. Try clearing filters."}
                </p>
                {events.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setSourceFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile View: Clean, readable Card items (md:hidden) */}
                <div className="md:hidden divide-y divide-border/60">
                  {filteredEvents.map((ev, idx) => {
                    const isImpsAccepted = ev.impsAccepted ?? true;
                    const allAccepted = ev.allAccepted ?? (ev.commissionAccepted && ev.siteFeeAccepted && isImpsAccepted);
                    const commDiff = Math.round((ev.actualCommission - ev.predictedCommission) * 100) / 100;
                    const feeDiff = Math.round((ev.actualSiteFee - ev.predictedSiteFee) * 100) / 100;
                    const impsPred = ev.predictedImps ?? 0;
                    const impsAct = ev.actualImps ?? 0;
                    const impsDiff = Math.round((impsAct - impsPred) * 100) / 100;
                    const tierInfo = SOURCE_LABELS[ev.predictionSource] || {
                      label: ev.predictionSource || "Fallback",
                      color: "bg-muted text-muted-foreground",
                    };

                    return (
                      <div
                        key={ev.id || idx}
                        onClick={() => handleOpenDetail(ev)}
                        className="p-3.5 space-y-2.5 hover:bg-muted/20 active:bg-muted/40 transition-colors cursor-pointer"
                      >
                        {/* Top: Amount + Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-foreground">
                              {ev.amount !== undefined && ev.amount > 0 ? formatINR(ev.amount) : "₹—"}
                            </span>
                            {ev.profit !== undefined && ev.profit > 0 && (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                +{formatINR(ev.profit)}
                              </span>
                            )}
                          </div>

                          {allAccepted ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium text-[11px] gap-1 px-2 py-0.5">
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              Accepted
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-medium text-[11px] gap-1 px-2 py-0.5">
                              <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              Overridden
                            </Badge>
                          )}
                        </div>

                        {/* Customer & Portal line */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 truncate">
                            {ev.customerName ? (
                              <span className="font-medium text-foreground flex items-center gap-1 truncate">
                                <User className="h-3 w-3 text-primary" />
                                {ev.customerName}
                              </span>
                            ) : (
                              <span className="italic text-muted-foreground/80">No customer</span>
                            )}
                            {ev.customerPhone && (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                • {ev.customerPhone}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                            {ev.createdAt ? format(new Date(ev.createdAt), "dd MMM, hh:mm a") : "Just now"}
                          </span>
                        </div>

                        {/* Middle: What Changed / Rates Box */}
                        <div className="bg-muted/30 rounded-xl p-2.5 border border-border/50 space-y-1.5">
                          {allAccepted ? (
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <AiIcon className="h-3.5 w-3.5 shrink-0" />
                                <span>Accepted exact AI suggestion</span>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center justify-between pt-0.5 flex-wrap gap-1">
                                <span>Commission: <strong className="text-foreground">{ev.predictedCommission}%</strong></span>
                                <span>Site Fee: <strong className="text-foreground">{ev.predictedSiteFee}%</strong></span>
                                <span>IMPS: <strong className="text-foreground">₹{impsPred}</strong></span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                  Margin: +{Math.round((ev.predictedCommission - ev.predictedSiteFee) * 100) / 100}%
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {/* Commission */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-medium">Commission:</span>
                                {ev.commissionAccepted ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1">
                                    <Check className="h-3 w-3" /> {ev.predictedCommission}% (Accepted)
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5 font-mono text-xs">
                                    <span className="text-muted-foreground line-through">{ev.predictedCommission}%</span>
                                    <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span className="font-bold text-foreground bg-amber-500/10 px-1 rounded">
                                      {ev.actualCommission}%
                                    </span>
                                    <span className={`text-[10px] ${commDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                                      ({commDiff > 0 ? `+${commDiff}%` : `${commDiff}%`})
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Site Fee */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-medium">Site Fee:</span>
                                {ev.siteFeeAccepted ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1">
                                    <Check className="h-3 w-3" /> {ev.predictedSiteFee}% (Accepted)
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5 font-mono text-xs">
                                    <span className="text-muted-foreground line-through">{ev.predictedSiteFee}%</span>
                                    <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span className="font-bold text-foreground bg-amber-500/10 px-1 rounded">
                                      {ev.actualSiteFee}%
                                    </span>
                                    <span className={`text-[10px] ${feeDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                                      ({feeDiff > 0 ? `+${feeDiff}%` : `${feeDiff}%`})
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* IMPS / NEFT */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-medium">IMPS / NEFT:</span>
                                {isImpsAccepted ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1">
                                    <Check className="h-3 w-3" /> ₹{impsPred} (Accepted)
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5 font-mono text-xs">
                                    <span className="text-muted-foreground line-through">₹{impsPred}</span>
                                    <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span className="font-bold text-foreground bg-amber-500/10 px-1 rounded">
                                      ₹{impsAct}
                                    </span>
                                    <span className={`text-[10px] ${impsDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                                      ({impsDiff > 0 ? `+₹${impsDiff}` : `₹${impsDiff}`})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottom: Context Badges + AI Tier */}
                        <div className="flex items-center justify-between gap-2 text-xs flex-wrap pt-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
                              <CreditCard className="h-2.5 w-2.5 mr-1 text-muted-foreground" />
                              {ev.cardType}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0">
                              {ev.transactionType}
                            </Badge>
                            {ev.siteName && (
                              <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                                {ev.siteName}
                              </Badge>
                            )}
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Send className="h-2.5 w-2.5 text-primary" />
                              {ev.portalName || ev.sentTo}
                            </span>
                            {ev.bankName && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Building2 className="h-2.5 w-2.5" />
                                {ev.bankName}
                              </span>
                            )}
                          </div>

                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${tierInfo.color} inline-flex items-center gap-1 ml-auto`}>
                            <AiIcon className="h-2.5 w-2.5 shrink-0" />
                            <span>{tierInfo.label}</span>
                          </Badge>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs gap-1.5 rounded-xl font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(ev);
                            }}
                          >
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            View Transaction Detail
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:border-destructive/30 rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(ev);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View: Full Table (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-transparent">
                        <TableHead className="text-xs w-[150px]">Date & Time</TableHead>
                        <TableHead className="text-xs w-[120px]">Status</TableHead>
                        <TableHead className="text-xs min-w-[200px]">Transaction & Customer</TableHead>
                        <TableHead className="text-xs min-w-[240px]">What Changed? (AI vs Actual)</TableHead>
                        <TableHead className="text-xs w-[150px]">
                          <div className="flex items-center gap-1.5">
                            <AiIcon className="h-3.5 w-3.5" />
                            <span>AI Source Tier</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-xs text-right w-[90px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((ev, idx) => {
                        const isImpsAccepted = ev.impsAccepted ?? true;
                        const allAccepted = ev.allAccepted ?? (ev.commissionAccepted && ev.siteFeeAccepted && isImpsAccepted);
                        const commDiff = Math.round((ev.actualCommission - ev.predictedCommission) * 100) / 100;
                        const feeDiff = Math.round((ev.actualSiteFee - ev.predictedSiteFee) * 100) / 100;
                        const impsPred = ev.predictedImps ?? 0;
                        const impsAct = ev.actualImps ?? 0;
                        const impsDiff = Math.round((impsAct - impsPred) * 100) / 100;
                        const tierInfo = SOURCE_LABELS[ev.predictionSource] || {
                          label: ev.predictionSource || "Fallback",
                          color: "bg-muted text-muted-foreground",
                        };

                        return (
                          <TableRow
                            key={ev.id || idx}
                            onClick={() => handleOpenDetail(ev)}
                            className="hover:bg-muted/30 cursor-pointer transition-colors"
                          >
                            {/* 1. Date & Time */}
                            <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                              {ev.createdAt
                                ? format(new Date(ev.createdAt), "dd MMM yyyy, hh:mm a")
                                : "Just now"}
                            </TableCell>

                            {/* 2. Status Badge */}
                            <TableCell>
                              {allAccepted ? (
                                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium text-[11px] gap-1 px-2 py-0.5 whitespace-nowrap">
                                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  Accepted
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-medium text-[11px] gap-1 px-2 py-0.5 whitespace-nowrap">
                                  <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                  Overridden
                                </Badge>
                              )}
                            </TableCell>

                            {/* 3. Entire Transaction & Context Column */}
                            <TableCell>
                              <div className="space-y-1.5 py-1">
                                {/* Amount & Profit */}
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-foreground">
                                    {ev.amount !== undefined && ev.amount > 0 ? formatINR(ev.amount) : "₹—"}
                                  </span>
                                  {ev.profit !== undefined && ev.profit > 0 && (
                                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                                      +{formatINR(ev.profit)} profit
                                    </span>
                                  )}
                                </div>

                                {/* Customer info if available */}
                                {ev.customerName && (
                                  <div className="text-xs text-foreground font-medium flex items-center gap-1.5">
                                    <User className="h-3 w-3 text-primary" />
                                    <span>{ev.customerName}</span>
                                    {ev.customerPhone && (
                                      <span className="text-[11px] text-muted-foreground font-mono">
                                        ({ev.customerPhone})
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Context Badges */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
                                    <CreditCard className="h-2.5 w-2.5 mr-1 text-muted-foreground" />
                                    {ev.cardType}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0">
                                    {ev.transactionType}
                                  </Badge>
                                  {ev.siteName && (
                                    <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                                      {ev.siteName}
                                    </Badge>
                                  )}
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Send className="h-2.5 w-2.5 text-primary" />
                                    {ev.portalName || ev.sentTo}
                                  </span>
                                  {ev.bankName && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                      <Building2 className="h-2.5 w-2.5 text-muted-foreground" />
                                      {ev.bankName}
                                    </span>
                                  )}
                                  {ev.customerMode && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                      <Smartphone className="h-2.5 w-2.5 text-muted-foreground" />
                                      {ev.customerMode}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* 4. What Changed? Details */}
                            <TableCell>
                              {allAccepted ? (
                                <div className="space-y-0.5">
                                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                    <AiIcon className="h-3.5 w-3.5 shrink-0" />
                                    <span>Accepted exact AI suggestion</span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                                    <span>Commission: <strong className="font-semibold text-foreground">{ev.predictedCommission}%</strong></span>
                                    <span>•</span>
                                    <span>Site Fee: <strong className="font-semibold text-foreground">{ev.predictedSiteFee}%</strong></span>
                                    <span>•</span>
                                    <span>IMPS: <strong className="font-semibold text-foreground">₹{impsPred}</strong></span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5 py-1">
                                  {/* Commission change */}
                                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                    <span className="font-medium text-muted-foreground w-20">Commission:</span>
                                    {ev.commissionAccepted ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                                        <Check className="h-3 w-3" /> {ev.predictedCommission}% (Accepted)
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                        <span className="text-muted-foreground line-through">{ev.predictedCommission}%</span>
                                        <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                                        <span className="font-bold text-foreground bg-amber-500/10 px-1 rounded">
                                          {ev.actualCommission}%
                                        </span>
                                        <span className={`text-[10px] ${commDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                                          ({commDiff > 0 ? `+${commDiff}%` : `${commDiff}%`})
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Site Fee change */}
                                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                    <span className="font-medium text-muted-foreground w-20">Site Fee:</span>
                                    {ev.siteFeeAccepted ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                                        <Check className="h-3 w-3" /> {ev.predictedSiteFee}% (Accepted)
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                        <span className="text-muted-foreground line-through">{ev.predictedSiteFee}%</span>
                                        <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                                        <span className="font-bold text-foreground bg-amber-500/10 px-1 rounded">
                                          {ev.actualSiteFee}%
                                        </span>
                                        <span className={`text-[10px] ${feeDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                                          ({feeDiff > 0 ? `+${feeDiff}%` : `${feeDiff}%`})
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* IMPS change */}
                                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                    <span className="font-medium text-muted-foreground w-20">IMPS / NEFT:</span>
                                    {isImpsAccepted ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                                        <Check className="h-3 w-3" /> ₹{impsPred} (Accepted)
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                        <span className="text-muted-foreground line-through">₹{impsPred}</span>
                                        <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                                        <span className="font-bold text-foreground bg-amber-500/10 px-1 rounded">
                                          ₹{impsAct}
                                        </span>
                                        <span className={`text-[10px] ${impsDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                                          ({impsDiff > 0 ? `+₹${impsDiff}` : `₹${impsDiff}`})
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </TableCell>

                            {/* 5. AI Source Tier & Confidence */}
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${tierInfo.color} inline-flex items-center gap-1.5`}>
                                  <AiIcon className="h-2.5 w-2.5 shrink-0" />
                                  <span>{tierInfo.label}</span>
                                </Badge>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <span>Confidence:</span>
                                  <span className="font-semibold text-foreground">
                                    {Math.round(ev.predictionConfidence * 100)}%
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* 6. Action Column */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDetail(ev);
                                  }}
                                  title="View details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="hidden lg:inline">Detail</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(ev);
                                  }}
                                  title="Delete AI tracker log"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Entire Transaction Detail Modal ────────────────────────────── */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 space-y-4">
            {selectedEvent && (() => {
              const isSelectedImpsAccepted = selectedEvent.impsAccepted ?? true;
              const isSelectedAllAccepted = selectedEvent.allAccepted ?? (selectedEvent.commissionAccepted && selectedEvent.siteFeeAccepted && isSelectedImpsAccepted);

              return (
              <>
                <DialogHeader className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                      <FileText className="h-5 w-5 text-primary" />
                      <span>Entire Transaction Detail</span>
                    </DialogTitle>
                    {isSelectedAllAccepted ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5">
                        <Check className="h-3 w-3 mr-1" /> AI Accepted
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5">
                        <AlertCircle className="h-3 w-3 mr-1" /> AI Overridden
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-xs font-mono text-muted-foreground">
                    Recorded {selectedEvent.createdAt ? format(new Date(selectedEvent.createdAt), "dd MMMM yyyy, hh:mm:ss a") : "Recently"}
                    {selectedEvent.transactionId && ` • ID: ${selectedEvent.transactionId.slice(0, 8)}...`}
                  </DialogDescription>
                </DialogHeader>

                {/* Hero Financial Banner */}
                <div className="bg-gradient-to-br from-primary/10 via-background to-muted/40 p-4 rounded-2xl border border-border/80 space-y-3">
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Transaction Amount</span>
                      <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
                        {selectedEvent.amount !== undefined && selectedEvent.amount > 0 ? formatINR(selectedEvent.amount) : "₹—"}
                      </div>
                    </div>
                    {selectedEvent.profit !== undefined && (
                      <div className="text-right">
                        <span className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Net Profit</span>
                        <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatINR(selectedEvent.profit)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5-stat metrics grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-border/40 text-xs">
                    <div className="bg-background/80 p-2 rounded-xl border border-border/40">
                      <span className="text-muted-foreground text-[10px] block">Commission Rate</span>
                      <strong className="text-foreground text-xs">{selectedEvent.actualCommission}%</strong>
                    </div>
                    <div className="bg-background/80 p-2 rounded-xl border border-border/40">
                      <span className="text-muted-foreground text-[10px] block">Site Fee Rate</span>
                      <strong className="text-foreground text-xs">{selectedEvent.actualSiteFee}%</strong>
                    </div>
                    <div className="bg-background/80 p-2 rounded-xl border border-border/40">
                      <span className="text-muted-foreground text-[10px] block">IMPS Charges</span>
                      <strong className="text-foreground text-xs">₹{selectedEvent.actualImps ?? 0}</strong>
                    </div>
                    <div className="bg-background/80 p-2 rounded-xl border border-border/40">
                      <span className="text-muted-foreground text-[10px] block">Card Type</span>
                      <strong className="text-foreground text-xs">{selectedEvent.cardType}</strong>
                    </div>
                    <div className="bg-background/80 p-2 rounded-xl border border-border/40">
                      <span className="text-muted-foreground text-[10px] block">Type</span>
                      <strong className="text-foreground text-xs uppercase">{selectedEvent.transactionType}</strong>
                    </div>
                  </div>
                </div>

                {/* Customer & Routing Specifications Card */}
                <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" /> Customer & Routing Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Customer Name</span>
                      <span className="font-semibold text-foreground">
                        {selectedEvent.customerName || "No customer attached"}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Phone Number</span>
                      {selectedEvent.customerPhone ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-foreground">{selectedEvent.customerPhone}</span>
                          <button
                            onClick={() => handleCopyPhone(selectedEvent.customerPhone!)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy phone"
                          >
                            {copiedPhone ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/80 italic">—</span>
                      )}
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Gateway Site</span>
                      <span className="font-semibold text-foreground">
                        {selectedEvent.siteName || "Default"}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Portal</span>
                      <span className="font-semibold text-foreground">
                        {selectedEvent.portalName || selectedEvent.sentTo}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Sent To (Recipient)</span>
                      <span className="font-semibold text-foreground">{selectedEvent.sentTo}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Bank Name</span>
                      <span className="font-medium text-foreground">{selectedEvent.bankName || "—"}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Customer Mode</span>
                      <span className="font-medium text-foreground">{selectedEvent.customerMode || "—"}</span>
                    </div>
                  </div>

                  {/* Notes / Memo */}
                  {selectedEvent.notes && (
                    <div className="pt-2 border-t border-border/40">
                      <span className="text-muted-foreground block text-[11px] mb-1">Notes / System Memo</span>
                      <p className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-foreground font-mono leading-relaxed break-words">
                        {selectedEvent.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Prediction Audit Ledger */}
                <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <AiIcon className="h-3.5 w-3.5" /> AI Prediction Breakdown
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40">
                      <span className="text-muted-foreground">Commission Suggestion</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono">Suggested: {selectedEvent.predictedCommission}%</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold text-foreground font-mono">Actual: {selectedEvent.actualCommission}%</span>
                        {selectedEvent.commissionAccepted ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px] px-1.5 py-0 border-emerald-500/20">Accepted</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-700 text-[10px] px-1.5 py-0 border-amber-500/20">Changed</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40">
                      <span className="text-muted-foreground">Site Fee Suggestion</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono">Suggested: {selectedEvent.predictedSiteFee}%</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold text-foreground font-mono">Actual: {selectedEvent.actualSiteFee}%</span>
                        {selectedEvent.siteFeeAccepted ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px] px-1.5 py-0 border-emerald-500/20">Accepted</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-700 text-[10px] px-1.5 py-0 border-amber-500/20">Changed</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40">
                      <span className="text-muted-foreground">IMPS / NEFT Suggestion</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono">Suggested: ₹{selectedEvent.predictedImps ?? 0}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold text-foreground font-mono">Actual: ₹{selectedEvent.actualImps ?? 0}</span>
                        {isSelectedImpsAccepted ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px] px-1.5 py-0 border-emerald-500/20">Accepted</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-700 text-[10px] px-1.5 py-0 border-amber-500/20">Changed</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted-foreground">AI Intelligence Model:</span>
                      <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${(SOURCE_LABELS[selectedEvent.predictionSource] || { color: "bg-muted text-muted-foreground" }).color}`}>
                        {SOURCE_LABELS[selectedEvent.predictionSource]?.label || selectedEvent.predictionSource}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Confidence Score:</span>
                      <span className="font-semibold text-foreground">
                        {Math.round(selectedEvent.predictionConfidence * 100)}% Match
                      </span>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 rounded-xl px-4 text-xs gap-1.5"
                    onClick={() => {
                      if (selectedEvent) handleDeleteClick(selectedEvent);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete From Tracker
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto rounded-xl px-5"
                    onClick={() => setDetailOpen(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete AI Tracker Log?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove this prediction audit record from the AI Tracker. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
