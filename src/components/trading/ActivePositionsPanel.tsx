import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown } from "lucide-react";

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

  const fetchPositions = async () => {
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
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, [user]);

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
        title: "Posição fechada manualmente",
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
      <h3 className="font-bold mb-3 text-foreground">
        Posições Abertas ({positions.length})
      </h3>

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
                  variant={pos.direction === "LONG" ? "default" : "destructive"}
                >
                  {pos.direction === "LONG" ? (
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
                    ${pos.current_price.toFixed(2)}
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
                    ${pos.current_pnl.toFixed(2)}
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
