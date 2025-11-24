import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const AccountPanel = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [pnlPercent, setPnlPercent] = useState(0);
  const [paperMode, setPaperMode] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchAccountData = async () => {
    if (!user) return;

    try {
      // 1. Buscar balance de user_settings
      const { data: settings } = await supabase
        .from("user_settings")
        .select("balance, paper_mode")
        .eq("user_id", user.id)
        .single();

      const currentBalance = settings?.balance || 0;
      setBalance(currentBalance);
      setPaperMode(settings?.paper_mode || true);

      // 2. Buscar PnL das operações fechadas hoje
      const today = new Date().toISOString().split('T')[0];
      const { data: todayOps } = await supabase
        .from("operations")
        .select("pnl")
        .eq("user_id", user.id)
        .gte("entry_time", `${today}T00:00:00`)
        .lte("entry_time", `${today}T23:59:59`);

      const closedPnL = todayOps?.reduce((sum, op) => sum + (op.pnl || 0), 0) || 0;

      // 3. Buscar PnL das posições abertas
      const { data: activePositions } = await supabase
        .from("active_positions")
        .select("current_pnl")
        .eq("user_id", user.id);

      const activePnL = activePositions?.reduce((sum, pos) => sum + (pos.current_pnl || 0), 0) || 0;

      // 4. Calcular PnL total e percentual
      const totalPnL = closedPnL + activePnL;
      setPnl(totalPnL);
      setPnlPercent(currentBalance > 0 ? (totalPnL / currentBalance) * 100 : 0);

    } catch (error) {
      console.error("Erro ao buscar dados da conta:", error);
    }
  };

  useEffect(() => {
    fetchAccountData();
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(fetchAccountData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="p-4 border-b border-border bg-card/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Conta de Trading
          </h3>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="w-3 h-3" />
        </Button>
        
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>

      {/* Balance Card */}
      <Card className="p-4 bg-gradient-to-br from-card to-secondary border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase">Saldo Total</span>
          <Badge variant="outline" className="text-xs">
            {paperMode ? "Paper Mode" : "Binance"}
          </Badge>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold font-mono text-foreground">
            ${balance.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {pnl >= 0 ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-destructive" />
          )}
          <span className={`text-sm font-mono ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
            ${Math.abs(pnl).toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
          </span>
          <span className="text-xs text-muted-foreground">hoje</span>
        </div>
      </Card>
    </div>
  );
};
