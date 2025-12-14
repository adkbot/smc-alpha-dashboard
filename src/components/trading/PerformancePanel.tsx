import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Trophy, 
  Activity,
  BarChart3,
  Zap,
  Award
} from "lucide-react";

interface PerformanceStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnL: number;
  avgRiskReward: number;
  currentStreak: number;
  streakType: "WIN" | "LOSS" | "NONE";
  bestTrade: number;
  worstTrade: number;
  todayTrades: number;
  todayPnL: number;
}

export const PerformancePanel = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PerformanceStats>({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalPnL: 0,
    avgRiskReward: 0,
    currentStreak: 0,
    streakType: "NONE",
    bestTrade: 0,
    worstTrade: 0,
    todayTrades: 0,
    todayPnL: 0,
  });

  const fetchPerformance = useCallback(async () => {
    if (!user) return;

    try {
      // Buscar todas as operações fechadas
      const { data: operations } = await supabase
        .from("operations")
        .select("result, pnl, risk_reward, exit_time")
        .eq("user_id", user.id)
        .not("result", "eq", "OPEN")
        .order("exit_time", { ascending: false });

      if (!operations || operations.length === 0) {
        return;
      }

      const wins = operations.filter(op => op.result === "WIN").length;
      const losses = operations.filter(op => op.result === "LOSS").length;
      const totalTrades = wins + losses;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

      const totalPnL = operations.reduce((sum, op) => sum + (op.pnl || 0), 0);
      const avgRiskReward = operations.reduce((sum, op) => sum + (op.risk_reward || 0), 0) / (totalTrades || 1);

      // Calcular streak
      let currentStreak = 0;
      let streakType: "WIN" | "LOSS" | "NONE" = "NONE";
      
      if (operations.length > 0) {
        const lastResult = operations[0].result;
        streakType = lastResult === "WIN" ? "WIN" : "LOSS";
        
        for (const op of operations) {
          if (op.result === lastResult) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Melhor e pior trade
      const pnlValues = operations.map(op => op.pnl || 0);
      const bestTrade = Math.max(...pnlValues, 0);
      const worstTrade = Math.min(...pnlValues, 0);

      // Trades de hoje
      const today = new Date().toISOString().split('T')[0];
      const todayOps = operations.filter(op => 
        op.exit_time && op.exit_time.startsWith(today)
      );
      const todayTrades = todayOps.length;
      const todayPnL = todayOps.reduce((sum, op) => sum + (op.pnl || 0), 0);

      setStats({
        totalTrades,
        wins,
        losses,
        winRate,
        totalPnL,
        avgRiskReward,
        currentStreak,
        streakType,
        bestTrade,
        worstTrade,
        todayTrades,
        todayPnL,
      });
    } catch (error) {
      console.error("Erro ao buscar performance:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchPerformance();
    const interval = setInterval(fetchPerformance, 15000);
    return () => clearInterval(interval);
  }, [fetchPerformance]);

  return (
    <Card className="p-4 m-4 bg-gradient-to-br from-card to-secondary/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Performance
        </h3>
        <Badge variant="outline" className="text-xs">
          {stats.totalTrades} trades
        </Badge>
      </div>

      {/* Win Rate Visual */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Win Rate</span>
          <span className={`text-sm font-bold ${stats.winRate >= 50 ? 'text-success' : 'text-destructive'}`}>
            {stats.winRate.toFixed(1)}%
          </span>
        </div>
        <Progress 
          value={stats.winRate} 
          className="h-2"
        />
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span className="text-success">{stats.wins}W</span>
          <span className="text-destructive">{stats.losses}L</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Total PnL */}
        <div className="p-2 bg-background/50 rounded-lg border border-border">
          <div className="flex items-center gap-1 mb-1">
            {stats.totalPnL >= 0 ? (
              <TrendingUp className="w-3 h-3 text-success" />
            ) : (
              <TrendingDown className="w-3 h-3 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">Total PnL</span>
          </div>
          <span className={`text-lg font-bold font-mono ${stats.totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
            ${stats.totalPnL.toFixed(2)}
          </span>
        </div>

        {/* Média R:R */}
        <div className="p-2 bg-background/50 rounded-lg border border-border">
          <div className="flex items-center gap-1 mb-1">
            <Target className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">Média R:R</span>
          </div>
          <span className="text-lg font-bold font-mono text-foreground">
            1:{stats.avgRiskReward.toFixed(1)}
          </span>
        </div>

        {/* Streak */}
        <div className="p-2 bg-background/50 rounded-lg border border-border">
          <div className="flex items-center gap-1 mb-1">
            <Zap className={`w-3 h-3 ${stats.streakType === 'WIN' ? 'text-success' : stats.streakType === 'LOSS' ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground">Streak</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-lg font-bold font-mono ${stats.streakType === 'WIN' ? 'text-success' : stats.streakType === 'LOSS' ? 'text-destructive' : 'text-foreground'}`}>
              {stats.currentStreak}
            </span>
            {stats.streakType !== "NONE" && (
              <Badge 
                variant={stats.streakType === 'WIN' ? 'default' : 'destructive'} 
                className="text-[10px] px-1"
              >
                {stats.streakType}
              </Badge>
            )}
          </div>
        </div>

        {/* Hoje */}
        <div className="p-2 bg-background/50 rounded-lg border border-border">
          <div className="flex items-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">Hoje</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold font-mono text-foreground">
              {stats.todayTrades}
            </span>
            <span className={`text-xs font-mono ${stats.todayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${stats.todayPnL.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Best/Worst Trades */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <div className="flex-1 text-center p-2 bg-success/10 rounded">
          <Trophy className="w-3 h-3 text-success mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">Melhor</div>
          <div className="text-sm font-bold text-success font-mono">
            +${stats.bestTrade.toFixed(2)}
          </div>
        </div>
        <div className="flex-1 text-center p-2 bg-destructive/10 rounded">
          <Award className="w-3 h-3 text-destructive mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">Pior</div>
          <div className="text-sm font-bold text-destructive font-mono">
            ${stats.worstTrade.toFixed(2)}
          </div>
        </div>
      </div>
    </Card>
  );
};
