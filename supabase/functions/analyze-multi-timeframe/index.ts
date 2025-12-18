import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==================== SISTEMA IA EVOLUTIVA ====================

interface IALearningData {
  padraoId: string;
  taxaAcerto: number;
  vezesTestado: number;
  confianca: "ALTA" | "MEDIA" | "BAIXA" | "NEUTRO";
  ajusteAplicado: string;
}

// Determinar sessão de trading atual
function getTradingSession(): string {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= 21 || utcHour < 6) return 'OCEANIA';
  if (utcHour >= 6 && utcHour < 8) return 'ASIA';
  if (utcHour >= 8 && utcHour < 13) return 'LONDON';
  return 'NY';
}

// Consultar aprendizado IA para o padrão atual
async function consultarAprendizadoIA(
  supabase: any,
  userId: string | null,
  sweepType: string,
  structureType: string,
  fvgType: string,
  zoneType: string
): Promise<IALearningData | null> {
  if (!userId) return null;
  
  try {
    const sessionType = getTradingSession();
    const padraoId = `${sweepType || 'none'}_${structureType || 'none'}_${fvgType || 'none'}_${zoneType || 'none'}_${sessionType}`;
    
    const { data: pattern } = await supabase
      .from('ia_learning_patterns')
      .select('taxa_acerto, vezes_testado, recompensa_acumulada')
      .eq('user_id', userId)
      .eq('padrao_id', padraoId)
      .single();
    
    if (!pattern) {
      return {
        padraoId,
        taxaAcerto: 50,
        vezesTestado: 0,
        confianca: "NEUTRO",
        ajusteAplicado: "Padrão novo - sem histórico",
      };
    }
    
    // Determinar nível de confiança
    let confianca: "ALTA" | "MEDIA" | "BAIXA" | "NEUTRO";
    let ajuste: string;
    
    if (pattern.vezes_testado < 5) {
      confianca = "NEUTRO";
      ajuste = "Dados insuficientes (<5 trades)";
    } else if (pattern.taxa_acerto >= 60) {
      confianca = "ALTA";
      ajuste = "Padrão lucrativo - entrada priorizada";
    } else if (pattern.taxa_acerto >= 45) {
      confianca = "MEDIA";
      ajuste = "Padrão neutro - filtros padrão";
    } else if (pattern.taxa_acerto >= 35) {
      confianca = "BAIXA";
      ajuste = "⚠️ Taxa baixa - aumentar rigor de volume +20%";
    } else {
      confianca = "BAIXA";
      ajuste = "🚫 Padrão arriscado (<35%) - considerar evitar";
    }
    
    console.log(`[IA-LEARNING] 🧠 Padrão: ${padraoId} | Taxa: ${pattern.taxa_acerto.toFixed(1)}% | Conf: ${confianca}`);
    
    return {
      padraoId,
      taxaAcerto: pattern.taxa_acerto,
      vezesTestado: pattern.vezes_testado,
      confianca,
      ajusteAplicado: ajuste,
    };
  } catch (error) {
    console.error('[IA-LEARNING] Erro ao consultar:', error);
    return null;
  }
}

// ==================== INTERFACES TRADE RAIZ EVOLUÍDO ====================

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

// NOVO: Interface para detecção de Sweep (Varredura de Liquidez)
interface SweepDetection {
  detected: boolean;
  type: "sweep_low" | "sweep_high" | null;
  level: number | null;
  timestamp: number | null;
  description: string;
}

interface BOSS {
  tipo: "alta" | "baixa";
  preco_rompido: number;
  indice_rompimento: number;
  vela_fechamento: number;
  confirmado: boolean;
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

interface OrderBlock {
  index: number;
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  open: number;
  close: number;
  midpoint: number;
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

// PRE-LIST TRADE RAIZ EVOLUÍDO - 5 CRITÉRIOS ESSENCIAIS
interface TraderRaizChecklist {
  // Critério 1: Sweep detectado
  sweepDetected: boolean;
  sweepType: "sweep_low" | "sweep_high" | null;
  sweepLevel: number | null;
  
  // Critério 2: CHOCH/BOS confirmado
  structureConfirmed: boolean;
  structureType: "BOS" | "CHOCH" | null;
  structurePrice: number | null;
  
  // Critério 3: FVG presente após sweep
  fvgPresent: boolean;
  fvgType: "bullish" | "bearish" | null;
  
  // Critério 4: Zona correta (Discount para compras, Premium para vendas)
  zoneCorrect: boolean;
  zoneName: "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM";
  
  // Critério 5: R:R >= 3:1
  riskRewardValid: boolean;
  riskRewardValue: number;
  
  // Campos legacy para compatibilidade
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
  
  // Resultado final
  criteriaCount: number;
  allCriteriaMet: boolean;
  conclusion: "ENTRADA VÁLIDA" | "AGUARDAR" | "ANULAR";
  reasoning: string;
}

// ==================== MÓDULO DE LIQUIDEZ (SWEEP DETECTION) ====================

function detectSweep(candles: Candle[], swings: SwingPoint[]): SweepDetection {
  if (candles.length < 3 || swings.length < 2) {
    return { detected: false, type: null, level: null, timestamp: null, description: "Dados insuficientes" };
  }
  
  const current = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  
  // Pegar swings recentes
  const recentLows = swings.filter(s => s.type === "low").slice(-5);
  const recentHighs = swings.filter(s => s.type === "high").slice(-5);
  
  // SWEEP LOW (Stop Hunt de fundos): Preço violou o fundo mas FECHOU acima
  for (const swingLow of recentLows) {
    const hasSweeptLow = prev.low < swingLow.price && prev.close > swingLow.price;
    const currentConfirms = current.close > swingLow.price;
    
    if (hasSweeptLow && currentConfirms) {
      console.log(`[SWEEP] 🎯 SWEEP LOW detectado @ $${swingLow.price.toFixed(2)}`);
      return {
        detected: true,
        type: "sweep_low",
        level: swingLow.price,
        timestamp: candles[candles.length - 2].time,
        description: `Varredura de liquidez em $${swingLow.price.toFixed(2)} - Setup LONG`
      };
    }
  }
  
  // SWEEP HIGH (Stop Hunt de topos): Preço violou o topo mas FECHOU abaixo
  for (const swingHigh of recentHighs) {
    const hasSweeptHigh = prev.high > swingHigh.price && prev.close < swingHigh.price;
    const currentConfirms = current.close < swingHigh.price;
    
    if (hasSweeptHigh && currentConfirms) {
      console.log(`[SWEEP] 🎯 SWEEP HIGH detectado @ $${swingHigh.price.toFixed(2)}`);
      return {
        detected: true,
        type: "sweep_high",
        level: swingHigh.price,
        timestamp: candles[candles.length - 2].time,
        description: `Varredura de liquidez em $${swingHigh.price.toFixed(2)} - Setup SHORT`
      };
    }
  }
  
  return { detected: false, type: null, level: null, timestamp: null, description: "Sem sweep detectado" };
}

// ==================== AGENTE DE ESTRUTURA ====================

function detectSwingPoints(
  candles: Candle[],
  leftBars: number = 3,
  rightBars: number = 3
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
      swingPoints.push({ index: i, price: current.high, type: "high" });
    }

    if (isSwingLow) {
      swingPoints.push({ index: i, price: current.low, type: "low" });
    }
  }

  return swingPoints;
}

function detectBOSS(candles: Candle[], swings: SwingPoint[]): BOSS | null {
  if (swings.length < 2) return null;
  
  const highs = swings.filter(s => s.type === "high").sort((a, b) => a.index - b.index);
  const lows = swings.filter(s => s.type === "low").sort((a, b) => a.index - b.index);
  
  if (highs.length < 1 || lows.length < 1) return null;
  
  const ultimoClose = candles[candles.length - 1].close;
  
  // BOSS de BAIXA
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
  
  // BOSS de ALTA
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

  const boss = detectBOSS(candles, swings);
  
  let currentTrend: "ALTA" | "BAIXA" | "NEUTRO" = "NEUTRO";
  let bosCount = 0;
  let chochCount = 0;
  let lastBOS: number | null = null;
  let lastCHOCH: number | null = null;

  if (boss && boss.confirmado) {
    currentTrend = boss.tipo === "alta" ? "ALTA" : "BAIXA";
    lastBOS = candles[boss.indice_rompimento].time;
    bosCount = 1;
  } else {
    const recentHighs = highs.slice(-3);
    const recentLows = lows.slice(-3);
    
    if (recentHighs.length >= 2 && recentLows.length >= 2) {
      const lastHigh = recentHighs[recentHighs.length - 1];
      const prevHigh = recentHighs[recentHighs.length - 2];
      const lastLow = recentLows[recentLows.length - 1];
      const prevLow = recentLows[recentLows.length - 2];
      
      if (lastHigh.price > prevHigh.price && lastLow.price > prevLow.price) {
        currentTrend = "ALTA";
        lastBOS = candles[lastHigh.index].time;
        bosCount = 1;
      }
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
    if (boss?.confirmado) confidence += 20;
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

// ==================== AGENTE PREMIUM/DISCOUNT ====================

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
  
  const fib_50 = rangeLow + (rangeSize * 0.5);
  
  let status: "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT";
  let statusDescription: string;
  
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

function determineDominantBias(higherTF: Record<string, BOSCHOCHResult>) {
  const d1 = higherTF["1d"];
  const h4 = higherTF["4h"];
  const h1 = higherTF["1h"];

  const trends = [d1.trend, h4.trend, h1.trend];
  const altaCount = trends.filter(t => t === "ALTA").length;
  const baixaCount = trends.filter(t => t === "BAIXA").length;

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
    reasoning: "Todos TFs neutros",
  };
}

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
    interpretation = "⚠️ Divergência entre TFs - Aguardar definição";
    tradingOpportunity = false;
  } else {
    interpretation = "📊 Mercado neutro - Aguardar definição";
    tradingOpportunity = true; // Permitir operações em range
  }

  return {
    ...localAnalysis,
    interpretation,
    alignedWithHigherTF,
    tradingOpportunity,
    reasoning: alignedWithHigherTF
      ? "Movimento local segue direção dos TFs superiores"
      : "Movimento divergente - Confirmar com estrutura",
  };
}

// ==================== AGENTE FVG ====================

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

function calcularEntrada50OB(ob: OrderBlock): number {
  const corpoAlto = Math.max(ob.open, ob.close);
  const corpoBaixo = Math.min(ob.open, ob.close);
  return corpoBaixo + ((corpoAlto - corpoBaixo) / 2);
}

function detectOrderBlocks(
  candles: Candle[],
  swings: SwingPoint[],
  boss: BOSS | null,
  fvgs: FVG[],
  sweep: SweepDetection
): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  
  // Com sweep detectado, criar OB mesmo sem BOSS confirmado
  const hasTrigger = (boss && boss.confirmado) || sweep.detected;
  
  if (!hasTrigger) {
    return orderBlocks;
  }
  
  const lookbackStart = boss?.indice_rompimento || candles.length - 1;
  
  // OB Bullish após sweep low
  if (sweep.type === "sweep_low" || (boss?.tipo === "alta")) {
    for (let i = lookbackStart - 1; i >= Math.max(0, lookbackStart - 20); i--) {
      const velaBaixa = candles[i].close < candles[i].open;
      
      if (velaBaixa) {
        const fvgPresente = fvgs.some(
          fvg => fvg.type === "bullish" && fvg.index >= i && fvg.index <= i + 3
        );
        
        const avgSize = candles.slice(Math.max(0, i - 20), i)
          .reduce((sum, c) => sum + Math.abs(c.high - c.low), 0) / Math.min(20, i || 1);
        
        const candleSize = Math.abs(candles[i].high - candles[i].low);
        const sizeScore = (candleSize / (avgSize || 1)) * 50;
        const volumeScore = Math.min(50, (candles[i].volume / 1000000) * 10);
        const sweepBonus = sweep.detected ? 20 : 0;
        const strength = Math.min(100, sizeScore + volumeScore + sweepBonus);
        
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
  
  // OB Bearish após sweep high
  if (sweep.type === "sweep_high" || (boss?.tipo === "baixa")) {
    for (let i = lookbackStart - 1; i >= Math.max(0, lookbackStart - 20); i--) {
      const velaAlta = candles[i].close > candles[i].open;
      
      if (velaAlta) {
        const fvgPresente = fvgs.some(
          fvg => fvg.type === "bearish" && fvg.index >= i && fvg.index <= i + 3
        );
        
        const avgSize = candles.slice(Math.max(0, i - 20), i)
          .reduce((sum, c) => sum + Math.abs(c.high - c.low), 0) / Math.min(20, i || 1);
        
        const candleSize = Math.abs(candles[i].high - candles[i].low);
        const sizeScore = (candleSize / (avgSize || 1)) * 50;
        const volumeScore = Math.min(50, (candles[i].volume / 1000000) * 10);
        const sweepBonus = sweep.detected ? 20 : 0;
        const strength = Math.min(100, sizeScore + volumeScore + sweepBonus);
        
        const ob: OrderBlock = {
          index: i,
          type: "bearish",
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

// ==================== AGENTE DE SINAIS (R:R 3:1) ====================

function calculateDynamicTP(
  entry: number,
  stopLoss: number,
  type: "bullish" | "bearish",
  swings: SwingPoint[],
  candles: Candle[]
): { takeProfit: number; riskReward: number; targetSwing: TargetSwing } {
  const risk = Math.abs(entry - stopLoss);
  
  if (type === "bullish") {
    const targetHighs = swings
      .filter(s => s.type === "high" && s.price > entry)
      .sort((a, b) => a.price - b.price);
    
    for (const swing of targetHighs) {
      const targetPrice = swing.price * 0.995;
      const reward = Math.abs(targetPrice - entry);
      const rr = reward / risk;
      
      // TRADE RAIZ: RR mínimo 3:1
      if (rr >= 3.0 && rr <= 15.0) {
        return {
          takeProfit: targetPrice,
          riskReward: rr,
          targetSwing: { type: "high", price: swing.price, index: swing.index }
        };
      }
    }
  } else {
    const targetLows = swings
      .filter(s => s.type === "low" && s.price < entry)
      .sort((a, b) => b.price - a.price);
    
    for (const swing of targetLows) {
      const targetPrice = swing.price * 1.005;
      const reward = Math.abs(entry - targetPrice);
      const rr = reward / risk;
      
      if (rr >= 3.0 && rr <= 15.0) {
        return {
          takeProfit: targetPrice,
          riskReward: rr,
          targetSwing: { type: "low", price: swing.price, index: swing.index }
        };
      }
    }
  }
  
  // Fallback: RR conservador 3.5:1
  const conservativeTP = type === "bullish" 
    ? entry + (risk * 3.5)
    : entry - (risk * 3.5);
  
  const nearestSwing = type === "bullish"
    ? swings.filter(s => s.type === "high" && s.price > entry).sort((a, b) => a.price - b.price)[0]
    : swings.filter(s => s.type === "low" && s.price < entry).sort((a, b) => b.price - a.price)[0];
  
  return {
    takeProfit: conservativeTP,
    riskReward: 3.5,
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

function calculatePOIs(
  candles: Candle[],
  fvgs: FVG[],
  orderBlocks: OrderBlock[],
  premiumDiscount: PremiumDiscountResult,
  dominantBias: ReturnType<typeof determineDominantBias>,
  manipulationZones: ManipulationZone[],
  swings: SwingPoint[],
  sweep: SweepDetection
): POI[] {
  const pois: POI[] = [];
  const currentPrice = candles[candles.length - 1].close;
  
  for (const ob of orderBlocks) {
    const factors: string[] = [];
    let score = 40;
    
    factors.push(ob.type === "bullish" ? "OB Bullish" : "OB Bearish");
    
    // Bônus por sweep detectado
    if (sweep.detected) {
      factors.push(`🎯 SWEEP ${sweep.type === "sweep_low" ? "LOW" : "HIGH"}`);
      score += 25;
    }
    
    // Alinhamento com viés
    if ((ob.type === "bullish" && dominantBias.bias === "ALTA") ||
        (ob.type === "bearish" && dominantBias.bias === "BAIXA")) {
      factors.push(`Viés ${dominantBias.bias} alinhado`);
      score += 15;
    }
    
    // Validar zona
    const zoneValid = (ob.type === "bullish" && premiumDiscount.status === "DISCOUNT") ||
                      (ob.type === "bearish" && premiumDiscount.status === "PREMIUM");
    
    if (zoneValid) {
      factors.push(premiumDiscount.status === "DISCOUNT" ? "Zona Discount ✓" : "Zona Premium ✓");
      score += 20;
    } else {
      factors.push(`❌ Zona ${premiumDiscount.status}`);
      // Não bloquear, apenas reduzir score
      score -= 10;
    }
    
    // FVG presente
    if (ob.fvg_presente) {
      factors.push("FVG presente ✓");
      score += 15;
    }
    
    // Força do OB
    factors.push(`Força: ${Math.round(ob.strength)}%`);
    score += ob.strength * 0.1;
    
    // Distância de manipulação
    const nearManipulation = manipulationZones.some(zone => 
      Math.abs(zone.price - ob.midpoint) / ob.midpoint < 0.005
    );
    
    if (!nearManipulation) {
      factors.push("Zona limpa");
      score += 5;
    }
    
    // Score mínimo 60% para criar POI (reduzido de 70%)
    if (score < 60) continue;
    
    const entry = ob.midpoint;
    
    // Stop Loss técnico
    const swingForSL = ob.type === "bullish" 
      ? swings.filter(s => s.type === "low").sort((a, b) => b.index - a.index)[0]
      : swings.filter(s => s.type === "high").sort((a, b) => b.index - a.index)[0];
    
    const stopLoss = ob.type === "bullish"
      ? Math.min(ob.bottom, swingForSL?.price || ob.bottom) * 0.999
      : Math.max(ob.top, swingForSL?.price || ob.top) * 1.001;
    
    // TP Dinâmico com RR mínimo 3:1
    const { takeProfit, riskReward, targetSwing } = calculateDynamicTP(
      entry,
      stopLoss,
      ob.type,
      swings,
      candles
    );
    
    // TRADE RAIZ: Se RR < 3, não criar POI
    if (riskReward < 3.0) {
      factors.push(`❌ RR ${riskReward.toFixed(1)} < 3:1`);
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

// ==================== PRE-LIST TRADE RAIZ (5 CRITÉRIOS) ====================

function calculateTraderRaizChecklist(
  swings: SwingPoint[],
  bosChoch: BOSCHOCHResult,
  premiumDiscount: PremiumDiscountResult,
  dominantBias: ReturnType<typeof determineDominantBias>,
  manipulationZones: ManipulationZone[],
  orderBlocks: OrderBlock[],
  fvgs: FVG[],
  pois: POI[],
  sweep: SweepDetection
): TraderRaizChecklist {
  let criteriaCount = 0;
  const reasons: string[] = [];
  
  // ========== CRITÉRIO 1: SWEEP DETECTADO ==========
  const sweepDetected = sweep.detected;
  if (sweepDetected) {
    criteriaCount++;
    reasons.push(`✓ SWEEP ${sweep.type} @ $${sweep.level?.toFixed(2)}`);
  } else {
    reasons.push("✗ Sem sweep de liquidez");
  }
  
  // ========== CRITÉRIO 2: ESTRUTURA (BOS/CHOCH) ==========
  const structureConfirmed = bosChoch.boss?.confirmado || bosChoch.lastBOS !== null || bosChoch.lastCHOCH !== null;
  const structureType = bosChoch.boss?.confirmado ? "BOS" : bosChoch.lastCHOCH ? "CHOCH" : bosChoch.lastBOS ? "BOS" : null;
  const structurePrice = bosChoch.boss?.preco_rompido || null;
  
  if (structureConfirmed) {
    criteriaCount++;
    reasons.push(`✓ ${structureType || 'Estrutura'} confirmado`);
  } else {
    reasons.push("✗ Sem estrutura confirmada");
  }
  
  // ========== CRITÉRIO 3: FVG PRESENTE ==========
  const relevantFvgType = sweep.type === "sweep_low" ? "bullish" : sweep.type === "sweep_high" ? "bearish" : null;
  const fvgPresent = relevantFvgType 
    ? fvgs.some(f => f.type === relevantFvgType)
    : fvgs.length > 0;
  const fvgType = fvgs[0]?.type || null;
  
  if (fvgPresent) {
    criteriaCount++;
    reasons.push(`✓ FVG ${fvgType} presente`);
  } else {
    reasons.push("✗ Sem FVG");
  }
  
  // ========== CRITÉRIO 4: ZONA CORRETA ==========
  // Para LONG (sweep low): precisa estar em DISCOUNT
  // Para SHORT (sweep high): precisa estar em PREMIUM
  let zoneCorrect = false;
  if (sweep.type === "sweep_low" && premiumDiscount.status === "DISCOUNT") {
    zoneCorrect = true;
  } else if (sweep.type === "sweep_high" && premiumDiscount.status === "PREMIUM") {
    zoneCorrect = true;
  } else if (!sweep.detected) {
    // Sem sweep, aceitar zona alinhada com viés
    zoneCorrect = (
      (dominantBias.bias === "ALTA" && premiumDiscount.status === "DISCOUNT") ||
      (dominantBias.bias === "BAIXA" && premiumDiscount.status === "PREMIUM")
    );
  }
  
  if (zoneCorrect) {
    criteriaCount++;
    reasons.push(`✓ Zona ${premiumDiscount.status} correta`);
  } else {
    reasons.push(`✗ Zona ${premiumDiscount.status} incorreta`);
  }
  
  // ========== CRITÉRIO 5: R:R >= 3:1 ==========
  const bestPOI = pois[0];
  const rrValue = bestPOI?.riskReward || 0;
  const riskRewardValid = rrValue >= 3.0;
  
  if (riskRewardValid) {
    criteriaCount++;
    reasons.push(`✓ RR 1:${rrValue.toFixed(1)} (>= 3:1)`);
  } else {
    reasons.push(`✗ RR 1:${rrValue.toFixed(1)} < 3:1`);
  }
  
  // ========== CONCLUSÃO ==========
  // TRADE RAIZ: 5 de 5 critérios para entrada válida
  const allCriteriaMet = criteriaCount >= 4; // 4 de 5 é suficiente (mais realista)
  let conclusion: "ENTRADA VÁLIDA" | "AGUARDAR" | "ANULAR";
  
  if (criteriaCount >= 4) {
    conclusion = "ENTRADA VÁLIDA";
  } else if (criteriaCount >= 3) {
    conclusion = "AGUARDAR";
  } else {
    conclusion = "ANULAR";
  }
  
  // Campos legacy para compatibilidade
  const validOB = orderBlocks.find(ob => 
    (dominantBias.bias === "ALTA" && ob.type === "bullish") ||
    (dominantBias.bias === "BAIXA" && ob.type === "bearish")
  );
  
  return {
    // Novos 5 critérios
    sweepDetected,
    sweepType: sweep.type,
    sweepLevel: sweep.level,
    structureConfirmed,
    structureType,
    structurePrice,
    fvgPresent,
    fvgType,
    zoneCorrect,
    zoneName: premiumDiscount.status,
    riskRewardValid,
    riskRewardValue: rrValue,
    
    // Legacy
    swingsMapped: swings.length >= 4,
    swingsCount: swings.length,
    trendDefined: bosChoch.trend !== "NEUTRO",
    trendDirection: bosChoch.trend,
    structureBroken: structureConfirmed,
    bossConfirmado: bosChoch.boss?.confirmado || false,
    zoneAligned: zoneCorrect,
    manipulationIdentified: manipulationZones.length > 0,
    manipulationZonesCount: manipulationZones.length,
    orderBlockLocated: !!validOB,
    orderBlockRange: validOB ? `$${validOB.bottom.toFixed(2)} - $${validOB.top.toFixed(2)}` : "N/A",
    orderBlockStrength: validOB?.strength || 0,
    orderBlockEntry50: validOB?.midpoint || null,
    entryConfirmed: pois.length > 0,
    
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
    const { symbol, timeframes, currentTimeframe, userId } = await req.json();

    if (!symbol || !currentTimeframe) {
      throw new Error("Symbol and currentTimeframe are required");
    }

    console.log(`🤖 TRADE RAIZ EVOLUÍDO - ${symbol} | TF: ${currentTimeframe}`);
    
    // Inicializar Supabase para consulta de IA
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = supabaseUrl && supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null;

    // PASSO 1: Analisar timeframes superiores
    const higherTimeframes = ["1d", "4h", "1h"];
    const higherTFAnalysis: Record<string, BOSCHOCHResult> = {};

    console.log("📊 Top-Down Analysis...");

    for (const tf of higherTimeframes) {
      const candles = await fetchBinanceKlines(symbol, tf, 100);
      const swings = detectSwingPoints(candles, 3, 3);
      const analysis = detectBOSandCHOCH(candles, swings);
      higherTFAnalysis[tf] = analysis;
      
      console.log(`  ${tf.toUpperCase()}: ${analysis.trend} | BOS: ${analysis.boss?.confirmado ? '✓' : '✗'} | Conf: ${analysis.confidence}%`);
    }

    // PASSO 2: Determinar VIÉS DOMINANTE
    const dominantBias = determineDominantBias(higherTFAnalysis);
    console.log(`🎯 VIÉS: ${dominantBias.bias} (${dominantBias.strength})`);

    // PASSO 3: Analisar timeframe atual
    console.log(`🔍 Analisando ${currentTimeframe}...`);
    const currentTFCandles = await fetchBinanceKlines(symbol, currentTimeframe, 200);
    const currentTFSwings = detectSwingPoints(currentTFCandles, 3, 3);
    const currentTFLocalAnalysis = detectBOSandCHOCH(currentTFCandles, currentTFSwings);
    const premiumDiscount = calculatePremiumDiscount(currentTFCandles, currentTFSwings);
    
    // PASSO 4: SWEEP DETECTION (NOVO!)
    const sweep = detectSweep(currentTFCandles, currentTFSwings);
    console.log(`🎯 SWEEP: ${sweep.detected ? `${sweep.type} @ $${sweep.level?.toFixed(2)}` : 'Não detectado'}`);
    
    // PASSO 5: Detectar estruturas
    const fvgs = detectFVG(currentTFCandles);
    console.log(`  FVGs: ${fvgs.length}`);
    
    const orderBlocks = detectOrderBlocks(
      currentTFCandles, 
      currentTFSwings, 
      currentTFLocalAnalysis.boss,
      fvgs,
      sweep
    );
    console.log(`  Order Blocks: ${orderBlocks.length}`);
    
    if (orderBlocks.length > 0) {
      const ob = orderBlocks[0];
      console.log(`  🎯 OB Entry (50%): $${ob.midpoint.toFixed(2)}`);
    }
    
    const manipulationZones = detectManipulationZones(currentTFCandles, currentTFSwings);
    console.log(`  Manipulação: ${manipulationZones.length}`);
    
    // PASSO 6: Calcular POIs (R:R >= 3:1)
    const pois = calculatePOIs(
      currentTFCandles,
      fvgs,
      orderBlocks,
      premiumDiscount,
      dominantBias,
      manipulationZones,
      currentTFSwings,
      sweep
    );
    console.log(`  POIs (RR >= 3:1): ${pois.length}`);
    
    pois.forEach((poi, i) => {
      console.log(`    #${i+1}: ${poi.type} @ $${poi.entry.toFixed(2)} | RR 1:${poi.riskReward.toFixed(1)}`);
    });
    
    const currentTFAnalysis = analyzeWithContext(
      currentTFLocalAnalysis,
      dominantBias,
      higherTFAnalysis
    );

    // PASSO 7: Overview de todos os timeframes
    const allTimeframesAnalysis = await Promise.all(
      timeframes.map(async (tf: string) => {
        const candles = await fetchBinanceKlines(symbol, tf, 100);
        const swings = detectSwingPoints(candles, 3, 3);
        const analysis = detectBOSandCHOCH(candles, swings);
        return { timeframe: tf, ...analysis };
      })
    );

    // PASSO 8: PRE-LIST TRADE RAIZ (5 CRITÉRIOS)
    const checklist = calculateTraderRaizChecklist(
      currentTFSwings,
      currentTFLocalAnalysis,
      premiumDiscount,
      dominantBias,
      manipulationZones,
      orderBlocks,
      fvgs,
      pois,
      sweep
    );
    
    console.log("📋 PRE-LIST TRADE RAIZ (5 critérios):");
    console.log(`   1. Sweep: ${checklist.sweepDetected ? `✓ ${checklist.sweepType}` : '✗'}`);
    console.log(`   2. Estrutura: ${checklist.structureConfirmed ? `✓ ${checklist.structureType}` : '✗'}`);
    console.log(`   3. FVG: ${checklist.fvgPresent ? `✓ ${checklist.fvgType}` : '✗'}`);
    console.log(`   4. Zona: ${checklist.zoneCorrect ? `✓ ${checklist.zoneName}` : `✗ ${checklist.zoneName}`}`);
    console.log(`   5. R:R: ${checklist.riskRewardValid ? `✓` : '✗'} 1:${checklist.riskRewardValue.toFixed(1)} (min 3:1)`);
    console.log(`   📊 CONCLUSÃO: ${checklist.conclusion} (${checklist.criteriaCount}/5)`);

    // ==================== IA EVOLUTIVA: CONSULTAR APRENDIZADO ====================
    let iaLearning: IALearningData | null = null;
    
    if (supabase && userId) {
      iaLearning = await consultarAprendizadoIA(
        supabase,
        userId,
        sweep.type || 'none',
        checklist.structureType || 'none',
        checklist.fvgType || 'none',
        premiumDiscount.status
      );
    }

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
        sweep,
      },
      
      checklist,
      allTimeframes: allTimeframesAnalysis,
      
      // NOVO: Dados de aprendizado da IA
      iaLearning,
    };

    console.log("✅ Análise concluída");
    if (iaLearning) {
      console.log(`🧠 IA: ${iaLearning.confianca} (${iaLearning.taxaAcerto.toFixed(1)}%)`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
