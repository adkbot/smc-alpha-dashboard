import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisionAgentSignal {
  user_id: string;
  action: 'ENTER' | 'EXIT' | 'IGNORE';
  confidence: number;
  asset: string;
  video_id: string;
  frame_index?: number;
  timestamp_in_video?: number;
  features_summary?: Record<string, any>;
  model_version?: string;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  risk_reward?: number;
  direction?: 'LONG' | 'SHORT';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[VISION-AGENT-SIGNAL] Nova requisição recebida');

    // Validar autenticação (Token do Vision Agent ou Service Role)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const payload: VisionAgentSignal = await req.json();
    
    // Validação do payload
    if (!payload.user_id) {
      throw new Error('user_id is required');
    }

    if (!['ENTER', 'EXIT', 'IGNORE'].includes(payload.action)) {
      throw new Error('Invalid action. Must be ENTER, EXIT, or IGNORE');
    }

    if (!payload.asset || !payload.video_id || payload.confidence === undefined) {
      throw new Error('Missing required fields: asset, video_id, confidence');
    }

    console.log(`[VISION-AGENT-SIGNAL] Sinal recebido: ${payload.action} | ${payload.asset} | Confidence: ${payload.confidence}`);

    // Se é IGNORE, apenas registrar e retornar
    if (payload.action === 'IGNORE') {
      await supabase.from('agent_logs').insert({
        user_id: payload.user_id,
        agent_name: 'vision_trading_agent',
        action: 'signal_ignore',
        status: 'info',
        details: {
          video_id: payload.video_id,
          asset: payload.asset,
          confidence: payload.confidence,
          frame_index: payload.frame_index,
        },
      });

      return new Response(
        JSON.stringify({ status: 'ignored', message: 'Signal action is IGNORE' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configurações do Vision Agent do usuário
    const { data: agentSettings, error: agentSettingsError } = await supabase
      .from('vision_agent_settings')
      .select('enabled, mode, confidence_threshold, max_signals_per_day')
      .eq('user_id', payload.user_id)
      .maybeSingle();

    if (agentSettingsError) {
      throw new Error(`Error fetching agent settings: ${agentSettingsError.message}`);
    }

    if (!agentSettings || !agentSettings.enabled) {
      console.log('[VISION-AGENT-SIGNAL] Vision Agent is disabled for this user');
      return new Response(
        JSON.stringify({ status: 'disabled', message: 'Vision Agent is not enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar confidence threshold
    if (payload.confidence < agentSettings.confidence_threshold) {
      console.log(`[VISION-AGENT-SIGNAL] Confidence too low: ${payload.confidence} < ${agentSettings.confidence_threshold}`);
      
      await supabase.from('agent_logs').insert({
        user_id: payload.user_id,
        agent_name: 'vision_trading_agent',
        action: 'signal_rejected_low_confidence',
        status: 'warning',
        details: {
          video_id: payload.video_id,
          confidence: payload.confidence,
          threshold: agentSettings.confidence_threshold,
        },
      });

      return new Response(
        JSON.stringify({ 
          status: 'rejected', 
          reason: 'confidence_too_low',
          confidence: payload.confidence,
          threshold: agentSettings.confidence_threshold,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar limite de sinais diários
    const today = new Date().toISOString().split('T')[0];
    const { count: signalsToday } = await supabase
      .from('vision_agent_signals')
      .select('id', { count: 'exact' })
      .eq('user_id', payload.user_id)
      .gte('created_at', today)
      .neq('signal_type', 'IGNORE');

    if (signalsToday && signalsToday >= agentSettings.max_signals_per_day) {
      console.log(`[VISION-AGENT-SIGNAL] Daily signal limit reached: ${signalsToday}/${agentSettings.max_signals_per_day}`);
      
      await supabase.from('agent_logs').insert({
        user_id: payload.user_id,
        agent_name: 'vision_trading_agent',
        action: 'signal_rejected_daily_limit',
        status: 'warning',
        details: {
          video_id: payload.video_id,
          signals_today: signalsToday,
          max_signals: agentSettings.max_signals_per_day,
        },
      });

      return new Response(
        JSON.stringify({ 
          status: 'rejected', 
          reason: 'daily_limit_reached',
          signals_today: signalsToday,
          max_signals: agentSettings.max_signals_per_day,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar video_id UUID da tabela vision_agent_videos
    const { data: videoData } = await supabase
      .from('vision_agent_videos')
      .select('id')
      .eq('user_id', payload.user_id)
      .eq('video_id', payload.video_id)
      .maybeSingle();

    const videoUUID = videoData?.id || null;

    // Registrar sinal na tabela vision_agent_signals
    const { data: signalRecord, error: signalError } = await supabase
      .from('vision_agent_signals')
      .insert({
        user_id: payload.user_id,
        video_id: videoUUID,
        signal_type: payload.action,
        action: payload.direction || 'LONG',
        confidence: payload.confidence,
        asset: payload.asset,
        entry_price: payload.entry_price,
        stop_loss: payload.stop_loss,
        take_profit: payload.take_profit,
        risk_reward: payload.risk_reward,
        frame_index: payload.frame_index,
        timestamp_in_video: payload.timestamp_in_video,
        features_summary: payload.features_summary || {},
        model_version: payload.model_version,
        executed: false,
        execution_status: 'pending',
      })
      .select()
      .single();

    if (signalError) {
      throw new Error(`Error inserting signal: ${signalError.message}`);
    }

    console.log(`[VISION-AGENT-SIGNAL] Sinal registrado: ${signalRecord.id}`);

    // Inserir em pending_signals para visualização no dashboard
    await supabase.from('pending_signals').insert({
      user_id: payload.user_id,
      asset: payload.asset,
      signal_type: payload.action,
      direction: payload.direction || 'LONG',
      entry_price: payload.entry_price,
      stop_loss: payload.stop_loss,
      take_profit: payload.take_profit,
      risk_reward: payload.risk_reward,
      confidence: payload.confidence,
      signal_data: {
        source: 'vision_trading_agent',
        video_id: payload.video_id,
        frame_index: payload.frame_index,
        model_version: payload.model_version,
        features: payload.features_summary,
      },
      status: 'pending',
    });

    // Log de sucesso
    await supabase.from('agent_logs').insert({
      user_id: payload.user_id,
      agent_name: 'vision_trading_agent',
      action: `signal_${payload.action.toLowerCase()}`,
      status: 'success',
      details: {
        signal_id: signalRecord.id,
        video_id: payload.video_id,
        confidence: payload.confidence,
        asset: payload.asset,
        frame_index: payload.frame_index,
      },
    });

    // Se modo for LIVE e action for ENTER, executar ordem automaticamente
    if (agentSettings.mode === 'LIVE' && payload.action === 'ENTER') {
      // Buscar configurações do bot
      const { data: botSettings } = await supabase
        .from('user_settings')
        .select('bot_status, paper_mode')
        .eq('user_id', payload.user_id)
        .single();

      if (botSettings?.bot_status === 'running') {
        console.log('[VISION-AGENT-SIGNAL] Executando ordem automaticamente (LIVE mode)...');

        try {
          // Chamar a Edge Function execute-order
          const executeResponse = await fetch(`${supabaseUrl}/functions/v1/execute-order`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              asset: payload.asset,
              direction: payload.direction || 'LONG',
              entry_price: payload.entry_price,
              stop_loss: payload.stop_loss,
              take_profit: payload.take_profit,
              risk_reward: payload.risk_reward,
              signal_data: {
                source: 'vision_trading_agent',
                video_id: payload.video_id,
                confidence: payload.confidence,
                frame_index: payload.frame_index,
                model_version: payload.model_version,
              },
            }),
          });

          const executeResult = await executeResponse.json();

          if (executeResponse.ok && executeResult.success) {
            // Atualizar sinal como executado
            await supabase
              .from('vision_agent_signals')
              .update({
                executed: true,
                execution_status: 'executed',
                execution_details: executeResult,
              })
              .eq('id', signalRecord.id);

            console.log(`[VISION-AGENT-SIGNAL] ✅ Ordem executada com sucesso: ${executeResult.positionId}`);

            return new Response(
              JSON.stringify({
                status: 'executed',
                signal_id: signalRecord.id,
                execution: executeResult,
                mode: agentSettings.mode,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            throw new Error(executeResult.error || 'Failed to execute order');
          }
        } catch (execError: any) {
          console.error('[VISION-AGENT-SIGNAL] ❌ Erro ao executar ordem:', execError.message);

          // Atualizar sinal como falho
          await supabase
            .from('vision_agent_signals')
            .update({
              executed: false,
              execution_status: 'failed',
              execution_details: { error: execError.message },
            })
            .eq('id', signalRecord.id);

          await supabase.from('agent_logs').insert({
            user_id: payload.user_id,
            agent_name: 'vision_trading_agent',
            action: 'execution_failed',
            status: 'error',
            details: {
              signal_id: signalRecord.id,
              error: execError.message,
            },
          });

          return new Response(
            JSON.stringify({
              status: 'signal_created_but_execution_failed',
              signal_id: signalRecord.id,
              error: execError.message,
              mode: agentSettings.mode,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Se modo SHADOW ou PAPER, apenas registrar
    return new Response(
      JSON.stringify({
        status: 'signal_created',
        signal_id: signalRecord.id,
        mode: agentSettings.mode,
        message: `Signal ${payload.action} registered in ${agentSettings.mode} mode`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[VISION-AGENT-SIGNAL] ❌ Erro:', error.message);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
