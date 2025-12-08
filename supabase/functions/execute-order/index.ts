import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface para checklist Trader Raiz
interface TraderRaizChecklist {
  swingsMapped: boolean;
  trendDefined: boolean;
  trendDirection: "ALTA" | "BAIXA" | "NEUTRO";
  structureBroken: boolean;
  structurePrice: number | null;
  zoneCorrect: boolean;
  zoneName: string;
  manipulationIdentified: boolean;
  orderBlockLocated: boolean;
  orderBlockRange: string;
  riskRewardValid: boolean;
  riskRewardValue: number;
  entryConfirmed: boolean;
  allCriteriaMet: boolean;
  conclusion: "ENTRADA VÁLIDA" | "AGUARDAR" | "ANULAR";
}

// Função para criar assinatura HMAC-SHA256 correta para Binance
async function createBinanceSignature(queryString: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const msgData = encoder.encode(queryString);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Função para configurar alavancagem na Binance
async function setLeverage(apiKey: string, apiSecret: string, symbol: string, leverage: number): Promise<boolean> {
  try {
    const timestamp = Date.now();
    const params = new URLSearchParams({
      symbol: symbol,
      leverage: leverage.toString(),
      timestamp: timestamp.toString(),
    });
    
    const signature = await createBinanceSignature(params.toString(), apiSecret);
    params.append('signature', signature);
    
    const response = await fetch(`https://fapi.binance.com/fapi/v1/leverage?${params}`, {
      method: 'POST',
      headers: { 'X-MBX-APIKEY': apiKey },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`[LEVERAGE] ⚠️ Erro ao configurar alavancagem: ${data.msg}`);
      return false;
    }
    
    console.log(`[LEVERAGE] ✅ Alavancagem configurada: ${data.leverage}x para ${symbol}`);
    return true;
  } catch (error) {
    console.error('[LEVERAGE] Erro:', error);
    return false;
  }
}

// Constantes para BTCUSDT FUTURES
const MIN_QUANTITY_BTC = 0.001; // Quantidade mínima para BTCUSDT
const QUANTITY_PRECISION = 3;   // Casas decimais para quantidade
const MARGIN_BUFFER = 0.85;     // 85% do saldo disponível (15% buffer para taxas/margem manutenção)
const OPENING_FEE_RATE = 0.0004; // 0.04% taxa de abertura Binance Futures

// Função para buscar saldo real da Binance FUTURES
async function getRealBinanceBalance(apiKey: string, apiSecret: string): Promise<number> {
  try {
    const timestamp = Date.now();
    const params = new URLSearchParams({
      timestamp: timestamp.toString(),
    });
    
    const signature = await createBinanceSignature(params.toString(), apiSecret);
    params.append('signature', signature);
    
    const response = await fetch(`https://fapi.binance.com/fapi/v2/balance?${params}`, {
      method: 'GET',
      headers: { 'X-MBX-APIKEY': apiKey },
    });
    
    if (!response.ok) {
      console.log('[BINANCE-BALANCE] ⚠️ Erro ao buscar saldo real');
      return 0;
    }
    
    const balances = await response.json();
    const usdtBalance = balances.find((b: any) => b.asset === 'USDT');
    
    if (usdtBalance) {
      const availableBalance = parseFloat(usdtBalance.availableBalance || usdtBalance.balance || '0');
      console.log(`[BINANCE-BALANCE] ✅ Saldo REAL disponível: $${availableBalance.toFixed(2)} USDT`);
      return availableBalance;
    }
    
    return 0;
  } catch (error) {
    console.error('[BINANCE-BALANCE] Erro:', error);
    return 0;
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

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Não autenticado');
    }

    const { asset, direction, entry_price, stop_loss, take_profit, risk_reward, signal_data, checklist } = await req.json();

    console.log(`[EXECUTE-ORDER] ==========================================`);
    console.log(`[EXECUTE-ORDER] Processando ordem para ${user.id}`);
    console.log(`[EXECUTE-ORDER] ${direction} ${asset} @ ${entry_price}`);
    console.log(`[EXECUTE-ORDER] SL: ${stop_loss} | TP: ${take_profit} | R:R: 1:${risk_reward}`);

    // VALIDAR CHECKLIST TRADER RAIZ (8 CRITÉRIOS)
    if (checklist) {
      console.log(`[EXECUTE-ORDER] Validando Pre-List Trader Raiz...`);
      
      const checklistStatus = checklist as TraderRaizChecklist;
      
      if (!checklistStatus.allCriteriaMet) {
        console.log(`[EXECUTE-ORDER] ❌ Pre-List não passou: ${checklistStatus.conclusion}`);
        throw new Error(`Pre-List Trader Raiz: ${checklistStatus.conclusion}. Critérios não satisfeitos.`);
      }
      
      console.log(`[EXECUTE-ORDER] ✅ Pre-List passou: ${checklistStatus.conclusion}`);
    }

    // 1. Validar bot_status e configurações
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('bot_status, paper_mode, balance, risk_per_trade, leverage, max_positions')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      throw new Error('Configurações do usuário não encontradas');
    }

    if (settings.bot_status !== 'running') {
      throw new Error(`Bot não está em execução (status: ${settings.bot_status})`);
    }

    // 2. Verificar se já existe posição no mesmo ativo
    const { data: existingPosition } = await supabase
      .from('active_positions')
      .select('id')
      .eq('user_id', user.id)
      .eq('asset', asset)
      .single();

    if (existingPosition) {
      throw new Error('Já existe uma posição aberta neste ativo');
    }

    // 3. Verificar max_positions
    const { count } = await supabase
      .from('active_positions')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id);

    if (count && count >= settings.max_positions) {
      throw new Error(`Número máximo de posições atingido (${settings.max_positions})`);
    }

    // 4. Validar saldo mínimo
    if (settings.balance < 10) {
      throw new Error('Saldo insuficiente para operar (mínimo $10)');
    }

    // 5. Validar R:R mínimo de 3:1 (Metodologia Trader Raiz)
    if (risk_reward < 3.0) {
      console.log(`[EXECUTE-ORDER] ⚠️ R:R ${risk_reward} abaixo do mínimo 3:1 - ABORTANDO`);
      throw new Error(`R:R muito baixo (1:${risk_reward.toFixed(2)}). Mínimo Trader Raiz: 1:3.0`);
    }

    // ========================================
    // 6. OBTER CREDENCIAIS E SALDO REAL DA BINANCE
    // ========================================
    
    let realBinanceBalance = 0;
    let apiKey = '';
    let apiSecret = '';
    
    if (!settings.paper_mode) {
      // Buscar credenciais da Binance
      const { data: credentials } = await supabase
        .from('user_api_credentials')
        .select('encrypted_api_key, encrypted_api_secret')
        .eq('user_id', user.id)
        .eq('broker_type', 'binance')
        .eq('is_active', true)
        .single();

      if (!credentials) {
        throw new Error('Credenciais da Binance não configuradas');
      }

      // Decrypt credentials
      const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      apiKey = atob(credentials.encrypted_api_key).replace(`${masterKey}:`, '');
      apiSecret = atob(credentials.encrypted_api_secret).replace(`${masterKey}:`, '');
      
      // Buscar saldo REAL da Binance
      console.log(`[EXECUTE-ORDER] 🔍 Consultando saldo REAL da Binance...`);
      realBinanceBalance = await getRealBinanceBalance(apiKey, apiSecret);
      
      if (realBinanceBalance < 10) {
        throw new Error(`Saldo insuficiente na Binance ($${realBinanceBalance.toFixed(2)} USDT). Mínimo: $10`);
      }
    }

    // ========================================
    // 7. CÁLCULO CORRETO PARA USDT-M FUTURES
    // ========================================
    
    // Usar saldo REAL da Binance em modo real, senão usar saldo do banco
    const balanceUSDT = !settings.paper_mode && realBinanceBalance > 0 
      ? realBinanceBalance 
      : settings.balance;
    
    const leverage = settings.leverage || 20;
    
    // risk_per_trade já está em decimal (ex: 0.10 = 10%)
    const riskPercentage = settings.risk_per_trade < 1 
      ? settings.risk_per_trade 
      : settings.risk_per_trade / 100;
    
    // Risco em USDT
    const riskAmountUSDT = balanceUSDT * riskPercentage;
    
    // Distância do Stop Loss em USDT (valor absoluto)
    const stopDistanceUSDT = Math.abs(entry_price - stop_loss);
    
    // FÓRMULA CORRETA: Quantity = Risco USDT / Distância SL USDT
    let quantityBTC = riskAmountUSDT / stopDistanceUSDT;
    
    // Calcular valores para verificação de margem COM TAXA DE ABERTURA
    const notionalValueUSDT = quantityBTC * entry_price;
    const openingFeeUSDT = notionalValueUSDT * OPENING_FEE_RATE; // Taxa de 0.04%
    const requiredMarginUSDT = (notionalValueUSDT / leverage) + openingFeeUSDT;
    const availableMarginUSDT = balanceUSDT * MARGIN_BUFFER; // 85% do saldo
    
    console.log(`[EXECUTE-ORDER] ==========================================`);
    console.log(`[EXECUTE-ORDER] 📊 CÁLCULO DE POSIÇÃO USDT-M FUTURES:`);
    console.log(`[EXECUTE-ORDER] Saldo LOCAL: $${settings.balance.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Saldo BINANCE REAL: $${realBinanceBalance.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Saldo USADO: $${balanceUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Risco: ${(riskPercentage * 100).toFixed(1)}% = $${riskAmountUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Entry: $${entry_price} | SL: $${stop_loss}`);
    console.log(`[EXECUTE-ORDER] Distância SL: $${stopDistanceUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Quantity inicial: ${quantityBTC.toFixed(6)} BTC`);
    console.log(`[EXECUTE-ORDER] Nocional: $${notionalValueUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Taxa abertura (0.04%): $${openingFeeUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Margem requerida (c/taxa): $${requiredMarginUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Margem disponível (${MARGIN_BUFFER * 100}%): $${availableMarginUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Alavancagem: ${leverage}x`);
    
    // ========================================
    // 8. REDUÇÃO AUTOMÁTICA SE MARGEM INSUFICIENTE
    // ========================================
    
    let adjustmentAttempts = 0;
    const MAX_ADJUSTMENT_ATTEMPTS = 5;
    
    while (requiredMarginUSDT > availableMarginUSDT && adjustmentAttempts < MAX_ADJUSTMENT_ATTEMPTS) {
      adjustmentAttempts++;
      console.log(`[EXECUTE-ORDER] ⚠️ Margem insuficiente! Tentativa ${adjustmentAttempts}/${MAX_ADJUSTMENT_ATTEMPTS} - Reduzindo quantidade em 10%...`);
      
      // Reduzir quantidade em 10%
      quantityBTC = quantityBTC * 0.9;
      
      // Recalcular margem
      const newNotional = quantityBTC * entry_price;
      const newOpeningFee = newNotional * OPENING_FEE_RATE;
      const newRequiredMargin = (newNotional / leverage) + newOpeningFee;
      
      console.log(`[EXECUTE-ORDER] Nova quantity: ${quantityBTC.toFixed(6)} BTC`);
      console.log(`[EXECUTE-ORDER] Novo nocional: $${newNotional.toFixed(2)} USDT`);
      console.log(`[EXECUTE-ORDER] Nova margem requerida: $${newRequiredMargin.toFixed(2)} USDT`);
      
      if (newRequiredMargin <= availableMarginUSDT) {
        console.log(`[EXECUTE-ORDER] ✅ Margem suficiente após ajuste!`);
        break;
      }
    }
    
    // Se ainda não couber após 5 tentativas, calcular o máximo possível
    if (adjustmentAttempts >= MAX_ADJUSTMENT_ATTEMPTS) {
      console.log(`[EXECUTE-ORDER] 🔧 Calculando quantidade máxima possível...`);
      
      // Máximo nocional possível: margem disponível * leverage (descontando taxa)
      // notional = margin * leverage
      // requiredMargin = notional/leverage + notional*0.0004
      // margin = notional/leverage + notional*0.0004
      // margin = notional * (1/leverage + 0.0004)
      // notional = margin / (1/leverage + 0.0004)
      const maxNotionalUSDT = availableMarginUSDT / (1/leverage + OPENING_FEE_RATE);
      quantityBTC = maxNotionalUSDT / entry_price;
      
      console.log(`[EXECUTE-ORDER] Nocional máximo possível: $${maxNotionalUSDT.toFixed(2)} USDT`);
      console.log(`[EXECUTE-ORDER] Quantity máxima: ${quantityBTC.toFixed(6)} BTC`);
    }
    
    // Formatar quantidade para Binance (3 casas decimais, mínimo 0.001)
    quantityBTC = Math.floor(quantityBTC * Math.pow(10, QUANTITY_PRECISION)) / Math.pow(10, QUANTITY_PRECISION);
    
    // Verificar quantidade mínima
    if (quantityBTC < MIN_QUANTITY_BTC) {
      console.log(`[EXECUTE-ORDER] ❌ Quantidade muito pequena: ${quantityBTC} BTC`);
      throw new Error(`Quantidade muito pequena (${quantityBTC.toFixed(6)} BTC). Mínimo: ${MIN_QUANTITY_BTC} BTC. Aumente o saldo ou o risco por trade.`);
    }
    
    // Calcular lucro/perda projetados com quantidade final
    const finalNotional = quantityBTC * entry_price;
    const finalMarginRequired = (finalNotional / leverage) + (finalNotional * OPENING_FEE_RATE);
    const projectedProfit = quantityBTC * Math.abs(take_profit - entry_price);
    const projectedLoss = quantityBTC * stopDistanceUSDT;
    
    console.log(`[EXECUTE-ORDER] ==========================================`);
    console.log(`[EXECUTE-ORDER] ✅ QUANTIDADE FINAL: ${quantityBTC.toFixed(QUANTITY_PRECISION)} BTC`);
    console.log(`[EXECUTE-ORDER] Nocional final: $${finalNotional.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Margem final requerida: $${finalMarginRequired.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Margem disponível: $${availableMarginUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Perda máxima (SL): $${projectedLoss.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Lucro projetado (TP): $${projectedProfit.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Ajustes realizados: ${adjustmentAttempts}`);
    console.log(`[EXECUTE-ORDER] ==========================================`);

    // 9. Executar ordem (Paper Mode ou Real Mode)
    let executedPrice = entry_price;
    let orderId = `PAPER_${Date.now()}`;

    if (!settings.paper_mode) {
      // Credenciais já foram obtidas anteriormente para buscar saldo real
      if (!apiKey || !apiSecret) {
        throw new Error('Credenciais da Binance não disponíveis');
      }

      const futuresSymbol = asset.toUpperCase();

      // Configurar alavancagem na Binance antes de executar ordem
      console.log(`[EXECUTE-ORDER] Configurando alavancagem ${leverage}x na Binance...`);
      await setLeverage(apiKey, apiSecret, futuresSymbol, leverage);

      console.log(`[EXECUTE-ORDER] Executando ordem REAL na Binance FUTURES...`);

      // Preparar parâmetros para FUTURES API
      const timestamp = Date.now();
      const formattedQuantity = quantityBTC.toFixed(QUANTITY_PRECISION);
      
      const params = new URLSearchParams({
        symbol: futuresSymbol,
        side: direction === 'LONG' ? 'BUY' : 'SELL',
        type: 'MARKET',
        quantity: formattedQuantity,
        timestamp: timestamp.toString(),
      });

      // Criar assinatura HMAC-SHA256
      const signature = await createBinanceSignature(params.toString(), apiSecret);
      params.append('signature', signature);

      console.log(`[EXECUTE-ORDER] Endpoint: fapi.binance.com/fapi/v1/order`);
      console.log(`[EXECUTE-ORDER] Symbol: ${futuresSymbol} | Side: ${direction === 'LONG' ? 'BUY' : 'SELL'} | Qty: ${formattedQuantity}`);

      // Usar FUTURES endpoint (fapi)
      const binanceResponse = await fetch(`https://fapi.binance.com/fapi/v1/order?${params}`, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      });

      const binanceData = await binanceResponse.json();

      if (!binanceResponse.ok) {
        console.error('[EXECUTE-ORDER] ❌ Binance error:', JSON.stringify(binanceData));
        throw new Error(`Binance error: ${binanceData.msg || JSON.stringify(binanceData)}`);
      }

      orderId = binanceData.orderId?.toString() || `REAL_${Date.now()}`;
      executedPrice = parseFloat(binanceData.avgPrice || binanceData.price || entry_price);

      console.log(`[EXECUTE-ORDER] ✅ Ordem REAL executada na Binance FUTURES!`);
      console.log(`[EXECUTE-ORDER] Order ID: ${orderId}`);
      console.log(`[EXECUTE-ORDER] Preço executado: $${executedPrice}`);
    } else {
      console.log(`[EXECUTE-ORDER] 📝 Ordem PAPER simulada`);
    }

    // 8. Registrar em active_positions
    const { data: position, error: positionError } = await supabase
      .from('active_positions')
      .insert({
        user_id: user.id,
        asset,
        direction,
        entry_price: executedPrice,
        current_price: executedPrice,
        stop_loss,
        take_profit,
        risk_reward,
        projected_profit: projectedProfit,
        agents: signal_data,
        session: signal_data?.session || 'UNKNOWN',
      })
      .select()
      .single();

    if (positionError) {
      throw new Error(`Erro ao registrar posição: ${positionError.message}`);
    }

    // 9. Registrar em operations
    const { error: operationError } = await supabase
      .from('operations')
      .insert({
        user_id: user.id,
        asset,
        direction,
        entry_price: executedPrice,
        entry_time: new Date().toISOString(),
        stop_loss,
        take_profit,
        risk_reward,
        result: 'OPEN',
        strategy: 'TRADER_RAIZ_SMC',
        agents: signal_data,
        session: signal_data?.session || 'UNKNOWN',
      });

    if (operationError) {
      console.error('[EXECUTE-ORDER] Erro ao registrar operação:', operationError);
    }

    // 10. Log de execução detalhado
    await supabase.from('agent_logs').insert({
      user_id: user.id,
      agent_name: 'TRADER_RAIZ_EXECUTOR',
      status: 'SUCCESS',
      asset,
      data: {
        orderId,
        executedPrice,
        quantity: quantityBTC,
        direction,
        paperMode: settings.paper_mode,
        riskReward: risk_reward,
        calculation: {
          balanceUSDT,
          riskPercentage: riskPercentage * 100,
          riskAmountUSDT,
          stopDistanceUSDT,
          leverage,
          projectedLoss,
          projectedProfit,
        },
        checklist: checklist || null,
      },
    });

    console.log(`[EXECUTE-ORDER] ✅ Ordem executada com sucesso: ${position.id}`);
    console.log(`[EXECUTE-ORDER] ==========================================`);

    return new Response(
      JSON.stringify({
        success: true,
        positionId: position.id,
        orderId,
        executedPrice,
        quantity: quantityBTC,
        projectedProfit,
        projectedLoss,
        message: `Ordem ${direction} executada em ${asset}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[EXECUTE-ORDER] ❌ Erro:', error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
