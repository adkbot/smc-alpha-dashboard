import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap, RefreshCw, Play, Loader2, Database, Trophy, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LearningPattern {
  id: string;
  padrao_id: string;
  taxa_acerto: number;
  vezes_testado: number;
  wins: number;
  losses: number;
  recompensa_acumulada: number;
}

interface PreTrainingReport {
  success: boolean;
  metrics: {
    totalCandles: number;
    setupsDetected: number;
    tradesSimulated: number;
    wins: number;
    losses: number;
    winRate: string;
    patternsLearned: number;
  };
  topPatterns: { pattern: string; winRate: string; trades: number }[];
  worstPatterns: { pattern: string; winRate: string; trades: number }[];
  message: string;
}

export const IALearningPanel = () => {
  const [patterns, setPatterns] = useState<LearningPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [iaEnabled, setIaEnabled] = useState(true);
  const [nivelConfianca, setNivelConfianca] = useState(50);
  const [isTraining, setIsTraining] = useState(false);
  
  // Pre-training state
  const [isPreTraining, setIsPreTraining] = useState(false);
  const [preTrainingProgress, setPreTrainingProgress] = useState(0);
  const [preTrainingReport, setPreTrainingReport] = useState<PreTrainingReport | null>(null);
  const [trainingComplete, setTrainingComplete] = useState(false);

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
    const interval = setInterval(fetchIAData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Executar treinamento manual
  const runTraining = async () => {
    setIsTraining(true);
    try {
      const { error } = await supabase.functions.invoke('ia-daily-training');
      if (error) throw error;
      await fetchIAData();
      toast.success('Treinamento diário concluído!');
    } catch (error) {
      console.error('Erro ao executar treinamento:', error);
      toast.error('Erro ao executar treinamento');
    } finally {
      setIsTraining(false);
    }
  };

  // Iniciar pré-treinamento com dados históricos
  const startPreTraining = async () => {
    setIsPreTraining(true);
    setPreTrainingProgress(10);
    setPreTrainingReport(null);
    setTrainingComplete(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      toast.info('🚀 Iniciando pré-treinamento com dados históricos da Binance...', {
        duration: 5000,
      });
      
      // Simular progresso enquanto aguarda
      const progressInterval = setInterval(() => {
        setPreTrainingProgress(prev => Math.min(prev + 5, 90));
      }, 2000);
      
      const { data, error } = await supabase.functions.invoke('ia-historical-training', {
        body: { symbol: 'BTCUSDT', userId: user.id }
      });
      
      clearInterval(progressInterval);
      
      if (error) throw error;
      
      setPreTrainingProgress(100);
      setPreTrainingReport(data);
      setTrainingComplete(true);
      
      // Ativar IA Learning automaticamente após treinamento bem-sucedido
      await supabase
        .from('user_settings')
        .upsert({ 
          user_id: user.id, 
          ia_learning_enabled: true 
        }, { onConflict: 'user_id' });
      
      setIaEnabled(true);
      await fetchIAData();
      
      // Notificação PROEMINENTE de treinamento completo
      toast.success(
        `🎯 TREINAMENTO DA IA COMPLETO!`, 
        {
          description: `✅ ${data.metrics.tradesSimulated} trades simulados | Win Rate: ${data.metrics.winRate}% | ${data.metrics.patternsLearned} padrões aprendidos`,
          duration: 15000,
        }
      );
      
    } catch (error: any) {
      console.error('Erro no pré-treinamento:', error);
      toast.error(`❌ Erro no pré-treinamento: ${error.message}`, {
        duration: 8000,
      });
    } finally {
      setIsPreTraining(false);
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
      {/* Alerta de Treinamento Completo */}
      {trainingComplete && preTrainingReport && (
        <Alert className="mb-4 border-success bg-success/10 animate-pulse">
          <Trophy className="h-5 w-5 text-success" />
          <AlertTitle className="text-success font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            IA TREINADA COM SUCESSO!
          </AlertTitle>
          <AlertDescription className="text-success/90">
            A IA aprendeu {preTrainingReport.metrics.patternsLearned} padrões com {preTrainingReport.metrics.winRate}% de Win Rate.
            O sistema agora opera com conhecimento pré-treinado!
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className={`w-4 h-4 ${trainingComplete ? 'text-success' : 'text-accent'}`} />
          <h3 className="text-xs font-bold text-accent uppercase tracking-wider">
            IA Evolutiva
          </h3>
          {trainingComplete && (
            <Badge variant="default" className="bg-success text-success-foreground text-xs animate-bounce">
              TREINADA ✓
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={runTraining}
            disabled={isTraining || isPreTraining}
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

      {/* Seção de Pré-Treinamento */}
      <div className="bg-accent/10 rounded-lg p-3 mb-4 border border-accent/20">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold text-accent">Pré-Treinamento Histórico</span>
        </div>
        
        {isPreTraining ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span className="text-xs text-muted-foreground">
                Processando dados da Binance...
              </span>
            </div>
            <Progress value={preTrainingProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {preTrainingProgress < 30 && 'Buscando klines históricos...'}
              {preTrainingProgress >= 30 && preTrainingProgress < 60 && 'Analisando padrões SMC...'}
              {preTrainingProgress >= 60 && preTrainingProgress < 90 && 'Simulando trades...'}
              {preTrainingProgress >= 90 && 'Salvando aprendizado...'}
            </p>
          </div>
        ) : preTrainingReport ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-background/50 rounded p-2">
                <p className="text-lg font-bold text-foreground">{preTrainingReport.metrics.tradesSimulated}</p>
                <p className="text-xs text-muted-foreground">Trades</p>
              </div>
              <div className="bg-background/50 rounded p-2">
                <p className="text-lg font-bold text-success">{preTrainingReport.metrics.winRate}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
              <div className="bg-background/50 rounded p-2">
                <p className="text-lg font-bold text-accent">{preTrainingReport.metrics.patternsLearned}</p>
                <p className="text-xs text-muted-foreground">Padrões</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={startPreTraining}
              className="w-full h-7 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Re-treinar
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Treine a IA com dados históricos reais da Binance para iniciar com conhecimento
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={startPreTraining}
              disabled={isPreTraining}
              className="h-8 text-xs"
            >
              <Play className="w-3 h-3 mr-1" />
              Iniciar Pré-Treinamento
            </Button>
          </div>
        )}
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
      {patterns.length === 0 && !preTrainingReport ? (
        <div className="text-center py-4">
          <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Use o Pré-Treinamento ou aguarde os primeiros trades
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
