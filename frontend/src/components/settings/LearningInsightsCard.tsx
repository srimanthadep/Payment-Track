import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AiIcon } from "@/components/icons/AiIcon";
import {
  Sparkles,
  BrainCircuit,
  Target,
  CheckCircle2,
  BarChart3,
  RotateCw,
  Zap,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import {
  transactionLearningService,
  PatternSummary,
  BacktestResults,
  TransactionFeeRecommendation,
} from "@/services/transactionLearningService";
import { settingsService, CardTypeOption, RecipientOption, TransactionTypeOption } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";

export const LearningInsightsCard = () => {
  const { toast } = useToast();
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);
  const [backtestStats, setBacktestStats] = useState<BacktestResults | null>(null);
  const [topPatterns, setTopPatterns] = useState<PatternSummary[]>([]);
  const [recordCount, setRecordCount] = useState(0);

  // Sandbox testing state
  const [cardTypes, setCardTypes] = useState<CardTypeOption[]>([]);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [txTypes, setTxTypes] = useState<TransactionTypeOption[]>([]);

  const [testCard, setTestCard] = useState("");
  const [testTx, setTestTx] = useState("withdrawal");
  const [testRecipient, setTestRecipient] = useState("");
  const [testResult, setTestResult] = useState<TransactionFeeRecommendation | null>(null);

  useEffect(() => {
    const init = async () => {
      await transactionLearningService.init();
      setRecordCount(transactionLearningService.getRecordCount());
      setTopPatterns(transactionLearningService.getTopPatterns(8));

      // Initial backtest run in background
      const stats = transactionLearningService.runBacktest();
      setBacktestStats(stats);

      // Populate dropdowns
      const c = settingsService.getCardTypes();
      const r = settingsService.getRecipients();
      const t = settingsService.getTransactionTypes();
      setCardTypes(c);
      setRecipients(r);
      setTxTypes(t);

      if (c.length > 0) setTestCard(c[0].name);
      if (r.length > 0) setTestRecipient(r[0].name);
    };

    init();
    return transactionLearningService.subscribe(() => {
      setRecordCount(transactionLearningService.getRecordCount());
      setTopPatterns(transactionLearningService.getTopPatterns(8));
    });
  }, []);

  // Update sandbox recommendation whenever test inputs change
  useEffect(() => {
    if (testCard || testTx) {
      const rec = transactionLearningService.getRecommendation({
        cardType: testCard,
        transactionType: testTx,
        sentTo: testRecipient,
      });
      setTestResult(rec);
    }
  }, [testCard, testTx, testRecipient]);

  const handleRunBacktest = () => {
    setIsRunningBacktest(true);
    setTimeout(() => {
      const stats = transactionLearningService.runBacktest();
      setBacktestStats(stats);
      setIsRunningBacktest(false);
      toast({
        title: "Backtest Complete",
        description: `Evaluated ${stats.totalEvaluated} transactions with ${stats.highConfidenceCommAccuracy}% high-confidence commission accuracy.`,
      });
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Card */}
      <Card className="border shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <AiIcon className="h-6 w-6" />
              <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
                AI Transaction Learning & Accuracy
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Maximum A Posteriori (MAP) probabilistic model learning commission and site-fee rates from your transaction history.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunBacktest}
              disabled={isRunningBacktest}
              className="h-8 text-xs gap-1.5 shadow-xs"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRunningBacktest ? "animate-spin" : ""}`} />
              {isRunningBacktest ? "Evaluating..." : "Run Accuracy Audit"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Metric 1 */}
            <div className="p-3.5 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">High-Confidence Accuracy</span>
                <Target className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {backtestStats ? `${backtestStats.highConfidenceCommAccuracy}%` : "--"}
              </div>
              <div className="space-y-1 pt-1">
                <Progress
                  value={backtestStats ? backtestStats.highConfidenceCommAccuracy : 0}
                  className="h-1.5 bg-emerald-500/15"
                />
                <p className="text-[11px] text-muted-foreground">
                  Site Fee: {backtestStats?.highConfidenceFeeAccuracy}% ({backtestStats?.highConfidenceCount} txns)
                </p>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-3.5 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">All-Tiers Commission</span>
                <AiIcon className="h-4 w-4" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {backtestStats ? `${backtestStats.commissionAccuracy}%` : "--"}
              </div>
              <div className="space-y-1 pt-1">
                <Progress
                  value={backtestStats ? backtestStats.commissionAccuracy : 0}
                  className="h-1.5 bg-primary/15"
                />
                <p className="text-[11px] text-muted-foreground">
                  Overall accuracy across all records
                </p>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-3.5 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Both Exactly Matched</span>
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {backtestStats ? `${backtestStats.bothAccuracy}%` : "--"}
              </div>
              <div className="space-y-1 pt-1">
                <Progress
                  value={backtestStats ? backtestStats.bothAccuracy : 0}
                  className="h-1.5 bg-blue-500/15"
                />
                <p className="text-[11px] text-muted-foreground">
                  Simultaneous Commission + Fee
                </p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-3.5 sm:p-4 rounded-xl border bg-card/60 backdrop-blur-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Training Pool Size</span>
                <BarChart3 className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {recordCount}
              </div>
              <div className="space-y-1 pt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Zap className="h-3 w-3" /> Live incremental updates
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Learns from every new transaction
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Interactive Prediction Sandbox */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Live Model Prediction Sandbox
              </CardTitle>
              <CardDescription className="text-xs">
                Test how the model auto-fills values for different combinations of inputs in real time.
              </CardDescription>
            </div>
            {testResult && testResult.source !== "none" && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
                <AiIcon className="h-3.5 w-3.5" />
                {Math.round(testResult.confidence * 100)}% Confidence
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Card Type</Label>
              <Select value={testCard} onValueChange={setTestCard}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select card" />
                </SelectTrigger>
                <SelectContent>
                  {cardTypes.map((c) => (
                    <SelectItem key={c.id} value={c.name} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Transaction Type</Label>
              <Select value={testTx} onValueChange={setTestTx}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {txTypes.map((t) => (
                    <SelectItem key={t.id} value={t.name} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sent To (Portal)</Label>
              <Select value={testRecipient} onValueChange={setTestRecipient}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select portal / person" />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((r) => (
                    <SelectItem key={r.id} value={r.name} className="text-xs">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Result Banner */}
          <div className="p-4 rounded-xl border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-muted-foreground block">Predicted Commission</span>
                <span className="text-lg font-bold text-foreground">
                  {testResult && testResult.commission !== null ? `${testResult.commission}%` : "Not enough data"}
                </span>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div>
                <span className="text-xs text-muted-foreground block">Predicted Site Fee</span>
                <span className="text-lg font-bold text-foreground">
                  {testResult && testResult.siteFee !== null ? `${testResult.siteFee}%` : "0% (None)"}
                </span>
              </div>
            </div>

            <div className="text-right sm:text-right text-xs text-muted-foreground">
              <span className="font-semibold text-foreground block">
                {testResult?.source === "card_tx_portal"
                  ? "Tier 1: Card + Tx + Portal Match"
                  : testResult?.source === "card_tx"
                  ? "Tier 2: Card + Tx Fallback"
                  : "No Pattern Discovered"}
              </span>
              <span>{testResult?.explanation || "Requires at least 2 historical matches"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Top Discovered Historical Patterns */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Discovered Behavioral Patterns
            </CardTitle>
            <CardDescription className="text-xs">
              Frequently recurring fee patterns identified automatically across your transactions.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead>Combination</TableHead>
                  <TableHead>Learned Commission</TableHead>
                  <TableHead>Learned Site Fee</TableHead>
                  <TableHead className="text-center">Sample Size</TableHead>
                  <TableHead className="text-right">Consistency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPatterns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                      No patterns found yet. Add more transactions to populate the learning index.
                    </TableCell>
                  </TableRow>
                ) : (
                  topPatterns.map((p, idx) => (
                    <TableRow key={idx} className="text-xs">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[11px] font-semibold">
                            {p.cardType}
                          </Badge>
                          <span className="text-muted-foreground">+</span>
                          <span className="capitalize text-muted-foreground">{p.transactionType}</span>
                          {p.sentTo && (
                            <>
                              <span className="text-muted-foreground">→</span>
                              <Badge variant="outline" className="text-[11px]">
                                {p.sentTo}
                              </Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        {p.modalCommission}%
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.modalSiteFee > 0 ? `${p.modalSiteFee}%` : "0%"}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {p.sampleCount} txns
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            p.consistency >= 90
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          }
                        >
                          {p.consistency}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
