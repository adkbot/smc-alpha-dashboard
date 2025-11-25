import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, TrendingUp, Target, Shield, CheckCircle2 } from "lucide-react";

export const VisionAgentStrategies = () => {
  const { user } = useAuth();

  const { data: strategies, isLoading } = useQuery({
    queryKey: ["visionLearnedStrategies", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("vision_learned_strategies")
        .select("*")
        .eq("user_id", user.id)
        .order("confidence_score", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Estratégias Aprendidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!strategies || strategies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Estratégias Aprendidas
          </CardTitle>
          <CardDescription>
            Nenhuma estratégia aprendida ainda. O Vision Agent irá aprender conforme analisa os vídeos.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Estratégias Aprendidas
        </CardTitle>
        <CardDescription>
          {strategies.length} estratégia{strategies.length !== 1 ? "s" : ""} extraída{strategies.length !== 1 ? "s" : ""} dos vídeos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {strategies.map((strategy) => {
              const conditions = strategy.conditions as any;
              const entryRules = strategy.entry_rules as any;
              const exitRules = strategy.exit_rules as any;

              return (
                <Card key={strategy.id} className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">
                          {strategy.strategy_name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {strategy.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {Math.round((strategy.confidence_score || 0) * 100)}% conf
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {/* Condições */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Condições</span>
                      </div>
                      <div className="pl-5 space-y-0.5">
                        {conditions?.trend_bias && (
                          <p>• Bias: {conditions.trend_bias}</p>
                        )}
                        {conditions?.timeframe_primary && (
                          <p>• Timeframe: {conditions.timeframe_primary}</p>
                        )}
                        {conditions?.required_structures && conditions.required_structures.length > 0 && (
                          <p>• Estruturas: {conditions.required_structures.join(", ")}</p>
                        )}
                      </div>
                    </div>

                    {/* Entrada */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Entrada</span>
                      </div>
                      <div className="pl-5 space-y-0.5">
                        {entryRules?.entry_point && (
                          <p>• Ponto: {entryRules.entry_point}</p>
                        )}
                        {entryRules?.entry_zone && (
                          <p>• Zona: {entryRules.entry_zone}</p>
                        )}
                      </div>
                    </div>

                    {/* Saída */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                        <Target className="w-3.5 h-3.5" />
                        <span>Saída</span>
                      </div>
                      <div className="pl-5 space-y-0.5">
                        {exitRules?.stop_loss && (
                          <p>• SL: {exitRules.stop_loss}</p>
                        )}
                        {exitRules?.take_profit && (
                          <p>• TP: {exitRules.take_profit}</p>
                        )}
                        {exitRules?.min_risk_reward && (
                          <p>• R:R mínimo: 1:{exitRules.min_risk_reward}</p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 pt-2 border-t border-border/50 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Aplicada {strategy.times_applied || 0}x</span>
                      </div>
                      {strategy.success_rate !== null && strategy.times_applied > 0 && (
                        <div>
                          Taxa: {Math.round((strategy.success_rate || 0) * 100)}%
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
