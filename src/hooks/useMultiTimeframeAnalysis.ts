import { useState, useEffect, useRef } from "react";
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

// PRE-LIST TRADER RAIZ
export interface TraderRaizChecklist {
  swingsMapped: boolean;
  swingsCount: number;
  trendDefined: boolean;
  trendDirection: "ALTA" | "BAIXA" | "NEUTRO";
  structureBroken: boolean;
  structureType: "BOS" | "CHOCH" | null;
  structurePrice: number | null;
  zoneCorrect: boolean;
  zoneName: "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM";
  zoneAligned: boolean;
  manipulationIdentified: boolean;
  manipulationZonesCount: number;
  orderBlockLocated: boolean;
  orderBlockRange: string;
  orderBlockStrength: number;
  riskRewardValid: boolean;
  riskRewardValue: number;
  entryConfirmed: boolean;
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

      const { data: result, error: funcError } = await supabase.functions.invoke(
        "analyze-multi-timeframe",
        {
          body: { 
            symbol, 
            timeframes,
            currentTimeframe 
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

  // Auto-executar sinais APENAS quando Pre-List Trader Raiz for válida
  useEffect(() => {
    const checkAndExecuteSignals = async () => {
      // Verificar se há dados e checklist
      if (!data?.currentTimeframe?.pois || !data?.checklist) {
        console.log("[AUTO-EXECUTE] Sem dados ou checklist");
        return;
      }
      
      const checklist = data.checklist;
      const bestPOI = data.currentTimeframe.pois[0];
      
      // REGRA TRADER RAIZ: Só executa se todos os 8 critérios forem satisfeitos
      if (!checklist.allCriteriaMet) {
        console.log(`[AUTO-EXECUTE] Pre-List: ${checklist.conclusion} (${checklist.criteriaCount}/8) - NÃO EXECUTAR`);
        return;
      }
      
      // Verificar se há POI válido com R:R >= 3:1
      if (!bestPOI || bestPOI.riskReward < 3.0) {
        console.log(`[AUTO-EXECUTE] R:R ${bestPOI?.riskReward || 0} < 3:1 - ABORTANDO`);
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

        console.log("[AUTO-EXECUTE] 🎯 PRE-LIST TRADER RAIZ APROVADA!");
        console.log(`   Direção: ${direction}`);
        console.log(`   Entry: $${entry.toFixed(2)}`);
        console.log(`   SL: $${stopLoss.toFixed(2)}`);
        console.log(`   TP: $${takeProfit.toFixed(2)}`);
        console.log(`   R:R: 1:${riskReward.toFixed(2)}`);
        console.log(`   Checklist: ${checklist.criteriaCount}/8 critérios`);

        let orderResult: any = null;
        let error: any = null;
        
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
          orderResult = response.data;
          error = response.error;
        } catch (invokeError: any) {
          console.warn("[AUTO-EXECUTE] Invoke exception:", invokeError);
          error = invokeError;
        }

        // Check for network errors, API errors (400 responses), or error in response body
        const apiError = error || orderResult?.error;
        
        if (apiError) {
          const errorMessage = typeof apiError === 'string' 
            ? apiError 
            : (apiError?.message || apiError?.error || JSON.stringify(apiError));
          console.warn("[AUTO-EXECUTE] Ordem bloqueada:", errorMessage);
          toast({
            title: "⚠️ Ordem não executada",
            description: errorMessage,
            variant: "destructive",
          });
          return; // Exit gracefully
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
  }, [data?.currentTimeframe?.pois?.[0]?.id, data?.checklist?.allCriteriaMet, symbol]);

  return { data, loading, error, refresh: fetchAnalysis };
};
