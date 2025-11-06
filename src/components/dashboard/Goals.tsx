import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Goal {
  id: string;
  goal_type: "monthly" | "yearly";
  target_amount: number;
  period_start: string;
  period_end: string;
}

interface GoalsProps {
  userId: string;
}

export const Goals = ({ userId }: GoalsProps) => {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentProgress, setCurrentProgress] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    goal_type: "monthly" as "monthly" | "yearly",
    target_amount: "",
    period_start: "",
    period_end: "",
  });

  useEffect(() => {
    fetchGoals();
  }, [userId]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("period_start", { ascending: false });

      if (error) throw error;

      setGoals(data || []);

      // Calculate progress for each goal
      if (data && data.length > 0) {
        const progressMap: Record<string, number> = {};
        for (const goal of data) {
          const progress = await calculateProgress(goal);
          progressMap[goal.id] = progress;
        }
        setCurrentProgress(progressMap);
      }
    } catch (error: any) {
      console.error("Error fetching goals:", error);
      toast({
        title: "Error",
        description: "Failed to fetch goals",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = async (goal: Goal): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("commission")
        .eq("user_id", userId)
        .gte("transaction_date", goal.period_start)
        .lte("transaction_date", goal.period_end);

      if (error) throw error;

      const totalProfit = (data || []).reduce((sum, t) => sum + Number(t.commission || 0), 0);
      const percentage = (totalProfit / Number(goal.target_amount)) * 100;
      return Math.min(percentage, 100);
    } catch (error) {
      console.error("Error calculating progress:", error);
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("goals").insert({
        user_id: userId,
        goal_type: formData.goal_type,
        target_amount: parseFloat(formData.target_amount),
        period_start: formData.period_start,
        period_end: formData.period_end,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal created successfully",
      });

      setDialogOpen(false);
      setFormData({
        goal_type: "monthly",
        target_amount: "",
        period_start: "",
        period_end: "",
      });
      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create goal",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      const { error } = await supabase.from("goals").delete().eq("id", goalId);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal deleted successfully",
      });
      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCurrentPeriodDates = (type: "monthly" | "yearly") => {
    const now = new Date();
    if (type === "monthly") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: format(start, "yyyy-MM-dd"),
        end: format(end, "yyyy-MM-dd"),
      };
    } else {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return {
        start: format(start, "yyyy-MM-dd"),
        end: format(end, "yyyy-MM-dd"),
      };
    }
  };

  const handleGoalTypeChange = (type: "monthly" | "yearly") => {
    const dates = getCurrentPeriodDates(type);
    setFormData({
      ...formData,
      goal_type: type,
      period_start: dates.start,
      period_end: dates.end,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading goals...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Profit Goals</h3>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No goals set. Create a goal to track your profit targets!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const progress = currentProgress[goal.id] || 0;
            const isCompleted = progress >= 100;

            return (
              <Card key={goal.id} className={isCompleted ? "border-success" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base capitalize">{goal.goal_type} Goal</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(goal.period_start), "MMM d")} - {format(new Date(goal.period_end), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(goal.id)}
                      className="h-7 w-7 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Target</span>
                    <span className="font-semibold">{formatCurrency(goal.target_amount)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className={isCompleted ? "text-success font-semibold" : ""}>
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  {isCompleted && (
                    <div className="text-xs text-success font-medium text-center">
                      🎉 Goal Achieved!
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Goal</DialogTitle>
            <DialogDescription>Set a profit target for a specific period</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <Select value={formData.goal_type} onValueChange={handleGoalTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Goal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

