import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, Award, IndianRupee, ArrowUpRight, User } from "lucide-react";
import { startOfMonth, subDays, format } from "date-fns";

interface UserRanking {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  totalVolume: number;
  totalCommission: number;
  totalProfit: number;
  txCount: number;
}

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

export const AdminLeaderboard = () => {
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [period, setPeriod] = useState<"month" | "all">("month");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url");

      const profileMap: Record<string, { name: string; email: string; avatarUrl?: string }> = {};
      profiles?.forEach((p) => {
        profileMap[p.id] = {
          name: p.full_name || p.email?.split("@")[0] || "User",
          email: p.email || "",
          avatarUrl: p.avatar_url || undefined,
        };
      });

      // 2. Fetch transactions
      let query = supabase
        .from("transactions")
        .select("user_id, amount, commission, site_fee, profit, transaction_date");

      if (period === "month") {
        const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
        query = query.gte("transaction_date", monthStart);
      }

      const { data: txns } = await query;

      // 3. Aggregate per user
      const userAgg: Record<
        string,
        { totalVolume: number; totalCommission: number; totalProfit: number; txCount: number }
      > = {};

      txns?.forEach((t) => {
        const uid = t.user_id;
        if (!uid) return;
        if (!userAgg[uid]) {
          userAgg[uid] = { totalVolume: 0, totalCommission: 0, totalProfit: 0, txCount: 0 };
        }
        userAgg[uid].totalVolume += Number(t.amount || 0);
        userAgg[uid].totalCommission += Number(t.commission || 0);
        const profit =
          t.profit !== undefined && t.profit !== null
            ? Number(t.profit)
            : Number(t.commission || 0) - Number(t.site_fee || 0);
        userAgg[uid].totalProfit += profit;
        userAgg[uid].txCount += 1;
      });

      // 4. Transform to rankings list
      const list: UserRanking[] = Object.keys(userAgg).map((uid) => {
        const p = profileMap[uid] || { name: `User ${uid.slice(0, 4)}`, email: "" };
        return {
          userId: uid,
          name: p.name,
          email: p.email,
          avatarUrl: p.avatarUrl,
          totalVolume: userAgg[uid].totalVolume,
          totalCommission: userAgg[uid].totalCommission,
          totalProfit: userAgg[uid].totalProfit,
          txCount: userAgg[uid].txCount,
        };
      });

      // Sort by Net Profit descending
      list.sort((a, b) => b.totalProfit - a.totalProfit);
      setRankings(list);
    } catch (e) {
      console.error("Error fetching leaderboard:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs shadow-md ring-2 ring-amber-300">
            🥇
          </div>
        );
      case 1:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-bold text-xs shadow-md ring-2 ring-slate-200">
            🥈
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-bold text-xs shadow-md ring-2 ring-amber-600">
            🥉
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground font-bold text-xs">
            #{index + 1}
          </div>
        );
    }
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Leaderboard & Multi-User Rankings
            </CardTitle>
            <CardDescription className="text-xs">
              Performance rankings across all active team accounts
            </CardDescription>
          </div>

          <Tabs value={period} onValueChange={(v) => setPeriod(v as "month" | "all")}>
            <TabsList className="grid grid-cols-2 w-48">
              <TabsTrigger value="month" className="text-xs">
                This Month
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
            Calculating rankings...
          </div>
        ) : rankings.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No transactions found for this period
          </div>
        ) : (
          <div className="space-y-2">
            {rankings.map((user, idx) => (
              <div
                key={user.userId}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                  idx === 0
                    ? "bg-amber-500/5 border-amber-500/30 shadow-xs"
                    : idx === 1
                    ? "bg-muted/40 border-border/70"
                    : "bg-card border-border/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {getRankBadge(idx)}

                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{user.name}</span>
                      {idx === 0 && (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-[10px] gap-1 px-1.5 py-0">
                          <Crown className="h-3 w-3" /> Top Earner
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.email} • {user.txCount} transactions
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-left sm:text-right ml-10 sm:ml-0">
                  <div>
                    <div className="text-xs text-muted-foreground">Turnover Volume</div>
                    <div className="text-sm font-semibold">{formatINR(user.totalVolume)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">Net Profit</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(user.totalProfit)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
