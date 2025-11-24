import { useState, useEffect } from "react";
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

interface MTFAnalysis {
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

  // Auto-executar sinais se bot estiver rodando
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

  return { data, loading, error, refresh: fetchAnalysis };
};
