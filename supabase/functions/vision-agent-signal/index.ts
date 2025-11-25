import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignalPayload {
  action: 'ENTER' | 'EXIT' | 'IGNORE';
  video_id: string;
  frame_index: number;
  confidence: number;
  symbol?: string;
  features_summary?: {
    hands?: number;
    draw_count?: number;
    ocr?: string;
    [key: string]: any;
  };
  model_version: string;
  // Enhanced fields for learned knowledge
  setup_type?: string;
  timeframe?: string;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  risk_reward?: number;
  reasoning?: string;
  strategy_context?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[vision-agent-signal] Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: SignalPayload = await req.json();
    console.log('[vision-agent-signal] Received signal:', {
      user_id: user.id,
      action: payload.action,
      video_id: payload.video_id,
      frame_index: payload.frame_index,
      confidence: payload.confidence,
    });

    // Validate payload
    if (!payload.action || !payload.video_id || payload.frame_index === undefined || !payload.confidence || !payload.model_version) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, video_id, frame_index, confidence, model_version' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['ENTER', 'EXIT', 'IGNORE'].includes(payload.action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be ENTER, EXIT, or IGNORE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.confidence < 0 || payload.confidence > 1) {
      return new Response(
        JSON.stringify({ error: 'Confidence must be between 0 and 1' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into vision_agent_logs
    const { data: logData, error: logError } = await supabase
      .from('vision_agent_logs')
      .insert({
        user_id: user.id,
        video_id: payload.video_id,
        frame_index: payload.frame_index,
        action: payload.action,
        confidence: payload.confidence,
        symbol: payload.symbol || 'WIN$',
        features_summary: payload.features_summary || {},
        model_version: payload.model_version,
        executed: false,
      })
      .select()
      .single();

    if (logError) {
      console.error('[vision-agent-signal] Error inserting log:', logError);
      return new Response(
        JSON.stringify({ error: 'Failed to log signal', details: logError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[vision-agent-signal] Signal logged successfully:', logData.id);

    // Get agent state to check mode
    const { data: agentState, error: stateError } = await supabase
      .from('vision_agent_state')
      .select('mode, config')
      .eq('user_id', user.id)
      .single();

    if (stateError) {
      console.error('[vision-agent-signal] Error fetching agent state:', stateError);
    }

    let pendingSignalId: string | null = null;

    // If mode is PAPER or LIVE AND action is not IGNORE, create pending signal
    if (agentState && ['PAPER', 'LIVE'].includes(agentState.mode) && payload.action !== 'IGNORE') {
      console.log('[vision-agent-signal] Creating pending signal for execution');

      const direction = payload.action === 'ENTER' ? 'LONG' : 'SHORT';
      const entryPrice = payload.entry_price || 0; // Use provided entry price or 0
      const stopLoss = payload.stop_loss || 0;
      const takeProfit = payload.take_profit || 0;
      const riskReward = payload.risk_reward || 3.0;

      const { data: signalData, error: signalError } = await supabase
        .from('pending_signals')
        .insert({
          user_id: user.id,
          asset: payload.symbol || 'WIN$',
          direction,
          entry_price: entryPrice,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          risk_reward: riskReward,
          status: 'PENDING',
          strategy: payload.setup_type || 'VISION_AGENT',
          session: 'VISION',
          confidence_score: payload.confidence * 100,
          signal_data: {
            video_id: payload.video_id,
            frame_index: payload.frame_index,
            features_summary: payload.features_summary,
            model_version: payload.model_version,
            setup_type: payload.setup_type,
            timeframe: payload.timeframe,
            reasoning: payload.reasoning,
            strategy_context: payload.strategy_context,
          },
          agents: {
            vision_agent: {
              action: payload.action,
              confidence: payload.confidence,
              model_version: payload.model_version,
              setup_type: payload.setup_type,
              learned_from: payload.strategy_context?.learned_from || 'training',
            },
          },
          detected_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        })
        .select()
        .single();

      if (signalError) {
        console.error('[vision-agent-signal] Error creating pending signal:', signalError);
      } else {
        pendingSignalId = signalData.id;
        console.log('[vision-agent-signal] Pending signal created:', pendingSignalId);

        // Update log with execution flag
        await supabase
          .from('vision_agent_logs')
          .update({ executed: true })
          .eq('id', logData.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signal_id: logData.id,
        pending_signal_id: pendingSignalId,
        mode: agentState?.mode || 'UNKNOWN',
        message: agentState?.mode === 'SHADOW' 
          ? 'Signal logged (SHADOW mode - not executed)'
          : pendingSignalId
            ? 'Signal logged and queued for execution'
            : 'Signal logged',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[vision-agent-signal] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
