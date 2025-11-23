import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  type: "high" | "low";
}

interface BOSCHOCHResult {
  trend: "ALTA" | "BAIXA" | "NEUTRO";
  lastBOS: number | null;
  lastCHOCH: number | null;
  confidence: number;
  bosCount: number;
  chochCount: number;
}

interface PremiumDiscountResult {
  currentPrice: number;
  rangeHigh: number;
  rangeLow: number;
  rangePercentage: number;
  status: "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT";
  statusDescription: string;
}

// Detecta swing points (highs e lows) nos candles
function calculatePremiumDiscount(candles: Candle[], swings: SwingPoint[]): PremiumDiscountResult {
  const currentPrice = candles[candles.length - 1].close;
  
  const recentHighs = swings.filter(s => s.type === "high").slice(-3);
  const recentLows = swings.filter(s => s.type === "low").slice(-3);
  
  if (recentHighs.length === 0 || recentLows.length === 0) {
    return {
      currentPrice,
      rangeHigh: currentPrice,
      rangeLow: currentPrice,
      rangePercentage: 50,
      status: "EQUILIBRIUM",
      statusDescription: "Range indefinido",
    };
  }
  
  const rangeHigh = Math.max(...recentHighs.map(h => h.price));
  const rangeLow = Math.min(...recentLows.map(l => l.price));
  
  const rangeSize = rangeHigh - rangeLow;
  const priceFromLow = currentPrice - rangeLow;
  const rangePercentage = rangeSize > 0 ? (priceFromLow / rangeSize) * 100 : 50;
  
  let status: "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT";
  let statusDescription: string;
  
  if (rangePercentage >= 60) {
    status = "PREMIUM";
    statusDescription = "Zona de Venda (Premium)";
  } else if (rangePercentage <= 40) {
    status = "DISCOUNT";
    statusDescription = "Zona de Compra (Discount)";
  } else {
    status = "EQUILIBRIUM";
    statusDescription = "Equilíbrio (50%)";
  }
  
  return {
    currentPrice,
    rangeHigh,
    rangeLow,
    rangePercentage: Math.max(0, Math.min(100, rangePercentage)),
    status,
    statusDescription,
  };
}

function detectSwingPoints(
  candles: Candle[],
  leftBars: number = 5,
  rightBars: number = 5
): SwingPoint[] {
  const swingPoints: SwingPoint[] = [];

  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const current = candles[i];
    let isSwingHigh = true;
    let isSwingLow = true;

    // Verificar se é swing high
    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j !== i && candles[j].high >= current.high) {
        isSwingHigh = false;
        break;
      }
    }

    // Verificar se é swing low
    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j !== i && candles[j].low <= current.low) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingHigh) {
      swingPoints.push({
        index: i,
        price: current.high,
        type: "high",
      });
    }

    if (isSwingLow) {
      swingPoints.push({
        index: i,
        price: current.low,
        type: "low",
      });
    }
  }

  return swingPoints;
}

// Detecta BOS (Break of Structure) e CHOCH (Change of Character)
function detectBOSandCHOCH(candles: Candle[], swings: SwingPoint[]): BOSCHOCHResult {
  const highs = swings.filter(s => s.type === "high").sort((a, b) => a.index - b.index);
  const lows = swings.filter(s => s.type === "low").sort((a, b) => a.index - b.index);

  if (highs.length < 2 || lows.length < 2) {
    return {
      trend: "NEUTRO",
      lastBOS: null,
      lastCHOCH: null,
      confidence: 30,
      bosCount: 0,
      chochCount: 0,
    };
  }

  // Identificar trend atual baseado em Higher Highs/Higher Lows ou Lower Highs/Lower Lows
  let currentTrend: "ALTA" | "BAIXA" | "NEUTRO" = "NEUTRO";
  let bosCount = 0;
  let chochCount = 0;
  let lastBOS: number | null = null;
  let lastCHOCH: number | null = null;

  // Analisar sequência de highs e lows
  const recentHighs = highs.slice(-3);
  const recentLows = lows.slice(-3);

  // Detectar Higher Highs e Higher Lows (UPTREND)
  let hasHigherHighs = true;
  let hasHigherLows = true;
  
  for (let i = 1; i < recentHighs.length; i++) {
    if (recentHighs[i].price <= recentHighs[i - 1].price) {
      hasHigherHighs = false;
    }
  }
  
  for (let i = 1; i < recentLows.length; i++) {
    if (recentLows[i].price <= recentLows[i - 1].price) {
      hasHigherLows = false;
    }
  }

  // Detectar Lower Highs e Lower Lows (DOWNTREND)
  let hasLowerHighs = true;
  let hasLowerLows = true;
  
  for (let i = 1; i < recentHighs.length; i++) {
    if (recentHighs[i].price >= recentHighs[i - 1].price) {
      hasLowerHighs = false;
    }
  }
  
  for (let i = 1; i < recentLows.length; i++) {
    if (recentLows[i].price >= recentLows[i - 1].price) {
      hasLowerLows = false;
    }
  }

  // Determinar trend
  if (hasHigherHighs && hasHigherLows) {
    currentTrend = "ALTA";
    
    // BOS em ALTA: novo high > high anterior
    if (recentHighs.length >= 2) {
      const lastHigh = recentHighs[recentHighs.length - 1];
      const prevHigh = recentHighs[recentHighs.length - 2];
      if (lastHigh.price > prevHigh.price) {
        lastBOS = candles[lastHigh.index].time;
        bosCount++;
      }
    }
    
    // CHOCH em ALTA: preço quebrou último low (contra tendência)
    if (recentLows.length >= 2) {
      const lastLow = recentLows[recentLows.length - 1];
      const prevLow = recentLows[recentLows.length - 2];
      if (lastLow.price < prevLow.price) {
        lastCHOCH = candles[lastLow.index].time;
        chochCount++;
      }
    }
  } else if (hasLowerHighs && hasLowerLows) {
    currentTrend = "BAIXA";
    
    // BOS em BAIXA: novo low < low anterior
    if (recentLows.length >= 2) {
      const lastLow = recentLows[recentLows.length - 1];
      const prevLow = recentLows[recentLows.length - 2];
      if (lastLow.price < prevLow.price) {
        lastBOS = candles[lastLow.index].time;
        bosCount++;
      }
    }
    
    // CHOCH em BAIXA: preço quebrou último high (contra tendência)
    if (recentHighs.length >= 2) {
      const lastHigh = recentHighs[recentHighs.length - 1];
      const prevHigh = recentHighs[recentHighs.length - 2];
      if (lastHigh.price > prevHigh.price) {
        lastCHOCH = candles[lastHigh.index].time;
        chochCount++;
      }
    }
  }

  // Calcular confidence
  let confidence = 30;
  if (currentTrend !== "NEUTRO") {
    confidence = 60;
    if (lastBOS) confidence += 20;
    if (bosCount > 1) confidence += 10;
    if (confidence > 95) confidence = 95;
  }

  return {
    trend: currentTrend,
    lastBOS,
    lastCHOCH,
    confidence,
    bosCount,
    chochCount,
  };
}

// Determina o viés dominante baseado nos timeframes superiores
function determineDominantBias(higherTF: Record<string, BOSCHOCHResult>) {
  const d1 = higherTF["1d"];
  const h4 = higherTF["4h"];
  const h1 = higherTF["1h"];

  // Se 1D e 4H concordam com BOS confirmado = viés FORTE
  if (d1.trend === "ALTA" && h4.trend === "ALTA" && d1.lastBOS && h4.lastBOS) {
    return {
      bias: "ALTA" as const,
      strength: "FORTE",
      reasoning: "Diário e 4H em alta com BOS confirmado",
    };
  }

  if (d1.trend === "BAIXA" && h4.trend === "BAIXA" && d1.lastBOS && h4.lastBOS) {
    return {
      bias: "BAIXA" as const,
      strength: "FORTE",
      reasoning: "Diário e 4H em baixa com BOS confirmado",
    };
  }

  // Se 1D e 4H em alta, mas sem BOS claro = viés MODERADO
  if (d1.trend === "ALTA" && h4.trend === "ALTA") {
    return {
      bias: "ALTA" as const,
      strength: "MODERADO",
      reasoning: "Diário e 4H em alta, aguardando BOS para confirmar força",
    };
  }

  if (d1.trend === "BAIXA" && h4.trend === "BAIXA") {
    return {
      bias: "BAIXA" as const,
      strength: "MODERADO",
      reasoning: "Diário e 4H em baixa, aguardando BOS para confirmar força",
    };
  }

  // Divergência entre 1D e 4H = viés MISTO
  if (d1.trend === "ALTA" && h4.trend === "BAIXA") {
    return {
      bias: "MISTO" as const,
      strength: "FRACA",
      reasoning: "Divergência: Diário em alta mas 4H em baixa - Aguardar alinhamento",
    };
  }

  if (d1.trend === "BAIXA" && h4.trend === "ALTA") {
    return {
      bias: "MISTO" as const,
      strength: "FRACA",
      reasoning: "Divergência: Diário em baixa mas 4H em alta - Aguardar alinhamento",
    };
  }

  // Sem estrutura clara
  return {
    bias: "NEUTRO" as const,
    strength: "NENHUMA",
    reasoning: "Sem estrutura clara nos timeframes superiores",
  };
}

// Analisa timeframe atual COM contexto dos timeframes superiores
function analyzeWithContext(
  localAnalysis: BOSCHOCHResult,
  dominantBias: ReturnType<typeof determineDominantBias>,
  higherTF: Record<string, BOSCHOCHResult>
) {
  let interpretation = "";
  let tradingOpportunity = false;
  const alignedWithHigherTF = localAnalysis.trend === dominantBias.bias;

  // CENÁRIO 1: Viés maior em ALTA
  if (dominantBias.bias === "ALTA") {
    if (localAnalysis.trend === "ALTA") {
      // Alinhamento total
      interpretation = "🚀 ALINHAMENTO TOTAL - Continuação de alta esperada";
      tradingOpportunity = true;
    } else if (localAnalysis.trend === "BAIXA") {
      // Pullback ou reversão?
      if (localAnalysis.lastCHOCH) {
        interpretation = "⚠️ CHOCH detectado - Possível reversão ou correção profunda. Aguardar confirmação.";
        tradingOpportunity = false;
      } else {
        interpretation = "✅ PULLBACK para zona de compra - Setup ideal para LONG";
        tradingOpportunity = true;
      }
    } else {
      interpretation = "⏸️ Consolidação - Aguardar definição de direção";
      tradingOpportunity = false;
    }
  }

  // CENÁRIO 2: Viés maior em BAIXA
  else if (dominantBias.bias === "BAIXA") {
    if (localAnalysis.trend === "BAIXA") {
      // Alinhamento total
      interpretation = "🚀 ALINHAMENTO TOTAL - Continuação de baixa esperada";
      tradingOpportunity = true;
    } else if (localAnalysis.trend === "ALTA") {
      // Pullback ou reversão?
      if (localAnalysis.lastCHOCH) {
        interpretation = "⚠️ CHOCH contra tendência maior - Risco elevado. Aguardar confirmação.";
        tradingOpportunity = false;
      } else {
        interpretation = "✅ PULLBACK para zona de venda - Setup ideal para SHORT";
        tradingOpportunity = true;
      }
    } else {
      interpretation = "⏸️ Consolidação - Aguardar definição de direção";
      tradingOpportunity = false;
    }
  }

  // CENÁRIO 3: Viés MISTO ou NEUTRO
  else {
    if (localAnalysis.lastCHOCH) {
      interpretation = "⚠️ Estrutura indefinida nos timeframes maiores com CHOCH detectado - Evitar operações";
    } else {
      interpretation = "⏸️ Aguardar alinhamento dos timeframes superiores antes de operar";
    }
    tradingOpportunity = false;
  }

  return {
    ...localAnalysis,
    interpretation,
    alignedWithHigherTF,
    tradingOpportunity,
    reasoning: alignedWithHigherTF
      ? "Movimento local segue direção dos timeframes superiores"
      : "Movimento local diverge dos timeframes superiores - Pode ser correção ou reversão",
  };
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframes, currentTimeframe } = await req.json();

    if (!symbol || !currentTimeframe) {
      throw new Error("Symbol and currentTimeframe are required");
    }

    console.log(`🎯 Análise Top-Down para ${symbol} | TF atual: ${currentTimeframe}`);

    // PASSO 1: SEMPRE analisar timeframes superiores PRIMEIRO (1D, 4H, 1H)
    const higherTimeframes = ["1d", "4h", "1h"];
    const higherTFAnalysis: Record<string, BOSCHOCHResult> = {};

    console.log("📊 Analisando timeframes superiores (1D → 4H → 1H)...");

    for (const tf of higherTimeframes) {
      const candles = await fetchBinanceKlines(symbol, tf, 100);
      const swings = detectSwingPoints(candles);
      const analysis = detectBOSandCHOCH(candles, swings);
      higherTFAnalysis[tf] = analysis;
      
      console.log(`  ${tf.toUpperCase()}: ${analysis.trend} | BOS: ${analysis.lastBOS ? '✓' : '✗'} | CHOCH: ${analysis.lastCHOCH ? '✓' : '✗'}`);
    }

    // PASSO 2: Determinar VIÉS DOMINANTE
    const dominantBias = determineDominantBias(higherTFAnalysis);
    console.log(`🎯 VIÉS DOMINANTE: ${dominantBias.bias} (${dominantBias.strength})`);

    // PASSO 3: Analisar timeframe atual COM CONTEXTO
    console.log(`🔍 Analisando ${currentTimeframe} com contexto superior...`);
    const currentTFCandles = await fetchBinanceKlines(symbol, currentTimeframe, 100);
    const currentTFSwings = detectSwingPoints(currentTFCandles);
    const currentTFLocalAnalysis = detectBOSandCHOCH(currentTFCandles, currentTFSwings);
    const premiumDiscount = calculatePremiumDiscount(currentTFCandles, currentTFSwings);
    const currentTFAnalysis = analyzeWithContext(
      currentTFLocalAnalysis,
      dominantBias,
      higherTFAnalysis
    );

    // PASSO 4: Analisar TODOS os timeframes para overview (opcional)
    const allTimeframesAnalysis = await Promise.all(
      timeframes.map(async (tf: string) => {
        const candles = await fetchBinanceKlines(symbol, tf, 100);
        const swings = detectSwingPoints(candles);
        const analysis = detectBOSandCHOCH(candles, swings);
        return {
          timeframe: tf,
          ...analysis,
        };
      })
    );

    const result = {
      symbol,
      timestamp: new Date().toISOString(),
      
      // CONTEXTO SUPERIOR (sempre presente)
      higherTimeframes: {
        "1d": higherTFAnalysis["1d"],
        "4h": higherTFAnalysis["4h"],
        "1h": higherTFAnalysis["1h"],
      },
      
      // VIÉS DOMINANTE
      dominantBias,
      
      // ANÁLISE DO TIMEFRAME ATUAL
      currentTimeframe: {
        timeframe: currentTimeframe,
        ...currentTFAnalysis,
        premiumDiscount,
      },
      
      // OVERVIEW DE TODOS OS TIMEFRAMES
      allTimeframes: allTimeframesAnalysis,
    };

    console.log("✅ Análise Top-Down concluída");
    console.log(`   Viés: ${dominantBias.bias} | TF Atual: ${currentTFAnalysis.trend} | Setup: ${currentTFAnalysis.tradingOpportunity ? '✓' : '✗'}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Erro na análise Top-Down:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
