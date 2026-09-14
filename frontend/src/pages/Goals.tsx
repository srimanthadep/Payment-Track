import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  Trophy,
  Flame,
  Zap,
  Activity,
  ChevronRight,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  Wallet,
} from "lucide-react";
import {
  goalsService,
  Goal,
  GoalType,
  GOAL_TYPE_LABELS,
} from "@/services/goalsService";
import { activityLogService } from "@/services/activityLogService";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  addMonths,
  addWeeks,
} from "date-fns";

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

interface GoalProgress {
  current: number;
  percent: number;
}

const Goals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [progress, setProgress] = useState<Record<string, GoalProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const [formData, setFormData] = useState({
    goal_type: "" as GoalType | "",
    target_amount: "",
    period: "this_month" as "this_month" | "next_month" | "this_week" | "next_week" | "custom",
    period_start: "",
    period_end: "",
  });

  // Auth
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch goals
  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await goalsService.getGoals(user.id);
      setGoals(data);

      const progressMap: Record<string, GoalProgress> = {};
      await Promise.all(
        data.map(async (goal) => {
          try {
            const p = await goalsService.calculateProgress(goal, user.id);
            progressMap[goal.id] = p;
          } catch {
            progressMap[goal.id] = { current: 0, percent: 0 };
          }
        })
      );
      setProgress(progressMap);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load goals",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Realtime subscription for goals, transactions, and expenses
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("goals-realtime-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goals",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchGoals();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchGoals();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchGoals]);

  const getPeriodDates = (periodType: string): { start: string; end: string } => {
    const now = new Date();
    switch (periodType) {
      case "this_month":
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
        };
      case "next_month":
        return {
          start: format(startOfMonth(addMonths(now, 1)), "yyyy-MM-dd"),
          end: format(endOfMonth(addMonths(now, 1)), "yyyy-MM-dd"),
        };
      case "this_week":
        return {
          start: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      case "next_week":
        return {
          start: format(startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end: format(endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      default:
        return { start: "", end: "" };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.goal_type || !formData.target_amount) return;

    let periodStart = formData.period_start;
    let periodEnd = formData.period_end;

    if (formData.period !== "custom") {
      const dates = getPeriodDates(formData.period);
      periodStart = dates.start;
      periodEnd = dates.end;
    }

    if (!periodStart || !periodEnd) {
      toast({
        title: "Error",
        description: "Please select a valid period",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingGoal) {
        await goalsService.updateGoal(editingGoal.id, {
          goal_type: formData.goal_type,
          target_amount: parseFloat(formData.target_amount),
          period_start: periodStart,
          period_end: periodEnd,
        });
        activityLogService.log(
          "goal.updated",
          "goal",
          `Updated goal: ${GOAL_TYPE_LABELS[formData.goal_type as GoalType] ?? formData.goal_type} — Target: ₹${parseFloat(formData.target_amount).toLocaleString("en-IN")}`,
          {
            goal_id: editingGoal.id,
            goal_type: formData.goal_type,
            old_target: editingGoal.target_amount,
            new_target: parseFloat(formData.target_amount),
          }
        );
        toast({ title: "Goal Updated", description: "Your goal has been updated successfully" });
      } else {
        await goalsService.createGoal({
          user_id: user.id,
          goal_type: formData.goal_type,
          target_amount: parseFloat(formData.target_amount),
          period_start: periodStart,
          period_end: periodEnd,
        });
        activityLogService.log(
          "goal.created",
          "goal",
          `Created goal: ${GOAL_TYPE_LABELS[formData.goal_type as GoalType] ?? formData.goal_type} — Target: ₹${parseFloat(formData.target_amount).toLocaleString("en-IN")}`,
          {
            goal_type: formData.goal_type,
            target_amount: parseFloat(formData.target_amount),
            period_start: periodStart,
            period_end: periodEnd,
          }
        );
        toast({ title: "🎯 Goal Created!", description: "Track your progress on the Goals page" });
      }

      setDialogOpen(false);
      setEditingGoal(null);
      resetForm();
      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save goal",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      goal_type: goal.goal_type as GoalType,
      target_amount: goal.target_amount.toString(),
      period: "custom",
      period_start: goal.period_start,
      period_end: goal.period_end,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await goalsService.deleteGoal(deleteConfirmId);
      activityLogService.log(
        "goal.deleted",
        "goal",
        `Deleted goal (ID: ${deleteConfirmId})`,
        { goal_id: deleteConfirmId }
      );
      toast({ title: "Goal Deleted", description: "Goal removed successfully" });
      setDeleteConfirmId(null);
      fetchGoals();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      goal_type: "",
      target_amount: "",
      period: "this_month",
      period_start: "",
      period_end: "",
    });
  };

  const today = new Date().toISOString().split("T")[0];
  const activeGoals = goals.filter((g) => g.period_end >= today);
  const completedGoals = goals.filter((g) => g.period_end < today);

  const getGoalIcon = (type: string) => {
    switch (type) {
      case "monthly_profit":
      case "weekly_profit":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "monthly_volume":
      case "weekly_volume":
        return <Activity className="h-4 w-4 text-purple-500" />;
      case "monthly_commission":
        return <IndianRupee className="h-4 w-4 text-blue-500" />;
      default:
        return <Zap className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 text-[10px] font-semibold gap-1">
          <Trophy className="h-3 w-3" /> Achieved
        </Badge>
      );
    }
    if (percent >= 75) {
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-[10px] font-semibold gap-1">
          <Flame className="h-3 w-3" /> Almost there
        </Badge>
      );
    }
    if (percent >= 40) {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 text-[10px] font-semibold gap-1">
          <Zap className="h-3 w-3" /> On track
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground bg-muted/40">
        In Progress
      </Badge>
    );
  };

  const achievedCount = activeGoals.filter((g) => (progress[g.id]?.percent || 0) >= 100).length;
  const onTrackCount = activeGoals.filter((g) => {
    const p = progress[g.id]?.percent || 0;
    return p >= 40 && p < 100;
  }).length;
  const avgProgress = Math.round(
    activeGoals.reduce((sum, g) => sum + (progress[g.id]?.percent || 0), 0) /
      Math.max(activeGoals.length, 1)
  );

  if (!user) return null;

  return (
    <DashboardLayout>
      <PullToRefresh onRefresh={fetchGoals}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 max-w-7xl mx-auto"
        >
          {/* Header Matching System Design */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                  Goals & Targets
                </h1>
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20">
                  Milestones
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Set and monitor your financial volume, profit, and transaction targets
              </p>
            </div>

            <Button
              onClick={() => {
                setEditingGoal(null);
                resetForm();
                setDialogOpen(true);
              }}
              className="gap-1.5 h-9 text-xs sm:text-sm shadow-xs self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </div>

          {/* 4 Summary Stats Cards matching StatsCards.tsx styling */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 items-stretch">
            <Card className="overflow-hidden relative shadow-xs border-border/80 h-full flex flex-col justify-between hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight text-muted-foreground">
                  Active Goals
                </CardTitle>
                <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex-shrink-0 shadow-xs">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl sm:text-2xl font-bold">{activeGoals.length}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Currently being tracked</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden relative shadow-xs border-border/80 h-full flex flex-col justify-between hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight text-muted-foreground">
                  Achieved
                </CardTitle>
                <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex-shrink-0 shadow-xs">
                  <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {achievedCount}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">100%+ target reached</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden relative shadow-xs border-border/80 h-full flex flex-col justify-between hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight text-muted-foreground">
                  On Track
                </CardTitle>
                <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex-shrink-0 shadow-xs">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {onTrackCount}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Healthy progress velocity</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden relative shadow-xs border-border/80 h-full flex flex-col justify-between hover:border-primary/40 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight text-muted-foreground">
                  Avg Progress
                </CardTitle>
                <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex-shrink-0 shadow-xs">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {avgProgress}%
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Overall completion rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Goals Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse border-border/70">
                  <CardContent className="p-5 space-y-3">
                    <div className="h-4 w-1/2 bg-muted rounded" />
                    <div className="h-6 w-3/4 bg-muted rounded" />
                    <div className="h-2 w-full bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeGoals.length === 0 ? (
            <EmptyState
              icon={<Target className="h-8 w-8 text-primary" />}
              title="No Active Goals"
              description="Set your first financial milestone to track your monthly profit, turnover volume, or commission targets."
              actionLabel="Create Your First Goal"
              onAction={() => {
                resetForm();
                setDialogOpen(true);
              }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {activeGoals.map((goal, index) => {
                  const p = progress[goal.id] || { current: 0, percent: 0 };
                  const goalInfo =
                    GOAL_TYPE_LABELS[goal.goal_type as GoalType] || {
                      label: goal.goal_type,
                    };
                  const isAmount = goal.goal_type !== "daily_transactions";

                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-border/80 shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between">
                        <CardHeader className="pb-3 pt-4 px-4 sm:px-5 flex flex-row items-start justify-between space-y-0">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-muted/60 border border-border/60">
                              {getGoalIcon(goal.goal_type)}
                            </div>
                            <div>
                              <CardTitle className="text-sm font-bold text-foreground">
                                {goalInfo.label}
                              </CardTitle>
                              <CardDescription className="text-[11px] mt-0.5 flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(goal.period_start), "dd MMM")} –{" "}
                                {format(new Date(goal.period_end), "dd MMM yyyy")}
                              </CardDescription>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEdit(goal)}
                              title="Edit Goal"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteConfirmId(goal.id)}
                              title="Delete Goal"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="px-4 sm:px-5 pb-4 pt-1 space-y-3">
                          {/* Value comparison */}
                          <div className="flex items-baseline justify-between pt-1">
                            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                              {isAmount ? formatINR(p.current) : p.current}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              / {isAmount ? formatINR(goal.target_amount) : goal.target_amount}
                            </span>
                          </div>

                          {/* Seamless Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${
                                  p.percent >= 100
                                    ? "bg-emerald-500"
                                    : p.percent >= 75
                                    ? "bg-amber-500"
                                    : "bg-primary"
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(p.percent, 100)}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                          </div>

                          {/* Status Badge & Percentage */}
                          <div className="flex items-center justify-between pt-1 border-t border-border/40">
                            {getStatusBadge(p.percent)}
                            <span className="text-xs font-bold text-foreground">
                              {Math.round(p.percent)}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Completed Goals History */}
          {completedGoals.length > 0 && (
            <div className="space-y-3 pt-2">
              <Button
                variant="ghost"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 p-0 h-auto"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${showCompleted ? "rotate-90" : ""}`}
                />
                Past Goals Archive ({completedGoals.length})
              </Button>

              <AnimatePresence>
                {showCompleted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {completedGoals.map((goal) => {
                      const p = progress[goal.id] || { current: 0, percent: 0 };
                      const goalInfo =
                        GOAL_TYPE_LABELS[goal.goal_type as GoalType] || {
                          label: goal.goal_type,
                        };
                      const isAmount = goal.goal_type !== "daily_transactions";

                      return (
                        <Card
                          key={goal.id}
                          className="border-border/60 bg-muted/20 opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getGoalIcon(goal.goal_type)}
                                <span className="text-xs font-bold text-foreground">{goalInfo.label}</span>
                              </div>
                              {p.percent >= 100 ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 text-[10px]">
                                  Achieved
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Missed ({Math.round(p.percent)}%)
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {format(new Date(goal.period_start), "dd MMM")} –{" "}
                              {format(new Date(goal.period_end), "dd MMM yyyy")} •{" "}
                              {isAmount
                                ? `${formatINR(p.current)} / ${formatINR(goal.target_amount)}`
                                : `${p.current} / ${goal.target_amount}`}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </PullToRefresh>

      {/* Create / Edit Goal Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingGoal(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {editingGoal ? "Edit Goal" : "Create New Goal"}
            </DialogTitle>
            <DialogDescription>
              {editingGoal
                ? "Update your milestone target or date range"
                : "Set a financial target to track your progress"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <Select
                value={formData.goal_type}
                onValueChange={(v) =>
                  setFormData({ ...formData, goal_type: v as GoalType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select goal type..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_TYPE_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {getGoalIcon(key)}
                        <span>{val.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.goal_type && (
                <p className="text-xs text-muted-foreground">
                  {GOAL_TYPE_LABELS[formData.goal_type as GoalType]?.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                {formData.goal_type === "daily_transactions"
                  ? "Target Count"
                  : "Target Amount (₹)"}
              </Label>
              <div className="relative">
                {formData.goal_type !== "daily_transactions" && (
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  type="number"
                  step={formData.goal_type === "daily_transactions" ? "1" : "0.01"}
                  min="1"
                  value={formData.target_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, target_amount: e.target.value })
                  }
                  className={formData.goal_type !== "daily_transactions" ? "pl-9" : ""}
                  placeholder={
                    formData.goal_type === "daily_transactions" ? "e.g., 20" : "e.g., 50000"
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={formData.period}
                onValueChange={(v: any) =>
                  setFormData({ ...formData, period: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">
                    This Month ({format(startOfMonth(new Date()), "dd MMM")} –{" "}
                    {format(endOfMonth(new Date()), "dd MMM")})
                  </SelectItem>
                  <SelectItem value="next_month">
                    Next Month ({format(startOfMonth(addMonths(new Date(), 1)), "dd MMM")} –{" "}
                    {format(endOfMonth(addMonths(new Date(), 1)), "dd MMM")})
                  </SelectItem>
                  <SelectItem value="this_week">
                    This Week ({format(startOfWeek(new Date(), { weekStartsOn: 1 }), "dd MMM")} –{" "}
                    {format(endOfWeek(new Date(), { weekStartsOn: 1 }), "dd MMM")})
                  </SelectItem>
                  <SelectItem value="next_week">
                    Next Week
                  </SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.period === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) =>
                      setFormData({ ...formData, period_start: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) =>
                      setFormData({ ...formData, period_end: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingGoal(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="gap-1.5">
                <Target className="h-4 w-4" />
                {editingGoal ? "Update Goal" : "Create Goal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this goal and its progress data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Goals;
