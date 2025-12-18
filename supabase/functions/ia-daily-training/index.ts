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

    console.log(`[IA-TRAINING] 🧠 Iniciando treinamento diário - ${new Date().toISOString()}`);

    // 1. Recalcular taxa_acerto para todos os padrões (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Buscar todos os contextos de trade dos últimos 30 dias
    const { data: recentTrades, error: tradesError } = await supabase
      .from('ia_trade_context')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (tradesError) {
      throw new Error(`Erro ao buscar trades recentes: ${tradesError.message}`);
    }

    console.log(`[IA-TRAINING] 📊 Encontrados ${recentTrades?.length || 0} trades nos últimos 30 dias`);

    // 2. Agrupar por padrão e calcular estatísticas
    const patternStats: Record<string, {
      userId: string;
      wins: number;
      losses: number;
      total: number;
      totalPnL: number;
      avgRR: number;
    }> = {};

    (recentTrades || []).forEach(trade => {
      const key = `${trade.user_id}:${trade.padrao_combinado}`;
      
      if (!patternStats[key]) {
        patternStats[key] = {
          userId: trade.user_id,
          wins: 0,
          losses: 0,
          total: 0,
          totalPnL: 0,
          avgRR: 0,
        };
      }
      
      patternStats[key].total++;
      patternStats[key].totalPnL += trade.pnl || 0;
      patternStats[key].avgRR += trade.rr_ratio || 0;
      
      if (trade.resultado === 'WIN') {
        patternStats[key].wins++;
      } else if (trade.resultado === 'LOSS') {
        patternStats[key].losses++;
      }
    });

    // 3. Atualizar cada padrão no banco
    let updatedPatterns = 0;
    const topPatterns: { padraoId: string; taxaAcerto: number; total: number }[] = [];
    const worstPatterns: { padraoId: string; taxaAcerto: number; total: number }[] = [];

    for (const [key, stats] of Object.entries(patternStats)) {
      const [userId, padraoId] = key.split(':');
      const taxaAcerto = stats.total > 0 ? (stats.wins / stats.total) * 100 : 50;
      const avgRR = stats.total > 0 ? stats.avgRR / stats.total : 0;

      // Atualizar ou criar padrão
      const { error: upsertError } = await supabase
        .from('ia_learning_patterns')
        .upsert({
          user_id: userId,
          padrao_id: padraoId,
          recompensa_acumulada: stats.wins - stats.losses,
          vezes_testado: stats.total,
          wins: stats.wins,
          losses: stats.losses,
          taxa_acerto: taxaAcerto,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,padrao_id' });

      if (!upsertError) {
        updatedPatterns++;
        
        // Classificar padrões
        if (stats.total >= 3) {
          if (taxaAcerto >= 60) {
            topPatterns.push({ padraoId, taxaAcerto, total: stats.total });
          } else if (taxaAcerto < 40) {
            worstPatterns.push({ padraoId, taxaAcerto, total: stats.total });
          }
        }
      }
    }

    // Ordenar top e worst patterns
    topPatterns.sort((a, b) => b.taxaAcerto - a.taxaAcerto);
    worstPatterns.sort((a, b) => a.taxaAcerto - b.taxaAcerto);

    // 4. Calcular nível de confiança geral da IA
    const allTaxas = Object.values(patternStats)
      .filter(s => s.total >= 3)
      .map(s => (s.wins / s.total) * 100);
    
    const nivelConfianca = allTaxas.length > 0
      ? allTaxas.reduce((sum, t) => sum + t, 0) / allTaxas.length
      : 50;

    // 5. Limpar trades antigos (mais de 90 dias)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { count: deletedCount } = await supabase
      .from('ia_trade_context')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString());

    console.log(`[IA-TRAINING] 🧹 Removidos ${deletedCount || 0} trades antigos (>90 dias)`);

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      tradesAnalisados: recentTrades?.length || 0,
      padroesAtualizados: updatedPatterns,
      nivelConfiancaIA: nivelConfianca.toFixed(1),
      topPatterns: topPatterns.slice(0, 5),
      worstPatterns: worstPatterns.slice(0, 3),
      tradesRemovidos: deletedCount || 0,
    };

    console.log(`[IA-TRAINING] ✅ Treinamento concluído:`, JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[IA-TRAINING] ❌ Erro:', error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});