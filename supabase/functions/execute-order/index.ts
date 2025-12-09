import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para determinar sessão de trading baseada no horário UTC
function getTradingSession(): string {
  const hour = new Date().getUTCHours();
  if (hour >= 22 || hour < 7) return 'OCEANIA';
  if (hour >= 7 && hour < 9) return 'ASIA';
  if (hour >= 9 && hour < 13) return 'LONDON';
  return 'NY';
}

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

// Constantes de margem (aplicável a todos os pares)
const MARGIN_BUFFER = 0.85;     // 85% do saldo disponível (15% buffer para taxas/margem manutenção)
const OPENING_FEE_RATE = 0.0004; // 0.04% taxa de abertura Binance Futures

// Interface para regras de trading da Binance
interface ExchangeInfo {
  symbol: string;
  minQty: number;
  maxQty: number;
  stepSize: number;
  marketMinQty: number;
  marketMaxQty: number;
  minPrice: number;
  maxPrice: number;
  tickSize: number;
  minNotional: number;
  quantityPrecision: number;
  pricePrecision: number;
}

// Buscar regras de trading da Binance FUTURES para o símbolo
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
    
    // Extrair LOT_SIZE (quantidade)
    const lotSizeFilter = filters.find((f: any) => f.filterType === 'LOT_SIZE') || {};
    const marketLotSizeFilter = filters.find((f: any) => f.filterType === 'MARKET_LOT_SIZE') || {};
    
    // Extrair PRICE_FILTER (preços)
    const priceFilter = filters.find((f: any) => f.filterType === 'PRICE_FILTER') || {};
    
    // Extrair MIN_NOTIONAL (valor mínimo em USDT)
    const minNotionalFilter = filters.find((f: any) => f.filterType === 'MIN_NOTIONAL') || {};
    
    const exchangeInfo: ExchangeInfo = {
      symbol: symbolInfo.symbol,
      minQty: parseFloat(lotSizeFilter.minQty || '0.001'),
      maxQty: parseFloat(lotSizeFilter.maxQty || '1000'),
      stepSize: parseFloat(lotSizeFilter.stepSize || '0.001'),
      marketMinQty: parseFloat(marketLotSizeFilter.minQty || '0.001'),
      marketMaxQty: parseFloat(marketLotSizeFilter.maxQty || '1000'),
      minPrice: parseFloat(priceFilter.minPrice || '0.01'),
      maxPrice: parseFloat(priceFilter.maxPrice || '1000000'),
      tickSize: parseFloat(priceFilter.tickSize || '0.01'),
      minNotional: parseFloat(minNotionalFilter.notional || '5'),
      quantityPrecision: symbolInfo.quantityPrecision || 3,
      pricePrecision: symbolInfo.pricePrecision || 2,
    };
    
    console.log(`[EXCHANGE-INFO] ✅ Regras para ${symbol}:`);
    console.log(`  - minQty: ${exchangeInfo.minQty}`);
    console.log(`  - maxQty: ${exchangeInfo.maxQty}`);
    console.log(`  - stepSize: ${exchangeInfo.stepSize}`);
    console.log(`  - tickSize: ${exchangeInfo.tickSize}`);
    console.log(`  - minNotional: $${exchangeInfo.minNotional}`);
    console.log(`  - quantityPrecision: ${exchangeInfo.quantityPrecision}`);
    console.log(`  - pricePrecision: ${exchangeInfo.pricePrecision}`);
    
    return exchangeInfo;
  } catch (error) {
    console.error(`[EXCHANGE-INFO] ❌ Erro:`, error);
    
    // Retornar valores padrão para BTCUSDT se falhar
    console.log(`[EXCHANGE-INFO] Usando valores padrão para ${symbol}`);
    return {
      symbol,
      minQty: 0.001,
      maxQty: 1000,
      stepSize: 0.001,
      marketMinQty: 0.001,
      marketMaxQty: 1000,
      minPrice: 0.01,
      maxPrice: 1000000,
      tickSize: 0.10,
      minNotional: 5,
      quantityPrecision: 3,
      pricePrecision: 2,
    };
  }
}

// Arredondar quantidade para stepSize (sempre arredonda para BAIXO para segurança)
function roundToStepSize(quantity: number, stepSize: number, precision: number): number {
  const factor = 1 / stepSize;
  const rounded = Math.floor(quantity * factor) / factor;
  return parseFloat(rounded.toFixed(precision));
}

// Arredondar preço para tickSize (arredonda para o tick mais próximo)
function roundToTickSize(price: number, tickSize: number, precision: number): number {
  const factor = 1 / tickSize;
  const rounded = Math.round(price * factor) / factor;
  return parseFloat(rounded.toFixed(precision));
}

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

    // 2. 🚨 NOVA REGRA: Verificar se já existe QUALQUER posição aberta (qualquer par)
    // Só permite UMA posição aberta por vez no sistema inteiro
    const { data: existingPositions, error: posError } = await supabase
      .from('active_positions')
      .select('id, asset')
      .eq('user_id', user.id);

    if (existingPositions && existingPositions.length > 0) {
      const openAssets = existingPositions.map(p => p.asset).join(', ');
      console.log(`[EXECUTE-ORDER] ❌ BLOQUEADO: Já existe posição aberta em: ${openAssets}`);
      throw new Error(`Já existe posição aberta em: ${openAssets}. Feche a posição atual antes de abrir uma nova.`);
    }

    console.log(`[EXECUTE-ORDER] ✅ Nenhuma posição aberta - permitido continuar`);

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
      // Buscar credenciais da Binance COM STATUS DE VALIDAÇÃO
      const { data: credentials } = await supabase
        .from('user_api_credentials')
        .select('encrypted_api_key, encrypted_api_secret, test_status')
        .eq('user_id', user.id)
        .eq('broker_type', 'binance')
        .eq('is_active', true)
        .single();

      if (!credentials) {
        throw new Error('Credenciais da Binance não configuradas. Configure em Configurações.');
      }

      // 🔒 VALIDAR QUE CREDENCIAIS ESTÃO TESTADAS COM SUCESSO
      if (credentials.test_status !== 'success') {
        console.log(`[EXECUTE-ORDER] ❌ Credenciais Binance não validadas: ${credentials.test_status}`);
        throw new Error(`Credenciais Binance não validadas (status: ${credentials.test_status}). Teste sua conexão em Configurações.`);
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
    // 7. BUSCAR REGRAS DE TRADING DA BINANCE (exchangeInfo)
    // ========================================
    
    const futuresSymbol = asset.toUpperCase();
    const exchangeInfo = await getExchangeInfo(futuresSymbol);
    
    // Arredondar preços para tickSize
    const validatedEntryPrice = roundToTickSize(entry_price, exchangeInfo.tickSize, exchangeInfo.pricePrecision);
    const validatedStopLoss = roundToTickSize(stop_loss, exchangeInfo.tickSize, exchangeInfo.pricePrecision);
    const validatedTakeProfit = roundToTickSize(take_profit, exchangeInfo.tickSize, exchangeInfo.pricePrecision);
    
    console.log(`[EXECUTE-ORDER] 💱 Preços validados (tickSize: ${exchangeInfo.tickSize}):`);
    console.log(`  - Entry: ${entry_price} → ${validatedEntryPrice}`);
    console.log(`  - SL: ${stop_loss} → ${validatedStopLoss}`);
    console.log(`  - TP: ${take_profit} → ${validatedTakeProfit}`);

    // ========================================
    // 8. CÁLCULO CORRETO PARA USDT-M FUTURES
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
    
    // ========================================
    // 🛡️ PROTEÇÃO DE MARGEM MÁXIMA (baseada na % configurada pelo usuário)
    // ========================================
    
    // CORREÇÃO: Usar saldo LOCAL (configurado pelo usuário) para calcular margem máxima
    // Isso garante que cada trade use no MÁXIMO X% do capital configurado
    const localBalance = settings.balance; // Saldo LOCAL ($151.81)
    const maxMarginAllowedUSDT = localBalance * riskPercentage; // 10% de $151.81 = $15.18
    
    console.log(`[EXECUTE-ORDER] ==========================================`);
    console.log(`[EXECUTE-ORDER] 🛡️ PROTEÇÃO DE MARGEM MÁXIMA ATIVA:`);
    console.log(`[EXECUTE-ORDER] Limite de margem: ${(riskPercentage * 100).toFixed(1)}% = $${maxMarginAllowedUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] ==========================================`);
    
    // Calcular valores iniciais para verificação de margem COM TAXA DE ABERTURA
    let notionalValueUSDT = quantityBTC * entry_price;
    let openingFeeUSDT = notionalValueUSDT * OPENING_FEE_RATE; // Taxa de 0.04%
    let requiredMarginUSDT = (notionalValueUSDT / leverage) + openingFeeUSDT;
    const availableMarginUSDT = balanceUSDT * MARGIN_BUFFER; // 85% do saldo (backup)
    
    console.log(`[EXECUTE-ORDER] 📊 CÁLCULO DE POSIÇÃO USDT-M FUTURES:`);
    console.log(`[EXECUTE-ORDER] Saldo LOCAL: $${settings.balance.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Saldo BINANCE REAL: $${realBinanceBalance.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Saldo USADO: $${balanceUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Risco configurado: ${(riskPercentage * 100).toFixed(1)}% = $${riskAmountUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Entry: $${entry_price} | SL: $${stop_loss}`);
    console.log(`[EXECUTE-ORDER] Distância SL: $${stopDistanceUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Quantity INICIAL (baseada no risco): ${quantityBTC.toFixed(6)} BTC`);
    console.log(`[EXECUTE-ORDER] Nocional INICIAL: $${notionalValueUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Taxa abertura (0.04%): $${openingFeeUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Margem REQUERIDA (c/taxa): $${requiredMarginUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Margem MÁXIMA PERMITIDA: $${maxMarginAllowedUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Alavancagem: ${leverage}x`);
    
    // ========================================
    // 🛡️ APLICAR PROTEÇÃO: Limitar margem à % configurada pelo usuário
    // ========================================
    
    let marginProtectionApplied = false;
    
    if (requiredMarginUSDT > maxMarginAllowedUSDT) {
      marginProtectionApplied = true;
      console.log(`[EXECUTE-ORDER] ==========================================`);
      console.log(`[EXECUTE-ORDER] 🛡️ PROTEÇÃO DE MARGEM ATIVADA!`);
      console.log(`[EXECUTE-ORDER] Margem calculada: $${requiredMarginUSDT.toFixed(2)} > Limite: $${maxMarginAllowedUSDT.toFixed(2)}`);
      
      // Recalcular quantidade baseado na margem máxima permitida
      // notional = (margin - fee) * leverage
      // Mas fee depende de notional, então precisamos resolver:
      // margin = notional/leverage + notional*0.0004
      // margin = notional * (1/leverage + 0.0004)
      // notional = margin / (1/leverage + 0.0004)
      const maxNotionalForMargin = maxMarginAllowedUSDT / (1/leverage + OPENING_FEE_RATE);
      quantityBTC = maxNotionalForMargin / entry_price;
      
      // Recalcular valores com quantidade ajustada
      notionalValueUSDT = quantityBTC * entry_price;
      openingFeeUSDT = notionalValueUSDT * OPENING_FEE_RATE;
      requiredMarginUSDT = (notionalValueUSDT / leverage) + openingFeeUSDT;
      
      // Calcular o novo risco REAL (pode ser menor que o configurado)
      const newRiskReal = quantityBTC * stopDistanceUSDT;
      const newRiskPercent = (newRiskReal / balanceUSDT) * 100;
      
      console.log(`[EXECUTE-ORDER] ✅ Quantity AJUSTADA: ${quantityBTC.toFixed(6)} BTC`);
      console.log(`[EXECUTE-ORDER] Novo nocional: $${notionalValueUSDT.toFixed(2)} USDT`);
      console.log(`[EXECUTE-ORDER] Nova margem: $${requiredMarginUSDT.toFixed(2)} USDT (dentro do limite!)`);
      console.log(`[EXECUTE-ORDER] Novo risco REAL: $${newRiskReal.toFixed(2)} USDT (${newRiskPercent.toFixed(2)}%)`);
      console.log(`[EXECUTE-ORDER] ⚠️ Risco foi reduzido de ${(riskPercentage * 100).toFixed(1)}% para ${newRiskPercent.toFixed(2)}% para caber na margem`);
      console.log(`[EXECUTE-ORDER] ==========================================`);
    }
    
    // ========================================
    // 9. VERIFICAÇÃO DE SEGURANÇA ADICIONAL (85% buffer)
    // ========================================
    
    let adjustmentAttempts = 0;
    const MAX_ADJUSTMENT_ATTEMPTS = 5;
    
    while (requiredMarginUSDT > availableMarginUSDT && adjustmentAttempts < MAX_ADJUSTMENT_ATTEMPTS) {
      adjustmentAttempts++;
      console.log(`[EXECUTE-ORDER] ⚠️ Margem ainda excede buffer de segurança! Tentativa ${adjustmentAttempts}/${MAX_ADJUSTMENT_ATTEMPTS} - Reduzindo quantidade em 10%...`);
      
      // Reduzir quantidade em 10%
      quantityBTC = quantityBTC * 0.9;
      
      // Recalcular margem
      notionalValueUSDT = quantityBTC * entry_price;
      openingFeeUSDT = notionalValueUSDT * OPENING_FEE_RATE;
      requiredMarginUSDT = (notionalValueUSDT / leverage) + openingFeeUSDT;
      
      console.log(`[EXECUTE-ORDER] Nova quantity: ${quantityBTC.toFixed(6)} BTC`);
      console.log(`[EXECUTE-ORDER] Novo nocional: $${notionalValueUSDT.toFixed(2)} USDT`);
      console.log(`[EXECUTE-ORDER] Nova margem requerida: $${requiredMarginUSDT.toFixed(2)} USDT`);
      
      if (requiredMarginUSDT <= availableMarginUSDT) {
        console.log(`[EXECUTE-ORDER] ✅ Margem dentro do buffer de segurança!`);
        break;
      }
    }
    
    // Se ainda não couber após 5 tentativas, calcular o máximo possível
    if (adjustmentAttempts >= MAX_ADJUSTMENT_ATTEMPTS) {
      console.log(`[EXECUTE-ORDER] 🔧 Calculando quantidade máxima possível baseada no buffer de segurança...`);
      
      const maxNotionalUSDT = availableMarginUSDT / (1/leverage + OPENING_FEE_RATE);
      quantityBTC = maxNotionalUSDT / entry_price;
      
      console.log(`[EXECUTE-ORDER] Nocional máximo possível: $${maxNotionalUSDT.toFixed(2)} USDT`);
      console.log(`[EXECUTE-ORDER] Quantity máxima: ${quantityBTC.toFixed(6)} BTC`);
    }
    
    // ========================================
    // 10. VALIDAR QUANTIDADE COM exchangeInfo
    // ========================================
    
    // Arredondar quantidade para stepSize
    quantityBTC = roundToStepSize(quantityBTC, exchangeInfo.stepSize, exchangeInfo.quantityPrecision);
    
    // Verificar quantidade mínima (usar maior entre marketMinQty e minQty)
    const effectiveMinQty = Math.max(exchangeInfo.minQty, exchangeInfo.marketMinQty);
    
    if (quantityBTC < effectiveMinQty) {
      console.log(`[EXECUTE-ORDER] ❌ Quantidade muito pequena: ${quantityBTC} (min: ${effectiveMinQty})`);
      throw new Error(`Quantidade muito pequena (${quantityBTC}). Mínimo: ${effectiveMinQty}. Aumente o saldo ou o risco por trade.`);
    }
    
    // Verificar quantidade máxima
    const effectiveMaxQty = Math.min(exchangeInfo.maxQty, exchangeInfo.marketMaxQty);
    if (quantityBTC > effectiveMaxQty) {
      console.log(`[EXECUTE-ORDER] ⚠️ Quantidade acima do máximo. Reduzindo de ${quantityBTC} para ${effectiveMaxQty}`);
      quantityBTC = effectiveMaxQty;
    }
    
    // Verificar minNotional (valor mínimo em USDT)
    const calculatedNotional = quantityBTC * validatedEntryPrice;
    if (calculatedNotional < exchangeInfo.minNotional) {
      console.log(`[EXECUTE-ORDER] ❌ Nocional muito baixo: $${calculatedNotional.toFixed(2)} (min: $${exchangeInfo.minNotional})`);
      throw new Error(`Valor nocional muito baixo ($${calculatedNotional.toFixed(2)}). Mínimo: $${exchangeInfo.minNotional}. Aumente o saldo ou o risco por trade.`);
    }
    
    // Calcular lucro/perda projetados com quantidade final
    const finalNotional = quantityBTC * validatedEntryPrice;
    const finalMarginRequired = (finalNotional / leverage) + (finalNotional * OPENING_FEE_RATE);
    const projectedProfit = quantityBTC * Math.abs(validatedTakeProfit - validatedEntryPrice);
    const projectedLoss = quantityBTC * stopDistanceUSDT;
    
    console.log(`[EXECUTE-ORDER] ==========================================`);
    console.log(`[EXECUTE-ORDER] ✅ VALIDAÇÃO COMPLETA COM exchangeInfo:`);
    console.log(`[EXECUTE-ORDER] Quantity final: ${quantityBTC.toFixed(exchangeInfo.quantityPrecision)} (stepSize: ${exchangeInfo.stepSize})`);
    console.log(`[EXECUTE-ORDER] Nocional final: $${finalNotional.toFixed(2)} USDT (min: $${exchangeInfo.minNotional})`);
    console.log(`[EXECUTE-ORDER] Margem final requerida: $${finalMarginRequired.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Margem disponível: $${availableMarginUSDT.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Perda máxima (SL): $${projectedLoss.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Lucro projetado (TP): $${projectedProfit.toFixed(2)} USDT`);
    console.log(`[EXECUTE-ORDER] Ajustes realizados: ${adjustmentAttempts}`);
    console.log(`[EXECUTE-ORDER] ==========================================`);

    // 11. Executar ordem (Paper Mode ou Real Mode)
    let executedPrice = validatedEntryPrice;
    let orderId = `PAPER_${Date.now()}`;

    if (!settings.paper_mode) {
      // Credenciais já foram obtidas anteriormente para buscar saldo real
      if (!apiKey || !apiSecret) {
        throw new Error('Credenciais da Binance não disponíveis');
      }

      // Configurar alavancagem na Binance antes de executar ordem
      console.log(`[EXECUTE-ORDER] Configurando alavancagem ${leverage}x na Binance...`);
      await setLeverage(apiKey, apiSecret, futuresSymbol, leverage);

      console.log(`[EXECUTE-ORDER] Executando ordem REAL na Binance FUTURES...`);

      // Preparar parâmetros para FUTURES API
      const timestamp = Date.now();
      const formattedQuantity = quantityBTC.toFixed(exchangeInfo.quantityPrecision);
      
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

    // 12. Registrar em active_positions (usar preços validados)
    // CORREÇÃO: Mapear direction LONG→BUY, SHORT→SELL para cumprir constraint do banco
    const dbDirection = direction === 'LONG' ? 'BUY' : 'SELL';
    const validSession = signal_data?.session && ['OCEANIA', 'ASIA', 'LONDON', 'NY'].includes(signal_data.session)
      ? signal_data.session
      : getTradingSession();

    console.log(`[EXECUTE-ORDER] 📝 Registrando posição - direction: ${direction} → ${dbDirection}, session: ${validSession}`);

    const { data: position, error: positionError } = await supabase
      .from('active_positions')
      .insert({
        user_id: user.id,
        asset,
        direction: dbDirection,
        entry_price: executedPrice,
        current_price: executedPrice,
        stop_loss: validatedStopLoss,
        take_profit: validatedTakeProfit,
        risk_reward,
        projected_profit: projectedProfit,
        agents: signal_data,
        session: validSession,
      })
      .select()
      .single();

    if (positionError) {
      console.error(`[EXECUTE-ORDER] ❌ Erro ao registrar posição:`, positionError);
      throw new Error(`Erro ao registrar posição: ${positionError.message}`);
    }

    console.log(`[EXECUTE-ORDER] ✅ Posição registrada com sucesso: ${position.id}`);

    // 13. Registrar em operations (usar preços validados)
    // CORREÇÃO: Mesmo mapeamento de direction e session
    const { error: operationError } = await supabase
      .from('operations')
      .insert({
        user_id: user.id,
        asset,
        direction: dbDirection,
        entry_price: executedPrice,
        entry_time: new Date().toISOString(),
        stop_loss: validatedStopLoss,
        take_profit: validatedTakeProfit,
        risk_reward,
        result: 'OPEN',
        strategy: 'TRADER_RAIZ_SMC',
        agents: signal_data,
        session: validSession,
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
