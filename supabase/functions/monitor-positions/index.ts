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

    console.log('[MONITOR-POSITIONS] Iniciando verificação de posições abertas...');

    // 1. Buscar todas as posições abertas
    const { data: positions, error: positionsError } = await supabase
      .from('active_positions')
      .select('*');

    if (positionsError) {
      throw new Error(`Erro ao buscar posições: ${positionsError.message}`);
    }

    if (!positions || positions.length === 0) {
      console.log('[MONITOR-POSITIONS] Nenhuma posição aberta encontrada');
      return new Response(
        JSON.stringify({ message: 'Nenhuma posição para monitorar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MONITOR-POSITIONS] Monitorando ${positions.length} posições`);

    const closedPositions = [];

    // 2. Verificar cada posição
    for (const position of positions) {
      try {
        // Buscar preço atual da Binance
        const priceResponse = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${position.asset}`
        );
        const priceData = await priceResponse.json();
        const currentPrice = parseFloat(priceData.price);

        console.log(`[MONITOR-POSITIONS] ${position.asset}: Preço atual $${currentPrice}`);

        // Calcular PnL
        const quantity = position.projected_profit / Math.abs(position.take_profit - position.entry_price);
        let pnl = 0;
        
        if (position.direction === 'LONG') {
          pnl = (currentPrice - position.entry_price) * quantity;
        } else {
          pnl = (position.entry_price - currentPrice) * quantity;
        }

        // 3. Verificar se SL ou TP foram atingidos
        let shouldClose = false;
        let result: 'WIN' | 'LOSS' | null = null;

        if (position.direction === 'LONG') {
          if (currentPrice <= position.stop_loss) {
            shouldClose = true;
            result = 'LOSS';
            console.log(`[MONITOR-POSITIONS] 🔴 SL atingido em ${position.asset}`);
          } else if (currentPrice >= position.take_profit) {
            shouldClose = true;
            result = 'WIN';
            console.log(`[MONITOR-POSITIONS] 🟢 TP atingido em ${position.asset}`);
          }
        } else {
          if (currentPrice >= position.stop_loss) {
            shouldClose = true;
            result = 'LOSS';
            console.log(`[MONITOR-POSITIONS] 🔴 SL atingido em ${position.asset}`);
          } else if (currentPrice <= position.take_profit) {
            shouldClose = true;
            result = 'WIN';
            console.log(`[MONITOR-POSITIONS] 🟢 TP atingido em ${position.asset}`);
          }
        }

        // 4. Fechar posição se necessário
        if (shouldClose && result) {
          const closeResponse = await fetch(`${supabaseUrl}/functions/v1/close-position`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              positionId: position.id,
              exitPrice: currentPrice,
              result,
            }),
          });

          if (closeResponse.ok) {
            closedPositions.push({
              asset: position.asset,
              result,
              pnl,
            });
          }
        } else {
          // 5. Atualizar current_price e current_pnl
          await supabase
            .from('active_positions')
            .update({
              current_price: currentPrice,
              current_pnl: pnl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', position.id);
        }

      } catch (error: any) {
        console.error(`[MONITOR-POSITIONS] Erro ao processar ${position.asset}:`, error.message);
      }
    }

    console.log(`[MONITOR-POSITIONS] ✅ Verificação concluída. Posições fechadas: ${closedPositions.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        positionsChecked: positions.length,
        positionsClosed: closedPositions.length,
        closedPositions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[MONITOR-POSITIONS] ❌ Erro:', error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
