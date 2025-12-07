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

    console.log(`[EXECUTE-ORDER] Processando ordem para ${user.id}: ${direction} ${asset}`);

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
    if (settings.balance < 100) {
      throw new Error('Saldo insuficiente para operar (mínimo $100)');
    }

    // 5. Validar R:R mínimo de 3:1 (Metodologia Trader Raiz)
    if (risk_reward < 3.0) {
      console.log(`[EXECUTE-ORDER] ⚠️ R:R ${risk_reward} abaixo do mínimo 3:1 - ABORTANDO`);
      throw new Error(`R:R muito baixo (1:${risk_reward.toFixed(2)}). Mínimo Trader Raiz: 1:3.0`);
    }

    // 6. Calcular tamanho da posição
    // risk_per_trade já está em decimal (ex: 0.06 = 6%)
    const riskPercentage = settings.risk_per_trade < 1 ? settings.risk_per_trade : settings.risk_per_trade / 100;
    const riskAmount = settings.balance * riskPercentage;
    const stopDistance = Math.abs(entry_price - stop_loss);
    const quantity = (riskAmount / stopDistance) * settings.leverage;
    const projectedProfit = quantity * Math.abs(take_profit - entry_price);

    console.log(`[EXECUTE-ORDER] Risco: ${riskPercentage * 100}% = $${riskAmount.toFixed(2)}`);
    console.log(`[EXECUTE-ORDER] Quantidade calculada: ${quantity.toFixed(6)} | Lucro projetado: $${projectedProfit.toFixed(2)}`);

    // 7. Executar ordem (Paper Mode ou Real Mode)
    let executedPrice = entry_price;
    let orderId = `PAPER_${Date.now()}`;

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

      // Decrypt credentials usando o mesmo método de sync-real-balance
      const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const apiKey = atob(credentials.encrypted_api_key).replace(`${masterKey}:`, '');
      const apiSecret = atob(credentials.encrypted_api_secret).replace(`${masterKey}:`, '');

      console.log(`[EXECUTE-ORDER] Executando ordem REAL na Binance FUTURES...`);

      // Preparar parâmetros para FUTURES API
      const timestamp = Date.now();
      
      // Formatar símbolo para futures (remover possível sufixo se necessário)
      const futuresSymbol = asset.toUpperCase();
      
      // Calcular quantidade com precisão adequada para BTC (3 casas decimais)
      const formattedQuantity = quantity.toFixed(3);
      
      const params = new URLSearchParams({
        symbol: futuresSymbol,
        side: direction === 'LONG' ? 'BUY' : 'SELL',
        type: 'MARKET',
        quantity: formattedQuantity,
        timestamp: timestamp.toString(),
      });

      // Criar assinatura HMAC-SHA256 correta
      const signature = await createBinanceSignature(params.toString(), apiSecret);
      params.append('signature', signature);

      console.log(`[EXECUTE-ORDER] Endpoint: fapi.binance.com/fapi/v1/order`);
      console.log(`[EXECUTE-ORDER] Params: ${params.toString().replace(signature, 'SIG_HIDDEN')}`);

      // Usar FUTURES endpoint (fapi) em vez de SPOT (api)
      const binanceResponse = await fetch(`https://fapi.binance.com/fapi/v1/order?${params}`, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      });

      const binanceData = await binanceResponse.json();

      if (!binanceResponse.ok) {
        console.error('[EXECUTE-ORDER] Binance error:', binanceData);
        throw new Error(`Binance error: ${binanceData.msg || JSON.stringify(binanceData)}`);
      }

      orderId = binanceData.orderId?.toString() || `REAL_${Date.now()}`;
      executedPrice = parseFloat(binanceData.avgPrice || binanceData.price || entry_price);

      console.log(`[EXECUTE-ORDER] ✅ Ordem REAL executada na Binance FUTURES: ${orderId}`);
    } else {
      console.log(`[EXECUTE-ORDER] Ordem PAPER simulada`);
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

    // 10. Log de execução
    await supabase.from('agent_logs').insert({
      user_id: user.id,
      agent_name: 'TRADER_RAIZ_EXECUTOR',
      status: 'SUCCESS',
      asset,
      data: {
        orderId,
        executedPrice,
        quantity: parseFloat(quantity.toFixed(6)),
        direction,
        paperMode: settings.paper_mode,
        riskReward: risk_reward,
        checklist: checklist || null,
      },
    });

    console.log(`[EXECUTE-ORDER] ✅ Ordem executada com sucesso: ${position.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        positionId: position.id,
        orderId,
        executedPrice,
        quantity: parseFloat(quantity.toFixed(6)),
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
