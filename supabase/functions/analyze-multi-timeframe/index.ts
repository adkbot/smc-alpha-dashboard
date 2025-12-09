import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==================== INTERFACES ADKBOT ====================

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

// BOSS com validação de FECHAMENTO (não wick)
interface BOSS {
  tipo: "alta" | "baixa";
  preco_rompido: number;
  indice_rompimento: number;
  vela_fechamento: number;
  confirmado: boolean; // Só true se FECHOU além do swing
}

interface BOSCHOCHResult {
  trend: "ALTA" | "BAIXA" | "NEUTRO";
  lastBOS: number | null;
  lastCHOCH: number | null;
  confidence: number;
  bosCount: number;
  chochCount: number;
  boss: BOSS | null;
}

interface PremiumDiscountResult {
  currentPrice: number;
  rangeHigh: number;
  rangeLow: number;
  rangePercentage: number;
  status: "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT";
  statusDescription: string;
  fib_50: number;
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

// Order Block ADKBOT com entrada 50% do CORPO
interface OrderBlock {
  index: number;
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  open: number;
  close: number;
  midpoint: number; // ENTRADA: 50% do CORPO (não do wick)
  volume: number;
  strength: number;
  confirmed: boolean;
  fvg_presente: boolean;
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

// PRE-LIST TRADER RAIZ - 8 CRITÉRIOS ADKBOT
interface TraderRaizChecklist {
  swingsMapped: boolean;
  swingsCount: number;
  trendDefined: boolean;
  trendDirection: "ALTA" | "BAIXA" | "NEUTRO";
  structureBroken: boolean;
  structureType: "BOS" | "CHOCH" | null;
  structurePrice: number | null;
  bossConfirmado: boolean; // NOVO: BOSS confirmado com FECHAMENTO
  zoneCorrect: boolean;
  zoneName: "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM";
  zoneAligned: boolean;
  manipulationIdentified: boolean;
  manipulationZonesCount: number;
  orderBlockLocated: boolean;
  orderBlockRange: string;
  orderBlockStrength: number;
  orderBlockEntry50: number | null; // NOVO: Entrada exata 50% do OB
  riskRewardValid: boolean;
  riskRewardValue: number;
  entryConfirmed: boolean;
  criteriaCount: number;
  allCriteriaMet: boolean;
  conclusion: "ENTRADA VÁLIDA" | "AGUARDAR" | "ANULAR";
  reasoning: string;
}

// ==================== AGENTE DE ESTRUTURA ADKBOT ====================

// Detectar swing points com período 5 (ADKBOT padrão)
function detectSwingPoints(
  candles: Candle[],
  leftBars: number = 5,  // ADKBOT: período 5
  rightBars: number = 5
): SwingPoint[] {
  const swingPoints: SwingPoint[] = [];

  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const current = candles[i];
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j !== i && candles[j].high >= current.high) {
        isSwingHigh = false;
        break;
      }
    }

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

// BOSS ADKBOT: Só confirmado com FECHAMENTO DE VELA (ignora wicks/sweeps)
function detectBOSS_ADKBOT(candles: Candle[], swings: SwingPoint[]): BOSS | null {
  if (swings.length < 2) return null;
  
  const highs = swings.filter(s => s.type === "high").sort((a, b) => a.index - b.index);
  const lows = swings.filter(s => s.type === "low").sort((a, b) => a.index - b.index);
  
  if (highs.length < 1 || lows.length < 1) return null;
  
  const ultimoClose = candles[candles.length - 1].close;
  const ultimaVela = candles[candles.length - 1];
  
  // BOSS de BAIXA: FECHAMENTO abaixo do último Swing Low
  const ultimoSwingLow = lows[lows.length - 1];
  if (ultimoClose < ultimoSwingLow.price) {
    return {
      tipo: "baixa",
      preco_rompido: ultimoSwingLow.price,
      indice_rompimento: candles.length - 1,
      vela_fechamento: ultimoClose,
      confirmado: true
    };
  }
  
  // BOSS de ALTA: FECHAMENTO acima do último Swing High
  const ultimoSwingHigh = highs[highs.length - 1];
  if (ultimoClose > ultimoSwingHigh.price) {
    return {
      tipo: "alta",
      preco_rompido: ultimoSwingHigh.price,
      indice_rompimento: candles.length - 1,
      vela_fechamento: ultimoClose,
      confirmado: true
    };
  }
  
  return null;
}

// Detecta BOS e CHOCH com regras ADKBOT
function detectBOSandCHOCH(candles: Candle[], swings: SwingPoint[]): BOSCHOCHResult {
  const highs = swings.filter(s => s.type === "high").sort((a, b) => a.index - b.index);
  const lows = swings.filter(s => s.type === "low").sort((a, b) => a.index - b.index);
  const currentPrice = candles[candles.length - 1].close;

  if (highs.length < 1 || lows.length < 1) {
    return {
      trend: "NEUTRO",
      lastBOS: null,
      lastCHOCH: null,
      confidence: 30,
      bosCount: 0,
      chochCount: 0,
      boss: null,
    };
  }

  // Detectar BOSS ADKBOT (só com fechamento)
  const boss = detectBOSS_ADKBOT(candles, swings);
  
  let currentTrend: "ALTA" | "BAIXA" | "NEUTRO" = "NEUTRO";
  let bosCount = 0;
  let chochCount = 0;
  let lastBOS: number | null = null;
  let lastCHOCH: number | null = null;

  // Se BOSS confirmado, usar como tendência
  if (boss && boss.confirmado) {
    currentTrend = boss.tipo === "alta" ? "ALTA" : "BAIXA";
    lastBOS = candles[boss.indice_rompimento].time;
    bosCount = 1;
  } else {
    // Fallback: Higher Highs/Lows ou Lower Highs/Lows
    const recentHighs = highs.slice(-3);
    const recentLows = lows.slice(-3);
    
    if (recentHighs.length >= 2 && recentLows.length >= 2) {
      const lastHigh = recentHighs[recentHighs.length - 1];
      const prevHigh = recentHighs[recentHighs.length - 2];
      const lastLow = recentLows[recentLows.length - 1];
      const prevLow = recentLows[recentLows.length - 2];
      
      // Higher Highs + Higher Lows = ALTA
      if (lastHigh.price > prevHigh.price && lastLow.price > prevLow.price) {
        currentTrend = "ALTA";
        lastBOS = candles[lastHigh.index].time;
        bosCount = 1;
      }
      // Lower Highs + Lower Lows = BAIXA
      else if (lastHigh.price < prevHigh.price && lastLow.price < prevLow.price) {
        currentTrend = "BAIXA";
        lastBOS = candles[lastLow.index].time;
        bosCount = 1;
      }
    }
  }

  // Detectar CHOCH
  const recentHighs = highs.slice(-2);
  const recentLows = lows.slice(-2);
  
  if (recentHighs.length >= 2 && recentLows.length >= 2) {
    const prevHigh = recentHighs[recentHighs.length - 2];
    const prevLow = recentLows[recentLows.length - 2];
    
    if (currentTrend === "ALTA" && currentPrice < prevLow.price) {
      lastCHOCH = candles[candles.length - 1].time;
      chochCount = 1;
    }
    if (currentTrend === "BAIXA" && currentPrice > prevHigh.price) {
      lastCHOCH = candles[candles.length - 1].time;
      chochCount = 1;
    }
  }

  let confidence = 40;
  if (currentTrend !== "NEUTRO") {
    confidence = 60;
    if (boss?.confirmado) confidence += 25; // Bônus por BOSS confirmado
    if (lastBOS) confidence += 10;
    if (confidence > 95) confidence = 95;
  }

  return {
    trend: currentTrend,
    lastBOS,
    lastCHOCH,
    confidence,
    bosCount,
    chochCount,
    boss,
  };
}

// ==================== AGENTE PREMIUM/DISCOUNT ADKBOT ====================

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
      fib_50: currentPrice,
    };
  }
  
  const rangeHigh = Math.max(...recentHighs.map(h => h.price));
  const rangeLow = Math.min(...recentLows.map(l => l.price));
  
  const rangeSize = rangeHigh - rangeLow;
  const priceFromLow = currentPrice - rangeLow;
  const rangePercentage = rangeSize > 0 ? (priceFromLow / rangeSize) * 100 : 50;
  
  // Fibonacci 50%
  const fib_50 = rangeLow + (rangeSize * 0.5);
  
  let status: "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT";
  let statusDescription: string;
  
  // ADKBOT: 50% é o limite exato
  // Premium = acima de 50% (vender caro)
  // Discount = abaixo de 50% (comprar barato)
  if (rangePercentage > 50) {
    status = "PREMIUM";
    statusDescription = "Zona de Venda (Premium > 50%)";
  } else if (rangePercentage < 50) {
    status = "DISCOUNT";
    statusDescription = "Zona de Compra (Discount < 50%)";
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
    fib_50,
  };
}

// Validação ADKBOT: Zona correta para operação
function validarZonaADKBOT(preco: number, zona: PremiumDiscountResult, tipoOperacao: "venda" | "compra"): boolean {
  if (tipoOperacao === "venda") {
    // Venda APENAS em Premium (acima de 50%)
    return preco >= zona.fib_50;
  } else {
    // Compra APENAS em Discount (abaixo de 50%)
    return preco <= zona.fib_50;
  }
}

// Determina o viés dominante baseado nos timeframes superiores
function determineDominantBias(higherTF: Record<string, BOSCHOCHResult>) {
  const d1 = higherTF["1d"];
  const h4 = higherTF["4h"];
  const h1 = higherTF["1h"];

  const trends = [d1.trend, h4.trend, h1.trend];
  const altaCount = trends.filter(t => t === "ALTA").length;
  const baixaCount = trends.filter(t => t === "BAIXA").length;

  // Verificar se tem BOSS confirmado em algum TF
  const hasBOSSConfirmado = d1.boss?.confirmado || h4.boss?.confirmado || h1.boss?.confirmado;

  if (altaCount >= 2) {
    return {
      bias: "ALTA" as const,
      strength: hasBOSSConfirmado ? "FORTE" : "MODERADO",
      reasoning: `${altaCount}/3 TFs em alta${hasBOSSConfirmado ? ' com BOSS confirmado' : ''}`,
    };
  }

  if (baixaCount >= 2) {
    return {
      bias: "BAIXA" as const,
      strength: hasBOSSConfirmado ? "FORTE" : "MODERADO",
      reasoning: `${baixaCount}/3 TFs em baixa${hasBOSSConfirmado ? ' com BOSS confirmado' : ''}`,
    };
  }

  if (altaCount === 1 && baixaCount === 0) {
    return {
      bias: "ALTA" as const,
      strength: "FRACA",
      reasoning: "Um TF superior em alta, demais neutros",
    };
  }

  if (baixaCount === 1 && altaCount === 0) {
    return {
      bias: "BAIXA" as const,
      strength: "FRACA",
      reasoning: "Um TF superior em baixa, demais neutros",
    };
  }

  if (altaCount === 1 && baixaCount === 1) {
    return {
      bias: "MISTO" as const,
      strength: "FRACA",
      reasoning: "Divergência entre TFs - Operar com cautela",
    };
  }

  if (h1.trend !== "NEUTRO") {
    return {
      bias: h1.trend as "ALTA" | "BAIXA",
      strength: "FRACA",
      reasoning: `H1 mostra ${h1.trend.toLowerCase()}, demais indefinidos`,
    };
  }

  return {
    bias: "NEUTRO" as const,
    strength: "NENHUMA",
    reasoning: "Todos TFs neutros - Sem BOSS confirmado",
  };
}

// Analisa timeframe atual com contexto
function analyzeWithContext(
  localAnalysis: BOSCHOCHResult,
  dominantBias: ReturnType<typeof determineDominantBias>,
  higherTF: Record<string, BOSCHOCHResult>
) {
  let interpretation = "";
  let tradingOpportunity = false;
  const alignedWithHigherTF = localAnalysis.trend === dominantBias.bias || dominantBias.bias === "NEUTRO";

  if (dominantBias.bias === "ALTA") {
    if (localAnalysis.trend === "ALTA") {
      interpretation = "🚀 ALINHAMENTO TOTAL - Continuação de alta";
      tradingOpportunity = true;
    } else if (localAnalysis.trend === "BAIXA") {
      if (localAnalysis.lastCHOCH) {
        interpretation = "⚠️ CHOCH detectado - Possível reversão";
        tradingOpportunity = false;
      } else {
        interpretation = "✅ PULLBACK para zona de compra - Setup LONG";
        tradingOpportunity = true;
      }
    } else {
      interpretation = "⏸️ Consolidação em tendência de alta";
      tradingOpportunity = true;
    }
  } else if (dominantBias.bias === "BAIXA") {
    if (localAnalysis.trend === "BAIXA") {
      interpretation = "🚀 ALINHAMENTO TOTAL - Continuação de baixa";
      tradingOpportunity = true;
    } else if (localAnalysis.trend === "ALTA") {
      if (localAnalysis.lastCHOCH) {
        interpretation = "⚠️ CHOCH contra tendência maior";
        tradingOpportunity = false;
      } else {
        interpretation = "✅ PULLBACK para zona de venda - Setup SHORT";
        tradingOpportunity = true;
      }
    } else {
      interpretation = "⏸️ Consolidação em tendência de baixa";
      tradingOpportunity = true;
    }
  } else if (dominantBias.bias === "MISTO") {
    interpretation = "⚠️ Divergência entre TFs - Aguardar BOSS confirmado";
    tradingOpportunity = false;
  } else {
    interpretation = "📊 Sem BOSS confirmado - Aguardar definição";
    tradingOpportunity = false;
  }

  return {
    ...localAnalysis,
    interpretation,
    alignedWithHigherTF,
    tradingOpportunity,
    reasoning: alignedWithHigherTF
      ? "Movimento local segue direção dos TFs superiores"
      : "Movimento divergente - Confirmar com BOSS",
  };
}

// ==================== AGENTE POI ADKBOT ====================

// Detecta Fair Value Gaps
function detectFVG(candles: Candle[]): FVG[] {
  const fvgs: FVG[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  for (let i = 1; i < candles.length - 1; i++) {
    // Bullish FVG
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
    
    // Bearish FVG
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
  
  return fvgs.filter(fvg => !fvg.isFilled).slice(-5);
}

// ADKBOT: Calcula entrada EXATAMENTE em 50% do CORPO do Order Block
function calcularEntrada50OB(ob: OrderBlock): number {
  const corpoAlto = Math.max(ob.open, ob.close);
  const corpoBaixo = Math.min(ob.open, ob.close);
  return corpoBaixo + ((corpoAlto - corpoBaixo) / 2);
}

// Detecta Order Blocks ADKBOT
function detectOrderBlocks(
  candles: Candle[],
  swings: SwingPoint[],
  boss: BOSS | null,
  fvgs: FVG[]
): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  
  if (!boss || !boss.confirmado) {
    // Sem BOSS confirmado, não criar OBs
    return orderBlocks;
  }
  
  const indiceBoss = boss.indice_rompimento;
  
  if (boss.tipo === "baixa") {
    // OB Bearish: Última vela de ALTA antes da queda (que deixou FVG)
    for (let i = indiceBoss - 1; i >= Math.max(0, indiceBoss - 20); i--) {
      const velaAlta = candles[i].close > candles[i].open;
      
      if (velaAlta) {
        // Verificar se tem FVG bearish próximo
        const fvgPresente = fvgs.some(
          fvg => fvg.type === "bearish" && 
                 fvg.index >= i && 
                 fvg.index <= i + 3
        );
        
        const avgSize = candles.slice(Math.max(0, i - 20), i)
          .reduce((sum, c) => sum + Math.abs(c.high - c.low), 0) / Math.min(20, i || 1);
        
        const candleSize = Math.abs(candles[i].high - candles[i].low);
        const sizeScore = (candleSize / (avgSize || 1)) * 50;
        const volumeScore = Math.min(50, (candles[i].volume / 1000000) * 10);
        const strength = Math.min(100, sizeScore + volumeScore);
        
        const ob: OrderBlock = {
          index: i,
          type: "bearish",
          top: candles[i].high,
          bottom: candles[i].low,
          open: candles[i].open,
          close: candles[i].close,
          midpoint: 0, // Será calculado
          volume: candles[i].volume,
          strength,
          confirmed: true,
          fvg_presente: fvgPresente
        };
        
        // ADKBOT: Entrada em 50% do CORPO
        ob.midpoint = calcularEntrada50OB(ob);
        
        orderBlocks.push(ob);
        break;
      }
    }
  } else if (boss.tipo === "alta") {
    // OB Bullish: Última vela de BAIXA antes da alta (que deixou FVG)
    for (let i = indiceBoss - 1; i >= Math.max(0, indiceBoss - 20); i--) {
      const velaBaixa = candles[i].close < candles[i].open;
      
      if (velaBaixa) {
        const fvgPresente = fvgs.some(
          fvg => fvg.type === "bullish" && 
                 fvg.index >= i && 
                 fvg.index <= i + 3
        );
        
        const avgSize = candles.slice(Math.max(0, i - 20), i)
          .reduce((sum, c) => sum + Math.abs(c.high - c.low), 0) / Math.min(20, i || 1);
        
        const candleSize = Math.abs(candles[i].high - candles[i].low);
        const sizeScore = (candleSize / (avgSize || 1)) * 50;
        const volumeScore = Math.min(50, (candles[i].volume / 1000000) * 10);
        const strength = Math.min(100, sizeScore + volumeScore);
        
        const ob: OrderBlock = {
          index: i,
          type: "bullish",
          top: candles[i].high,
          bottom: candles[i].low,
          open: candles[i].open,
          close: candles[i].close,
          midpoint: 0,
          volume: candles[i].volume,
          strength,
          confirmed: true,
          fvg_presente: fvgPresente
        };
        
        ob.midpoint = calcularEntrada50OB(ob);
        
        orderBlocks.push(ob);
        break;
      }
    }
  }
  
  return orderBlocks.sort((a, b) => b.strength - a.strength).slice(0, 3);
}

// Detecta Zonas de Manipulação
function detectManipulationZones(
  candles: Candle[],
  swings: SwingPoint[]
): ManipulationZone[] {
  const zones: ManipulationZone[] = [];
  const priceThreshold = 0.002;
  
  const highs = swings.filter(s => s.type === "high");
  const lows = swings.filter(s => s.type === "low");
  
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

// ==================== AGENTE DE SINAIS ADKBOT ====================

// ADKBOT: Calcula TP Dinâmico baseado em liquidez oposta (swing estrutural)
function calculateDynamicTP_ADKBOT(
  entry: number,
  stopLoss: number,
  type: "bullish" | "bearish",
  swings: SwingPoint[],
  candles: Candle[]
): { takeProfit: number; riskReward: number; targetSwing: TargetSwing } {
  const risk = Math.abs(entry - stopLoss);
  
  if (type === "bullish") {
    // TP: Último Swing High (liquidez oposta)
    const targetHighs = swings
      .filter(s => s.type === "high" && s.price > entry)
      .sort((a, b) => a.price - b.price);
    
    for (const swing of targetHighs) {
      const targetPrice = swing.price * 0.995; // -0.5% margem
      const reward = Math.abs(targetPrice - entry);
      const rr = reward / risk;
      
      // ADKBOT: RR mínimo 5:1
      if (rr >= 5.0 && rr <= 15.0) {
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
    // TP: Último Swing Low (liquidez oposta)
    const targetLows = swings
      .filter(s => s.type === "low" && s.price < entry)
      .sort((a, b) => b.price - a.price);
    
    for (const swing of targetLows) {
      const targetPrice = swing.price * 1.005; // +0.5% margem
      const reward = Math.abs(entry - targetPrice);
      const rr = reward / risk;
      
      if (rr >= 5.0 && rr <= 15.0) {
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
  
  // Se não encontrar swing com RR >= 5, usar RR conservador 5:1
  const conservativeTP = type === "bullish" 
    ? entry + (risk * 5)
    : entry - (risk * 5);
  
  const nearestSwing = type === "bullish"
    ? swings.filter(s => s.type === "high" && s.price > entry).sort((a, b) => a.price - b.price)[0]
    : swings.filter(s => s.type === "low" && s.price < entry).sort((a, b) => b.price - a.price)[0];
  
  return {
    takeProfit: conservativeTP,
    riskReward: 5.0,
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

// Sistema de POI ADKBOT
function calculatePOIs_ADKBOT(
  candles: Candle[],
  fvgs: FVG[],
  orderBlocks: OrderBlock[],
  premiumDiscount: PremiumDiscountResult,
  dominantBias: ReturnType<typeof determineDominantBias>,
  manipulationZones: ManipulationZone[],
  swings: SwingPoint[],
  boss: BOSS | null
): POI[] {
  const pois: POI[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  // ADKBOT: Sem BOSS confirmado = sem POI
  if (!boss || !boss.confirmado) {
    return pois;
  }
  
  for (const ob of orderBlocks) {
    const factors: string[] = [];
    let score = 40;
    
    factors.push(ob.type === "bullish" ? "OB Bullish" : "OB Bearish");
    
    // Verificar alinhamento com viés
    if ((ob.type === "bullish" && dominantBias.bias === "ALTA") ||
        (ob.type === "bearish" && dominantBias.bias === "BAIXA")) {
      factors.push(`Viés ${dominantBias.bias} alinhado`);
      score += 20;
    }
    
    // ADKBOT: Validar zona Premium/Discount
    const tipoOperacao = ob.type === "bullish" ? "compra" : "venda";
    const zonaValida = validarZonaADKBOT(currentPrice, premiumDiscount, tipoOperacao);
    
    if (zonaValida) {
      factors.push(premiumDiscount.status === "DISCOUNT" ? "Zona Discount ✓" : "Zona Premium ✓");
      score += 25;
    } else {
      // ADKBOT: Zona incorreta = bloquear operação
      factors.push(`❌ Zona ${premiumDiscount.status} incorreta`);
      continue; // Não criar POI se zona estiver errada
    }
    
    // FVG presente
    if (ob.fvg_presente) {
      factors.push("FVG presente ✓");
      score += 15;
    }
    
    // Força do OB
    factors.push(`Força: ${Math.round(ob.strength)}%`);
    score += ob.strength * 0.15;
    
    // Distância de manipulação
    const nearManipulation = manipulationZones.some(zone => 
      Math.abs(zone.price - ob.midpoint) / ob.midpoint < 0.005
    );
    
    if (!nearManipulation) {
      factors.push("Zona limpa");
      score += 10;
    } else {
      score -= 15;
    }
    
    if (score < 70) continue;
    
    // ADKBOT: Entrada EXATAMENTE em 50% do CORPO do OB
    const entry = ob.midpoint;
    
    // Stop Loss técnico
    const swingForSL = ob.type === "bullish" 
      ? swings.filter(s => s.type === "low").sort((a, b) => b.index - a.index)[0]
      : swings.filter(s => s.type === "high").sort((a, b) => b.index - a.index)[0];
    
    const stopLoss = ob.type === "bullish"
      ? Math.min(ob.bottom, swingForSL?.price || ob.bottom) * 0.9995
      : Math.max(ob.top, swingForSL?.price || ob.top) * 1.0005;
    
    // ADKBOT: TP Dinâmico com RR mínimo 5:1
    const { takeProfit, riskReward, targetSwing } = calculateDynamicTP_ADKBOT(
      entry,
      stopLoss,
      ob.type,
      swings,
      candles
    );
    
    // ADKBOT: Se RR < 5, CANCELAR operação
    if (riskReward < 5.0) {
      factors.push(`❌ RR ${riskReward.toFixed(1)} < 5:1`);
      continue;
    }
    
    factors.push(`RR 1:${riskReward.toFixed(1)} ✓`);
    
    pois.push({
      id: `poi_${Date.now()}_${ob.index}`,
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
  
  return pois.sort((a, b) => b.riskReward - a.riskReward).slice(0, 3);
}

// ==================== PRE-LIST TRADER RAIZ ADKBOT ====================

function calculateTraderRaizChecklist_ADKBOT(
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
  const swingsMapped = swings.length >= 4;
  if (swingsMapped) {
    criteriaCount++;
    reasons.push("✓ Swings mapeados");
  } else {
    reasons.push("✗ Poucos swings");
  }
  
  // 2. TENDÊNCIA DEFINIDA
  const trendDefined = bosChoch.trend !== "NEUTRO";
  if (trendDefined) {
    criteriaCount++;
    reasons.push(`✓ Tendência ${bosChoch.trend}`);
  } else {
    reasons.push("✗ Tendência indefinida");
  }
  
  // 3. BOSS CONFIRMADO COM FECHAMENTO (ADKBOT)
  const bossConfirmado = bosChoch.boss?.confirmado === true;
  const structureBroken = bossConfirmado || bosChoch.lastBOS !== null;
  const structureType = bossConfirmado ? "BOS" : bosChoch.lastCHOCH ? "CHOCH" : null;
  const structurePrice = bosChoch.boss?.preco_rompido || null;
  
  if (bossConfirmado) {
    criteriaCount++;
    reasons.push(`✓ BOSS confirmado (fechamento)`);
  } else if (structureBroken) {
    reasons.push("⚠ Estrutura quebrada (não confirmada)");
  } else {
    reasons.push("✗ Sem BOSS confirmado");
  }
  
  // 4. ZONA CORRETA (Premium/Discount) ADKBOT
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
  
  // 5. MANIPULAÇÃO IDENTIFICADA
  const manipulationIdentified = manipulationZones.length > 0;
  if (manipulationIdentified) {
    criteriaCount++;
    reasons.push("✓ Manipulação mapeada");
  } else {
    criteriaCount++; // Não obrigatório
    reasons.push("⚠ Sem manipulação");
  }
  
  // 6. ORDER BLOCK LOCALIZADO
  const validOB = orderBlocks.find(ob => 
    (dominantBias.bias === "ALTA" && ob.type === "bullish") ||
    (dominantBias.bias === "BAIXA" && ob.type === "bearish")
  );
  const orderBlockLocated = !!validOB;
  const orderBlockEntry50 = validOB?.midpoint || null;
  
  if (orderBlockLocated) {
    criteriaCount++;
    reasons.push(`✓ OB ${validOB!.type} - Entry 50%: $${validOB!.midpoint.toFixed(2)}`);
  } else {
    reasons.push("✗ Order Block não localizado");
  }
  
  // 7. RISCO/RETORNO >= 5:1 (ADKBOT)
  const bestPOI = pois[0];
  const rrValue = bestPOI?.riskReward || 0;
  const riskRewardValid = rrValue >= 5.0;
  if (riskRewardValid) {
    criteriaCount++;
    reasons.push(`✓ RR 1:${rrValue.toFixed(1)} (>= 5:1)`);
  } else {
    reasons.push(`✗ RR 1:${rrValue.toFixed(1)} < 5:1`);
  }
  
  // 8. CONFIRMAÇÃO DE ENTRADA
  const entryConfirmed = pois.length > 0 && pois[0].confluenceScore >= 70;
  if (entryConfirmed) {
    criteriaCount++;
    reasons.push("✓ Entrada confirmada");
  } else {
    reasons.push("✗ Sem confirmação");
  }
  
  // CONCLUSÃO ADKBOT: Precisa de TODOS os 8 critérios
  const allCriteriaMet = criteriaCount === 8;
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
    bossConfirmado,
    zoneCorrect: zoneAligned,
    zoneName: premiumDiscount.status,
    zoneAligned,
    manipulationIdentified,
    manipulationZonesCount: manipulationZones.length,
    orderBlockLocated,
    orderBlockRange: validOB ? `$${validOB.bottom.toFixed(2)} - $${validOB.top.toFixed(2)}` : "N/A",
    orderBlockStrength: validOB?.strength || 0,
    orderBlockEntry50,
    riskRewardValid,
    riskRewardValue: rrValue,
    entryConfirmed,
    criteriaCount,
    allCriteriaMet,
    conclusion,
    reasoning: reasons.join(" | "),
  };
}

// ==================== BINANCE API ====================

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

// ==================== SERVIDOR PRINCIPAL ====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframes, currentTimeframe } = await req.json();

    if (!symbol || !currentTimeframe) {
      throw new Error("Symbol and currentTimeframe are required");
    }

    console.log(`🤖 ADKBOT - Análise para ${symbol} | TF: ${currentTimeframe}`);

    // PASSO 1: Analisar timeframes superiores (1D, 4H, 1H)
    const higherTimeframes = ["1d", "4h", "1h"];
    const higherTFAnalysis: Record<string, BOSCHOCHResult> = {};

    console.log("📊 Analisando TFs superiores (Top-Down)...");

    for (const tf of higherTimeframes) {
      const candles = await fetchBinanceKlines(symbol, tf, 100);
      const swings = detectSwingPoints(candles, 5, 5); // ADKBOT: período 5
      const analysis = detectBOSandCHOCH(candles, swings);
      higherTFAnalysis[tf] = analysis;
      
      console.log(`  ${tf.toUpperCase()}: ${analysis.trend} | BOSS: ${analysis.boss?.confirmado ? '✓ CONFIRMADO' : '✗'} | Conf: ${analysis.confidence}%`);
    }

    // PASSO 2: Determinar VIÉS DOMINANTE
    const dominantBias = determineDominantBias(higherTFAnalysis);
    console.log(`🎯 VIÉS: ${dominantBias.bias} (${dominantBias.strength})`);

    // PASSO 3: Analisar timeframe atual
    console.log(`🔍 Analisando ${currentTimeframe}...`);
    const currentTFCandles = await fetchBinanceKlines(symbol, currentTimeframe, 200);
    const currentTFSwings = detectSwingPoints(currentTFCandles, 5, 5);
    const currentTFLocalAnalysis = detectBOSandCHOCH(currentTFCandles, currentTFSwings);
    const premiumDiscount = calculatePremiumDiscount(currentTFCandles, currentTFSwings);
    
    // PASSO 4: Detectar estruturas SMC
    console.log("🔍 Detectando estruturas ADKBOT...");
    const fvgs = detectFVG(currentTFCandles);
    console.log(`  FVGs: ${fvgs.length}`);
    
    const orderBlocks = detectOrderBlocks(
      currentTFCandles, 
      currentTFSwings, 
      currentTFLocalAnalysis.boss,
      fvgs
    );
    console.log(`  Order Blocks: ${orderBlocks.length}`);
    
    if (orderBlocks.length > 0) {
      const ob = orderBlocks[0];
      console.log(`  🎯 OB Entry (50% corpo): $${ob.midpoint.toFixed(2)}`);
    }
    
    const manipulationZones = detectManipulationZones(currentTFCandles, currentTFSwings);
    console.log(`  Manipulação: ${manipulationZones.length}`);
    
    // PASSO 5: Calcular POIs ADKBOT
    const pois = calculatePOIs_ADKBOT(
      currentTFCandles,
      fvgs,
      orderBlocks,
      premiumDiscount,
      dominantBias,
      manipulationZones,
      currentTFSwings,
      currentTFLocalAnalysis.boss
    );
    console.log(`  POIs (RR >= 5:1): ${pois.length}`);
    
    pois.forEach((poi, i) => {
      console.log(`    #${i+1}: ${poi.type} @ $${poi.entry.toFixed(2)} | RR 1:${poi.riskReward.toFixed(1)}`);
    });
    
    const currentTFAnalysis = analyzeWithContext(
      currentTFLocalAnalysis,
      dominantBias,
      higherTFAnalysis
    );

    // PASSO 6: Overview de todos os timeframes
    const allTimeframesAnalysis = await Promise.all(
      timeframes.map(async (tf: string) => {
        const candles = await fetchBinanceKlines(symbol, tf, 100);
        const swings = detectSwingPoints(candles, 5, 5);
        const analysis = detectBOSandCHOCH(candles, swings);
        return {
          timeframe: tf,
          ...analysis,
        };
      })
    );

    // PASSO 7: PRE-LIST TRADER RAIZ ADKBOT
    const checklist = calculateTraderRaizChecklist_ADKBOT(
      currentTFSwings,
      currentTFLocalAnalysis,
      premiumDiscount,
      dominantBias,
      manipulationZones,
      orderBlocks,
      fvgs,
      pois
    );
    
    console.log("📋 PRE-LIST ADKBOT:");
    console.log(`   1. Swings: ${checklist.swingsMapped ? '✓' : '✗'} (${checklist.swingsCount})`);
    console.log(`   2. Tendência: ${checklist.trendDefined ? '✓' : '✗'} ${checklist.trendDirection}`);
    console.log(`   3. BOSS: ${checklist.bossConfirmado ? '✓ CONFIRMADO' : '✗'}`);
    console.log(`   4. Zona: ${checklist.zoneCorrect ? '✓' : '✗'} ${checklist.zoneName}`);
    console.log(`   5. Manipulação: ${checklist.manipulationIdentified ? '✓' : '⚠'}`);
    console.log(`   6. OB Entry 50%: ${checklist.orderBlockLocated ? `✓ $${checklist.orderBlockEntry50?.toFixed(2)}` : '✗'}`);
    console.log(`   7. R:R: ${checklist.riskRewardValid ? '✓' : '✗'} 1:${checklist.riskRewardValue.toFixed(1)} (min 5:1)`);
    console.log(`   8. Confirmação: ${checklist.entryConfirmed ? '✓' : '✗'}`);
    console.log(`   📊 CONCLUSÃO: ${checklist.conclusion} (${checklist.criteriaCount}/8)`);

    const result = {
      symbol,
      timestamp: new Date().toISOString(),
      
      higherTimeframes: {
        "1d": higherTFAnalysis["1d"],
        "4h": higherTFAnalysis["4h"],
        "1h": higherTFAnalysis["1h"],
      },
      
      dominantBias,
      
      currentTimeframe: {
        timeframe: currentTimeframe,
        ...currentTFAnalysis,
        premiumDiscount,
        fvgs,
        orderBlocks,
        manipulationZones,
        pois,
      },
      
      checklist,
      allTimeframes: allTimeframesAnalysis,
    };

    console.log("✅ ADKBOT Análise concluída");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Erro ADKBOT:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
