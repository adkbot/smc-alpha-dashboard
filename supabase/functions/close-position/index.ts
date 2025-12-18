import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface para regras de trading da Binance
interface ExchangeInfo {
  symbol: string;
  minQty: number;
  maxQty: number;
  stepSize: number;
  quantityPrecision: number;
  pricePrecision: number;
  tickSize: number;
}

// Buscar regras de trading da Binance FUTURES
async function getExchangeInfo(symbol: string): Promise<ExchangeInfo> {
  try {
    console.log(`[EXCHANGE-INFO] Buscando regras para ${symbol}...`);
    
    const response = await fetch(`https://fapi.binance.com/fapi/v1/exchangeInfo?symbol=${symbol}`);
    
    if (!response.ok) {
      throw new Error(`Falha ao buscar exchangeInfo: ${response.status}`);
    }
    
    const data = await response.json();
    const symbolInfo = data.symbols?.find((s: any) => s.symbol === symbol);
    
    if (!symbolInfo) {
      throw new Error(`Símbolo ${symbol} não encontrado na Binance`);
    }
    
    const filters = symbolInfo.filters || [];
    const lotSizeFilter = filters.find((f: any) => f.filterType === 'LOT_SIZE') || {};
    const priceFilter = filters.find((f: any) => f.filterType === 'PRICE_FILTER') || {};
    
    const exchangeInfo: ExchangeInfo = {
      symbol: symbolInfo.symbol,
      minQty: parseFloat(lotSizeFilter.minQty || '0.001'),
      maxQty: parseFloat(lotSizeFilter.maxQty || '1000'),
      stepSize: parseFloat(lotSizeFilter.stepSize || '0.001'),
      quantityPrecision: symbolInfo.quantityPrecision || 3,
      pricePrecision: symbolInfo.pricePrecision || 2,
      tickSize: parseFloat(priceFilter.tickSize || '0.01'),
    };
    
    console.log(`[EXCHANGE-INFO] ✅ Regras: stepSize=${exchangeInfo.stepSize}, quantityPrecision=${exchangeInfo.quantityPrecision}`);
    
    return exchangeInfo;
  } catch (error) {
    console.error(`[EXCHANGE-INFO] ❌ Erro:`, error);
    return {
      symbol,
      minQty: 0.001,
      maxQty: 1000,
      stepSize: 0.001,
      quantityPrecision: 3,
      pricePrecision: 2,
      tickSize: 0.10,
    };
  }
}

// Arredondar quantidade para stepSize
function roundToStepSize(quantity: number, stepSize: number, precision: number): number {
  const factor = 1 / stepSize;
  const rounded = Math.floor(quantity * factor) / factor;
  return parseFloat(rounded.toFixed(precision));
}

// Função para criar assinatura HMAC-SHA256 (igual ao execute-order)
async function createBinanceSignature(queryString: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(queryString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

// ==================== SISTEMA IA EVOLUTIVA COM REPLAY BUFFER ====================

interface TradeContext {
  sweepType: string;
  structureType: string;
  fvgType: string;
  zoneType: string;
  sessionType: string;
  obStrength: number;
  rrRatio: number;
  mtfAligned?: boolean;
  waitedForConfirmation?: boolean;
  consecutiveLosses?: number;
}

interface RewardBreakdown {
  total: number;
  pnl: number;
  discipline: number;
  context: number;
  penalties: number;
  drawdown: number;
}

// 🎯 REWARD FUNCTION AVANÇADA (NÍVEL HUMANO)
function calculateAdvancedReward(
  resultado: 'WIN' | 'LOSS',
  pnl: number,
  rrAchieved: number,
  contexto: TradeContext
): RewardBreakdown {
  // 1️⃣ PNL BASE (40% do peso)
  const pnlReward = resultado === 'WIN' ? 1.0 : -1.0;
  
  // 2️⃣ BÔNUS DE DISCIPLINA (+0.5 cada)
  let disciplineBonus = 0;
  if (contexto.mtfAligned) disciplineBonus += 0.5;
  if (rrAchieved >= 2.0) disciplineBonus += 0.5;
  if (rrAchieved >= 3.0) disciplineBonus += 0.3;
  if (contexto.waitedForConfirmation) disciplineBonus += 0.3;
  
  // 3️⃣ BÔNUS DE CONTEXTO (+0.3-0.4 cada)
  let contextBonus = 0;
  // Zona correta (discount pra LONG, premium pra SHORT)
  if (contexto.zoneType === 'discount' || contexto.zoneType === 'premium') contextBonus += 0.3;
  // Sweep antes da entrada
  if (contexto.sweepType && contexto.sweepType !== 'none') contextBonus += 0.4;
  // FVG presente
  if (contexto.fvgType && contexto.fvgType !== 'none') contextBonus += 0.2;
  // Estrutura confirmada
  if (contexto.structureType && contexto.structureType !== 'none') contextBonus += 0.3;
  
  // 4️⃣ PENALIDADES (-0.5 a -1.0)
  let penalties = 0;
  // Revenge trading (múltiplos losses seguidos)
  if (contexto.consecutiveLosses && contexto.consecutiveLosses >= 2) penalties -= 0.5;
  if (contexto.consecutiveLosses && contexto.consecutiveLosses >= 3) penalties -= 0.8;
  
  // Sessão ruim (Oceania geralmente tem menos liquidez)
  const badSessions = ['oceania'];
  if (badSessions.includes(contexto.sessionType?.toLowerCase() || '')) penalties -= 0.2;
  
  // 5️⃣ DRAWDOWN PENALTY (baseado em OB strength como proxy)
  let drawdownPenalty = 0;
  if (contexto.obStrength && contexto.obStrength < 30) drawdownPenalty -= 0.3;
  
  // REWARD FINAL
  const totalReward = pnlReward + (resultado === 'WIN' ? disciplineBonus + contextBonus : 0) + penalties + drawdownPenalty;
  
  return {
    total: totalReward,
    pnl: pnlReward,
    discipline: disciplineBonus,
    context: contextBonus,
    penalties,
    drawdown: drawdownPenalty,
  };
}

// Calcular scores de qualidade (0-100)
function calculateScores(contexto: TradeContext, rrAchieved: number): { discipline: number; context: number; quality: number } {
  // Discipline score
  let discipline = 50;
  if (contexto.mtfAligned) discipline += 20;
  if (rrAchieved >= 2) discipline += 15;
  if (rrAchieved >= 3) discipline += 10;
  if (contexto.waitedForConfirmation) discipline += 5;
  discipline = Math.min(discipline, 100);
  
  // Context score
  let context = 50;
  if (contexto.sweepType && contexto.sweepType !== 'none') context += 15;
  if (contexto.structureType && contexto.structureType !== 'none') context += 15;
  if (contexto.fvgType && contexto.fvgType !== 'none') context += 10;
  if (contexto.zoneType === 'discount' || contexto.zoneType === 'premium') context += 10;
  context = Math.min(context, 100);
  
  // Entry quality (média ponderada)
  const quality = (discipline * 0.5) + (context * 0.5);
  
  return { discipline, context, quality };
}

// Aplicar recompensa ao sistema de aprendizado + SALVAR NO REPLAY BUFFER
async function aplicarRecompensa(
  supabase: any,
  userId: string,
  resultado: 'WIN' | 'LOSS',
  contexto: TradeContext,
  operationData: {
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    direction: string;
    rrTarget: number;
  }
): Promise<void> {
  try {
    // Construir padrao_id combinado (5 partes)
    const padraoId = `${contexto.sweepType || 'none'}_${contexto.structureType || 'none'}_${contexto.fvgType || 'none'}_${contexto.zoneType || 'none'}_${contexto.sessionType?.toLowerCase() || 'unknown'}`;
    
    // Calcular RR atingido
    const rrAchieved = resultado === 'WIN' ? operationData.rrTarget : 0;
    
    // 🎯 CALCULAR REWARD AVANÇADO
    const rewardBreakdown = calculateAdvancedReward(resultado, operationData.pnl, rrAchieved, contexto);
    const scores = calculateScores(contexto, rrAchieved);
    
    console.log(`[IA-LEARNING] 🧠 Aplicando recompensa avançada:`);
    console.log(`  - Padrão: ${padraoId}`);
    console.log(`  - Resultado: ${resultado} | PnL: $${operationData.pnl.toFixed(2)}`);
    console.log(`  - Reward Total: ${rewardBreakdown.total.toFixed(2)} (PnL: ${rewardBreakdown.pnl}, Disc: ${rewardBreakdown.discipline.toFixed(2)}, Ctx: ${rewardBreakdown.context.toFixed(2)}, Pen: ${rewardBreakdown.penalties})`);
    console.log(`  - Scores: Discipline=${scores.discipline}%, Context=${scores.context}%, Quality=${scores.quality}%`);
    
    // 1. Verificar se padrão já existe
    const { data: existingPattern } = await supabase
      .from('ia_learning_patterns')
      .select('*')
      .eq('user_id', userId)
      .eq('padrao_id', padraoId)
      .single();
    
    if (existingPattern) {
      // Atualizar padrão existente
      const newWins = resultado === 'WIN' ? existingPattern.wins + 1 : existingPattern.wins;
      const newLosses = resultado === 'LOSS' ? existingPattern.losses + 1 : existingPattern.losses;
      const newVezes = existingPattern.vezes_testado + 1;
      const newRecompensa = existingPattern.recompensa_acumulada + rewardBreakdown.total;
      const newTaxaAcerto = newVezes > 0 ? (newWins / newVezes) * 100 : 50;
      
      await supabase
        .from('ia_learning_patterns')
        .update({
          recompensa_acumulada: newRecompensa,
          vezes_testado: newVezes,
          wins: newWins,
          losses: newLosses,
          taxa_acerto: newTaxaAcerto,
          ultimo_uso: new Date().toISOString(),
        })
        .eq('id', existingPattern.id);
      
      console.log(`[IA-LEARNING] ✅ Padrão atualizado: taxa_acerto=${newTaxaAcerto.toFixed(1)}% (${newWins}W/${newLosses}L)`);
    } else {
      // Criar novo padrão
      const newWins = resultado === 'WIN' ? 1 : 0;
      const newLosses = resultado === 'LOSS' ? 1 : 0;
      const newTaxaAcerto = resultado === 'WIN' ? 100 : 0;
      
      await supabase
        .from('ia_learning_patterns')
        .insert({
          user_id: userId,
          padrao_id: padraoId,
          recompensa_acumulada: rewardBreakdown.total,
          vezes_testado: 1,
          wins: newWins,
          losses: newLosses,
          taxa_acerto: newTaxaAcerto,
        });
      
      console.log(`[IA-LEARNING] ✅ Novo padrão criado: ${padraoId}`);
    }
    
    // 2. Salvar contexto detalhado do trade (ia_trade_context)
    await supabase
      .from('ia_trade_context')
      .insert({
        user_id: userId,
        padrao_combinado: padraoId,
        sweep_type: contexto.sweepType,
        structure_type: contexto.structureType,
        fvg_type: contexto.fvgType,
        zone_type: contexto.zoneType,
        session_type: contexto.sessionType,
        ob_strength: contexto.obStrength,
        rr_ratio: rrAchieved,
        entry_price: operationData.entryPrice,
        exit_price: operationData.exitPrice,
        pnl: operationData.pnl,
        resultado: resultado,
      });
    
    // 3. 🆕 SALVAR NO REPLAY BUFFER (memória de experiências)
    const state = {
      sweep: contexto.sweepType,
      structure: contexto.structureType,
      fvg: contexto.fvgType,
      zone: contexto.zoneType,
      session: contexto.sessionType,
      obStrength: contexto.obStrength,
      mtfAligned: contexto.mtfAligned,
    };
    
    const metadata = {
      pattern_id: padraoId,
      rr_target: operationData.rrTarget,
      rr_achieved: rrAchieved,
      mtfAligned: contexto.mtfAligned,
      session: contexto.sessionType,
    };
    
    // Determinar se é ELITE (RR >= 2.0, Discipline >= 80, WIN)
    const isElite = resultado === 'WIN' && rrAchieved >= 2.0 && scores.discipline >= 80;
    
    const { data: savedExperience } = await supabase
      .from('ia_replay_buffer')
      .insert({
        user_id: userId,
        state,
        action: operationData.direction,
        reward: rewardBreakdown.total,
        next_state: null,
        done: true,
        metadata,
        pattern_id: padraoId,
        entry_price: operationData.entryPrice,
        exit_price: operationData.exitPrice,
        pnl: operationData.pnl,
        rr_achieved: rrAchieved,
        entry_quality: scores.quality,
        discipline_score: scores.discipline,
        context_score: scores.context,
        reward_breakdown: rewardBreakdown,
        is_elite: isElite,
        trade_result: resultado,
        session_type: contexto.sessionType,
      })
      .select()
      .single();
    
    console.log(`[IA-LEARNING] ✅ Experiência salva no Replay Buffer${isElite ? ' [ELITE]' : ''}`);
    
    // 4. 🆕 Se ELITE, salvar também no Elite Buffer
    if (isElite && savedExperience) {
      await supabase
        .from('ia_elite_buffer')
        .insert({
          user_id: userId,
          replay_buffer_id: savedExperience.id,
          rr_achieved: rrAchieved,
          discipline_score: scores.discipline,
          mtf_aligned: contexto.mtfAligned || false,
          training_weight: 2.0, // Elite tem 2x peso no treino
        });
      
      console.log(`[IA-LEARNING] 🌟 Trade ELITE salvo no Elite Buffer (RR: ${rrAchieved.toFixed(1)}, Discipline: ${scores.discipline}%)`);
    }
    
    console.log(`[IA-LEARNING] ✅ Contexto do trade salvo para treinamento`);
    
  } catch (error) {
    console.error(`[IA-LEARNING] ❌ Erro ao aplicar recompensa:`, error);
    // Não bloquear fechamento se IA falhar
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { positionId, exitPrice, result, tradeContext } = await req.json();

    console.log(`[CLOSE-POSITION] Fechando posição ${positionId} | Resultado: ${result}`);

    // 1. Buscar dados da posição
    const { data: position, error: positionError } = await supabase
      .from('active_positions')
      .select('*')
      .eq('id', positionId)
      .single();

    if (positionError || !position) {
      throw new Error('Posição não encontrada');
    }

    // 2. Buscar exchangeInfo para validar quantidade
    const symbol = position.asset.replace('/', '').toUpperCase();
    const exchangeInfo = await getExchangeInfo(symbol);

    // 3. Calcular quantidade e PnL final
    const quantity = position.projected_profit / Math.abs(position.take_profit - position.entry_price);
    
    // Arredondar quantidade para stepSize
    const validatedQuantity = roundToStepSize(quantity, exchangeInfo.stepSize, exchangeInfo.quantityPrecision);
    
    let finalPnL = 0;

    if (position.direction === 'LONG' || position.direction === 'BUY') {
      finalPnL = (exitPrice - position.entry_price) * validatedQuantity;
    } else {
      finalPnL = (position.entry_price - exitPrice) * validatedQuantity;
    }

    console.log(`[CLOSE-POSITION] Quantidade original: ${quantity.toFixed(6)}`);
    console.log(`[CLOSE-POSITION] Quantidade validada: ${validatedQuantity} (stepSize: ${exchangeInfo.stepSize})`);
    console.log(`[CLOSE-POSITION] PnL calculado: $${finalPnL.toFixed(2)}`);

    // 4. Buscar configurações do usuário
    const { data: settings } = await supabase
      .from('user_settings')
      .select('paper_mode, balance, ia_learning_enabled')
      .eq('user_id', position.user_id)
      .single();

    // 5. Executar fechamento na Binance FUTURES (se Real Mode)
    let binanceOrderId = `PAPER_CLOSE_${Date.now()}`;

    if (settings && !settings.paper_mode) {
      console.log(`[CLOSE-POSITION] Modo REAL - Executando ordem na Binance FUTURES`);
      
      const { data: credentials } = await supabase
        .from('user_api_credentials')
        .select('encrypted_api_key, encrypted_api_secret')
        .eq('user_id', position.user_id)
        .eq('broker_type', 'binance')
        .eq('is_active', true)
        .single();

      if (credentials) {
        // Decriptação corrigida - remover prefixo masterKey se existir
        let apiKey = '';
        let apiSecret = '';
        
        try {
          const encryptedKey = credentials.encrypted_api_key || '';
          const encryptedSecret = credentials.encrypted_api_secret || '';
          
          const decodedKey = atob(encryptedKey);
          const decodedSecret = atob(encryptedSecret);
          
          if (decodedKey.includes(':')) {
            apiKey = decodedKey.split(':').slice(1).join(':');
          } else {
            apiKey = decodedKey;
          }
          
          if (decodedSecret.includes(':')) {
            apiSecret = decodedSecret.split(':').slice(1).join(':');
          } else {
            apiSecret = decodedSecret;
          }
          
          console.log(`[CLOSE-POSITION] Credenciais decriptadas com sucesso`);
        } catch (decryptError) {
          console.error(`[CLOSE-POSITION] Erro ao decriptar credenciais:`, decryptError);
          throw new Error('Falha ao decriptar credenciais da Binance');
        }

        if (!apiKey || !apiSecret) {
          throw new Error('Credenciais da Binance não encontradas ou inválidas');
        }

        // Preparar parâmetros para ordem FUTURES
        const timestamp = Date.now();
        const side = (position.direction === 'LONG' || position.direction === 'BUY') ? 'SELL' : 'BUY';
        const quantityFormatted = validatedQuantity.toFixed(exchangeInfo.quantityPrecision);
        
        const params = new URLSearchParams({
          symbol: symbol,
          side: side,
          type: 'MARKET',
          quantity: quantityFormatted,
          timestamp: timestamp.toString(),
        });

        // Criar assinatura HMAC-SHA256 correta
        const signature = await createBinanceSignature(params.toString(), apiSecret);
        params.append('signature', signature);

        console.log(`[CLOSE-POSITION] Parâmetros da ordem FUTURES:`, {
          symbol,
          side,
          quantity: quantityFormatted,
          timestamp,
        });

        // Usar endpoint FUTURES correto
        const binanceResponse = await fetch(`https://fapi.binance.com/fapi/v1/order?${params}`, {
          method: 'POST',
          headers: {
            'X-MBX-APIKEY': apiKey,
          },
        });

        const binanceData = await binanceResponse.json();

        if (binanceResponse.ok) {
          binanceOrderId = binanceData.orderId?.toString() || `FUTURES_${Date.now()}`;
          console.log(`[CLOSE-POSITION] ✅ Ordem REAL fechada na Binance FUTURES: ${binanceOrderId}`);
        } else {
          console.error(`[CLOSE-POSITION] ❌ Erro na Binance FUTURES:`, binanceData);
          console.error(`[CLOSE-POSITION] Status: ${binanceResponse.status}`);
          console.error(`[CLOSE-POSITION] Detalhes: code=${binanceData.code}, msg=${binanceData.msg}`);
        }
      } else {
        console.log(`[CLOSE-POSITION] Credenciais Binance não encontradas para usuário`);
      }
    } else {
      console.log(`[CLOSE-POSITION] Modo PAPER - Simulando fechamento`);
    }

    // 6. Deletar de active_positions
    await supabase
      .from('active_positions')
      .delete()
      .eq('id', positionId);

    // 7. Atualizar operations
    const { error: updateError } = await supabase
      .from('operations')
      .update({
        exit_price: exitPrice,
        exit_time: new Date().toISOString(),
        pnl: finalPnL,
        result: result,
      })
      .eq('user_id', position.user_id)
      .eq('asset', position.asset)
      .eq('entry_price', position.entry_price)
      .is('exit_time', null);

    if (updateError) {
      console.error('[CLOSE-POSITION] Erro ao atualizar operations:', updateError);
    }

    // 8. Atualizar user_settings (balance)
    if (settings) {
      const newBalance = settings.balance + finalPnL;
      await supabase
        .from('user_settings')
        .update({ balance: newBalance })
        .eq('user_id', position.user_id);
      
      console.log(`[CLOSE-POSITION] Balance atualizado: $${settings.balance.toFixed(2)} → $${newBalance.toFixed(2)}`);
    }

    // ==================== IA EVOLUTIVA: APLICAR RECOMPENSA ====================
    if (settings?.ia_learning_enabled !== false) {
      const context: TradeContext = tradeContext || {
        sweepType: position.agents?.sweep_type || 'none',
        structureType: position.agents?.structure_type || 'none',
        fvgType: position.agents?.fvg_type || 'none',
        zoneType: position.agents?.zone_type || 'none',
        sessionType: position.session || getTradingSession(),
        obStrength: position.agents?.ob_strength || 0,
        rrRatio: position.risk_reward || 0,
        mtfAligned: position.agents?.mtf_aligned || false,
        waitedForConfirmation: position.agents?.waited_confirmation || true,
      };
      
      await aplicarRecompensa(
        supabase,
        position.user_id,
        result as 'WIN' | 'LOSS',
        context,
        {
          entryPrice: position.entry_price,
          exitPrice: exitPrice,
          pnl: finalPnL,
          direction: position.direction,
          rrTarget: position.risk_reward || 3,
        }
      );
    }

    // 9. Log
    await supabase.from('agent_logs').insert({
      user_id: position.user_id,
      agent_name: 'POSITION_CLOSER',
      status: 'SUCCESS',
      asset: position.asset,
      data: {
        positionId,
        exitPrice,
        pnl: finalPnL,
        result,
        binanceOrderId,
        paperMode: settings?.paper_mode || true,
        quantityValidated: validatedQuantity,
        iaLearningApplied: settings?.ia_learning_enabled !== false,
        exchangeInfo: {
          stepSize: exchangeInfo.stepSize,
          quantityPrecision: exchangeInfo.quantityPrecision,
        },
      },
    });

    console.log(`[CLOSE-POSITION] ✅ Posição fechada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        positionId,
        exitPrice,
        pnl: finalPnL,
        result,
        binanceOrderId,
        iaLearningApplied: settings?.ia_learning_enabled !== false,
        message: `Posição fechada com ${result}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[CLOSE-POSITION] ❌ Erro:', error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});