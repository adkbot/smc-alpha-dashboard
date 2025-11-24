import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface BotStatus {
  status: "stopped" | "running" | "paused";
  lastAction: string;
  activePositions: number;
  todayTrades: number;
  paperMode: boolean;
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
  });
  const [loading, setLoading] = useState(false);

  const fetchBotStatus = async () => {
    if (!user) return;

    try {
      // Buscar configurações
      const { data: settings } = await supabase
        .from("user_settings")
        .select("bot_status, paper_mode")
        .eq("user_id", user.id)
        .single();

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

      const status = settings?.bot_status as "stopped" | "running" | "paused" || "stopped";
      
      setBotStatus({
        status,
        lastAction: new Date().toLocaleTimeString(),
        activePositions: activeCount || 0,
        todayTrades: tradesCount || 0,
        paperMode: settings?.paper_mode ?? true,
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
      // Verificar se credenciais da Binance estão configuradas
      const { data: credentials } = await supabase
        .from("user_api_credentials")
        .select("test_status")
        .eq("user_id", user.id)
        .eq("broker_type", "binance")
        .single();

      if (!credentials && !botStatus.paperMode) {
        toast({
          title: "Credenciais não configuradas",
          description: "Configure suas credenciais da Binance em Configurações",
          variant: "destructive",
        });
        return;
      }

      // Atualizar status
      const { error } = await supabase
        .from("user_settings")
        .update({ bot_status: "running" })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "🟢 Bot Iniciado",
        description: `Modo: ${botStatus.paperMode ? "PAPER" : "REAL"}`,
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

      {!botStatus.paperMode && (
        <div className="mb-4 p-2 bg-destructive/10 border border-destructive rounded-md flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">
            <strong>Modo REAL ativo!</strong> Operações serão executadas com dinheiro real na corretora.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button
          onClick={startBot}
          disabled={botStatus.status === "running" || loading}
          size="sm"
          className="bg-success hover:bg-success/90"
        >
          <Play className="w-4 h-4 mr-1" />
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

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Modo:</span>
          <Badge variant="outline" className="ml-2">
            {botStatus.paperMode ? "📄 PAPER" : "💰 REAL"}
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
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Última Atualização:</span>
          <span className="ml-2 text-muted-foreground text-[10px]">
            {botStatus.lastAction}
          </span>
        </div>
      </div>
    </Card>
  );
};
