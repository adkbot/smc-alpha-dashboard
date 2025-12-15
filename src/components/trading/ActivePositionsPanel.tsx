import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface ActivePosition {
  id: string;
  asset: string;
  direction: string;
  entry_price: number;
  current_price: number;
  stop_loss: number;
  take_profit: number;
  current_pnl: number;
  risk_reward: number;
  opened_at: string;
}

export const ActivePositionsPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [positions, setPositions] = useState<ActivePosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Sincroniza posições do banco local com a Binance (verifica se ainda existem)
  const syncPositionsWithBinance = useCallback(async () => {
    if (!user) return;
    
    try {
      // Buscar settings do usuário
      const { data: settings } = await supabase
        .from("user_settings")
        .select("paper_mode")
        .eq("user_id", user.id)
        .maybeSingle();

      // Em modo paper, apenas buscar do banco
      if (settings?.paper_mode) {
        return;
      }

      // Buscar credenciais
      const { data: credentials } = await supabase
        .from("user_api_credentials")
        .select("test_status, futures_ok")
        .eq("user_id", user.id)
        .eq("broker_type", "binance")
        .maybeSingle();

      // Se não tem credenciais válidas, não sincronizar
      if (credentials?.test_status !== "success") {
        return;
      }

      setSyncing(true);

      // Chamar Edge Function para verificar posições na Binance
      const { data: binancePositions, error } = await supabase.functions.invoke("sync-binance-positions", {
        body: { user_id: user.id },
      });

      if (error) {
        console.error("Erro ao sincronizar posições:", error);
        return;
      }

      // Se a Binance não tem posições abertas, limpar as locais
      if (binancePositions?.positions?.length === 0) {
        // Buscar posições locais para deletar
        const { data: localPositions } = await supabase
          .from("active_positions")
          .select("id")
          .eq("user_id", user.id);

        if (localPositions && localPositions.length > 0) {
          // Deletar posições locais que não existem mais na Binance
          for (const pos of localPositions) {
            await supabase
              .from("active_positions")
              .delete()
              .eq("id", pos.id);
          }
          console.log("✅ Posições locais limpas - não existem mais na Binance");
        }
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
    } finally {
      setSyncing(false);
    }
  }, [user]);

  const fetchPositions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("active_positions")
        .select("*")
        .eq("user_id", user.id)
        .order("opened_at", { ascending: false });

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error("Erro ao buscar posições:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchPositions();
    // Sincronizar com Binance na primeira carga
    syncPositionsWithBinance();
    
    const interval = setInterval(() => {
      fetchPositions();
      // Sincronizar com Binance a cada 30 segundos
      syncPositionsWithBinance();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchPositions, syncPositionsWithBinance]);

  const closeManually = async (positionId: string, position: ActivePosition) => {
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("close-position", {
        body: {
          positionId,
          exitPrice: position.current_price,
          result: position.current_pnl >= 0 ? "WIN" : "LOSS",
        },
      });

      if (error) throw error;

      toast({
        title: "Posição fechada",
        description: `${position.asset} - PnL: $${position.current_pnl.toFixed(2)}`,
      });

      fetchPositions();
    } catch (error: any) {
      toast({
        title: "Erro ao fechar posição",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 m-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground">
          Posições Abertas ({positions.length})
        </h3>
        {syncing && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>

      <ScrollArea className="h-[90px]">
        {positions.map((pos) => {
          const pnlPercent = ((pos.current_pnl / (pos.entry_price * 1)) * 100);
          const isProfitable = pos.current_pnl >= 0;

          return (
            <Card
              key={pos.id}
              className="p-3 mb-3 border-l-4"
              style={{
                borderLeftColor: isProfitable
                  ? "hsl(var(--success))"
                  : "hsl(var(--destructive))",
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <Badge variant="outline" className="font-mono">
                  {pos.asset}
                </Badge>
                <Badge
                  variant={pos.direction === "LONG" || pos.direction === "BUY" ? "default" : "destructive"}
                >
                  {pos.direction === "LONG" || pos.direction === "BUY" ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {pos.direction}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <span className="text-muted-foreground">Entry:</span>
                  <span className="ml-1 font-mono text-foreground">
                    ${pos.entry_price.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Atual:</span>
                  <span className="ml-1 font-mono text-foreground">
                    ${pos.current_price?.toFixed(2) || '---'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">SL:</span>
                  <span className="ml-1 font-mono text-destructive">
                    ${pos.stop_loss.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">TP:</span>
                  <span className="ml-1 font-mono text-success">
                    ${pos.take_profit.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">PnL:</span>
                <div className="text-right">
                  <span
                    className={`font-bold ${
                      isProfitable ? "text-success" : "text-destructive"
                    }`}
                  >
                    ${pos.current_pnl?.toFixed(2) || '0.00'}
                  </span>
                  <span
                    className={`text-xs ml-1 ${
                      isProfitable ? "text-success" : "text-destructive"
                    }`}
                  >
                    ({pnlPercent >= 0 ? "+" : ""}
                    {pnlPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2"
                onClick={() => closeManually(pos.id, pos)}
                disabled={loading}
              >
                Fechar Manualmente
              </Button>
            </Card>
          );
        })}

        {positions.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            Nenhuma posição aberta
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};