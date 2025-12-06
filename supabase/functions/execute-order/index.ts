import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { asset, direction, entry_price, stop_loss, take_profit, risk_reward, signal_data } = await req.json();

    console.log(`[EXECUTE-ORDER] Processando ordem para ${user.id}: ${direction} ${asset}`);

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

    // 5. Validar R:R mínimo
    if (risk_reward < 1.5) {
      throw new Error(`R:R muito baixo (${risk_reward}). Mínimo: 1.5`);
    }

    // 6. Calcular tamanho da posição
    const riskAmount = settings.balance * (settings.risk_per_trade / 100);
    const stopDistance = Math.abs(entry_price - stop_loss);
    const quantity = (riskAmount / stopDistance) * settings.leverage;
    const projectedProfit = quantity * Math.abs(take_profit - entry_price);

    console.log(`[EXECUTE-ORDER] Quantidade calculada: ${quantity} | Lucro projetado: $${projectedProfit}`);

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

      // Decrypt credentials (same method as sync-real-balance)
      const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const apiKey = atob(credentials.encrypted_api_key).replace(`${masterKey}:`, '');
      const apiSecret = atob(credentials.encrypted_api_secret).replace(`${masterKey}:`, '');

      // Executar ordem na Binance
      const timestamp = Date.now();
      const params = new URLSearchParams({
        symbol: asset,
        side: direction === 'LONG' ? 'BUY' : 'SELL',
        type: 'MARKET',
        quantity: quantity.toFixed(6),
        timestamp: timestamp.toString(),
      });

      // Assinar requisição
      const encoder = new TextEncoder();
      const data = encoder.encode(params.toString() + apiSecret);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      params.append('signature', signature);

      const binanceResponse = await fetch(`https://api.binance.com/api/v3/order?${params}`, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      });

      const binanceData = await binanceResponse.json();

      if (!binanceResponse.ok) {
        throw new Error(`Binance error: ${binanceData.msg || 'Falha ao executar ordem'}`);
      }

      orderId = binanceData.orderId;
      executedPrice = parseFloat(binanceData.fills?.[0]?.price || entry_price);

      console.log(`[EXECUTE-ORDER] Ordem REAL executada na Binance: ${orderId}`);
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
        strategy: 'FVG_MULTI_TF',
        agents: signal_data,
        session: signal_data?.session || 'UNKNOWN',
      });

    if (operationError) {
      console.error('[EXECUTE-ORDER] Erro ao registrar operação:', operationError);
    }

    // 10. Log de execução
    await supabase.from('agent_logs').insert({
      user_id: user.id,
      agent_name: 'ORDER_EXECUTOR',
      status: 'SUCCESS',
      asset,
      data: {
        orderId,
        executedPrice,
        quantity,
        direction,
        paperMode: settings.paper_mode,
      },
    });

    console.log(`[EXECUTE-ORDER] ✅ Ordem executada com sucesso: ${position.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        positionId: position.id,
        orderId,
        executedPrice,
        quantity,
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
