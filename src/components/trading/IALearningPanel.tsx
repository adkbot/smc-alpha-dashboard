import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface LearningPattern {
  id: string;
  padrao_id: string;
  taxa_acerto: number;
  vezes_testado: number;
  wins: number;
  losses: number;
  recompensa_acumulada: number;
}

export const IALearningPanel = () => {
  const [patterns, setPatterns] = useState<LearningPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [iaEnabled, setIaEnabled] = useState(true);
  const [nivelConfianca, setNivelConfianca] = useState(50);
  const [isTraining, setIsTraining] = useState(false);

  // Fetch IA learning data
  const fetchIAData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar configuração IA
      const { data: settings } = await supabase
        .from('user_settings')
        .select('ia_learning_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      setIaEnabled(settings?.ia_learning_enabled !== false);

      // Buscar padrões de aprendizado
      const { data: patternsData } = await supabase
        .from('ia_learning_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('vezes_testado', { ascending: false })
        .limit(20);

      if (patternsData) {
        setPatterns(patternsData);

        // Calcular nível de confiança geral
        const validPatterns = patternsData.filter(p => p.vezes_testado >= 3);
        if (validPatterns.length > 0) {
          const avgTaxa = validPatterns.reduce((sum, p) => sum + p.taxa_acerto, 0) / validPatterns.length;
          setNivelConfianca(avgTaxa);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados IA:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIAData();
    const interval = setInterval(fetchIAData, 60000); // Atualizar a cada 1 minuto
    return () => clearInterval(interval);
  }, []);

  // Executar treinamento manual
  const runTraining = async () => {
    setIsTraining(true);
    try {
      const { error } = await supabase.functions.invoke('ia-daily-training');
      if (error) throw error;
      await fetchIAData();
    } catch (error) {
      console.error('Erro ao executar treinamento:', error);
    } finally {
      setIsTraining(false);
    }
  };

  // Toggle IA
  const toggleIA = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_settings')
        .upsert({ 
          user_id: user.id, 
          ia_learning_enabled: !iaEnabled 
        }, { onConflict: 'user_id' });

      setIaEnabled(!iaEnabled);
    } catch (error) {
      console.error('Erro ao alternar IA:', error);
    }
  };

  // Separar padrões bons e ruins
  const topPatterns = patterns
    .filter(p => p.vezes_testado >= 3 && p.taxa_acerto >= 55)
    .sort((a, b) => b.taxa_acerto - a.taxa_acerto)
    .slice(0, 5);

  const worstPatterns = patterns
    .filter(p => p.vezes_testado >= 3 && p.taxa_acerto < 45)
    .sort((a, b) => a.taxa_acerto - b.taxa_acerto)
    .slice(0, 3);

  const totalTrades = patterns.reduce((sum, p) => sum + p.vezes_testado, 0);
  const totalWins = patterns.reduce((sum, p) => sum + p.wins, 0);
  const totalLosses = patterns.reduce((sum, p) => sum + p.losses, 0);

  // Formatar nome do padrão para exibição
  const formatPatternName = (padraoId: string): string => {
    const parts = padraoId.split('_');
    const formatted = parts
      .filter(p => p !== 'none')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' + ');
    return formatted || 'Padrão Base';
  };

  // Cor do nível de confiança
  const getConfiancaColor = () => {
    if (nivelConfianca >= 60) return 'text-success';
    if (nivelConfianca >= 45) return 'text-warning';
    return 'text-destructive';
  };

  const getConfiancaBadge = () => {
    if (nivelConfianca >= 60) return { label: 'Alta', variant: 'default' as const };
    if (nivelConfianca >= 45) return { label: 'Média', variant: 'secondary' as const };
    return { label: 'Baixa', variant: 'destructive' as const };
  };

  if (loading) {
    return (
      <Card className="p-4 border-border bg-card">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-4 border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-bold text-accent uppercase tracking-wider">
            IA Evolutiva
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={runTraining}
            disabled={isTraining}
            className="h-7 text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isTraining ? 'animate-spin' : ''}`} />
            {isTraining ? 'Treinando...' : 'Treinar'}
          </Button>
          <Badge 
            variant={iaEnabled ? 'default' : 'secondary'}
            className="cursor-pointer text-xs"
            onClick={toggleIA}
          >
            {iaEnabled ? 'ON' : 'OFF'}
          </Badge>
        </div>
      </div>

      {/* Nível de Confiança Principal */}
      <div className="bg-muted/30 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Nível de Confiança da IA</span>
          <Badge variant={getConfiancaBadge().variant} className="text-xs">
            {getConfiancaBadge().label}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${getConfiancaColor()}`}>
            {nivelConfianca.toFixed(1)}%
          </span>
          <Progress 
            value={nivelConfianca} 
            className="flex-1 h-2"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Baseado em {totalTrades} trades ({totalWins}W / {totalLosses}L)
        </p>
      </div>

      {/* Top Padrões (Lucrativos) */}
      {topPatterns.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-3 h-3 text-success" />
            <span className="text-xs font-semibold text-success">Top Padrões</span>
          </div>
          <div className="space-y-2">
            {topPatterns.map((pattern) => (
              <div 
                key={pattern.id}
                className="flex items-center justify-between p-2 bg-success/10 rounded border border-success/20"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {formatPatternName(pattern.padrao_id)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pattern.wins}W / {pattern.losses}L ({pattern.vezes_testado} trades)
                  </p>
                </div>
                <Badge variant="outline" className="text-success border-success ml-2">
                  {pattern.taxa_acerto.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Padrões a Evitar */}
      {worstPatterns.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3 h-3 text-destructive" />
            <span className="text-xs font-semibold text-destructive">Padrões a Evitar</span>
          </div>
          <div className="space-y-2">
            {worstPatterns.map((pattern) => (
              <div 
                key={pattern.id}
                className="flex items-center justify-between p-2 bg-destructive/10 rounded border border-destructive/20"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {formatPatternName(pattern.padrao_id)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pattern.wins}W / {pattern.losses}L ({pattern.vezes_testado} trades)
                  </p>
                </div>
                <Badge variant="outline" className="text-destructive border-destructive ml-2">
                  {pattern.taxa_acerto.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicador de Status */}
      {patterns.length === 0 ? (
        <div className="text-center py-4">
          <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            A IA começará a aprender após os primeiros trades
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2 border-t border-border">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted-foreground">
            IA monitorando {patterns.length} padrões
          </span>
        </div>
      )}
    </Card>
  );
};