import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle,
  History
} from "lucide-react";

interface Operation {
  id: string;
  asset: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number;
  take_profit: number;
  risk_reward: number;
  result: string;
  pnl: number | null;
  entry_time: string;
  exit_time: string | null;
  session: string;
}

export const OperationsHistoryPanel = () => {
  const { user } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);

  const fetchOperations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("operations")
        .select("*")
        .eq("user_id", user.id)
        .not("result", "eq", "OPEN")
        .order("exit_time", { ascending: false })
        .limit(10);

      if (error) throw error;
      setOperations(data || []);
    } catch (error) {
      console.error("Erro ao buscar operações:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchOperations();
    const interval = setInterval(fetchOperations, 15000);
    return () => clearInterval(interval);
  }, [fetchOperations]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSessionColor = (session: string) => {
    switch (session) {
      case 'OCEANIA': return 'bg-blue-500/20 text-blue-400';
      case 'ASIA': return 'bg-yellow-500/20 text-yellow-400';
      case 'LONDON': return 'bg-purple-500/20 text-purple-400';
      case 'NY': return 'bg-green-500/20 text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="p-4 m-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Histórico
        </h3>
        <Badge variant="outline" className="text-xs">
          Últimas {operations.length}
        </Badge>
      </div>

      <ScrollArea className="h-[200px]">
        {operations.map((op) => {
          const isWin = op.result === "WIN";
          const isLong = op.direction === "BUY" || op.direction === "LONG";
          const pnlValue = op.pnl || 0;
          
          return (
            <div
              key={op.id}
              className={`mb-2 p-3 rounded-lg border transition-all hover:bg-muted/50 ${
                isWin 
                  ? 'border-l-4 border-l-success border-border' 
                  : 'border-l-4 border-l-destructive border-border'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {op.asset}
                  </Badge>
                  <Badge 
                    variant={isLong ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {isLong ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {isLong ? "LONG" : "SHORT"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {isWin ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className={`font-bold font-mono ${isWin ? 'text-success' : 'text-destructive'}`}>
                    {pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div>
                  <span className="text-muted-foreground">Entry:</span>
                  <span className="ml-1 font-mono text-foreground">
                    ${op.entry_price.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Exit:</span>
                  <span className="ml-1 font-mono text-foreground">
                    ${op.exit_price?.toFixed(2) || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">R:R:</span>
                  <span className="ml-1 font-mono text-primary">
                    1:{op.risk_reward.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {op.exit_time ? formatTime(op.exit_time) : '-'}
                </div>
                <Badge 
                  variant="secondary" 
                  className={`text-[10px] ${getSessionColor(op.session)}`}
                >
                  {op.session}
                </Badge>
              </div>
            </div>
          );
        })}

        {operations.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Nenhuma operação fechada ainda
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
