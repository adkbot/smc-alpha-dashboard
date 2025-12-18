import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeframes para análise (Binance intervals)
const TIMEFRAMES = ['1d', '4h', '1h', '30m', '15m', '5m'];
const CANDLES_PER_TF: Record<string, number> = {
  '1d': 365,
  '4h': 500,
  '1h': 720,
  '30m': 1000,
  '15m': 1000,
  '5m': 1000
};

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SMCState {
  trend: 'bullish' | 'bearish' | 'neutral';
  sweep: 'high' | 'low' | 'none';
  structure: 'bos_up' | 'bos_down' | 'choch_up' | 'choch_down' | 'none';
  fvg: 'bullish' | 'bearish' | 'none';
  zone: 'premium' | 'discount' | 'equilibrium';
}

interface TradeSetup {
  index: number;
  direction: 'LONG' | 'SHORT';
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  pattern: string;
  mtfAligned: boolean;
}

// Buscar klines da Binance
async function fetchBinanceKlines(symbol: string, interval: string, limit: number): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.map((k: any[]) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5])
  }));
}

// Detectar tendência
function detectTrend(candles: Candle[], index: number): 'bullish' | 'bearish' | 'neutral' {
  if (index < 20) return 'neutral';
  
  const recentCandles = candles.slice(index - 20, index);
  const highs = recentCandles.map(c => c.high);
  const lows = recentCandles.map(c => c.low);
  
  const higherHighs = highs.slice(-10).every((h, i) => i === 0 || h >= highs[i - 1 + highs.length - 10]);
  const higherLows = lows.slice(-10).every((l, i) => i === 0 || l >= lows[i - 1 + lows.length - 10]);
  const lowerHighs = highs.slice(-10).every((h, i) => i === 0 || h <= highs[i - 1 + highs.length - 10]);
  const lowerLows = lows.slice(-10).every((l, i) => i === 0 || l <= lows[i - 1 + lows.length - 10]);
  
  if (higherHighs && higherLows) return 'bullish';
  if (lowerHighs && lowerLows) return 'bearish';
  return 'neutral';
}

// Detectar sweep de liquidez (MELHORADO: verifica últimos 5 candles)
function detectSweep(candles: Candle[], index: number): 'high' | 'low' | 'none' {
  if (index < 30) return 'none';
  
  const lookback = candles.slice(index - 30, index - 5);
  const recentCandles = candles.slice(index - 5, index + 1);
  
  // Encontrar swing high/low do período anterior
  const swingHigh = Math.max(...lookback.map(c => c.high));
  const swingLow = Math.min(...lookback.map(c => c.low));
  
  // Verificar sweep nos últimos 5 candles (não só no atual)
  for (const candle of recentCandles) {
    // Sweep high: price vai acima do swing high e fecha abaixo
    if (candle.high > swingHigh && candle.close < swingHigh) {
      return 'high';
    }
    
    // Sweep low: price vai abaixo do swing low e fecha acima
    if (candle.low < swingLow && candle.close > swingLow) {
      return 'low';
    }
  }
  
  return 'none';
}

// Detectar estrutura BOS/CHOCH
function detectStructure(candles: Candle[], index: number): 'bos_up' | 'bos_down' | 'choch_up' | 'choch_down' | 'none' {
  if (index < 20) return 'none';
  
  const prev = candles.slice(index - 20, index);
  const current = candles[index];
  
  // Encontrar swing points anteriores
  const swings = findSwingPoints(prev);
  if (swings.highs.length < 2 || swings.lows.length < 2) return 'none';
  
  const lastHigh = swings.highs[swings.highs.length - 1];
  const prevHigh = swings.highs[swings.highs.length - 2];
  const lastLow = swings.lows[swings.lows.length - 1];
  const prevLow = swings.lows[swings.lows.length - 2];
  
  const trend = detectTrend(candles, index - 1);
  
  // BOS Up: quebra de high em tendência de alta
  if (current.close > lastHigh.price && trend === 'bullish') {
    return 'bos_up';
  }
  
  // BOS Down: quebra de low em tendência de baixa
  if (current.close < lastLow.price && trend === 'bearish') {
    return 'bos_down';
  }
  
  // CHOCH Up: quebra de high em tendência de baixa (reversão)
  if (current.close > lastHigh.price && trend === 'bearish') {
    return 'choch_up';
  }
  
  // CHOCH Down: quebra de low em tendência de alta (reversão)
  if (current.close < lastLow.price && trend === 'bullish') {
    return 'choch_down';
  }
  
  return 'none';
}

function findSwingPoints(candles: Candle[]): { highs: { price: number; index: number }[]; lows: { price: number; index: number }[] } {
  const highs: { price: number; index: number }[] = [];
  const lows: { price: number; index: number }[] = [];
  
  for (let i = 2; i < candles.length - 2; i++) {
    const isSwingHigh = candles[i].high > candles[i - 1].high && 
                        candles[i].high > candles[i - 2].high &&
                        candles[i].high > candles[i + 1].high &&
                        candles[i].high > candles[i + 2].high;
    
    const isSwingLow = candles[i].low < candles[i - 1].low && 
                       candles[i].low < candles[i - 2].low &&
                       candles[i].low < candles[i + 1].low &&
                       candles[i].low < candles[i + 2].low;
    
    if (isSwingHigh) highs.push({ price: candles[i].high, index: i });
    if (isSwingLow) lows.push({ price: candles[i].low, index: i });
  }
  
  return { highs, lows };
}

// Detectar FVG (RELAXADO: aceita gaps menores e considera contexto)
function detectFVG(candles: Candle[], index: number): 'bullish' | 'bearish' | 'none' {
  if (index < 3) return 'none';
  
  const c1 = candles[index - 2];
  const c2 = candles[index - 1];
  const c3 = candles[index];
  const avgPrice = (c1.close + c2.close + c3.close) / 3;
  const minGap = avgPrice * 0.0005; // Gap mínimo de 0.05% do preço
  
  // Bullish FVG: gap entre high de c1 e low de c3
  const bullishGap = c3.low - c1.high;
  if (bullishGap > minGap) {
    return 'bullish';
  }
  
  // Bearish FVG: gap entre low de c1 e high de c3
  const bearishGap = c1.low - c3.high;
  if (bearishGap > minGap) {
    return 'bearish';
  }
  
  // FVG parcial: candle do meio tem corpo grande na direção
  const c2Body = Math.abs(c2.close - c2.open);
  const c2Range = c2.high - c2.low;
  const isStrongCandle = c2Body > c2Range * 0.6; // Corpo > 60% do range
  
  if (isStrongCandle) {
    if (c2.close > c2.open && c3.low > c1.close) return 'bullish';
    if (c2.close < c2.open && c3.high < c1.close) return 'bearish';
  }
  
  return 'none';
}

// Detectar zona premium/discount
function detectZone(candles: Candle[], index: number): 'premium' | 'discount' | 'equilibrium' {
  if (index < 50) return 'equilibrium';
  
  const lookback = candles.slice(index - 50, index);
  const highest = Math.max(...lookback.map(c => c.high));
  const lowest = Math.min(...lookback.map(c => c.low));
  const range = highest - lowest;
  const midpoint = lowest + range / 2;
  const current = candles[index].close;
  
  const premium = midpoint + range * 0.2;
  const discount = midpoint - range * 0.2;
  
  if (current > premium) return 'premium';
  if (current < discount) return 'discount';
  return 'equilibrium';
}

// Analisar estado SMC de um candle
function analyzeSMCState(candles: Candle[], index: number): SMCState {
  return {
    trend: detectTrend(candles, index),
    sweep: detectSweep(candles, index),
    structure: detectStructure(candles, index),
    fvg: detectFVG(candles, index),
    zone: detectZone(candles, index)
  };
}

// Verificar se setup é válido (SISTEMA DE PONTUAÇÃO FLEXÍVEL)
function isValidSetup(state: SMCState, direction: 'LONG' | 'SHORT'): { valid: boolean; score: number } {
  let score = 0;
  
  if (direction === 'LONG') {
    // Sweep de liquidez (25 pontos)
    if (state.sweep === 'low') score += 25;
    
    // Estrutura bullish (30 pontos)
    if (state.structure === 'choch_up') score += 30;
    else if (state.structure === 'bos_up') score += 25;
    
    // FVG bullish (25 pontos)
    if (state.fvg === 'bullish') score += 25;
    
    // Zona discount (15 pontos)
    if (state.zone === 'discount') score += 15;
    else if (state.zone === 'equilibrium') score += 5;
    
    // Tendência bullish (bonus 10 pontos)
    if (state.trend === 'bullish') score += 10;
  } else {
    // SHORT - critérios inversos
    if (state.sweep === 'high') score += 25;
    
    if (state.structure === 'choch_down') score += 30;
    else if (state.structure === 'bos_down') score += 25;
    
    if (state.fvg === 'bearish') score += 25;
    
    if (state.zone === 'premium') score += 15;
    else if (state.zone === 'equilibrium') score += 5;
    
    if (state.trend === 'bearish') score += 10;
  }
  
  // Válido se tiver pelo menos 40 pontos (mínimo 2 critérios relevantes)
  return { valid: score >= 40, score };
}

// Gerar padrão ID
function generatePatternId(state: SMCState, session: string): string {
  return `${state.sweep}_${state.structure}_${state.fvg}_${state.zone}_${session}`;
}

// Detectar sessão de trading
function getTradingSession(timestamp: number): string {
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  
  if (hour >= 0 && hour < 8) return 'asia';
  if (hour >= 8 && hour < 13) return 'london';
  if (hour >= 13 && hour < 21) return 'newyork';
  return 'asia';
}

// Simular trade no histórico
function simulateTrade(
  candles: Candle[], 
  setup: TradeSetup
): { result: 'WIN' | 'LOSS' | 'PENDING'; rrAchieved: number } {
  const { index, direction, entry, sl, tp } = setup;
  
  // Verificar nos próximos candles
  for (let i = index + 1; i < Math.min(index + 100, candles.length); i++) {
    const candle = candles[i];
    
    if (direction === 'LONG') {
      // Stop Loss atingido
      if (candle.low <= sl) {
        return { result: 'LOSS', rrAchieved: 0 };
      }
      // Take Profit atingido
      if (candle.high >= tp) {
        const profit = tp - entry;
        const risk = entry - sl;
        return { result: 'WIN', rrAchieved: profit / risk };
      }
    } else {
      // SHORT
      if (candle.high >= sl) {
        return { result: 'LOSS', rrAchieved: 0 };
      }
      if (candle.low <= tp) {
        const profit = entry - tp;
        const risk = sl - entry;
        return { result: 'WIN', rrAchieved: profit / risk };
      }
    }
  }
  
  return { result: 'PENDING', rrAchieved: 0 };
}

// Calcular recompensa multi-fator
function calculateReward(
  result: 'WIN' | 'LOSS',
  rrAchieved: number,
  mtfAligned: boolean,
  entryQuality: number
): number {
  // Base: resultado (60%)
  let reward = result === 'WIN' ? 1.0 : -1.0;
  
  if (result === 'WIN') {
    // Bonus R:R (20%)
    if (rrAchieved >= 5) reward += 0.5;
    else if (rrAchieved >= 3) reward += 0.3;
    else if (rrAchieved >= 2) reward += 0.1;
    
    // Bonus alinhamento MTF (10%)
    if (mtfAligned) reward += 0.3;
    
    // Bonus qualidade entrada (10%)
    reward += entryQuality * 0.2;
  }
  
  return reward;
}

// Verificar alinhamento multi-timeframe
function checkMTFAlignment(
  allData: Map<string, { candles: Candle[]; state: SMCState }>,
  direction: 'LONG' | 'SHORT'
): boolean {
  let aligned = 0;
  
  for (const [tf, data] of allData) {
    if (direction === 'LONG' && data.state.trend === 'bullish') aligned++;
    if (direction === 'SHORT' && data.state.trend === 'bearish') aligned++;
  }
  
  return aligned >= 4; // 4 de 6 timeframes alinhados
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { symbol = 'BTCUSDT', userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ia-historical-training] Iniciando pré-treinamento para ${symbol}`);

    // Métricas de progresso
    let totalCandles = 0;
    let setupsDetected = 0;
    let tradesSimulated = 0;
    let wins = 0;
    let losses = 0;
    let patternsLearned = new Set<string>();

    // Buscar dados históricos de todos os timeframes
    const allTimeframeData = new Map<string, Candle[]>();
    
    for (const tf of TIMEFRAMES) {
      console.log(`[ia-historical-training] Buscando ${tf}...`);
      const candles = await fetchBinanceKlines(symbol, tf, CANDLES_PER_TF[tf]);
      allTimeframeData.set(tf, candles);
      totalCandles += candles.length;
      
      // Rate limit Binance
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[ia-historical-training] ${totalCandles} candles carregados`);

    // Processar timeframe principal (15m) para encontrar setups
    const mainCandles = allTimeframeData.get('15m')!;
    const patternRewards: Map<string, { wins: number; losses: number; reward: number }> = new Map();

    // DIVIDIR: 80% para treinamento, 20% para validação
    const trainingEnd = Math.floor((mainCandles.length - 100) * 0.8);
    const validationStart = trainingEnd;
    
    console.log(`[ia-historical-training] Treinamento: índice 50 a ${trainingEnd}, Validação: ${validationStart} a ${mainCandles.length - 100}`);

    // ========== FASE 1: TREINAMENTO (80%) ==========
    // Contadores de estados SMC para debug
    let smcStats = { sweepHigh: 0, sweepLow: 0, bosUp: 0, bosDown: 0, chochUp: 0, chochDown: 0, fvgBull: 0, fvgBear: 0, premium: 0, discount: 0 };
    
    for (let i = 50; i < trainingEnd; i++) {
      const currentCandle = mainCandles[i];
      const state = analyzeSMCState(mainCandles, i);
      const session = getTradingSession(currentCandle.time);
      
      // Contabilizar estados para debug
      if (state.sweep === 'high') smcStats.sweepHigh++;
      if (state.sweep === 'low') smcStats.sweepLow++;
      if (state.structure === 'bos_up') smcStats.bosUp++;
      if (state.structure === 'bos_down') smcStats.bosDown++;
      if (state.structure === 'choch_up') smcStats.chochUp++;
      if (state.structure === 'choch_down') smcStats.chochDown++;
      if (state.fvg === 'bullish') smcStats.fvgBull++;
      if (state.fvg === 'bearish') smcStats.fvgBear++;
      if (state.zone === 'premium') smcStats.premium++;
      if (state.zone === 'discount') smcStats.discount++;
      
      // Verificar setup LONG
      const longSetup = isValidSetup(state, 'LONG');
      if (longSetup.valid) {
        setupsDetected++;
        
        // Calcular entry, SL, TP
        const entry = currentCandle.close;
        const atr = calculateATR(mainCandles.slice(i - 14, i));
        const sl = entry - atr * 1.5;
        const tp = entry + atr * 3;
        const rr = (tp - entry) / (entry - sl);
        
        // Preparar dados MTF para verificar alinhamento
        const mtfStates = new Map<string, { candles: Candle[]; state: SMCState }>();
        for (const [tf, candles] of allTimeframeData) {
          const tfIndex = findCorrespondingIndex(candles, currentCandle.time);
          if (tfIndex > 0) {
            mtfStates.set(tf, { candles, state: analyzeSMCState(candles, tfIndex) });
          }
        }
        
        const mtfAligned = checkMTFAlignment(mtfStates, 'LONG');
        const pattern = generatePatternId(state, session);
        
        const setup: TradeSetup = {
          index: i,
          direction: 'LONG',
          entry,
          sl,
          tp,
          rr,
          pattern,
          mtfAligned
        };
        
        // Simular trade
        const { result, rrAchieved } = simulateTrade(mainCandles, setup);
        
        if (result !== 'PENDING') {
          tradesSimulated++;
          if (result === 'WIN') wins++;
          else losses++;
          
          // Calcular recompensa (usar score do setup como qualidade)
          const entryQuality = longSetup.score / 100;
          const reward = calculateReward(result, rrAchieved, mtfAligned, entryQuality);
          
          // Acumular para o padrão
          if (!patternRewards.has(pattern)) {
            patternRewards.set(pattern, { wins: 0, losses: 0, reward: 0 });
          }
          const pr = patternRewards.get(pattern)!;
          if (result === 'WIN') pr.wins++;
          else pr.losses++;
          pr.reward += reward;
          
          patternsLearned.add(pattern);
        }
      }
      
      // Verificar setup SHORT
      const shortSetup = isValidSetup(state, 'SHORT');
      if (shortSetup.valid) {
        setupsDetected++;
        
        const entry = currentCandle.close;
        const atr = calculateATR(mainCandles.slice(i - 14, i));
        const sl = entry + atr * 1.5;
        const tp = entry - atr * 3;
        const rr = (entry - tp) / (sl - entry);
        
        const mtfStates = new Map<string, { candles: Candle[]; state: SMCState }>();
        for (const [tf, candles] of allTimeframeData) {
          const tfIndex = findCorrespondingIndex(candles, currentCandle.time);
          if (tfIndex > 0) {
            mtfStates.set(tf, { candles, state: analyzeSMCState(candles, tfIndex) });
          }
        }
        
        const mtfAligned = checkMTFAlignment(mtfStates, 'SHORT');
        const pattern = generatePatternId(state, session);
        
        const setup: TradeSetup = {
          index: i,
          direction: 'SHORT',
          entry,
          sl,
          tp,
          rr,
          pattern,
          mtfAligned
        };
        
        const { result, rrAchieved } = simulateTrade(mainCandles, setup);
        
        if (result !== 'PENDING') {
          tradesSimulated++;
          if (result === 'WIN') wins++;
          else losses++;
          
          const entryQuality = shortSetup.score / 100;
          const reward = calculateReward(result, rrAchieved, mtfAligned, entryQuality);
          
          if (!patternRewards.has(pattern)) {
            patternRewards.set(pattern, { wins: 0, losses: 0, reward: 0 });
          }
          const pr = patternRewards.get(pattern)!;
          if (result === 'WIN') pr.wins++;
          else pr.losses++;
          pr.reward += reward;
          
          patternsLearned.add(pattern);
        }
      }
    }

    // Log de estados SMC detectados
    console.log(`[ia-historical-training] Estados SMC detectados:`);
    console.log(`  Sweeps: High=${smcStats.sweepHigh}, Low=${smcStats.sweepLow}`);
    console.log(`  Estruturas: BOS_UP=${smcStats.bosUp}, BOS_DOWN=${smcStats.bosDown}, CHOCH_UP=${smcStats.chochUp}, CHOCH_DOWN=${smcStats.chochDown}`);
    console.log(`  FVGs: Bullish=${smcStats.fvgBull}, Bearish=${smcStats.fvgBear}`);
    console.log(`  Zonas: Premium=${smcStats.premium}, Discount=${smcStats.discount}`);

    // ========== FASE 2: VALIDAÇÃO (20%) COM IA TREINADA ==========
    let validationWins = 0;
    let validationLosses = 0;
    let validationTrades = 0;

    console.log(`[ia-historical-training] Iniciando validação com ${patternRewards.size} padrões aprendidos...`);

    for (let i = validationStart; i < mainCandles.length - 100; i++) {
      const currentCandle = mainCandles[i];
      const state = analyzeSMCState(mainCandles, i);
      const session = getTradingSession(currentCandle.time);
      const pattern = generatePatternId(state, session);

      // Consultar padrão aprendido
      const learned = patternRewards.get(pattern);
      
      // SÓ OPERAR se padrão foi aprendido com taxa_acerto >= 55%
      if (!learned || (learned.wins + learned.losses) < 3) continue;
      
      const learnedWinRate = learned.wins / (learned.wins + learned.losses);
      if (learnedWinRate < 0.55) continue; // Ignorar padrões ruins

      // Verificar setup válido (usando sistema de pontuação)
      let direction: 'LONG' | 'SHORT' | null = null;
      const longCheck = isValidSetup(state, 'LONG');
      const shortCheck = isValidSetup(state, 'SHORT');
      
      if (longCheck.valid) direction = 'LONG';
      else if (shortCheck.valid) direction = 'SHORT';
      
      if (!direction) continue;

      const entry = currentCandle.close;
      const atr = calculateATR(mainCandles.slice(i - 14, i));
      const sl = direction === 'LONG' ? entry - atr * 1.5 : entry + atr * 1.5;
      const tp = direction === 'LONG' ? entry + atr * 3 : entry - atr * 3;
      const rr = direction === 'LONG' ? (tp - entry) / (entry - sl) : (entry - tp) / (sl - entry);

      const setup: TradeSetup = {
        index: i,
        direction,
        entry,
        sl,
        tp,
        rr,
        pattern,
        mtfAligned: true
      };

      const { result } = simulateTrade(mainCandles, setup);

      if (result !== 'PENDING') {
        validationTrades++;
        if (result === 'WIN') validationWins++;
        else validationLosses++;
      }
    }

    console.log(`[ia-historical-training] Validação: ${validationWins}W/${validationLosses}L em ${validationTrades} trades`);

    console.log(`[ia-historical-training] ${tradesSimulated} trades simulados, ${wins}W/${losses}L`);

    // Salvar padrões aprendidos no banco
    for (const [pattern, data] of patternRewards) {
      const total = data.wins + data.losses;
      const taxaAcerto = total > 0 ? (data.wins / total) * 100 : 50;
      
      const { error } = await supabase
        .from('ia_learning_patterns')
        .upsert({
          user_id: userId,
          padrao_id: pattern,
          wins: data.wins,
          losses: data.losses,
          vezes_testado: total,
          taxa_acerto: taxaAcerto,
          recompensa_acumulada: data.reward,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,padrao_id' });
      
      if (error) {
        console.error(`[ia-historical-training] Erro ao salvar padrão ${pattern}:`, error);
      }
    }

    // Calcular métricas finais
    const winRate = tradesSimulated > 0 ? (wins / tradesSimulated) * 100 : 0;
    
    // Top padrões
    const sortedPatterns = Array.from(patternRewards.entries())
      .map(([pattern, data]) => ({
        pattern,
        ...data,
        winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0
      }))
      .sort((a, b) => b.reward - a.reward);
    
    const topPatterns = sortedPatterns.slice(0, 5);
    const worstPatterns = sortedPatterns.slice(-3).reverse();

    // Calcular win rate da validação
    const validationWinRate = validationTrades > 0 ? (validationWins / validationTrades) * 100 : 0;

    // ========== SALVAR MODELO EM ia_model_weights ==========
    console.log(`[ia-historical-training] Salvando modelo treinado em ia_model_weights...`);
    
    // Construir pattern_weights (Q-values por padrão)
    const patternWeights: Record<string, { qValue: number; winRate: number; trades: number }> = {};
    for (const [pattern, data] of patternRewards) {
      const total = data.wins + data.losses;
      const wr = total > 0 ? (data.wins / total) * 100 : 50;
      patternWeights[pattern] = {
        qValue: data.reward,
        winRate: wr,
        trades: total,
      };
    }
    
    // Identificar padrões congelados (>= 10 trades E WR >= 60%)
    const frozenPatterns = sortedPatterns
      .filter(p => (p.wins + p.losses) >= 10 && p.winRate >= 60)
      .map(p => p.pattern);
    
    // Calcular confiança geral (média ponderada pelo número de trades)
    let totalWeightedWR = 0;
    let totalWeight = 0;
    for (const [_, data] of patternRewards) {
      const total = data.wins + data.losses;
      if (total >= 3) {
        const wr = (data.wins / total) * 100;
        totalWeightedWR += wr * total;
        totalWeight += total;
      }
    }
    const overallConfidence = totalWeight > 0 ? totalWeightedWR / totalWeight : 50;
    
    // Determinar se modelo está pronto para produção
    // Critérios: validationWinRate >= 50% E tradesSimulated >= 50
    const isProductionReady = validationWinRate >= 50 && tradesSimulated >= 50;
    
    // Desativar modelos anteriores
    await supabase
      .from('ia_model_weights')
      .update({ is_current: false })
      .eq('user_id', userId)
      .eq('is_current', true);
    
    // Salvar novo modelo
    const { data: savedModel, error: modelError } = await supabase
      .from('ia_model_weights')
      .insert({
        user_id: userId,
        version: 1,
        is_current: true,
        is_production: isProductionReady,
        model_name: `RL_Model_${new Date().toISOString().split('T')[0]}`,
        pattern_weights: patternWeights,
        frozen_patterns: frozenPatterns,
        confidence_level: overallConfidence,
        train_trades: tradesSimulated,
        train_winrate: winRate,
        validation_trades: validationTrades,
        validation_winrate: validationWinRate,
        training_config: {
          symbol,
          timeframes: TIMEFRAMES,
          trainingRatio: 0.8,
          minSetupScore: 40,
          minPatternTrades: 3,
        },
      })
      .select()
      .single();
    
    if (modelError) {
      console.error(`[ia-historical-training] Erro ao salvar modelo:`, modelError);
    } else {
      console.log(`[ia-historical-training] ✅ Modelo salvo com sucesso!`);
      console.log(`  - Confiança: ${overallConfidence.toFixed(1)}%`);
      console.log(`  - Pronto para produção: ${isProductionReady ? 'SIM' : 'NÃO'}`);
      console.log(`  - Padrões congelados: ${frozenPatterns.length}`);
    }

    const report = {
      success: true,
      metrics: {
        totalCandles,
        setupsDetected,
        tradesSimulated,
        wins,
        losses,
        winRate: winRate.toFixed(1),
        patternsLearned: patternsLearned.size
      },
      validation: {
        wins: validationWins,
        losses: validationLosses,
        winRate: validationWinRate.toFixed(1),
        tradesValidated: validationTrades
      },
      model: {
        confidence: overallConfidence.toFixed(1),
        isProductionReady,
        frozenPatterns: frozenPatterns.length,
        modelId: savedModel?.id || null,
      },
      topPatterns: topPatterns.map(p => ({
        pattern: p.pattern,
        winRate: p.winRate.toFixed(1),
        trades: p.wins + p.losses
      })),
      worstPatterns: worstPatterns.map(p => ({
        pattern: p.pattern,
        winRate: p.winRate.toFixed(1),
        trades: p.wins + p.losses
      })),
      message: `Treinamento concluído! ${patternsLearned.size} padrões aprendidos com ${tradesSimulated} trades simulados (${winRate.toFixed(1)}% WR). Validação: ${validationWins}W/${validationLosses}L (${validationWinRate.toFixed(1)}% WR). Modelo ${isProductionReady ? 'APROVADO' : 'em treinamento'}.`
    };

    console.log(`[ia-historical-training] Concluído:`, report.message);

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[ia-historical-training] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Calcular ATR (Average True Range)
function calculateATR(candles: Candle[]): number {
  if (candles.length < 2) return 0;
  
  let sum = 0;
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    sum += tr;
  }
  
  return sum / (candles.length - 1);
}

// Encontrar índice correspondente em outro timeframe
function findCorrespondingIndex(candles: Candle[], targetTime: number): number {
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].time <= targetTime) {
      return i;
    }
  }
  return -1;
}
