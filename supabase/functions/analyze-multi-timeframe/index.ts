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

// PRE-LIST TRADER RAIZ - 8 CRITÉRIOS OBRIGATÓRIOS
interface TraderRaizChecklist {
  // 1. Topos e Fundos Mapeados
  swingsMapped: boolean;
  swingsCount: number;
  
  // 2. Tendência Definida
  trendDefined: boolean;
  trendDirection: "ALTA" | "BAIXA" | "NEUTRO";
  
  // 3. Estrutura Quebrada (BOS/CHoCH)
  structureBroken: boolean;
  structureType: "BOS" | "CHOCH" | null;
  structurePrice: number | null;
  
  // 4. Zona Correta (Premium/Discount)
  zoneCorrect: boolean;
  zoneName: "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM";
  zoneAligned: boolean;
  
  // 5. Manipulação Identificada
  manipulationIdentified: boolean;
  manipulationZonesCount: number;
  
  // 6. Order Block Localizado
  orderBlockLocated: boolean;
  orderBlockRange: string;
  orderBlockStrength: number;
  
  // 7. Risco/Retorno >= 3:1 (idealmente 5:1)
  riskRewardValid: boolean;
  riskRewardValue: number;
  
  // 8. Confirmação de Entrada
  entryConfirmed: boolean;
  
  // Resumo
  criteriaCount: number;
  allCriteriaMet: boolean;
  conclusion: "ENTRADA VÁLIDA" | "AGUARDAR" | "ANULAR";
  reasoning: string;
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
  
  // Relaxar critérios - 55% e 45% em vez de 60% e 40%
  if (rangePercentage >= 55) {
    status = "PREMIUM";
    statusDescription = "Zona de Venda (Premium)";
  } else if (rangePercentage <= 45) {
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

// Detectar swing points com parâmetros mais relaxados
function detectSwingPoints(
  candles: Candle[],
  leftBars: number = 3,  // Reduzido de 5 para 3
  rightBars: number = 3  // Reduzido de 5 para 3
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

// Detecta BOS (Break of Structure) e CHOCH (Change of Character) - RELAXADO
function detectBOSandCHOCH(candles: Candle[], swings: SwingPoint[]): BOSCHOCHResult {
  const highs = swings.filter(s => s.type === "high").sort((a, b) => a.index - b.index);
  const lows = swings.filter(s => s.type === "low").sort((a, b) => a.index - b.index);
  const currentPrice = candles[candles.length - 1].close;

  // Relaxar: precisa de apenas 2 swings em vez de 2+ com validação perfeita
  if (highs.length < 1 || lows.length < 1) {
    return {
      trend: "NEUTRO",
      lastBOS: null,
      lastCHOCH: null,
      confidence: 30,
      bosCount: 0,
      chochCount: 0,
    };
  }

  let currentTrend: "ALTA" | "BAIXA" | "NEUTRO" = "NEUTRO";
  let bosCount = 0;
  let chochCount = 0;
  let lastBOS: number | null = null;
  let lastCHOCH: number | null = null;

  // Pegar swings mais recentes
  const recentHighs = highs.slice(-4);
  const recentLows = lows.slice(-4);

  // MÉTODO 1: Verificar estrutura de mercado baseado em quebra de nível
  const lastHigh = recentHighs[recentHighs.length - 1];
  const lastLow = recentLows[recentLows.length - 1];
  const prevHigh = recentHighs.length > 1 ? recentHighs[recentHighs.length - 2] : null;
  const prevLow = recentLows.length > 1 ? recentLows[recentLows.length - 2] : null;

  // Verificar BOS de ALTA: preço atual quebrou o último high significativo
  if (prevHigh && currentPrice > prevHigh.price) {
    currentTrend = "ALTA";
    lastBOS = candles[candles.length - 1].time;
    bosCount++;
  }

  // Verificar BOS de BAIXA: preço atual quebrou o último low significativo
  if (prevLow && currentPrice < prevLow.price) {
    currentTrend = "BAIXA";
    lastBOS = candles[candles.length - 1].time;
    bosCount++;
  }

  // MÉTODO 2: Verificar Higher Highs/Lows ou Lower Highs/Lows (relaxado)
  if (currentTrend === "NEUTRO" && recentHighs.length >= 2 && recentLows.length >= 2) {
    // Verificar tendência de alta: último high > penúltimo high E último low > penúltimo low
    const highTrending = lastHigh.price > (prevHigh?.price || 0);
    const lowTrending = lastLow.price > (prevLow?.price || 0);
    
    if (highTrending && lowTrending) {
      currentTrend = "ALTA";
      lastBOS = candles[lastHigh.index].time;
      bosCount++;
    }
    
    // Verificar tendência de baixa: último high < penúltimo high E último low < penúltimo low
    const highDowntrending = lastHigh.price < (prevHigh?.price || Infinity);
    const lowDowntrending = lastLow.price < (prevLow?.price || Infinity);
    
    if (highDowntrending && lowDowntrending) {
      currentTrend = "BAIXA";
      lastBOS = candles[lastLow.index].time;
      bosCount++;
    }
  }

  // MÉTODO 3: Verificar apenas a última movimentação (mais relaxado ainda)
  if (currentTrend === "NEUTRO" && recentHighs.length >= 1 && recentLows.length >= 1) {
    // Se o preço está acima do último high, é bullish
    if (currentPrice > lastHigh.price) {
      currentTrend = "ALTA";
      bosCount++;
    }
    // Se o preço está abaixo do último low, é bearish
    else if (currentPrice < lastLow.price) {
      currentTrend = "BAIXA";
      bosCount++;
    }
    // Se está entre high e low, verificar onde está mais próximo
    else {
      const distanceToHigh = Math.abs(currentPrice - lastHigh.price);
      const distanceToLow = Math.abs(currentPrice - lastLow.price);
      const range = lastHigh.price - lastLow.price;
      
      // Se está 70%+ próximo do high, considera bullish momentum
      if (distanceToHigh < range * 0.3) {
        currentTrend = "ALTA";
      }
      // Se está 70%+ próximo do low, considera bearish momentum  
      else if (distanceToLow < range * 0.3) {
        currentTrend = "BAIXA";
      }
    }
  }

  // Detectar CHOCH (mudança de caráter)
  if (currentTrend === "ALTA" && prevLow && currentPrice < prevLow.price) {
    lastCHOCH = candles[candles.length - 1].time;
    chochCount++;
  }
  if (currentTrend === "BAIXA" && prevHigh && currentPrice > prevHigh.price) {
    lastCHOCH = candles[candles.length - 1].time;
    chochCount++;
  }

  // Calcular confidence
  let confidence = 40; // Base maior
  if (currentTrend !== "NEUTRO") {
    confidence = 60;
    if (lastBOS) confidence += 15;
    if (bosCount > 1) confidence += 10;
    if (prevHigh && prevLow) confidence += 10;
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

// Determina o viés dominante baseado nos timeframes superiores - RELAXADO
function determineDominantBias(higherTF: Record<string, BOSCHOCHResult>) {
  const d1 = higherTF["1d"];
  const h4 = higherTF["4h"];
  const h1 = higherTF["1h"];

  // Contagem de tendências
  const trends = [d1.trend, h4.trend, h1.trend];
  const altaCount = trends.filter(t => t === "ALTA").length;
  const baixaCount = trends.filter(t => t === "BAIXA").length;

  // Se 2+ timeframes concordam, usar essa direção
  if (altaCount >= 2) {
    const hasBOS = d1.lastBOS || h4.lastBOS || h1.lastBOS;
    return {
      bias: "ALTA" as const,
      strength: hasBOS ? "FORTE" : "MODERADO",
      reasoning: `${altaCount}/3 timeframes em alta${hasBOS ? ' com BOS confirmado' : ''}`,
    };
  }

  if (baixaCount >= 2) {
    const hasBOS = d1.lastBOS || h4.lastBOS || h1.lastBOS;
    return {
      bias: "BAIXA" as const,
      strength: hasBOS ? "FORTE" : "MODERADO",
      reasoning: `${baixaCount}/3 timeframes em baixa${hasBOS ? ' com BOS confirmado' : ''}`,
    };
  }

  // Se pelo menos 1 timeframe tem tendência clara, usar como viés fraco
  if (altaCount === 1 && baixaCount === 0) {
    return {
      bias: "ALTA" as const,
      strength: "FRACA",
      reasoning: "Um timeframe superior em alta, demais neutros",
    };
  }

  if (baixaCount === 1 && altaCount === 0) {
    return {
      bias: "BAIXA" as const,
      strength: "FRACA",
      reasoning: "Um timeframe superior em baixa, demais neutros",
    };
  }

  // Divergência ou todos neutros
  if (altaCount === 1 && baixaCount === 1) {
    return {
      bias: "MISTO" as const,
      strength: "FRACA",
      reasoning: "Divergência entre timeframes - Operar com cautela",
    };
  }

  // Se tudo neutro, mas H1 tem direção, usar como guia
  if (h1.trend !== "NEUTRO") {
    return {
      bias: h1.trend as "ALTA" | "BAIXA",
      strength: "FRACA",
      reasoning: `H1 mostra ${h1.trend.toLowerCase()}, demais indefinidos - Range Trading`,
    };
  }

  return {
    bias: "NEUTRO" as const,
    strength: "NENHUMA",
    reasoning: "Todos timeframes neutros - Range Trading ativo",
  };
}

// Analisa timeframe atual COM contexto dos timeframes superiores - RELAXADO
function analyzeWithContext(
  localAnalysis: BOSCHOCHResult,
  dominantBias: ReturnType<typeof determineDominantBias>,
  higherTF: Record<string, BOSCHOCHResult>
) {
  let interpretation = "";
  let tradingOpportunity = false;
  const alignedWithHigherTF = localAnalysis.trend === dominantBias.bias || dominantBias.bias === "NEUTRO";

  // CENÁRIO 1: Viés maior em ALTA
  if (dominantBias.bias === "ALTA") {
    if (localAnalysis.trend === "ALTA") {
      interpretation = "🚀 ALINHAMENTO TOTAL - Continuação de alta esperada";
      tradingOpportunity = true;
    } else if (localAnalysis.trend === "BAIXA") {
      if (localAnalysis.lastCHOCH) {
        interpretation = "⚠️ CHOCH detectado - Possível reversão. Aguardar confirmação.";
        tradingOpportunity = false;
      } else {
        interpretation = "✅ PULLBACK para zona de compra - Setup ideal para LONG";
        tradingOpportunity = true;
      }
    } else {
      interpretation = "⏸️ Consolidação em tendência de alta - Buscar entradas em suporte";
      tradingOpportunity = true; // Permite operações em consolidação dentro de tendência
    }
  }

  // CENÁRIO 2: Viés maior em BAIXA
  else if (dominantBias.bias === "BAIXA") {
    if (localAnalysis.trend === "BAIXA") {
      interpretation = "🚀 ALINHAMENTO TOTAL - Continuação de baixa esperada";
      tradingOpportunity = true;
    } else if (localAnalysis.trend === "ALTA") {
      if (localAnalysis.lastCHOCH) {
        interpretation = "⚠️ CHOCH contra tendência maior - Risco elevado.";
        tradingOpportunity = false;
      } else {
        interpretation = "✅ PULLBACK para zona de venda - Setup ideal para SHORT";
        tradingOpportunity = true;
      }
    } else {
      interpretation = "⏸️ Consolidação em tendência de baixa - Buscar entradas em resistência";
      tradingOpportunity = true;
    }
  }

  // CENÁRIO 3: Viés MISTO
  else if (dominantBias.bias === "MISTO") {
    interpretation = "⚠️ Divergência entre timeframes - Operar ranges ou aguardar definição";
    tradingOpportunity = true; // Permitir range trading
  }

  // CENÁRIO 4: Viés NEUTRO - Range Trading
  else {
    if (localAnalysis.trend === "ALTA") {
      interpretation = "📈 Range com momentum bullish - Oportunidades LONG em suportes";
      tradingOpportunity = true;
    } else if (localAnalysis.trend === "BAIXA") {
      interpretation = "📉 Range com momentum bearish - Oportunidades SHORT em resistências";
      tradingOpportunity = true;
    } else {
      interpretation = "📊 Mercado em range - Trading de extremos (suporte/resistência)";
      tradingOpportunity = true; // Range trading permitido
    }
  }

  return {
    ...localAnalysis,
    interpretation,
    alignedWithHigherTF,
    tradingOpportunity,
    reasoning: alignedWithHigherTF
      ? "Movimento local segue direção dos timeframes superiores"
      : "Movimento local pode indicar correção ou range - Operar com cautela",
  };
}

// Detecta Fair Value Gaps (FVG)
function detectFVG(candles: Candle[]): FVG[] {
  const fvgs: FVG[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  for (let i = 1; i < candles.length - 1; i++) {
    // Bullish FVG: high[i-1] < low[i+1]
    if (candles[i - 1].high < candles[i + 1].low) {
      const bottom = candles[i - 1].high;
      const top = candles[i + 1].low;
      const isFilled = currentPrice >= bottom && currentPrice <= top;
      
      fvgs.push({
        index: i,
        type: "bullish",
        bottom,
        top,
        midpoint: (bottom + top) / 2,
        size: top - bottom,
        isFilled
      });
    }
    
    // Bearish FVG: low[i-1] > high[i+1]
    if (candles[i - 1].low > candles[i + 1].high) {
      const bottom = candles[i + 1].high;
      const top = candles[i - 1].low;
      const isFilled = currentPrice >= bottom && currentPrice <= top;
      
      fvgs.push({
        index: i,
        type: "bearish",
        bottom,
        top,
        midpoint: (bottom + top) / 2,
        size: top - bottom,
        isFilled
      });
    }
  }
  
  // Retornar apenas os 5 FVGs mais recentes não preenchidos
  return fvgs
    .filter(fvg => !fvg.isFilled)
    .slice(-5);
}

// Detecta Order Blocks
function detectOrderBlocks(
  candles: Candle[],
  swings: SwingPoint[],
  bosIndexes: number[]
): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  
  // Se não há BOS detectados, criar Order Blocks baseado em swings recentes
  const indicesToCheck = bosIndexes.length > 0 
    ? bosIndexes 
    : swings.slice(-5).map(s => s.index);
  
  for (const idx of indicesToCheck) {
    const swing = swings.find(s => s.index === idx);
    
    if (swing?.type === "high" || (!swing && candles[idx])) {
      // BOS de alta ou swing high: buscar último candle bearish antes
      for (let i = idx - 1; i >= Math.max(0, idx - 10); i--) {
        if (candles[i].close < candles[i].open) {
          const avgSize = candles.slice(Math.max(0, i - 20), i)
            .reduce((sum, c) => sum + Math.abs(c.high - c.low), 0) / Math.min(20, i);
          
          const candleSize = Math.abs(candles[i].high - candles[i].low);
          const sizeScore = (candleSize / avgSize) * 50;
          const volumeScore = Math.min(50, (candles[i].volume / 1000000) * 10);
          const strength = Math.min(100, sizeScore + volumeScore);
          
          const currentPrice = candles[candles.length - 1].close;
          const confirmed = currentPrice > candles[i].high;
          
          orderBlocks.push({
            index: i,
            type: "bullish",
            top: candles[i].high,
            bottom: candles[i].low,
            midpoint: (candles[i].high + candles[i].low) / 2,
            volume: candles[i].volume,
            strength,
            confirmed
          });
          break;
        }
      }
    }
    
    if (swing?.type === "low" || (!swing && candles[idx])) {
      // BOS de baixa ou swing low: buscar último candle bullish antes
      for (let i = idx - 1; i >= Math.max(0, idx - 10); i--) {
        if (candles[i].close > candles[i].open) {
          const avgSize = candles.slice(Math.max(0, i - 20), i)
            .reduce((sum, c) => sum + Math.abs(c.high - c.low), 0) / Math.min(20, i);
          
          const candleSize = Math.abs(candles[i].high - candles[i].low);
          const sizeScore = (candleSize / avgSize) * 50;
          const volumeScore = Math.min(50, (candles[i].volume / 1000000) * 10);
          const strength = Math.min(100, sizeScore + volumeScore);
          
          const currentPrice = candles[candles.length - 1].close;
          const confirmed = currentPrice < candles[i].low;
          
          orderBlocks.push({
            index: i,
            type: "bearish",
            top: candles[i].high,
            bottom: candles[i].low,
            midpoint: (candles[i].high + candles[i].low) / 2,
            volume: candles[i].volume,
            strength,
            confirmed
          });
          break;
        }
      }
    }
  }
  
  return orderBlocks
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);
}

// Detecta Zonas de Manipulação
function detectManipulationZones(
  candles: Candle[],
  swings: SwingPoint[]
): ManipulationZone[] {
  const zones: ManipulationZone[] = [];
  const priceThreshold = 0.002; // 0.2% de tolerância
  
  const highs = swings.filter(s => s.type === "high");
  const lows = swings.filter(s => s.type === "low");
  
  // Detectar Equal Highs
  for (let i = 0; i < highs.length - 1; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      const priceDiff = Math.abs(highs[i].price - highs[j].price) / highs[i].price;
      if (priceDiff < priceThreshold) {
        zones.push({
          type: "equal_highs",
          price: (highs[i].price + highs[j].price) / 2,
          startIndex: highs[i].index,
          endIndex: highs[j].index,
          danger: 80
        });
      }
    }
  }
  
  // Detectar Equal Lows
  for (let i = 0; i < lows.length - 1; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      const priceDiff = Math.abs(lows[i].price - lows[j].price) / lows[i].price;
      if (priceDiff < priceThreshold) {
        zones.push({
          type: "equal_lows",
          price: (lows[i].price + lows[j].price) / 2,
          startIndex: lows[i].index,
          endIndex: lows[j].index,
          danger: 80
        });
      }
    }
  }
  
  return zones.slice(-5);
}

// Calcula TP Dinâmico baseado em swing estrutural
function calculateDynamicTP(
  entry: number,
  stopLoss: number,
  type: "bullish" | "bearish",
  swings: SwingPoint[],
  candles: Candle[]
): { takeProfit: number; riskReward: number; targetSwing: TargetSwing } {
  const risk = Math.abs(entry - stopLoss);
  
  if (type === "bullish") {
    // Buscar swing highs acima do entry
    const targetHighs = swings
      .filter(s => s.type === "high" && s.price > entry)
      .sort((a, b) => a.price - b.price);
    
    // Tentar encontrar swing com RR entre 1.5 e 15.0 (relaxado de 2.0)
    for (const swing of targetHighs) {
      const targetPrice = swing.price * 0.995; // -0.5% margem
      const reward = Math.abs(targetPrice - entry);
      const rr = reward / risk;
      
      if (rr >= 1.5 && rr <= 15.0) {
        return {
          takeProfit: targetPrice,
          riskReward: rr,
          targetSwing: {
            type: "high",
            price: swing.price,
            index: swing.index
          }
        };
      }
    }
  } else {
    // Buscar swing lows abaixo do entry
    const targetLows = swings
      .filter(s => s.type === "low" && s.price < entry)
      .sort((a, b) => b.price - a.price);
    
    for (const swing of targetLows) {
      const targetPrice = swing.price * 1.005; // +0.5% margem
      const reward = Math.abs(entry - targetPrice);
      const rr = reward / risk;
      
      if (rr >= 1.5 && rr <= 15.0) {
        return {
          takeProfit: targetPrice,
          riskReward: rr,
          targetSwing: {
            type: "low",
            price: swing.price,
            index: swing.index
          }
        };
      }
    }
  }
  
  // Se não encontrar swing adequado, usar RR conservador 1:2.5
  const conservativeTP = type === "bullish" 
    ? entry + (risk * 2.5)
    : entry - (risk * 2.5);
  
  const nearestSwing = type === "bullish"
    ? swings.filter(s => s.type === "high" && s.price > entry).sort((a, b) => a.price - b.price)[0]
    : swings.filter(s => s.type === "low" && s.price < entry).sort((a, b) => b.price - a.price)[0];
  
  return {
    takeProfit: conservativeTP,
    riskReward: 2.5,
    targetSwing: nearestSwing ? {
      type: nearestSwing.type,
      price: nearestSwing.price,
      index: nearestSwing.index
    } : {
      type: type === "bullish" ? "high" : "low",
      price: conservativeTP,
      index: candles.length - 1
    }
  };
}

// Sistema de POI (Points of Interest) - MUITO RELAXADO
function calculatePOIs(
  candles: Candle[],
  fvgs: FVG[],
  orderBlocks: OrderBlock[],
  premiumDiscount: PremiumDiscountResult,
  dominantBias: ReturnType<typeof determineDominantBias>,
  manipulationZones: ManipulationZone[],
  swings: SwingPoint[]
): POI[] {
  const pois: POI[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  for (const fvg of fvgs) {
    const factors: string[] = [];
    let score = 30; // Base score reduzido
    
    // Adicionar tipo de FVG como fator
    factors.push(fvg.type === "bullish" ? "FVG Bullish" : "FVG Bearish");
    
    // Verificar alinhamento com viés dominante (bônus, não requisito)
    if ((fvg.type === "bullish" && dominantBias.bias === "ALTA") ||
        (fvg.type === "bearish" && dominantBias.bias === "BAIXA")) {
      factors.push(`Viés ${dominantBias.bias} alinhado`);
      score += 25;
    } else if (dominantBias.bias === "NEUTRO" || dominantBias.bias === "MISTO") {
      // Em mercado neutro, ambas direções são válidas
      factors.push("Range Trading");
      score += 15;
    } else {
      // Contra viés, mas ainda pode ser pullback
      factors.push("Contra-viés (pullback)");
      score += 10;
    }
    
    // Verificar posição no range Premium/Discount (bônus, não requisito)
    if ((fvg.type === "bullish" && premiumDiscount.status === "DISCOUNT") ||
        (fvg.type === "bearish" && premiumDiscount.status === "PREMIUM")) {
      factors.push(premiumDiscount.status === "DISCOUNT" ? "Zona Discount ✓" : "Zona Premium ✓");
      score += 20;
    } else if (premiumDiscount.status === "EQUILIBRIUM") {
      factors.push("Zona Equilibrium");
      score += 10;
    }
    
    // Verificar proximidade do preço atual ao FVG
    const distanceToFVG = Math.abs(currentPrice - fvg.midpoint) / currentPrice;
    if (distanceToFVG < 0.01) { // Dentro de 1%
      factors.push("Preço próximo");
      score += 15;
    } else if (distanceToFVG < 0.02) { // Dentro de 2%
      factors.push("Preço em alcance");
      score += 10;
    }
    
    // Verificar Order Block próximo
    const nearbyOB = orderBlocks.find(ob => 
      ob.type === fvg.type && 
      Math.abs(ob.midpoint - fvg.midpoint) / fvg.midpoint < 0.015
    );
    
    if (nearbyOB) {
      factors.push(`Order Block (${Math.round(nearbyOB.strength)}%)`);
      score += 20;
    }
    
    // Verificar distância de zonas de manipulação
    const nearManipulation = manipulationZones.some(zone => 
      Math.abs(zone.price - fvg.midpoint) / fvg.midpoint < 0.005
    );
    
    if (nearManipulation) {
      score -= 15; // Penalidade reduzida
    } else {
      factors.push("Zona limpa");
      score += 10;
    }
    
    // Score mínimo reduzido para 55%
    if (score < 55) continue;
    
    // Calcular entry (50% da zona)
    const entry = nearbyOB 
      ? (fvg.midpoint + nearbyOB.midpoint) / 2
      : fvg.midpoint;
    
    // Calcular Stop Loss técnico
    const stopLoss = fvg.type === "bullish"
      ? Math.min(fvg.bottom, nearbyOB?.bottom || Infinity) - (fvg.size * 0.1)
      : Math.max(fvg.top, nearbyOB?.top || 0) + (fvg.size * 0.1);
    
    // Calcular TP Dinâmico
    const { takeProfit, riskReward, targetSwing } = calculateDynamicTP(
      entry,
      stopLoss,
      fvg.type,
      swings,
      candles
    );
    
    factors.push(`RR 1:${riskReward.toFixed(1)}`);
    
    pois.push({
      id: `poi_${Date.now()}_${fvg.index}`,
      price: entry,
      type: fvg.type,
      confluenceScore: Math.min(score, 100),
      factors,
      entry,
      stopLoss,
      takeProfit,
      riskReward,
      targetSwing
    });
  }
  
  // Criar POIs baseados em Order Blocks mesmo sem FVG
  for (const ob of orderBlocks) {
    // Verificar se já existe POI para este OB
    const existingPOI = pois.find(p => Math.abs(p.price - ob.midpoint) / ob.midpoint < 0.005);
    if (existingPOI) continue;
    
    const factors: string[] = [];
    let score = 35;
    
    factors.push(ob.type === "bullish" ? "Order Block Bullish" : "Order Block Bearish");
    factors.push(`Força: ${Math.round(ob.strength)}%`);
    score += ob.strength * 0.3;
    
    // Verificar alinhamento
    if ((ob.type === "bullish" && dominantBias.bias === "ALTA") ||
        (ob.type === "bearish" && dominantBias.bias === "BAIXA")) {
      factors.push("Alinhado com viés");
      score += 15;
    } else if (dominantBias.bias === "NEUTRO") {
      factors.push("Range Trading");
      score += 10;
    }
    
    // Verificar Premium/Discount
    if ((ob.type === "bullish" && premiumDiscount.status === "DISCOUNT") ||
        (ob.type === "bearish" && premiumDiscount.status === "PREMIUM")) {
      factors.push(premiumDiscount.status);
      score += 15;
    }
    
    if (score < 55) continue;
    
    const entry = ob.midpoint;
    const stopLoss = ob.type === "bullish" 
      ? ob.bottom - (ob.top - ob.bottom) * 0.1
      : ob.top + (ob.top - ob.bottom) * 0.1;
    
    const { takeProfit, riskReward, targetSwing } = calculateDynamicTP(
      entry,
      stopLoss,
      ob.type,
      swings,
      candles
    );
    
    factors.push(`RR 1:${riskReward.toFixed(1)}`);
    
    pois.push({
      id: `poi_ob_${Date.now()}_${ob.index}`,
      price: entry,
      type: ob.type,
      confluenceScore: Math.min(score, 100),
      factors,
      entry,
      stopLoss,
      takeProfit,
      riskReward,
      targetSwing
    });
  }
  
  return pois
    .filter(poi => poi.confluenceScore >= 55) // Reduzido de 70 para 55
    .sort((a, b) => b.confluenceScore - a.confluenceScore)
    .slice(0, 5);
}

// FUNÇÃO PRE-LIST TRADER RAIZ - 8 CRITÉRIOS OBRIGATÓRIOS
function calculateTraderRaizChecklist(
  swings: SwingPoint[],
  bosChoch: BOSCHOCHResult,
  premiumDiscount: PremiumDiscountResult,
  dominantBias: ReturnType<typeof determineDominantBias>,
  manipulationZones: ManipulationZone[],
  orderBlocks: OrderBlock[],
  fvgs: FVG[],
  pois: POI[]
): TraderRaizChecklist {
  let criteriaCount = 0;
  const reasons: string[] = [];
  
  // 1. TOPOS E FUNDOS MAPEADOS
  const swingsMapped = swings.length >= 4; // Mínimo 4 swings para análise
  if (swingsMapped) {
    criteriaCount++;
    reasons.push("✓ Swings mapeados");
  } else {
    reasons.push("✗ Poucos swings detectados");
  }
  
  // 2. TENDÊNCIA DEFINIDA
  const trendDefined = bosChoch.trend !== "NEUTRO";
  if (trendDefined) {
    criteriaCount++;
    reasons.push(`✓ Tendência ${bosChoch.trend}`);
  } else {
    reasons.push("✗ Tendência indefinida");
  }
  
  // 3. ESTRUTURA QUEBRADA (BOS/CHoCH)
  const structureBroken = bosChoch.lastBOS !== null || bosChoch.lastCHOCH !== null;
  const structureType = bosChoch.lastBOS ? "BOS" : bosChoch.lastCHOCH ? "CHOCH" : null;
  const structurePrice = bosChoch.lastBOS || bosChoch.lastCHOCH;
  if (structureBroken) {
    criteriaCount++;
    reasons.push(`✓ ${structureType} confirmado`);
  } else {
    reasons.push("✗ Sem quebra de estrutura");
  }
  
  // 4. ZONA CORRETA (Premium/Discount)
  const zoneAligned = (
    (dominantBias.bias === "ALTA" && premiumDiscount.status === "DISCOUNT") ||
    (dominantBias.bias === "BAIXA" && premiumDiscount.status === "PREMIUM")
  );
  if (zoneAligned) {
    criteriaCount++;
    reasons.push(`✓ Zona ${premiumDiscount.status} alinhada`);
  } else {
    reasons.push(`✗ Zona ${premiumDiscount.status} não ideal`);
  }
  
  // 5. MANIPULAÇÃO IDENTIFICADA (liquidez capturada ou evitada)
  const manipulationIdentified = manipulationZones.length > 0;
  if (manipulationIdentified) {
    criteriaCount++;
    reasons.push("✓ Manipulação mapeada");
  } else {
    reasons.push("⚠ Sem zonas de manipulação");
    // Não obrigatório, conta como OK se não houver
    criteriaCount++;
  }
  
  // 6. ORDER BLOCK LOCALIZADO
  const validOB = orderBlocks.find(ob => 
    (dominantBias.bias === "ALTA" && ob.type === "bullish") ||
    (dominantBias.bias === "BAIXA" && ob.type === "bearish")
  );
  const orderBlockLocated = !!validOB;
  if (orderBlockLocated) {
    criteriaCount++;
    reasons.push(`✓ OB ${validOB!.type} em $${validOB!.midpoint.toFixed(2)}`);
  } else {
    reasons.push("✗ Order Block não localizado");
  }
  
  // 7. RISCO/RETORNO >= 3:1 (idealmente 5:1)
  const bestPOI = pois[0];
  const rrValue = bestPOI?.riskReward || 0;
  const riskRewardValid = rrValue >= 3.0;
  if (riskRewardValid) {
    criteriaCount++;
    reasons.push(`✓ RR 1:${rrValue.toFixed(1)} (${rrValue >= 5 ? "IDEAL" : "OK"})`);
  } else {
    reasons.push(`✗ RR 1:${rrValue.toFixed(1)} < 3:1`);
  }
  
  // 8. CONFIRMAÇÃO DE ENTRADA (FVG ou OB com confluência alta)
  const entryConfirmed = pois.some(poi => poi.confluenceScore >= 70);
  if (entryConfirmed) {
    criteriaCount++;
    reasons.push("✓ Entrada confirmada");
  } else {
    reasons.push("✗ Sem confirmação de entrada");
  }
  
  // CONCLUSÃO
  const allCriteriaMet = criteriaCount >= 7; // 7 de 8 critérios mínimo
  let conclusion: "ENTRADA VÁLIDA" | "AGUARDAR" | "ANULAR";
  
  if (criteriaCount === 8) {
    conclusion = "ENTRADA VÁLIDA";
  } else if (criteriaCount >= 6) {
    conclusion = "AGUARDAR";
  } else {
    conclusion = "ANULAR";
  }
  
  return {
    swingsMapped,
    swingsCount: swings.length,
    trendDefined,
    trendDirection: bosChoch.trend,
    structureBroken,
    structureType,
    structurePrice,
    zoneCorrect: zoneAligned,
    zoneName: premiumDiscount.status,
    zoneAligned,
    manipulationIdentified,
    manipulationZonesCount: manipulationZones.length,
    orderBlockLocated,
    orderBlockRange: validOB ? `$${validOB.bottom.toFixed(2)} - $${validOB.top.toFixed(2)}` : "N/A",
    orderBlockStrength: validOB?.strength || 0,
    riskRewardValid,
    riskRewardValue: rrValue,
    entryConfirmed,
    criteriaCount,
    allCriteriaMet,
    conclusion,
    reasoning: reasons.join(" | "),
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
      
      console.log(`  ${tf.toUpperCase()}: ${analysis.trend} | BOS: ${analysis.lastBOS ? '✓' : '✗'} | CHOCH: ${analysis.lastCHOCH ? '✓' : '✗'} | Conf: ${analysis.confidence}%`);
    }

    // PASSO 2: Determinar VIÉS DOMINANTE
    const dominantBias = determineDominantBias(higherTFAnalysis);
    console.log(`🎯 VIÉS DOMINANTE: ${dominantBias.bias} (${dominantBias.strength})`);

    // PASSO 3: Analisar timeframe atual COM CONTEXTO
    console.log(`🔍 Analisando ${currentTimeframe} com contexto superior...`);
    const currentTFCandles = await fetchBinanceKlines(symbol, currentTimeframe, 200);
    const currentTFSwings = detectSwingPoints(currentTFCandles);
    const currentTFLocalAnalysis = detectBOSandCHOCH(currentTFCandles, currentTFSwings);
    const premiumDiscount = calculatePremiumDiscount(currentTFCandles, currentTFSwings);
    
    // NOVAS DETECÇÕES SMC
    console.log("🔍 Detectando estruturas SMC...");
    const fvgs = detectFVG(currentTFCandles);
    console.log(`  📊 FVGs detectados: ${fvgs.length}`);
    
    // Extrair índices dos BOS para detectar Order Blocks - mais relaxado
    const bosIndexes = currentTFSwings
      .slice(-10) // Pegar últimos 10 swings
      .map(s => s.index);
    
    const orderBlocks = detectOrderBlocks(currentTFCandles, currentTFSwings, bosIndexes);
    console.log(`  📦 Order Blocks encontrados: ${orderBlocks.length}`);
    
    const manipulationZones = detectManipulationZones(currentTFCandles, currentTFSwings);
    console.log(`  🚫 Zonas de manipulação: ${manipulationZones.length}`);
    
    const pois = calculatePOIs(
      currentTFCandles,
      fvgs,
      orderBlocks,
      premiumDiscount,
      dominantBias,
      manipulationZones,
      currentTFSwings
    );
    console.log(`  🎯 POIs gerados: ${pois.length}`);
    
    pois.forEach((poi, i) => {
      console.log(`  POI #${i+1}: ${poi.type} @ $${poi.price.toFixed(2)}`);
      console.log(`    - Confluência: ${poi.confluenceScore}%`);
      console.log(`    - RR: 1:${poi.riskReward.toFixed(2)}`);
      console.log(`    - Fatores: ${poi.factors.join(', ')}`);
    });
    
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

    // CALCULAR PRE-LIST TRADER RAIZ
    const checklist = calculateTraderRaizChecklist(
      currentTFSwings,
      currentTFLocalAnalysis,
      premiumDiscount,
      dominantBias,
      manipulationZones,
      orderBlocks,
      fvgs,
      pois
    );
    
    console.log("📋 PRE-LIST TRADER RAIZ:");
    console.log(`   1. Swings Mapeados: ${checklist.swingsMapped ? '✓' : '✗'} (${checklist.swingsCount})`);
    console.log(`   2. Tendência: ${checklist.trendDefined ? '✓' : '✗'} ${checklist.trendDirection}`);
    console.log(`   3. Estrutura: ${checklist.structureBroken ? '✓' : '✗'} ${checklist.structureType || 'N/A'}`);
    console.log(`   4. Zona: ${checklist.zoneCorrect ? '✓' : '✗'} ${checklist.zoneName}`);
    console.log(`   5. Manipulação: ${checklist.manipulationIdentified ? '✓' : '⚠'} (${checklist.manipulationZonesCount})`);
    console.log(`   6. Order Block: ${checklist.orderBlockLocated ? '✓' : '✗'} ${checklist.orderBlockRange}`);
    console.log(`   7. R:R: ${checklist.riskRewardValid ? '✓' : '✗'} 1:${checklist.riskRewardValue.toFixed(2)}`);
    console.log(`   8. Confirmação: ${checklist.entryConfirmed ? '✓' : '✗'}`);
    console.log(`   📊 CONCLUSÃO: ${checklist.conclusion} (${checklist.criteriaCount}/8)`);

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
        
        // ESTRUTURAS SMC
        fvgs,
        orderBlocks,
        manipulationZones,
        pois,
      },
      
      // PRE-LIST TRADER RAIZ
      checklist,
      
      // OVERVIEW DE TODOS OS TIMEFRAMES
      allTimeframes: allTimeframesAnalysis,
    };

    console.log("✅ Análise Top-Down concluída");
    console.log(`   Viés: ${dominantBias.bias} | TF Atual: ${currentTFAnalysis.trend} | Setup: ${currentTFAnalysis.tradingOpportunity ? '✓' : '✗'} | POIs: ${pois.length}`);

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
