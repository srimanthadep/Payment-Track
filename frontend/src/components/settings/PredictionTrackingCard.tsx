import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  BarChart3,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import { AiIcon } from "@/components/icons/AiIcon";
import { predictionTrackingService, PredictionStats } from "@/services/predictionTrackingService";
import { useToast } from "@/hooks/use-toast";

/** Human-friendly tier names */
const SOURCE_LABELS: Record<string, string> = {
  customer_history: "Customer Memory",
  site_card_tx_portal_bank_mode: "Site + Full Context",
  site_card_tx_bank: "Site + Bank",
  site_card_tx: "Site + Card",
  site_tx: "Site + Tx Type",
  site_default: "Site Base Rate",
  card_tx_portal_bank_mode: "Full Context Match",
  card_tx_portal_bank: "Bank + Portal",
  card_tx_portal: "Portal Match",
  card_tx: "Card + Type",
  card: "Card Only",
  global_baseline: "Baseline Default",
};

export const PredictionTrackingCard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecent, setShowRecent] = useState(false);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await predictionTrackingService.getStats();
      setStats(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = () => {
    loadStats().then(() => {
      toast({
        title: "Refreshed",
        description: "Prediction tracking stats updated",
      });
    });
  };

  if (isLoading) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          Loading prediction tracking data…
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalPredictions === 0) {
    return (
      <Card className="border shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base sm:text-lg font-bold">
              AI Prediction Acceptance Tracker
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Tracks how often you accept or override AI-predicted commission, site fee, and IMPS/NEFT values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-2">
            <Eye className="h-8 w-8 text-amber-500/60 mx-auto" />
            <p className="text-sm font-medium text-foreground">No Tracking Data Yet</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Prediction tracking starts automatically when you add transactions with AI-suggested commission, site fee, or IMPS charges.
              The system records whether you keep or change the predicted values.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sourceTiers = Object.entries(stats.bySource).sort(
    (a, b) => b[1].total - a[1].total
  );

  return (
    <div className="space-y-6">
      {/* 1. Main Stats Card */}
      <Card className="border shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                AI Prediction Acceptance Tracker
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              How often you accept or override AI-suggested commission, site fee, and IMPS values across different sites.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8 text-xs gap-1.5 shadow-xs self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Overall Acceptance Rate */}
            <div className="p-3.5 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Acceptance Rate</span>
                <ThumbsUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.acceptanceRate}%
              </div>
              <div className="space-y-1 pt-1">
                <Progress
                  value={stats.acceptanceRate}
                  className="h-1.5 bg-emerald-500/15"
                />
                <p className="text-[11px] text-muted-foreground">
                  {stats.totalAccepted} of {stats.totalPredictions} kept as-is
                </p>
              </div>
            </div>

            {/* Commission Acceptance */}
            <div className="p-3.5 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Commission Accepted</span>
                <AiIcon className="h-4 w-4" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.commissionAcceptanceRate}%
              </div>
              <div className="space-y-1 pt-1">
                <Progress
                  value={stats.commissionAcceptanceRate}
                  className="h-1.5 bg-primary/15"
                />
                <p className="text-[11px] text-muted-foreground">
                  {stats.commissionAcceptedCount} accepted, {stats.commissionOverriddenCount} changed
                </p>
              </div>
            </div>

            {/* Site Fee Acceptance */}
            <div className="p-3.5 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Site Fee Accepted</span>
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.siteFeeAcceptanceRate}%
              </div>
              <div className="space-y-1 pt-1">
                <Progress
                  value={stats.siteFeeAcceptanceRate}
                  className="h-1.5 bg-blue-500/15"
                />
                <p className="text-[11px] text-muted-foreground">
                  {stats.siteFeeAcceptedCount} accepted, {stats.siteFeeOverriddenCount} changed
                </p>
              </div>
            </div>

            {/* IMPS Charges Acceptance */}
            <div className="p-3.5 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">IMPS Accepted</span>
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.impsAcceptanceRate ?? 100}%
              </div>
              <div className="space-y-1 pt-1">
                <Progress
                  value={stats.impsAcceptanceRate ?? 100}
                  className="h-1.5 bg-purple-500/15"
                />
                <p className="text-[11px] text-muted-foreground">
                  {stats.impsAcceptedCount ?? 0} accepted, {stats.impsOverriddenCount ?? 0} changed
                </p>
              </div>
            </div>

            {/* Total Overrides */}
            <div className="p-3.5 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">User Overrides</span>
                <XCircle className="h-4 w-4 text-red-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats.totalOverridden}
              </div>
              <div className="space-y-1 pt-1">
                <Progress
                  value={stats.totalPredictions > 0 ? (stats.totalOverridden / stats.totalPredictions) * 100 : 0}
                  className="h-1.5 bg-red-500/15"
                />
                <p className="text-[11px] text-muted-foreground">
                  Times user altered AI prediction
                </p>
              </div>
            </div>
          </div>

          {/* Visual Acceptance vs Override Bar */}
          <div className="rounded-xl border p-4 bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Acceptance vs Override Distribution</span>
              <span className="text-foreground">{stats.totalPredictions} total predictions</span>
            </div>
            <div className="h-6 rounded-full overflow-hidden flex bg-muted/50">
              {stats.totalAccepted > 0 && (
                <div
                  className="bg-emerald-500 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all duration-500"
                  style={{ width: `${stats.acceptanceRate}%`, minWidth: stats.acceptanceRate > 5 ? "40px" : "0px" }}
                >
                  {stats.acceptanceRate > 8 ? `${stats.acceptanceRate}%` : ""}
                </div>
              )}
              {stats.totalOverridden > 0 && (
                <div
                  className="bg-red-400 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all duration-500"
                  style={{
                    width: `${100 - stats.acceptanceRate}%`,
                    minWidth: (100 - stats.acceptanceRate) > 5 ? "40px" : "0px",
                  }}
                >
                  {(100 - stats.acceptanceRate) > 8 ? `${(100 - stats.acceptanceRate).toFixed(1)}%` : ""}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Accepted ({stats.totalAccepted})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" />
                Overridden ({stats.totalOverridden})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Acceptance by Prediction Source/Tier */}
      {sourceTiers.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                Acceptance by Prediction Tier
              </CardTitle>
              <CardDescription className="text-xs">
                How each prediction tier performs in terms of user trust and acceptance.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Prediction Tier</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Accepted</TableHead>
                    <TableHead className="text-center">Overridden</TableHead>
                    <TableHead className="text-right">Acceptance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceTiers.map(([source, data]) => {
                    const rate = data.total > 0 ? Math.round((data.accepted / data.total) * 1000) / 10 : 0;
                    return (
                      <TableRow key={source} className="text-xs">
                        <TableCell className="font-medium">
                          <Badge variant="secondary" className="text-[11px] font-semibold">
                            {SOURCE_LABELS[source] || source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {data.total}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {data.accepted}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-red-500 font-medium">
                            {data.overridden}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              rate >= 80
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : rate >= 50
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  : "bg-red-500/10 text-red-500 border-red-500/30"
                            }
                          >
                            {rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Recent Prediction Activity Feed */}
      {stats.recentEvents.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Recent Prediction Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Last {Math.min(stats.recentEvents.length, showRecent ? 20 : 5)} prediction events
                </CardDescription>
              </div>
              {stats.recentEvents.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRecent(!showRecent)}
                  className="h-7 text-xs gap-1 self-start sm:self-auto"
                >
                  {showRecent ? "Show Less" : `Show All (${stats.recentEvents.length})`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(showRecent ? stats.recentEvents : stats.recentEvents.slice(0, 5)).map(
                (event, idx) => {
                  const allAccepted =
                    event.allAccepted ??
                    (event.commissionAccepted && event.siteFeeAccepted && (event.impsAccepted ?? true));
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        allAccepted
                          ? "bg-emerald-500/[0.03] border-emerald-500/20"
                          : "bg-red-500/[0.03] border-red-500/20"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {allAccepted ? (
                          <ThumbsUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">
                            {allAccepted ? "Accepted" : "Overridden"}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {event.cardType} · {event.transactionType} → {event.sentTo}
                          </Badge>
                          {event.siteName && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            >
                              Site: {event.siteName}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>
                            Commission: {event.predictedCommission}%
                            {!event.commissionAccepted && (
                              <span className="text-red-500 font-medium"> → {event.actualCommission}%</span>
                            )}
                          </span>
                          <span>
                            Site Fee: {event.predictedSiteFee}%
                            {!event.siteFeeAccepted && (
                              <span className="text-red-500 font-medium"> → {event.actualSiteFee}%</span>
                            )}
                          </span>
                          {event.predictedImps !== undefined && event.predictedImps !== null && (
                            <span>
                              IMPS: ₹{event.predictedImps}
                              {!event.impsAccepted && event.actualImps !== undefined && (
                                <span className="text-red-500 font-medium"> → ₹{event.actualImps}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0 hidden sm:inline-flex"
                      >
                        {SOURCE_LABELS[event.predictionSource] || event.predictionSource}
                      </Badge>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
