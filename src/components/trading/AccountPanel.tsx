import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Settings, RefreshCw, AlertTriangle, CheckCircle, XCircle, WifiOff, ShieldAlert } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SyncStatus = "idle" | "syncing" | "success" | "error" | "needs_configuration";

export const AccountPanel = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [pnlPercent, setPnlPercent] = useState(0);
  const [paperMode, setPaperMode] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [binanceStatus, setBinanceStatus] = useState<"success" | "failed" | "pending">("pending");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Ref para controlar se deve tentar auto-sync (evita loop de erros)
  const shouldAutoSync = useRef(true);

  const ensureUserSettings = async () => {
    if (!user) return null;

    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSettings) return existingSettings;

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

  const fetchAccountData = useCallback(async () => {
    if (!user) return;

    try {
      const settings = await ensureUserSettings();

      if (settings) {
        setBalance(settings.balance || 0);
        setPaperMode(settings.paper_mode ?? true);
      }

      const { data: credentials } = await supabase
        .from("user_api_credentials")
        .select("test_status")
        .eq("user_id", user.id)
        .eq("broker_type", "binance")
        .maybeSingle();

      const newBinanceStatus = (credentials?.test_status as any) || "pending";
      setBinanceStatus(newBinanceStatus);
      
      // Se credenciais não são válidas, marcar como needs_configuration
      if (newBinanceStatus !== "success" && !settings?.paper_mode) {
        setSyncStatus("needs_configuration");
        shouldAutoSync.current = false;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: todayOps } = await supabase
        .from("operations")
        .select("pnl")
        .eq("user_id", user.id)
        .gte("entry_time", `${today}T00:00:00`)
        .lte("entry_time", `${today}T23:59:59`);

      const closedPnL = todayOps?.reduce((sum, op) => sum + (op.pnl || 0), 0) || 0;

      const { data: activePositions } = await supabase
        .from("active_positions")
        .select("current_pnl")
        .eq("user_id", user.id);

      const activePnL = activePositions?.reduce((sum, pos) => sum + (pos.current_pnl || 0), 0) || 0;

      const currentBalance = settings?.balance || 0;
      const totalPnL = closedPnL + activePnL;
      setPnl(totalPnL);
      setPnlPercent(currentBalance > 0 ? (totalPnL / currentBalance) * 100 : 0);

    } catch (error) {
      console.error("Erro ao buscar dados da conta:", error);
    }
  }, [user]);

  const syncRealBalance = useCallback(async () => {
    // 🔒 VALIDAÇÃO 0: Verificar se sessão é válida
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      setSyncStatus("error");
      setSyncError("Sessão expirada. Faça login novamente.");
      shouldAutoSync.current = false;
      return;
    }

    // 🔒 VALIDAÇÃO 1: Verificar modo paper (silencioso)
    if (paperMode) {
      return;
    }

    // 🔒 VALIDAÇÃO 2: Verificar se credenciais estão validadas (silencioso)
    if (binanceStatus !== "success") {
      setSyncStatus("needs_configuration");
      setSyncError("Credenciais não validadas");
      shouldAutoSync.current = false;
      return;
    }

    setSyncStatus("syncing");
    setSyncError(null);

    try {
      const { data, error } = await supabase.functions.invoke("sync-real-balance", {
        body: { broker_type: "binance", account_type: "futures" },
      });

      // Handle function invocation error
      if (error) {
        if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
          const { data: { session: recheck } } = await supabase.auth.getSession();
          if (!recheck) {
            setSyncStatus("error");
            setSyncError("Sessão expirada. Faça login novamente.");
            shouldAutoSync.current = false;
            return;
          }
        }
        throw new Error(error.message || "Erro de conexão com servidor");
      }

      // Check if response indicates an error
      if (data?.errorType === 'CREDENTIAL_ERROR') {
        setSyncStatus("needs_configuration");
        setSyncError(data.message);
        setBinanceStatus("failed");
        shouldAutoSync.current = false;
        return;
      }

      if (data?.success === false || data?.error) {
        const errorMsg = data.message || data.error || "Falha ao sincronizar";
        setSyncStatus("error");
        setSyncError(errorMsg);
        
        if (errorMsg.includes("credenciais") || errorMsg.includes("API") || errorMsg.includes("autenticação")) {
          shouldAutoSync.current = false;
          setSyncStatus("needs_configuration");
        }
        return;
      }

      // Success case - silencioso
      if (data?.success) {
        setBalance(data.balance);
        setSyncStatus("success");
        setSyncError(null);
        setLastSyncTime(new Date());
        shouldAutoSync.current = true;
      }
    } catch (error: any) {
      console.error("Erro ao sincronizar saldo:", error);
      setSyncStatus("error");
      setSyncError(error.message || "Falha na conexão");
    }
  }, [paperMode, binanceStatus]);

  const openSettings = () => setSettingsOpen(true);

  useEffect(() => {
    fetchAccountData();
    const interval = setInterval(fetchAccountData, 10000);
    return () => clearInterval(interval);
  }, [fetchAccountData]);

  // Auto-sync quando em modo REAL com credenciais válidas (COM proteção contra loop)
  useEffect(() => {
    if (!paperMode && binanceStatus === "success" && user && shouldAutoSync.current) {
      // Verificar sessão antes de iniciar ciclo de sync
      const checkSessionAndSync = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          shouldAutoSync.current = false;
          return;
        }
        syncRealBalance();
      };
      
      checkSessionAndSync();
      
      const syncInterval = setInterval(() => {
        if (shouldAutoSync.current) {
          checkSessionAndSync();
        }
      }, 30000);
      
      return () => clearInterval(syncInterval);
    }
  }, [paperMode, binanceStatus, user, syncRealBalance]);

  // Reset sync status when switching to paper mode
  useEffect(() => {
    if (paperMode) {
      setSyncStatus("idle");
      setSyncError(null);
      shouldAutoSync.current = true; // Reset ao voltar para paper
    }
  }, [paperMode]);

  const getSyncIndicator = () => {
    if (paperMode) return null;
    
    switch (syncStatus) {
      case "syncing":
        return <RefreshCw className="w-3 h-3 text-primary animate-spin" />;
      case "success":
        return <CheckCircle className="w-3 h-3 text-success" />;
      case "error":
        return <XCircle className="w-3 h-3 text-destructive" />;
      case "needs_configuration":
        return <ShieldAlert className="w-3 h-3 text-destructive" />;
      default:
        return binanceStatus === "success" ? 
          <CheckCircle className="w-3 h-3 text-success" /> : null;
    }
  };

  // Verifica se o botão de sync deve estar desabilitado
  const isSyncDisabled = syncStatus === "syncing" || binanceStatus !== "success";

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
              disabled={isSyncDisabled}
              title={
                binanceStatus !== "success" 
                  ? "Configure credenciais Binance primeiro" 
                  : "Sincronizar saldo da Binance"
              }
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === "syncing" ? 'animate-spin' : ''} ${isSyncDisabled && binanceStatus !== "success" ? 'text-muted-foreground' : ''}`} />
            </Button>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7"
            onClick={openSettings}
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
        
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>

      {/* Badge de credenciais inválidas */}
      {!paperMode && binanceStatus !== "success" && (
        <div className="mb-3">
          <Badge variant="destructive" className="w-full justify-center py-1">
            <ShieldAlert className="w-3 h-3 mr-1" />
            ⚠️ Credenciais Binance Inválidas
          </Badge>
        </div>
      )}

      {/* Erro de sincronização */}
      {syncError && !paperMode && (
        <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded-md">
          <div className="flex items-start gap-2">
            <WifiOff className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-destructive font-medium">
                {syncStatus === "needs_configuration" ? "Configuração Necessária" : "Erro de sincronização"}
              </p>
              <p className="text-xs text-destructive/80 mt-0.5">
                {syncError}
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full mt-2 h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={openSettings}
          >
            <Settings className="w-3 h-3 mr-1" />
            {syncStatus === "needs_configuration" ? "Reconectar Binance" : "Verificar Configurações"}
          </Button>
        </div>
      )}

      {/* Aviso se modo REAL sem credenciais validadas (quando não há syncError) */}
      {!paperMode && binanceStatus !== "success" && !syncError && (
        <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-destructive">
              Modo REAL sem conexão validada. Configure suas credenciais Binance.
            </p>
            <Button 
              size="sm" 
              variant="link" 
              className="h-auto p-0 text-xs text-destructive underline"
              onClick={openSettings}
            >
              Configurar agora
            </Button>
          </div>
        </div>
      )}

      {/* Balance Card */}
      <Card className="p-4 bg-gradient-to-br from-card to-secondary border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase">Saldo Total</span>
          <div className="flex items-center gap-2">
            {getSyncIndicator()}
            <Badge 
              variant={paperMode ? "outline" : "default"} 
              className={`text-xs ${!paperMode ? (binanceStatus === "success" ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground') : ''}`}
            >
              {paperMode ? "📄 Paper" : (binanceStatus === "success" ? "💰 REAL" : "⚠️ REAL")}
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
        
        {/* Last sync time indicator */}
        {!paperMode && lastSyncTime && syncStatus === "success" && (
          <div className="mt-2 text-xs text-muted-foreground">
            Última sync: {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </Card>
    </div>
  );
};