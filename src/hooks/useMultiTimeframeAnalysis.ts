import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BOSCHOCHData {
  trend: "ALTA" | "BAIXA" | "NEUTRO";
  lastBOS: number | null;
  lastCHOCH: number | null;
  confidence: number;
  bosCount: number;
  chochCount: number;
}

interface TimeframeAnalysis extends BOSCHOCHData {
  timeframe: string;
}

interface DominantBias {
  bias: "ALTA" | "BAIXA" | "NEUTRO" | "MISTO";
  strength: string;
  reasoning: string;
}

interface PremiumDiscount {
  currentPrice: number;
  rangeHigh: number;
  rangeLow: number;
  rangePercentage: number;
  status: "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT";
  statusDescription: string;
}

interface FVG {
  index: number;
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  midpoint: number;
  size: number;
  isFilled: boolean;
}

interface OrderBlock {
  index: number;
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  midpoint: number;
  volume: number;
  strength: number;
  confirmed: boolean;
}

interface ManipulationZone {
  type: "equal_highs" | "equal_lows" | "liquidity_sweep";
  price: number;
  startIndex: number;
  endIndex: number;
  danger: number;
}

interface TargetSwing {
  type: "high" | "low";
  price: number;
  index: number;
}

interface POI {
  id: string;
  price: number;
  type: "bullish" | "bearish";
  confluenceScore: number;
  factors: string[];
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  targetSwing: TargetSwing;
}

// 🆕 CAMADA 1: CONTEXT ENGINE
export interface TradingContext {
  ready: boolean;
  bias: "BULL" | "BEAR" | "RANGE" | null;
  biasStrength: "FORTE" | "MODERADO" | "FRACO";
  rangeHigh: number;
  rangeLow: number;
  session: "OCEANIA" | "ASIA" | "LONDON" | "NY";
}

// 🆕 CAMADA 3: DECISION ENGINE
export interface TradeDecision {
  execute: boolean;
  reason: string;
  confluenceScore: number;
  patternScore: number;
  combinedScore: number;
}

// PRE-LIST TRADE RAIZ EVOLUÍDO - CONFLUENCE SCORE
export interface TraderRaizChecklist {
  // 🆕 CONTEXTO (Camada 1)
  context: TradingContext;
  
  // 5 critérios principais (para UI)
  sweepDetected: boolean;
  sweepType: "sweep_low" | "sweep_high" | null;
  sweepLevel: number | null;
  structureConfirmed: boolean;
  structureType: "BOS" | "CHOCH" | null;
  structurePrice: number | null;
  fvgPresent: boolean;
  fvgType: "bullish" | "bearish" | null;
  zoneCorrect: boolean;
  zoneName: "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM";
  riskRewardValid: boolean;
  riskRewardValue: number;
  
  // Legacy para compatibilidade
  swingsMapped: boolean;
  swingsCount: number;
  trendDefined: boolean;
  trendDirection: "ALTA" | "BAIXA" | "NEUTRO";
  structureBroken: boolean;
  bossConfirmado: boolean;
  zoneAligned: boolean;
  manipulationIdentified: boolean;
  manipulationZonesCount: number;
  orderBlockLocated: boolean;
  orderBlockRange: string;
  orderBlockStrength: number;
  orderBlockEntry50: number | null;
  entryConfirmed: boolean;
  
  // 🆕 CONFLUENCE SCORE
  confluenceScore: number;
  confluenceMaxScore: number;
  confluencePercentage: number;
  confluenceFactors: string[];
  
  // 🆕 DECISION ENGINE (Camada 3)
  decision: TradeDecision;

  criteriaCount: number;
  allCriteriaMet: boolean;
  conclusion: "ENTRADA VÁLIDA" | "AGUARDAR" | "ANULAR";
  reasoning: string;
}

interface CurrentTimeframeAnalysis extends BOSCHOCHData {
  timeframe: string;
  interpretation: string;
  alignedWithHigherTF: boolean;
  tradingOpportunity: boolean;
  reasoning: string;
  premiumDiscount: PremiumDiscount;
  fvgs: FVG[];
  orderBlocks: OrderBlock[];
  manipulationZones: ManipulationZone[];
  pois: POI[];
}

// IA Learning Data
export interface IALearningData {
  padraoId: string;
  taxaAcerto: number;
  vezesTestado: number;
  confianca: "ALTA" | "MEDIA" | "BAIXA" | "NEUTRO";
  ajusteAplicado: string;
}

export interface MTFAnalysis {
  symbol: string;
  timestamp: string;
  higherTimeframes: {
    "1d": BOSCHOCHData;
    "4h": BOSCHOCHData;
    "1h": BOSCHOCHData;
  };
  dominantBias: DominantBias;
  currentTimeframe: CurrentTimeframeAnalysis;
  checklist: TraderRaizChecklist;
  allTimeframes: TimeframeAnalysis[];
  iaLearning?: IALearningData | null;
}

const DEFAULT_TIMEFRAMES = ["1d", "4h", "1h", "30m", "15m", "5m", "1m"];

export const useMultiTimeframeAnalysis = (
  symbol: string, 
  currentTimeframe: string,
  timeframes: string[] = DEFAULT_TIMEFRAMES
) => {
  const [data, setData] = useState<MTFAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref para evitar múltiplas execuções de ordens
  const lastExecutedSignalRef = useRef<string | null>(null);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obter userId para consulta de IA
      let userId: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      } catch {
        // Se não conseguir obter usuário, continua sem IA
      }

      const { data: result, error: funcError } = await supabase.functions.invoke(
        "analyze-multi-timeframe",
        {
          body: { 
            symbol, 
            timeframes,
            currentTimeframe,
            userId, // Passar userId para consulta de aprendizado IA
          },
        }
      );

      if (funcError) {
        throw funcError;
      }

      setData(result);
    } catch (err: any) {
      console.error("Erro ao buscar análise MTF:", err);
      setError(err.message || "Erro ao buscar análise");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();

    // Atualizar a cada 1 minuto
    const interval = setInterval(fetchAnalysis, 60000);

    return () => clearInterval(interval);
  }, [symbol, currentTimeframe, JSON.stringify(timeframes)]);

  // GATE DE PRONTIDÃO: Bloqueia execução até sistema estar completamente pronto
  const isSystemReady = useMemo(() => {
    const ready = !!(
      data &&
      data.currentTimeframe &&
      data.checklist &&
      data.currentTimeframe.premiumDiscount &&
      data.currentTimeframe.pois &&
      Object.keys(data).length > 0
    );
    
    if (!ready && data !== null) {
      console.log("⏸️ Sistema ainda não está pronto - aguardando dados completos");
    }
    
    return ready;
  }, [data]);

  // Auto-executar sinais APENAS quando Pre-List Trader Raiz for válida E sistema pronto
  useEffect(() => {
    const checkAndExecuteSignals = async () => {
      // GATE: Verificar prontidão do sistema primeiro
      if (!isSystemReady) {
        console.log("[AUTO-EXECUTE] Sistema não está pronto - aguardando dados completos");
        return;
      }
      
      // Verificar se há dados e checklist
      if (!data?.currentTimeframe?.pois || !data?.checklist) {
        console.log("[AUTO-EXECUTE] Sem dados ou checklist");
        return;
      }
      
      const checklist = data.checklist;
      const bestPOI = data.currentTimeframe.pois[0];
      
      // 🆕 CAMADA 1: VERIFICAR CONTEXTO
      if (!checklist.context?.ready) {
        console.log(`[AUTO-EXECUTE] ⏸️ Contexto não definido - AGUARDAR`);
        return;
      }
      
      console.log(`[AUTO-EXECUTE] 🔷 CONTEXTO: Bias=${checklist.context.bias} | Strength=${checklist.context.biasStrength} | Session=${checklist.context.session}`);
      
      // 🆕 CAMADA 2: Log dos setups detectados
      console.log(`[AUTO-EXECUTE] 🔷 SETUPS: Sweep=${checklist.sweepDetected} | FVG=${checklist.fvgPresent} | Structure=${checklist.structureConfirmed} | Zone=${checklist.zoneName}`);
      
      // 🆕 CAMADA 3: DECISION ENGINE
      const decision = checklist.decision;
      console.log(`[AUTO-EXECUTE] 🔷 DECISION: ${decision.reason}`);
      console.log(`[AUTO-EXECUTE]    Confluence: ${decision.confluenceScore.toFixed(1)}/10 | Pattern: ${decision.patternScore}/100 | Combined: ${decision.combinedScore.toFixed(0)}/100`);
      
      // 🆕 Usar DECISION ENGINE em vez de allCriteriaMet
      if (!decision.execute) {
        console.log(`[AUTO-EXECUTE] ⏸️ Decision Engine: NÃO EXECUTAR`);
        return;
      }
      
      // R:R mínimo de 2.5:1 (mais realista)
      if (!bestPOI || bestPOI.riskReward < 2.5) {
        console.log(`[AUTO-EXECUTE] R:R ${bestPOI?.riskReward?.toFixed(1) || 0} < 2.5:1 - ABORTANDO`);
        return;
      }
      
      // Evitar re-executar o mesmo sinal
      const signalId = `${bestPOI.id}_${bestPOI.entry}_${bestPOI.riskReward}`;
      if (lastExecutedSignalRef.current === signalId) {
        console.log("[AUTO-EXECUTE] Sinal já executado anteriormente");
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: settings } = await supabase
          .from("user_settings")
          .select("bot_status, paper_mode, auto_trading_enabled")
          .eq("user_id", user.id)
          .single();

        if (settings?.bot_status !== "running") {
          console.log("[AUTO-EXECUTE] Bot não está running");
          return;
        }

        // VERIFICAR AUTO TRADING HABILITADO
        if (!settings?.auto_trading_enabled) {
          console.log("[AUTO-EXECUTE] Auto Trading: OFF - NÃO EXECUTAR");
          return;
        }

        // Usar dados REAIS do POI calculado
        const direction = bestPOI.type === "bullish" ? "LONG" : "SHORT";
        const entry = bestPOI.entry;
        const stopLoss = bestPOI.stopLoss;
        const takeProfit = bestPOI.takeProfit;
        const riskReward = bestPOI.riskReward;

        console.log("[AUTO-EXECUTE] 🎯 DECISION ENGINE APROVOU!");
        console.log(`   Contexto: ${checklist.context?.bias} (${checklist.context?.biasStrength})`);
        console.log(`   Direção: ${direction}`);
        console.log(`   Entry: $${entry.toFixed(2)}`);
        console.log(`   SL: $${stopLoss.toFixed(2)}`);
        console.log(`   TP: $${takeProfit.toFixed(2)}`);
        console.log(`   R:R: 1:${riskReward.toFixed(2)}`);
        console.log(`   Checklist: ${checklist.criteriaCount}/5 critérios`);

        let orderResult: any = null;
        let errorMessage: string | null = null;
        
        try {
          const response = await supabase.functions.invoke("execute-order", {
            body: {
              asset: symbol,
              direction,
              entry_price: entry,
              stop_loss: stopLoss,
              take_profit: takeProfit,
              risk_reward: riskReward,
              signal_data: {
                ...data.currentTimeframe,
                poi: bestPOI,
              },
              checklist: checklist,
            },
          });
          
          // When edge function returns non-2xx, error is FunctionsHttpError
          // The actual error body must be read from response.response (raw Response object)
          if (response.error) {
            console.warn("[AUTO-EXECUTE] FunctionsHttpError detected");
            
            // Try to read the error body from the raw Response object
            try {
              const rawResponse = (response as any).response as Response | undefined;
              if (rawResponse && typeof rawResponse.json === 'function') {
                const errorBody = await rawResponse.json();
                console.log("[AUTO-EXECUTE] Error body:", errorBody);
                errorMessage = errorBody?.error || "Erro ao executar ordem";
              } else {
                errorMessage = response.error.message || "Erro ao executar ordem";
              }
            } catch (parseError) {
              console.warn("[AUTO-EXECUTE] Could not parse error body:", parseError);
              errorMessage = response.error.message || "Erro ao executar ordem";
            }
          } 
          // Handle API error in response body (some 400 status codes return data with error)
          else if (response.data?.error) {
            errorMessage = typeof response.data.error === 'string' 
              ? response.data.error 
              : JSON.stringify(response.data.error);
          } else if (response.data) {
            orderResult = response.data;
          }
        } catch (invokeError: any) {
          console.warn("[AUTO-EXECUTE] Invoke exception:", invokeError);
          errorMessage = invokeError?.message || "Erro de conexão";
        }

        // Show toast and exit gracefully if there's any error
        if (errorMessage) {
          console.warn("[AUTO-EXECUTE] Ordem bloqueada:", errorMessage);
          toast({
            title: "⚠️ Ordem não executada",
            description: errorMessage.length > 100 ? errorMessage.substring(0, 100) + "..." : errorMessage,
            variant: "destructive",
          });
          return; // Exit gracefully without crashing
        }
        
        if (orderResult?.success) {
          lastExecutedSignalRef.current = signalId;
          toast({
            title: `✅ Ordem ${direction} executada`,
            description: `${symbol} @ $${entry.toFixed(2)} | R:R 1:${riskReward.toFixed(2)} | ${settings.paper_mode ? 'PAPER' : 'REAL'}`,
          });
        }
      } catch (error: any) {
        console.error("[AUTO-EXECUTE] Erro geral:", error?.message || error);
      }
    };

    checkAndExecuteSignals();
  }, [data?.currentTimeframe?.pois?.[0]?.id, data?.checklist?.allCriteriaMet, symbol, isSystemReady]);

  return { data, loading, error, refresh: fetchAnalysis, isSystemReady };
};
