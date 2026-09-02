import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, ChevronRight, Trophy, Flame, Zap, TrendingUp, Activity, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import {
  goalsService,
  Goal,
  GoalType,
  GOAL_TYPE_LABELS,
} from "@/services/goalsService";

interface GoalProgressWidgetProps {
  userId: string;
}

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

export const GoalProgressWidget = ({ userId }: GoalProgressWidgetProps) => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [progress, setProgress] = useState<
    Record<string, { current: number; percent: number }>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActiveGoals = async () => {
      try {
        const activeGoals = await goalsService.getActiveGoals(userId);
        setGoals(activeGoals.slice(0, 3)); // Show top 3 on dashboard

        const progressMap: Record<string, { current: number; percent: number }> =
          {};
        await Promise.all(
          activeGoals.slice(0, 3).map(async (goal) => {
            try {
              const p = await goalsService.calculateProgress(goal, userId);
              progressMap[goal.id] = p;
            } catch {
              progressMap[goal.id] = { current: 0, percent: 0 };
            }
          })
        );
        setProgress(progressMap);
      } catch {
        // Silently fail on dashboard widget
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveGoals();
  }, [userId]);

  const getGoalIcon = (type: string) => {
    switch (type) {
      case "monthly_profit":
      case "weekly_profit":
        return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
      case "monthly_volume":
      case "weekly_volume":
        return <Activity className="h-3.5 w-3.5 text-purple-500" />;
      case "monthly_commission":
        return <IndianRupee className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <Zap className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse border-border/80 shadow-xs">
        <CardContent className="p-5 space-y-3">
          <div className="h-4 w-1/3 bg-muted rounded" />
          <div className="h-3 w-2/3 bg-muted rounded" />
          <div className="h-2 w-full bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card
        className="border-dashed border border-border/80 hover:border-primary/40 transition-colors cursor-pointer group shadow-xs"
        onClick={() => navigate("/goals")}
      >
        <CardContent className="flex items-center justify-center py-7 text-center">
          <div className="space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto text-primary group-hover:scale-105 transition-transform">
              <Target className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-foreground">
              Set Your Goals
            </p>
            <p className="text-[11px] text-muted-foreground">
              Track targets for profit & volume
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <CardTitle className="text-sm sm:text-base font-semibold">Active Goals</CardTitle>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
              {goals.length}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 sm:h-7 text-[11px] sm:text-xs gap-1 text-muted-foreground hover:text-foreground px-2 rounded-md hover:bg-muted/60"
            onClick={() => navigate("/goals")}
          >
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-5 pt-1 sm:pt-2 pb-3 sm:pb-4 space-y-3">
        {goals.map((goal) => {
          const p = progress[goal.id] || { current: 0, percent: 0 };
          const goalInfo =
            GOAL_TYPE_LABELS[goal.goal_type as GoalType] || {
              label: goal.goal_type,
            };
          const isAmount = goal.goal_type !== "daily_transactions";

          return (
            <div key={goal.id} className="space-y-1.5 p-2 rounded-lg bg-card hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-muted/60">
                    {getGoalIcon(goal.goal_type)}
                  </div>
                  <span className="text-xs font-semibold truncate max-w-[140px] text-foreground">
                    {goalInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">
                    {Math.round(p.percent)}%
                  </span>
                </div>
              </div>

              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
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

              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                <span>{isAmount ? formatINR(p.current) : p.current}</span>
                <span>
                  {isAmount ? formatINR(goal.target_amount) : goal.target_amount}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
