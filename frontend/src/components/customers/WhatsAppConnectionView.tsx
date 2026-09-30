import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageCircle,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Zap,
  Phone,
  Server,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Info,
  Clock,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  whatsappService,
  WhatsAppStatusResponse,
  WhatsAppLogEntry,
  formatPhoneForWhatsApp,
} from "@/services/whatsappService";
import { settingsService } from "@/services/settingsService";
import { cn } from "@/lib/utils";

interface WhatsAppConnectionViewProps {
  userId: string;
}

export const WhatsAppConnectionView = ({ userId }: WhatsAppConnectionViewProps) => {
  const { toast } = useToast();

  // Connection status state
  const [status, setStatus] = useState<WhatsAppStatusResponse | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Settings state
  const [settings, setSettings] = useState(() => settingsService.getSettings());
  const isEnabled = settings.whatsapp?.enabled !== false;

  // Test message state
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Audit logs state
  const [logs, setLogs] = useState<WhatsAppLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [filterAction, setFilterAction] = useState<string>("all");

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Check connection status
  const checkConnection = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      const res = await whatsappService.checkStatus();
      setStatus(res);
    } catch {
      setStatus({ configured: false });
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  // Fetch recent message logs
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const entries = await whatsappService.getLogs(userId, 30);
      setLogs(entries);
    } catch {
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [userId]);

  useEffect(() => {
    checkConnection();
    fetchLogs();
  }, [checkConnection, fetchLogs]);

  // Handle toggle enabled
  const handleToggleEnabled = (checked: boolean) => {
    settingsService.setWhatsAppEnabled(checked);
    setSettings(settingsService.getSettings());
    toast({
      title: checked ? "WhatsApp Messaging Active" : "WhatsApp Messaging Paused",
      description: checked
        ? "New customer welcome messages and receipts will be sent automatically."
        : "Automated WhatsApp messages are temporarily paused.",
    });
  };

  // Handle send test verification ping
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Phone Required",
        description: "Please enter a 10-digit phone number to receive the test message.",
      });
      return;
    }

    const waPhone = formatPhoneForWhatsApp(testPhone.trim());
    if (!waPhone) {
      toast({
        variant: "destructive",
        title: "Invalid Phone",
        description: "Please enter a valid 10-digit mobile number.",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await whatsappService.sendTestMessage(waPhone, userId);
      if (res.success) {
        toast({
          title: "Ping Delivered! ✅",
          description: `Verification message sent to ${testPhone.trim()} via WhatsApp.`,
        });
        setTestPhone("");
        fetchLogs();
      } else {
        toast({
          variant: "destructive",
          title: "Delivery Failed",
          description: res.error || "Could not send test message. Verify server environment variables.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to send test message",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({
      title: "Copied to Clipboard",
      description: `${key} copied.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredLogs = logs.filter((l) => {
    if (filterAction === "all") return true;
    return l.action === filterAction;
  });

  const isConfigured = status?.configured === true;

  return (
    <div className="space-y-6">
      {/* Top Banner Card: Connection Health & Master Switch */}
      <Card className="border shadow-sm overflow-hidden bg-gradient-to-r from-card via-card to-emerald-500/5">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left: Branding & Status */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                    WhatsApp Business Integration
                  </h2>
                  {isCheckingStatus ? (
                    <Badge variant="outline" className="text-[11px] gap-1 px-2 py-0.5">
                      <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                      Checking...
                    </Badge>
                  ) : isConfigured ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] gap-1.5 px-2.5 py-0.5 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Connected & Ready
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] gap-1.5 px-2.5 py-0.5 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Configuration Needed
                    </Badge>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {isConfigured
                    ? `Connected via Meta Cloud API (${status?.apiVersion || "v21.0"}) • Phone ID: ${status?.phoneNumberId || "Active"}`
                    : "Automated customer welcome messages and transaction receipts via WhatsApp Cloud API."}
                </p>
              </div>
            </div>

            {/* Right: Master Switch & Refresh */}
            <div className="flex items-center gap-3 self-end lg:self-center">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-1.5"
                onClick={() => {
                  checkConnection();
                  fetchLogs();
                }}
                disabled={isCheckingStatus || isLoadingLogs}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", (isCheckingStatus || isLoadingLogs) && "animate-spin")} />
                <span>Refresh Status</span>
              </Button>

              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/70">
                <div className="text-right">
                  <p className="text-xs font-semibold">Automated Dispatch</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isEnabled ? "Active" : "Paused"}
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleToggleEnabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Pair / Device View + Quick Verification Ping */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Pairing / API Status Card */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  Connection & Pairing Gateway
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  Enterprise Cloud API
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Direct Meta Business Cloud API connection for 99.9% uptime and zero device battery dependency.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Architecture specs box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Server className="h-3.5 w-3.5 text-blue-500" />
                    <span>Meta Cloud Protocol</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Direct HTTPS Webhook dispatch. No socket disconnects, background service drops, or QR expiry.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>E2E & Token Auth</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Secured by Meta Bearer System User Token with verified Business Account credentials.
                  </p>
                </div>
              </div>

              {/* QR Pairing / Linked Devices Reference */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-primary/5 border border-emerald-500/15 space-y-3">
                <div className="flex items-start gap-3">
                  {/* Visual QR Mockup */}
                  <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl bg-background p-2 border border-border shadow-xs flex flex-col items-center justify-center shrink-0 relative group">
                    <QrCode className="h-full w-full text-foreground/80" />
                    <div className="absolute inset-0 bg-background/90 rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-2 text-center">
                      <span className="text-[10px] font-bold text-emerald-600">Cloud API</span>
                      <span className="text-[8px] text-muted-foreground leading-tight mt-0.5">Automated pairing via Meta</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 text-xs">
                    <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      Pairing Instructions
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                      <li>Configure your **Meta Developer Portal** WhatsApp Cloud app.</li>
                      <li>Copy the **Phone Number ID** & **System User Access Token**.</li>
                      <li>Add them to your backend environment variables (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`).</li>
                      <li>Your customers will immediately receive automatic welcome messages & receipts!</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Active Automation Rules summary */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Automated Workflows Enabled
                </h4>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">Welcome Onboarding</span>
                        <p className="text-[10px] text-muted-foreground">Triggered on adding a customer with a phone number</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">Instant Transaction Receipt</span>
                        <p className="text-[10px] text-muted-foreground">Triggered on recording a customer transaction</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">A5 PDF Receipt Generator</span>
                        <p className="text-[10px] text-muted-foreground">Downloadable official PDF receipt from customer profile</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Supported
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 cols): Test Message Sender & Environment Guide */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Verification Ping */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Send Verification Ping
              </CardTitle>
              <CardDescription className="text-xs">
                Test your WhatsApp connection in real-time by delivering a test verification message to any phone number.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendTest} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Destination Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground text-xs font-semibold">
                      +91
                    </div>
                    <Input
                      type="tel"
                      placeholder="9876543210"
                      className="pl-11 h-9 text-xs"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Defaults to India (+91). Enter 10-digit mobile number.
                  </p>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  disabled={isSendingTest}
                >
                  {isSendingTest ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>{isSendingTest ? "Sending Test Ping..." : "Send Verification Ping"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Credentials Reference Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Environment Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Set these on your backend server (e.g. Render / .env):
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Phone Number ID</span>
                  <button
                    onClick={() => copyToClipboard("WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_PHONE_NUMBER_ID")}
                    className="flex items-center gap-1 hover:text-foreground text-[10px]"
                  >
                    {copiedKey === "WHATSAPP_PHONE_NUMBER_ID" ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="p-2 rounded-md bg-muted font-mono text-[10px] truncate">
                  WHATSAPP_PHONE_NUMBER_ID
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Access Token</span>
                  <button
                    onClick={() => copyToClipboard("WHATSAPP_ACCESS_TOKEN", "WHATSAPP_ACCESS_TOKEN")}
                    className="flex items-center gap-1 hover:text-foreground text-[10px]"
                  >
                    {copiedKey === "WHATSAPP_ACCESS_TOKEN" ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="p-2 rounded-md bg-muted font-mono text-[10px] truncate">
                  WHATSAPP_ACCESS_TOKEN
                </div>
              </div>

              <div className="pt-2 border-t border-border/60">
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline"
                >
                  <span>Open Meta Developer Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message Dispatch Audit Log Table */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Outbound Message Dispatch History
              </CardTitle>
              <CardDescription className="text-xs">
                Complete audit trail of all outbound WhatsApp messages delivered to customers.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter pills */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border/70 text-xs">
                <button
                  onClick={() => setFilterAction("all")}
                  className={cn(
                    "px-2 py-0.5 rounded font-medium text-[11px] transition-colors",
                    filterAction === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterAction("welcome")}
                  className={cn(
                    "px-2 py-0.5 rounded font-medium text-[11px] transition-colors",
                    filterAction === "welcome" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Welcome
                </button>
                <button
                  onClick={() => setFilterAction("receipt")}
                  className={cn(
                    "px-2 py-0.5 rounded font-medium text-[11px] transition-colors",
                    filterAction === "receipt" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Receipts
                </button>
                <button
                  onClick={() => setFilterAction("test")}
                  className={cn(
                    "px-2 py-0.5 rounded font-medium text-[11px] transition-colors",
                    filterAction === "test" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Test
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={fetchLogs}
                disabled={isLoadingLogs}
              >
                <RefreshCw className={cn("h-3 w-3", isLoadingLogs && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">No WhatsApp messages dispatched yet</p>
              <p className="text-xs max-w-sm mx-auto text-muted-foreground/80">
                Messages will appear here automatically when you add new customers or record transactions for customers with a phone number.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Timestamp</TableHead>
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold">Phone</TableHead>
                    <TableHead className="text-xs font-semibold">Message Type</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const isSuccess = log.status === "sent";
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs py-2.5 font-medium whitespace-nowrap text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 font-medium text-foreground">
                          {log.customer_name || "—"}
                        </TableCell>
                        <TableCell className="text-xs py-2.5 font-mono text-muted-foreground">
                          {log.phone}
                        </TableCell>
                        <TableCell className="text-xs py-2.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize",
                            log.action === "welcome"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : log.action === "receipt"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                          )}>
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-2.5 text-right whitespace-nowrap">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Delivered
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400"
                              title={log.error || "Delivery failed"}
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                              Failed
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
