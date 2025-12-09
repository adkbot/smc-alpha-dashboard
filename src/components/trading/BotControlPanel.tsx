import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, AlertCircle, CheckCircle, Loader2, Zap, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface BotStatus {
  status: "stopped" | "running" | "paused";
  lastAction: string;
  activePositions: number;
  todayTrades: number;
  paperMode: boolean;
  binanceConnected: boolean;
  autoTradingEnabled: boolean;
}

export const BotControlPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [botStatus, setBotStatus] = useState<BotStatus>({
    status: "stopped",
    lastAction: "Nunca iniciado",
    activePositions: 0,
    todayTrades: 0,
    paperMode: true,
    binanceConnected: false,
    autoTradingEnabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [autoToggleLoading, setAutoToggleLoading] = useState(false);

  const ensureUserSettings = async () => {
    if (!user) return null;

    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSettings) return existingSettings;

    // Criar com UPSERT se não existe
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

  const fetchBotStatus = async () => {
    if (!user) return;

    try {
      // Garantir que settings existe
      const settings = await ensureUserSettings();

      // Buscar status das credenciais Binance
      const { data: credentials } = await supabase
        .from("user_api_credentials")
        .select("test_status")
        .eq("user_id", user.id)
        .eq("broker_type", "binance")
        .maybeSingle();

      const binanceConnected = credentials?.test_status === "success";
      const isRealMode = !settings?.paper_mode;
      const currentBotStatus = settings?.bot_status as "stopped" | "running" | "paused" || "stopped";
      const autoTradingEnabled = settings?.auto_trading_enabled ?? false;

      // 🛑 AUTO-PROTEÇÃO: Se bot está rodando em modo REAL mas Binance desconectou
      if (currentBotStatus === "running" && isRealMode && !binanceConnected) {
        console.log("🛑 Auto-proteção: Parando bot e desabilitando Auto Trading - Binance desconectada em modo REAL");
        
        // Parar bot E desabilitar auto trading
        await supabase
          .from("user_settings")
          .update({ 
            bot_status: "stopped",
            auto_trading_enabled: false 
          })
          .eq("user_id", user.id);
        
        toast({
          title: "⚠️ Bot Parado Automaticamente",
          description: "Conexão com Binance perdida. Auto Trading desabilitado. Reconecte para continuar em modo REAL.",
          variant: "destructive",
        });

        setBotStatus({
          status: "stopped",
          lastAction: new Date().toLocaleTimeString(),
          activePositions: 0,
          todayTrades: 0,
          paperMode: settings?.paper_mode ?? true,
          binanceConnected: false,
          autoTradingEnabled: false, // Desabilitado automaticamente
        });
        return;
      }

      // 🛑 AUTO-PROTEÇÃO 2: Se Auto Trading está ligado mas Binance não está conectada em modo REAL
      if (autoTradingEnabled && isRealMode && !binanceConnected) {
        console.log("🛑 Auto-proteção: Desabilitando Auto Trading - Binance desconectada em modo REAL");
        
        await supabase
          .from("user_settings")
          .update({ auto_trading_enabled: false })
          .eq("user_id", user.id);
        
        toast({
          title: "⚠️ Auto Trading Desabilitado",
          description: "Conexão com Binance inválida. Configure suas credenciais.",
          variant: "destructive",
        });

        setBotStatus({
          status: currentBotStatus,
          lastAction: new Date().toLocaleTimeString(),
          activePositions: 0,
          todayTrades: 0,
          paperMode: settings?.paper_mode ?? true,
          binanceConnected: false,
          autoTradingEnabled: false,
        });
        return;
      }

      // Buscar posições ativas
      const { count: activeCount } = await supabase
        .from("active_positions")
        .select("id", { count: "exact" })
        .eq("user_id", user.id);

      // Buscar trades de hoje
      const today = new Date().toISOString().split("T")[0];
      const { count: tradesCount } = await supabase
        .from("operations")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .gte("entry_time", today);
      
      setBotStatus({
        status: currentBotStatus,
        lastAction: new Date().toLocaleTimeString(),
        activePositions: activeCount || 0,
        todayTrades: tradesCount || 0,
        paperMode: settings?.paper_mode ?? true,
        binanceConnected,
        autoTradingEnabled,
      });
    } catch (error) {
      console.error("Erro ao buscar status do bot:", error);
    }
  };

  useEffect(() => {
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const startBot = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Garantir que settings existe
      const settings = await ensureUserSettings();
      if (!settings) {
        throw new Error("Erro ao acessar configurações do usuário");
      }

      // Verificar modo e credenciais
      if (!settings.paper_mode) {
        // Modo REAL - verificar credenciais Binance
        const { data: credentials } = await supabase
          .from("user_api_credentials")
          .select("test_status")
          .eq("user_id", user.id)
          .eq("broker_type", "binance")
          .maybeSingle();

        if (!credentials) {
          toast({
            title: "Credenciais não configuradas",
            description: "Configure suas credenciais da Binance em Configurações antes de usar o modo REAL.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (credentials.test_status !== "success") {
          toast({
            title: "Conexão não validada",
            description: "Teste sua conexão com a Binance em Configurações antes de iniciar o bot em modo REAL.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Sincronizar saldo real antes de iniciar
        try {
          await supabase.functions.invoke("sync-real-balance", {
            body: { broker_type: "binance" },
          });
        } catch (syncError) {
          console.error("Erro ao sincronizar saldo:", syncError);
        }
      }

      // Atualizar status
      const { error } = await supabase
        .from("user_settings")
        .update({ bot_status: "running" })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "🟢 Bot Iniciado",
        description: `Modo: ${settings.paper_mode ? "PAPER (Simulado)" : "REAL (Binance)"}`,
      });

      fetchBotStatus();
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar bot",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pauseBot = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("user_settings")
        .update({ bot_status: "paused" })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "🟡 Bot Pausado",
        description: "Não entrará em novas posições",
      });

      fetchBotStatus();
    } catch (error: any) {
      toast({
        title: "Erro ao pausar bot",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("user_settings")
        .update({ bot_status: "stopped" })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "🔴 Bot Parado",
        description: "Sistema desativado",
      });

      fetchBotStatus();
    } catch (error: any) {
      toast({
        title: "Erro ao parar bot",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoTrading = async (enabled: boolean) => {
    if (!user) return;
    
    // 🔒 Bloquear ativação se modo REAL sem Binance conectada
    if (enabled && !botStatus.paperMode && !botStatus.binanceConnected) {
      toast({
        title: "⚠️ Não é possível ativar Auto Trading",
        description: "Configure e valide suas credenciais Binance primeiro.",
        variant: "destructive",
      });
      return;
    }
    
    setAutoToggleLoading(true);

    try {
      const { error } = await supabase
        .from("user_settings")
        .update({ auto_trading_enabled: enabled })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: enabled ? "⚡ Auto Trading ATIVADO" : "🔒 Auto Trading DESATIVADO",
        description: enabled 
          ? "Ordens serão executadas automaticamente quando Pre-List for aprovada"
          : "Bot apenas monitora, sem execução automática",
      });

      fetchBotStatus();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar Auto Trading",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAutoToggleLoading(false);
    }
  };

  // Verifica se modo REAL está instável (sem conexão)
  const isRealModeUnstable = !botStatus.paperMode && !botStatus.binanceConnected;

  return (
    <Card className="p-4 m-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">Controle do Bot</h3>
        <Badge
          variant={
            botStatus.status === "running"
              ? "default"
              : botStatus.status === "paused"
              ? "secondary"
              : "outline"
          }
        >
          {botStatus.status === "running"
            ? "🟢 ATIVO"
            : botStatus.status === "paused"
            ? "🟡 PAUSADO"
            : "🔴 PARADO"}
        </Badge>
      </div>

      {/* Badge de estado instável */}
      {isRealModeUnstable && (
        <div className="mb-3">
          <Badge variant="destructive" className="w-full justify-center py-1">
            <ShieldAlert className="w-3 h-3 mr-1" />
            ⚠️ Modo REAL Instável - Binance Desconectada
          </Badge>
        </div>
      )}

      {/* Aviso modo REAL */}
      {!botStatus.paperMode && (
        <div className={`mb-4 p-2 rounded-md flex items-start gap-2 ${
          botStatus.binanceConnected 
            ? 'bg-success/10 border border-success/30' 
            : 'bg-destructive/10 border border-destructive/30'
        }`}>
          {botStatus.binanceConnected ? (
            <>
              <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <p className="text-xs text-success">
                <strong>Modo REAL ativo!</strong> Conectado à Binance. Operações serão executadas com dinheiro real.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-destructive font-bold">
                  Modo REAL sem conexão!
                </p>
                <p className="text-xs text-destructive/80">
                  Configure e teste suas credenciais Binance. Bot e Auto Trading bloqueados.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button
          onClick={startBot}
          disabled={
            botStatus.status === "running" || 
            loading || 
            isRealModeUnstable
          }
          size="sm"
          className="bg-success hover:bg-success/90"
          title={isRealModeUnstable ? "Configure Binance primeiro" : "Iniciar bot"}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-1" />
          )}
          INICIAR
        </Button>

        <Button
          onClick={pauseBot}
          disabled={botStatus.status !== "running" || loading}
          variant="secondary"
          size="sm"
        >
          <Pause className="w-4 h-4 mr-1" />
          PAUSAR
        </Button>

        <Button
          onClick={stopBot}
          disabled={botStatus.status === "stopped" || loading}
          variant="destructive"
          size="sm"
        >
          <Square className="w-4 h-4 mr-1" />
          PARAR
        </Button>
      </div>

      {/* AUTO TRADING TOGGLE */}
      <div className={`p-3 rounded-lg border-2 mb-4 ${
        botStatus.autoTradingEnabled 
          ? 'bg-accent/10 border-accent' 
          : isRealModeUnstable
          ? 'bg-destructive/5 border-destructive/30'
          : 'bg-muted border-border'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${
              botStatus.autoTradingEnabled 
                ? 'text-accent' 
                : isRealModeUnstable 
                ? 'text-destructive/50'
                : 'text-muted-foreground'
            }`} />
            <Label htmlFor="auto-trading" className="text-sm font-bold cursor-pointer">
              Auto Trading
            </Label>
            {isRealModeUnstable && (
              <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive">
                BLOQUEADO
              </Badge>
            )}
          </div>
          <Switch
            id="auto-trading"
            checked={botStatus.autoTradingEnabled}
            onCheckedChange={toggleAutoTrading}
            disabled={autoToggleLoading || isRealModeUnstable}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {isRealModeUnstable 
            ? "⚠️ Configure credenciais Binance para habilitar Auto Trading"
            : botStatus.autoTradingEnabled 
            ? "⚡ Executa ordens automaticamente quando Pre-List Trader Raiz é aprovada"
            : "🔒 Bot monitora mas não executa ordens automaticamente"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Modo:</span>
          <Badge 
            variant="outline" 
            className={`ml-2 ${!botStatus.paperMode ? (botStatus.binanceConnected ? 'border-success text-success' : 'border-destructive text-destructive') : ''}`}
          >
            {botStatus.paperMode ? "📄 PAPER" : (botStatus.binanceConnected ? "💰 REAL" : "⚠️ REAL")}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Binance:</span>
          <Badge 
            variant="outline" 
            className={`ml-2 ${botStatus.binanceConnected ? 'border-success text-success' : 'border-destructive text-destructive'}`}
          >
            {botStatus.binanceConnected ? "✓ Conectado" : "✗ Desconectado"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Posições Abertas:</span>
          <span className="ml-2 font-bold text-foreground">{botStatus.activePositions}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Trades Hoje:</span>
          <span className="ml-2 font-bold text-foreground">{botStatus.todayTrades}</span>
        </div>
        <div className="flex items-center justify-between col-span-2">
          <span className="text-muted-foreground">Última Atualização:</span>
          <span className="ml-2 text-muted-foreground text-[10px]">
            {botStatus.lastAction}
          </span>
        </div>
      </div>
    </Card>
  );
};