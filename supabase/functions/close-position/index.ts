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

    const { positionId, exitPrice, result } = await req.json();

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

    // 2. Calcular PnL final
    const quantity = position.projected_profit / Math.abs(position.take_profit - position.entry_price);
    let finalPnL = 0;

    if (position.direction === 'LONG') {
      finalPnL = (exitPrice - position.entry_price) * quantity;
    } else {
      finalPnL = (position.entry_price - exitPrice) * quantity;
    }

    console.log(`[CLOSE-POSITION] PnL calculado: $${finalPnL.toFixed(2)}`);

    // 3. Buscar configurações do usuário
    const { data: settings } = await supabase
      .from('user_settings')
      .select('paper_mode, balance')
      .eq('user_id', position.user_id)
      .single();

    // 4. Executar fechamento na Binance (se Real Mode)
    let binanceOrderId = `PAPER_CLOSE_${Date.now()}`;

    if (settings && !settings.paper_mode) {
      const { data: credentials } = await supabase
        .from('user_api_credentials')
        .select('encrypted_api_key, encrypted_api_secret')
        .eq('user_id', position.user_id)
        .eq('broker_type', 'binance')
        .eq('is_active', true)
        .single();

      if (credentials) {
        const apiKey = atob(credentials.encrypted_api_key || '');
        const apiSecret = atob(credentials.encrypted_api_secret || '');

        const timestamp = Date.now();
        const params = new URLSearchParams({
          symbol: position.asset,
          side: position.direction === 'LONG' ? 'SELL' : 'BUY',
          type: 'MARKET',
          quantity: quantity.toFixed(6),
          timestamp: timestamp.toString(),
        });

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

        if (binanceResponse.ok) {
          binanceOrderId = binanceData.orderId;
          console.log(`[CLOSE-POSITION] Ordem REAL fechada na Binance: ${binanceOrderId}`);
        } else {
          console.error(`[CLOSE-POSITION] Erro na Binance:`, binanceData);
        }
      }
    }

    // 5. Deletar de active_positions
    await supabase
      .from('active_positions')
      .delete()
      .eq('id', positionId);

    // 6. Atualizar operations
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

    // 7. Atualizar user_settings (balance)
    if (settings) {
      const newBalance = settings.balance + finalPnL;
      await supabase
        .from('user_settings')
        .update({ balance: newBalance })
        .eq('user_id', position.user_id);
    }

    // 8. Log
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
