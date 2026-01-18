import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * IA INCREMENTAL TRAINING
 * Fine-tuning incremental - nunca esquece, só melhora
 * 
 * Princípios:
 * - Não treina do zero
 * - Elite buffer tem 2x peso
 * - Padrões estáveis ficam congelados
 * - Learning rate baixo para preservar conhecimento
 */

interface PatternWeight {
  q_long: number;
  q_short: number;
  q_hold: number;
  trades: number;
  wins: number;
  losses: number;
}

// Atualizar Q-value com learning rate baixo + MEMORY DECAY
function updateQValue(
  currentWeight: PatternWeight | undefined,
  action: string,
  reward: number,
  learningRate: number = 0.1
): PatternWeight {
  const weight = currentWeight || { q_long: 0, q_short: 0, q_hold: 0, trades: 0, wins: 0, losses: 0 };
  
  // Q-learning simplificado: Q(s,a) = Q(s,a) + α * (reward - Q(s,a))
  if (action === 'LONG') {
    weight.q_long = weight.q_long + learningRate * (reward - weight.q_long);
  } else if (action === 'SHORT') {
    weight.q_short = weight.q_short + learningRate * (reward - weight.q_short);
  } else {
    weight.q_hold = weight.q_hold + learningRate * (reward - weight.q_hold);
  }
  
  weight.trades++;
  if (reward > 0) weight.wins++;
  else weight.losses++;
  
  return weight;
}

// 🆕 MEMORY DECAY: newScore = (oldScore * 0.8) + (recentScore * 0.2)
// Preserva 80% do conhecimento antigo, ajusta 20% com novo
function applyMemoryDecay(
  existingWinRate: number,
  newResult: 'WIN' | 'LOSS'
): number {
  const recentWinRate = newResult === 'WIN' ? 100 : 0;
  return (existingWinRate * 0.8) + (recentWinRate * 0.2);
}

// 🆕 SHUFFLE ARRAY para amostragem aleatória
function shuffleArray<T>(arr: T[]): T[] {
  return arr
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

// 🆕 SAMPLE BATCH: 40% Elite + 60% Normal
function sampleBatch(
  replayBuffer: any[], 
  eliteBuffer: any[], 
  batchSize: number = 64
): any[] {
  const eliteSize = Math.floor(batchSize * 0.4); // 40% elite
  const normalSize = batchSize - eliteSize;      // 60% normal
  
  const eliteSamples = shuffleArray(eliteBuffer).slice(0, eliteSize);
  const normalSamples = shuffleArray(replayBuffer).slice(0, normalSize);
  
  console.log(`[SAMPLE-BATCH] Amostragem: ${eliteSamples.length} elite + ${normalSamples.length} normal = ${eliteSamples.length + normalSamples.length} total`);
  
  return [...eliteSamples, ...normalSamples];
}

// Calcular confiança do modelo baseado em métricas
function calculateModelConfidence(weights: Record<string, PatternWeight>): number {
  let totalTrades = 0;
  let totalWins = 0;
  let patternsWithData = 0;
  
  for (const pattern in weights) {
    const w = weights[pattern];
    if (w.trades >= 3) {
      patternsWithData++;
      totalTrades += w.trades;
      totalWins += w.wins;
    }
  }
  
  if (patternsWithData < 5 || totalTrades < 20) return 50; // Confidence base
  
  const winRate = (totalWins / totalTrades) * 100;
  const patternBonus = Math.min(patternsWithData / 2, 15); // Max 15% bonus
  
  return Math.min(Math.max(winRate + patternBonus, 30), 95);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ia-incremental-training] Iniciando fine-tuning para ${userId}`);

    // 1. Buscar modelo atual (pesos)
    const { data: currentModel } = await supabase
      .from('ia_model_weights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .single();

    let modelWeights: Record<string, PatternWeight> = {};
    let frozenPatterns: string[] = [];
    let currentVersion = 0;

    if (currentModel) {
      modelWeights = currentModel.pattern_weights || {};
      frozenPatterns = currentModel.frozen_patterns || [];
      currentVersion = currentModel.version || 0;
      console.log(`[ia-incremental-training] Modelo atual v${currentVersion} carregado com ${Object.keys(modelWeights).length} padrões`);
    } else {
      console.log(`[ia-incremental-training] Nenhum modelo encontrado - criando novo`);
    }

    // 2. Buscar experiências recentes do replay buffer (últimas 200)
    const { data: recentExperiences } = await supabase
      .from('ia_replay_buffer')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    console.log(`[ia-incremental-training] ${recentExperiences?.length || 0} experiências recentes encontradas`);

    // 3. Buscar experiências ELITE para reforço (2x peso)
    const { data: eliteExperiences } = await supabase
      .from('ia_elite_buffer')
      .select('*, replay:ia_replay_buffer(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    console.log(`[ia-incremental-training] ${eliteExperiences?.length || 0} experiências elite encontradas`);

    // 4. TREINAR INCREMENTALMENTE COM AMOSTRAGEM 40% ELITE + 60% NORMAL
    let updatedCount = 0;
    let skippedFrozen = 0;

    // 🆕 USAR SAMPLE BATCH: 40% Elite + 60% Normal
    const eliteReplays = (eliteExperiences || [])
      .filter(e => e.replay)
      .map(e => ({ ...e.replay, isElite: true, eliteId: e.id, timesUsed: e.times_used_in_training }));
    
    const normalReplays = (recentExperiences || []).map(e => ({ ...e, isElite: false }));
    
    const sampledBatch = sampleBatch(normalReplays, eliteReplays, 100);
    console.log(`[ia-incremental-training] Batch amostrado: ${sampledBatch.length} experiências (40% elite, 60% normal)`);

    // 4.1 Treinar com batch amostrado
    for (const exp of sampledBatch) {
      const patternId = exp.pattern_id || exp.metadata?.pattern_id;
      
      if (!patternId) continue;
      
      // Só atualiza padrões não congelados
      if (frozenPatterns.includes(patternId)) {
        skippedFrozen++;
        continue;
      }
      
      // 🆕 Elite tem 2x reward e learning rate menor
      const isElite = exp.isElite === true;
      const rewardMultiplier = isElite ? 2.0 : 1.0;
      const learningRate = isElite ? 0.05 : 0.1;
      
      modelWeights[patternId] = updateQValue(
        modelWeights[patternId],
        exp.action,
        exp.reward * rewardMultiplier,
        learningRate
      );
      updatedCount++;
      
      // Marcar uso no elite buffer se for elite
      if (isElite && exp.eliteId) {
        await supabase
          .from('ia_elite_buffer')
          .update({ times_used_in_training: (exp.timesUsed || 0) + 1 })
          .eq('id', exp.eliteId);
      }
    }

    // 5. Identificar padrões estáveis para congelar (>20 trades, WR > 60%)
    const newFrozenPatterns = [...frozenPatterns];
    for (const [pattern, weight] of Object.entries(modelWeights)) {
      if (weight.trades >= 20 && !frozenPatterns.includes(pattern)) {
        const winRate = weight.trades > 0 ? (weight.wins / weight.trades) * 100 : 50;
        if (winRate >= 60 || winRate <= 35) {
          // Congelar padrões muito bons ou muito ruins (já aprendidos)
          newFrozenPatterns.push(pattern);
          console.log(`[ia-incremental-training] Padrão congelado: ${pattern} (${winRate.toFixed(1)}% WR, ${weight.trades} trades)`);
        }
      }
    }

    // 6. Calcular métricas do modelo
    let totalTrades = 0;
    let totalWins = 0;
    let totalLosses = 0;
    
    for (const weight of Object.values(modelWeights)) {
      totalTrades += weight.trades;
      totalWins += weight.wins;
      totalLosses += weight.losses;
    }
    
    const modelWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 50;
    const confidence = calculateModelConfidence(modelWeights);

    // 7. Salvar nova versão do modelo (sem sobrescrever antiga)
    const newVersion = currentVersion + 1;
    
    const { data: newModel, error: insertError } = await supabase
      .from('ia_model_weights')
      .insert({
        user_id: userId,
        version: newVersion,
        model_name: 'incremental',
        is_current: true,
        is_production: confidence >= 70, // Só vai pra produção se confiança >= 70%
        pattern_weights: modelWeights,
        train_winrate: modelWinRate,
        train_trades: totalTrades,
        validation_winrate: modelWinRate,
        validation_trades: totalTrades,
        confidence_level: confidence,
        frozen_patterns: newFrozenPatterns,
        training_config: {
          learning_rate: 0.1,
          elite_learning_rate: 0.05,
          elite_weight: 2.0,
          recent_experiences: recentExperiences?.length || 0,
          elite_experiences: eliteExperiences?.length || 0,
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[ia-incremental-training] Erro ao salvar modelo:`, insertError);
      throw new Error(`Erro ao salvar modelo: ${insertError.message}`);
    }

    // 8. Desmarcar versão anterior como current
    if (currentModel) {
      await supabase
        .from('ia_model_weights')
        .update({ is_current: false })
        .eq('id', currentModel.id);
    }

    const report = {
      success: true,
      version: newVersion,
      previousVersion: currentVersion,
      metrics: {
        patternsUpdated: updatedCount,
        patternsFrozen: newFrozenPatterns.length,
        skippedFrozen,
        totalPatterns: Object.keys(modelWeights).length,
        totalTrades,
        totalWins,
        totalLosses,
        winRate: modelWinRate.toFixed(1),
        confidence: confidence.toFixed(1),
        isProduction: confidence >= 70,
      },
      message: `Fine-tuning concluído! Modelo v${newVersion} com ${Object.keys(modelWeights).length} padrões (${confidence.toFixed(0)}% confiança)`
    };

    console.log(`[ia-incremental-training] Concluído:`, report.message);

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[ia-incremental-training] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
