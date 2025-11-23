import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TimeframeAnalysis {
  timeframe: string;
  trend: "ALTA" | "BAIXA" | "NEUTRO";
  lastBOS: number | null;
  confidence: number;
}

interface MTFAnalysis {
  symbol: string;
  timestamp: string;
  analysis: TimeframeAnalysis[];
  alignment: number;
  alignmentPercentage: number;
  dominantBias: "ALTA" | "BAIXA" | "NEUTRO";
  trendCounts: Record<string, number>;
}

const DEFAULT_TIMEFRAMES = ["1d", "4h", "1h", "30m", "15m", "5m", "1m"];

export const useMultiTimeframeAnalysis = (symbol: string, timeframes: string[] = DEFAULT_TIMEFRAMES) => {
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
          body: { symbol, timeframes },
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
  }, [symbol, JSON.stringify(timeframes)]);

  return { data, loading, error, refresh: fetchAnalysis };
};
