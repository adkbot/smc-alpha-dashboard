import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Settings, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const AccountPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [pnlPercent, setPnlPercent] = useState(0);
  const [paperMode, setPaperMode] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncingBalance, setSyncingBalance] = useState(false);
  const [binanceStatus, setBinanceStatus] = useState<"success" | "failed" | "pending">("pending");

  const ensureUserSettings = async () => {
    if (!user) return null;

    // Primeiro tenta buscar
    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSettings) return existingSettings;

    // Se não existe, criar com UPSERT
    const { data: newSettings, error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        balance: 10000,
        paper_mode: true,
        risk_per_trade: 0.06,
        max_positions: 3,
        leverage: 20,
        bot_status: 'stopped',
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar user_settings:", error);
      return null;
    }

    return newSettings;
  };

  const fetchAccountData = async () => {
    if (!user) return;

    try {
      // 1. Garantir que user_settings existe
      const settings = await ensureUserSettings();

      if (settings) {
        setBalance(settings.balance || 0);
        setPaperMode(settings.paper_mode ?? true);
      }

      // 2. Buscar status das credenciais Binance
      const { data: credentials } = await supabase
        .from("user_api_credentials")
        .select("test_status")
        .eq("user_id", user.id)
        .eq("broker_type", "binance")
        .maybeSingle();

      if (credentials) {
        setBinanceStatus(credentials.test_status as any || "pending");
      }

      // 3. Buscar PnL das operações fechadas hoje
      const today = new Date().toISOString().split('T')[0];
      const { data: todayOps } = await supabase
        .from("operations")
        .select("pnl")
        .eq("user_id", user.id)
        .gte("entry_time", `${today}T00:00:00`)
        .lte("entry_time", `${today}T23:59:59`);

      const closedPnL = todayOps?.reduce((sum, op) => sum + (op.pnl || 0), 0) || 0;

      // 4. Buscar PnL das posições abertas
      const { data: activePositions } = await supabase
        .from("active_positions")
        .select("current_pnl")
        .eq("user_id", user.id);

      const activePnL = activePositions?.reduce((sum, pos) => sum + (pos.current_pnl || 0), 0) || 0;

      // 5. Calcular PnL total e percentual
      const currentBalance = settings?.balance || 0;
      const totalPnL = closedPnL + activePnL;
      setPnl(totalPnL);
      setPnlPercent(currentBalance > 0 ? (totalPnL / currentBalance) * 100 : 0);

    } catch (error) {
      console.error("Erro ao buscar dados da conta:", error);
    }
  };

  const syncRealBalance = async () => {
    if (paperMode) {
      toast({
        title: "Modo Paper ativo",
        description: "Desative o Paper Mode nas configurações para sincronizar saldo real.",
        variant: "destructive",
      });
      return;
    }

    setSyncingBalance(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-real-balance", {
        body: { broker_type: "binance" },
      });

      if (error) throw error;

      if (data?.balance) {
        setBalance(data.balance);
        toast({
          title: "Saldo sincronizado",
          description: `Saldo real: $${data.balance.toFixed(2)}`,
        });
      }
    } catch (error: any) {
      console.error("Erro ao sincronizar saldo:", error);
      toast({
        title: "Erro ao sincronizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncingBalance(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(fetchAccountData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Sincronizar saldo automaticamente quando em modo REAL e conectado
  useEffect(() => {
    if (!paperMode && binanceStatus === "success" && user) {
      syncRealBalance();
    }
  }, [paperMode, binanceStatus, user]);

  return (
    <div className="p-4 border-b border-border bg-card/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Conta de Trading
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {!paperMode && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0"
              onClick={syncRealBalance}
              disabled={syncingBalance}
              title="Sincronizar saldo da Binance"
            >
              <RefreshCw className={`w-3 h-3 ${syncingBalance ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
        
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>

      {/* Aviso se modo REAL sem credenciais validadas */}
      {!paperMode && binanceStatus !== "success" && (
        <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">
            Modo REAL sem conexão validada. Configure suas credenciais Binance.
          </p>
        </div>
      )}

      {/* Balance Card */}
      <Card className="p-4 bg-gradient-to-br from-card to-secondary border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase">Saldo Total</span>
          <div className="flex items-center gap-2">
            {!paperMode && binanceStatus === "success" && (
              <CheckCircle className="w-3 h-3 text-success" />
            )}
            <Badge 
              variant={paperMode ? "outline" : "default"} 
              className={`text-xs ${!paperMode ? 'bg-success text-success-foreground' : ''}`}
            >
              {paperMode ? "📄 Paper" : "💰 REAL"}
            </Badge>
          </div>
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