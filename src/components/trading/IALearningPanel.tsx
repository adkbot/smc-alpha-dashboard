import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap, RefreshCw, Play, Loader2, Database, Trophy, Sparkles, Activity, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 🆕 PATTERN SCORE FUNCTION (igual aos edge functions)
function calculatePatternScore(
  taxaAcerto: number, 
  vezesTestado: number, 
  recompensaAcumulada: number
): number {
  const winRateFactor = taxaAcerto * 0.6;
  const sampleSizeFactor = Math.min(vezesTestado / 20, 1) * 20;
  const avgReward = vezesTestado > 0 ? recompensaAcumulada / vezesTestado : 0;
  const rrFactor = Math.min(Math.max(avgReward, 0) / 2, 1) * 20;
  return Math.min(winRateFactor + sampleSizeFactor + rrFactor, 100);
}

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
  validation?: {
    wins: number;
    losses: number;
    winRate: string;
    tradesValidated: number;
  };
  model?: {
    confidence: string;
    isProductionReady: boolean;
    frozenPatterns: number;
  };
  topPatterns: { pattern: string; winRate: string; trades: number }[];
  worstPatterns: { pattern: string; winRate: string; trades: number }[];
  message: string;
}

interface RealOperationsStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnL: number;
}

interface ModelStatus {
  isProduction: boolean;
  confidence: number;
  trainWinRate: number;
  validationWinRate: number;
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
  
  // Real operations stats
  const [realStats, setRealStats] = useState<RealOperationsStats>({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalPnL: 0,
  });
  
  // Model status
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);

  // Fetch real operations stats
  const fetchRealOperationsStats = useCallback(async (userId: string) => {
    try {
      const { data: operations } = await supabase
        .from('operations')
        .select('result, pnl')
        .eq('user_id', userId)
        .in('result', ['WIN', 'LOSS']);

      if (operations && operations.length > 0) {
        const wins = operations.filter(op => op.result === 'WIN').length;
        const losses = operations.filter(op => op.result === 'LOSS').length;
        const totalPnL = operations.reduce((sum, op) => sum + (op.pnl || 0), 0);
        const winRate = operations.length > 0 ? (wins / operations.length) * 100 : 0;

        setRealStats({
          totalTrades: operations.length,
          wins,
          losses,
          winRate,
          totalPnL,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar operações reais:', error);
    }
  }, []);

  // Fetch model status - 🆕 CORRIGIDO ERRO 406: usar .limit(1) ao invés de .single()
  const fetchModelStatus = useCallback(async (userId: string) => {
    try {
      const { data: models } = await supabase
        .from('ia_model_weights')
        .select('is_production, confidence_level, train_winrate, validation_winrate')
        .eq('user_id', userId)
        .eq('is_current', true)
        .limit(1);

      const model = models?.[0] || null;

      if (model) {
        setModelStatus({
          isProduction: model.is_production || false,
          confidence: model.confidence_level || 50,
          trainWinRate: model.train_winrate || 0,
          validationWinRate: model.validation_winrate || 0,
        });
        setTrainingComplete(true);
      } else {
        setModelStatus(null);
      }
    } catch (error) {
      console.error('Erro ao buscar status do modelo:', error);
      setModelStatus(null);
    }
  }, []);

  // Fetch IA learning data
  const fetchIAData = useCallback(async () => {
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

      // Buscar stats reais e status do modelo
      await Promise.all([
        fetchRealOperationsStats(user.id),
        fetchModelStatus(user.id),
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados IA:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchRealOperationsStats, fetchModelStatus]);

  useEffect(() => {
    fetchIAData();
    const interval = setInterval(fetchIAData, 60000);
    return () => clearInterval(interval);
  }, [fetchIAData]);

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

  // 🆕 LIMPAR DADOS E RE-TREINAR (começar do zero)
  const clearAndRetrain = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Confirmação
    if (!confirm('⚠️ Isto vai APAGAR todos os dados de treinamento da IA. Tem certeza?')) return;
    
    toast.info('🗑️ Limpando dados de treinamento...');
    
    try {
      // 1. Limpar padrões aprendidos
      await supabase.from('ia_learning_patterns').delete().eq('user_id', user.id);
      
      // 2. Limpar modelos
      await supabase.from('ia_model_weights').delete().eq('user_id', user.id);
      
      // 3. Limpar replay buffer
      await supabase.from('ia_replay_buffer').delete().eq('user_id', user.id);
      
      // 4. Limpar elite buffer
      await supabase.from('ia_elite_buffer').delete().eq('user_id', user.id);
      
      // 5. Resetar state local
      setPatterns([]);
      setPreTrainingReport(null);
      setModelStatus(null);
      setTrainingComplete(false);
      setNivelConfianca(50);
      
      toast.success('✅ Dados limpos! Iniciando novo treinamento...');
      
      // 6. Iniciar novo treinamento automaticamente
      await startPreTraining();
      
    } catch (error: any) {
      console.error('Erro ao limpar dados:', error);
      toast.error(`❌ Erro ao limpar: ${error.message}`);
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
      {trainingComplete && modelStatus && (
        <Alert className={`mb-4 ${modelStatus.isProduction ? 'border-success bg-success/10' : 'border-warning bg-warning/10'}`}>
          <Trophy className={`h-5 w-5 ${modelStatus.isProduction ? 'text-success' : 'text-warning'}`} />
          <AlertTitle className={`${modelStatus.isProduction ? 'text-success' : 'text-warning'} font-bold flex items-center gap-2`}>
            <Sparkles className="w-4 h-4" />
            {modelStatus.isProduction ? 'IA PRONTA PARA PRODUÇÃO!' : 'IA EM TREINAMENTO'}
          </AlertTitle>
          <AlertDescription className={`${modelStatus.isProduction ? 'text-success/90' : 'text-warning/90'}`}>
            Confiança: {modelStatus.confidence.toFixed(1)}% | Validação: {modelStatus.validationWinRate.toFixed(1)}% WR
            {!modelStatus.isProduction && ' (precisa validação >= 50%)'}
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
          {modelStatus?.isProduction && (
            <Badge variant="default" className="bg-success text-success-foreground text-xs">
              PRODUÇÃO ✓
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
              {preTrainingProgress >= 90 && 'Salvando modelo...'}
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={startPreTraining}
                className="flex-1 h-7 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Re-treinar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearAndRetrain}
                disabled={isPreTraining}
                className="h-7 text-xs"
                title="Apagar todos os dados e começar do zero"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
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

      {/* DADOS SIMULADOS (Treinamento) */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Dados Simulados (Treinamento)</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-success/20 rounded-lg p-2 text-center border border-success/30">
            <TrendingUp className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="text-xl font-bold text-success">{totalWins}</p>
            <p className="text-xs text-success/80">WINS</p>
          </div>
          <div className="bg-destructive/20 rounded-lg p-2 text-center border border-destructive/30">
            <TrendingDown className="w-4 h-4 text-destructive mx-auto mb-1" />
            <p className="text-xl font-bold text-destructive">{totalLosses}</p>
            <p className="text-xs text-destructive/80">LOSSES</p>
          </div>
        </div>
      </div>

      {/* DADOS REAIS (Operações) */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3 h-3 text-accent" />
          <span className="text-xs font-semibold text-accent">Operações Reais</span>
        </div>
        {realStats.totalTrades > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-background/50 rounded-lg p-2 text-center border border-border">
              <p className="text-lg font-bold text-success">{realStats.wins}</p>
              <p className="text-xs text-muted-foreground">Wins</p>
            </div>
            <div className="bg-background/50 rounded-lg p-2 text-center border border-border">
              <p className="text-lg font-bold text-destructive">{realStats.losses}</p>
              <p className="text-xs text-muted-foreground">Losses</p>
            </div>
            <div className="bg-background/50 rounded-lg p-2 text-center border border-border">
              <p className={`text-lg font-bold ${realStats.totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${realStats.totalPnL.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">PnL</p>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">
              Nenhuma operação real finalizada ainda
            </p>
          </div>
        )}
      </div>

      {/* Validação Pós-Treinamento */}
      {preTrainingReport?.validation && (
        <Alert className="mb-4 border-accent bg-accent/10">
          <CheckCircle className="h-4 w-4 text-accent" />
          <AlertTitle className="text-accent text-sm">Validação (20% dados)</AlertTitle>
          <AlertDescription className="text-accent/90 text-xs">
            <span className="font-bold">{preTrainingReport.validation.wins}W</span> / <span className="font-bold">{preTrainingReport.validation.losses}L</span> 
            {' '}({preTrainingReport.validation.winRate}% WR em {preTrainingReport.validation.tradesValidated} trades)
          </AlertDescription>
        </Alert>
      )}

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
          Baseado em {totalTrades} trades simulados ({totalWins}W / {totalLosses}L)
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
            {topPatterns.map((pattern) => {
              const patternScore = calculatePatternScore(
                pattern.taxa_acerto,
                pattern.vezes_testado,
                pattern.recompensa_acumulada || 0
              );
              return (
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
                  <div className="flex items-center gap-1 ml-2">
                    <Badge variant={patternScore >= 80 ? "default" : "secondary"} className="text-xs">
                      {patternScore.toFixed(0)}
                    </Badge>
                    <Badge variant="outline" className="text-success border-success">
                      {pattern.taxa_acerto.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
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
            {worstPatterns.map((pattern) => {
              const patternScore = calculatePatternScore(
                pattern.taxa_acerto,
                pattern.vezes_testado,
                pattern.recompensa_acumulada || 0
              );
              return (
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
                  <div className="flex items-center gap-1 ml-2">
                    <Badge variant="secondary" className="text-xs">
                      {patternScore.toFixed(0)}
                    </Badge>
                    <Badge variant="outline" className="text-destructive border-destructive">
                      {pattern.taxa_acerto.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer - Padrões monitorados */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="w-3 h-3" />
          <span className="text-xs">IA monitorando {patterns.length} padrões | Score ≥80 = executa</span>
        </div>
      </div>
    </Card>
  );
};
