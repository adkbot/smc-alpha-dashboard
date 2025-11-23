import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

// Detectar swing highs e swing lows
function detectSwingPoints(candles: Candle[], leftBars = 5, rightBars = 5): SwingPoint[] {
  const swings: SwingPoint[] = [];
  
  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const current = candles[i];
    
    // Swing High
    let isSwingHigh = true;
    for (let j = i - leftBars; j < i + rightBars + 1; j++) {
      if (j !== i && candles[j].high >= current.high) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      swings.push({ index: i, price: current.high, type: 'high' });
    }
    
    // Swing Low
    let isSwingLow = true;
    for (let j = i - leftBars; j < i + rightBars + 1; j++) {
      if (j !== i && candles[j].low <= current.low) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      swings.push({ index: i, price: current.low, type: 'low' });
    }
  }
  
  return swings.sort((a, b) => a.index - b.index);
}

// Analisar estrutura de mercado
function analyzeMarketStructure(candles: Candle[]): {
  trend: 'ALTA' | 'BAIXA' | 'NEUTRO';
  lastBOS: number | null;
  confidence: number;
} {
  const swings = detectSwingPoints(candles);
  
  if (swings.length < 4) {
    return { trend: 'NEUTRO', lastBOS: null, confidence: 0 };
  }
  
  // Separar highs e lows
  const highs = swings.filter(s => s.type === 'high');
  const lows = swings.filter(s => s.type === 'low');
  
  if (highs.length < 2 || lows.length < 2) {
    return { trend: 'NEUTRO', lastBOS: null, confidence: 0 };
  }
  
  // Analisar últimos 3 highs e 3 lows
  const recentHighs = highs.slice(-3);
  const recentLows = lows.slice(-3);
  
  // Detectar Higher Highs e Higher Lows (ALTA)
  let isUptrend = true;
  let uptrendScore = 0;
  
  if (recentHighs.length >= 2) {
    for (let i = 1; i < recentHighs.length; i++) {
      if (recentHighs[i].price > recentHighs[i - 1].price) {
        uptrendScore++;
      } else {
        isUptrend = false;
      }
    }
  }
  
  if (recentLows.length >= 2) {
    for (let i = 1; i < recentLows.length; i++) {
      if (recentLows[i].price > recentLows[i - 1].price) {
        uptrendScore++;
      } else {
        isUptrend = false;
      }
    }
  }
  
  // Detectar Lower Highs e Lower Lows (BAIXA)
  let isDowntrend = true;
  let downtrendScore = 0;
  
  if (recentHighs.length >= 2) {
    for (let i = 1; i < recentHighs.length; i++) {
      if (recentHighs[i].price < recentHighs[i - 1].price) {
        downtrendScore++;
      } else {
        isDowntrend = false;
      }
    }
  }
  
  if (recentLows.length >= 2) {
    for (let i = 1; i < recentLows.length; i++) {
      if (recentLows[i].price < recentLows[i - 1].price) {
        downtrendScore++;
      } else {
        isDowntrend = false;
      }
    }
  }
  
  // Determinar trend
  let trend: 'ALTA' | 'BAIXA' | 'NEUTRO' = 'NEUTRO';
  let confidence = 0;
  
  if (isUptrend && uptrendScore >= 2) {
    trend = 'ALTA';
    confidence = Math.min(95, 60 + (uptrendScore * 10));
  } else if (isDowntrend && downtrendScore >= 2) {
    trend = 'BAIXA';
    confidence = Math.min(95, 60 + (downtrendScore * 10));
  } else {
    confidence = 30;
  }
  
  // Detectar último BOS (Break of Structure)
  let lastBOS: number | null = null;
  const recentCandles = candles.slice(-10);
  
  if (trend === 'ALTA' && highs.length >= 2) {
    const lastHigh = highs[highs.length - 1];
    const prevHigh = highs[highs.length - 2];
    if (lastHigh.price > prevHigh.price) {
      lastBOS = candles[lastHigh.index].time;
    }
  } else if (trend === 'BAIXA' && lows.length >= 2) {
    const lastLow = lows[lows.length - 1];
    const prevLow = lows[lows.length - 2];
    if (lastLow.price < prevLow.price) {
      lastBOS = candles[lastLow.index].time;
    }
  }
  
  return { trend, lastBOS, confidence };
}

// Buscar dados da Binance
async function fetchBinanceKlines(symbol: string, interval: string, limit = 100): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao buscar dados da Binance: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return data.map((k: any) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframes } = await req.json();
    
    if (!symbol || !timeframes || !Array.isArray(timeframes)) {
      return new Response(
        JSON.stringify({ error: 'symbol e timeframes são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analisando ${symbol} em ${timeframes.length} timeframes...`);

    // Analisar cada timeframe
    const analysisPromises = timeframes.map(async (tf) => {
      try {
        const candles = await fetchBinanceKlines(symbol, tf, 100);
        const analysis = analyzeMarketStructure(candles);
        
        return {
          timeframe: tf,
          trend: analysis.trend,
          lastBOS: analysis.lastBOS,
          confidence: analysis.confidence,
        };
      } catch (error) {
        console.error(`Erro ao analisar ${tf}:`, error);
        return {
          timeframe: tf,
          trend: 'NEUTRO' as const,
          lastBOS: null,
          confidence: 0,
        };
      }
    });

    const analysis = await Promise.all(analysisPromises);

    // Calcular alinhamento
    const trendCounts = analysis.reduce((acc, a) => {
      acc[a.trend] = (acc[a.trend] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalTimeframes = analysis.length;
    const altaCount = trendCounts['ALTA'] || 0;
    const baixaCount = trendCounts['BAIXA'] || 0;
    const maxCount = Math.max(altaCount, baixaCount);
    const alignment = maxCount / totalTimeframes;

    // Determinar viés dominante (baseado em timeframes maiores)
    const largerTimeframes = analysis.slice(0, 3); // Primeiros 3 timeframes (assumindo ordem decrescente)
    const largerTrends = largerTimeframes.map(a => a.trend);
    const dominantBias = largerTrends.filter(t => t === 'ALTA').length >= 2 ? 'ALTA' : 
                         largerTrends.filter(t => t === 'BAIXA').length >= 2 ? 'BAIXA' : 
                         'NEUTRO';

    const result = {
      symbol,
      timestamp: new Date().toISOString(),
      analysis,
      alignment,
      alignmentPercentage: Math.round(alignment * 100),
      dominantBias,
      trendCounts,
    };

    console.log('Análise MTF concluída:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro na análise MTF:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
