import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface VisionSignal {
  id: string;
  action: string;
  confidence: number;
  created_at: string;
  symbol?: string;
  video_id?: string;
}

export const VisionAgentSignals = () => {
  const { user } = useAuth();

  const { data: signals, isLoading } = useQuery({
    queryKey: ['vision-agent-signals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('vision_agent_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('action', ['ENTER', 'EXIT'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as VisionSignal[];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <Card className="p-3 bg-card/50 border-border">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs font-medium">Carregando sinais...</span>
        </div>
      </Card>
    );
  }

  if (!signals || signals.length === 0) {
    return (
      <Card className="p-3 bg-card/50 border-border">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Vision Agent Signals</span>
        </div>
        <div className="text-xs text-muted-foreground text-center py-2">
          Nenhum sinal detectado ainda
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 bg-card/50 border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase">Vision Agent Signals</span>
        </div>
        <Badge variant="outline" className="text-[9px]">
          {signals.length} sinais
        </Badge>
      </div>
      
      <ScrollArea className="h-[120px]">
        <div className="space-y-2">
          {signals.map((signal) => (
            <div
              key={signal.id}
              className={`p-2 rounded-md border text-xs ${
                signal.action === 'ENTER'
                  ? 'bg-success/10 border-success/30'
                  : 'bg-warning/10 border-warning/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  {signal.action === 'ENTER' ? (
                    <TrendingUp className="w-3 h-3 text-success" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-warning" />
                  )}
                  <span className="font-bold">
                    {signal.action === 'ENTER' ? 'ENTRADA' : 'SAÍDA'}
                  </span>
                </div>
                <Badge variant="outline" className="text-[8px]">
                  {signal.confidence}%
                </Badge>
              </div>
              
              {signal.symbol && (
                <div className="text-[9px] text-muted-foreground">
                  🎯 {signal.symbol}
                </div>
              )}
              
              <div className="text-[8px] text-muted-foreground mt-0.5">
                {new Date(signal.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
