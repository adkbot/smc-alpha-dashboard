import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { fetchBinanceCandles, analyzeStructure, Candle, StructureResult } from "@/utils/smc";

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

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch candles for all timeframes in parallel
      const candlesPromises = timeframes.map(tf => fetchBinanceCandles(symbol, tf, 100));
      const candlesResults = await Promise.all(candlesPromises);

      const tfMap: Record<string, Candle[]> = {};
      timeframes.forEach((tf, i) => {
        tfMap[tf] = candlesResults[i];
      });

      // 2. Analyze structure for each timeframe
      const analysisMap: Record<string, StructureResult> = {};
      timeframes.forEach(tf => {
        analysisMap[tf] = analyzeStructure(tfMap[tf]);
      });

      // 3. Build the MTFAnalysis object
      const currentTFAnalysis = analysisMap[currentTimeframe];
      const currentCandles = tfMap[currentTimeframe];
      const currentPrice = currentCandles[currentCandles.length - 1].close;

      // Calculate Premium/Discount (using last 50 candles range)
      const recentCandles = currentCandles.slice(-50);
      const rangeHigh = Math.max(...recentCandles.map(c => c.high));
      const rangeLow = Math.min(...recentCandles.map(c => c.low));
      const rangeSize = rangeHigh - rangeLow;
      const rangePercentage = rangeSize > 0 ? ((currentPrice - rangeLow) / rangeSize) * 100 : 50;

      let pdStatus: "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT" = "EQUILIBRIUM";
      if (rangePercentage > 60) pdStatus = "PREMIUM";
      else if (rangePercentage < 40) pdStatus = "DISCOUNT";

      const result: MTFAnalysis = {
        symbol,
        timestamp: new Date().toISOString(),
        higherTimeframes: {
          "1d": { ...analysisMap["1d"], confidence: 80, bosCount: 0, chochCount: 0 },
          "4h": { ...analysisMap["4h"], confidence: 80, bosCount: 0, chochCount: 0 },
          "1h": { ...analysisMap["1h"], confidence: 80, bosCount: 0, chochCount: 0 },
        },
        dominantBias: {
          bias: analysisMap["4h"].trend, // Using 4h as dominant
          strength: "FORTE",
          reasoning: `Tendência de ${analysisMap["4h"].trend} no 4H confirmada por estrutura.`
        },
        currentTimeframe: {
          timeframe: currentTimeframe,
          ...currentTFAnalysis,
          confidence: 85,
          bosCount: 0,
          chochCount: 0,
          interpretation: `Estrutura de ${currentTFAnalysis.trend} identificada.`,
          alignedWithHigherTF: currentTFAnalysis.trend === analysisMap["4h"].trend,
          tradingOpportunity: (currentTFAnalysis.trend === "ALTA" && pdStatus === "DISCOUNT") || (currentTFAnalysis.trend === "BAIXA" && pdStatus === "PREMIUM"),
          reasoning: currentTFAnalysis.trend === "ALTA" && pdStatus === "DISCOUNT"
            ? "Tendência de ALTA em zona de DESCONTO (Oportunidade de Compra)"
            : currentTFAnalysis.trend === "BAIXA" && pdStatus === "PREMIUM"
              ? "Tendência de BAIXA em zona PREMIUM (Oportunidade de Venda)"
              : "Aguardando melhor ponto de entrada...",
          premiumDiscount: {
            currentPrice,
            rangeHigh,
            rangeLow,
            rangePercentage,
            status: pdStatus,
            statusDescription: pdStatus
          },
          fvgs: [], // TODO: Implement FVG detection
          orderBlocks: [], // TODO: Implement OB detection
          manipulationZones: [],
          pois: [] // TODO: Implement POI detection
        },
        allTimeframes: timeframes.map(tf => ({
          timeframe: tf,
          ...analysisMap[tf],
          confidence: 80,
          bosCount: 0,
          chochCount: 0
        }))
      };

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

  // Auto-executar sinais se bot estiver rodando
  /*
  useEffect(() => {
    const checkAndExecuteSignals = async () => {
      if (!data?.currentTimeframe?.tradingOpportunity) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: settings } = await supabase
          .from("user_settings")
          .select("bot_status")
          .eq("user_id", user.id)
          .single();

        if (settings?.bot_status === "running") {
          const direction = data.currentTimeframe.trend === "ALTA" ? "LONG" : "SHORT";
          const currentPrice = data.currentTimeframe.premiumDiscount.currentPrice;

          // Calcular SL e TP básicos (pode ser ajustado)
          const slDistance = currentPrice * 0.01; // 1% de distância
          const rr = 2.0;

          const stopLoss = direction === "LONG"
            ? currentPrice - slDistance
            : currentPrice + slDistance;

          const takeProfit = direction === "LONG"
            ? currentPrice + (slDistance * rr)
            : currentPrice - (slDistance * rr);

          const { error } = await supabase.functions.invoke("execute-order", {
            body: {
              asset: symbol,
              direction,
              entry_price: currentPrice,
              stop_loss: stopLoss,
              take_profit: takeProfit,
              risk_reward: rr,
              signal_data: data.currentTimeframe,
            },
          });

          if (error) {
            console.error("Erro ao executar ordem automaticamente:", error);
          } else {
            toast({
              title: `✅ Ordem ${direction} executada`,
              description: `${symbol} @ $${currentPrice.toFixed(2)}`,
            });
          }
        }
      } catch (error) {
        console.error("Erro ao verificar e executar sinais:", error);
      }
    };

    checkAndExecuteSignals();
  }, [data?.currentTimeframe?.tradingOpportunity, symbol]);
  */

  return { data, loading, error, refresh: fetchAnalysis };
};
