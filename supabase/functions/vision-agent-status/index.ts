import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusPayload {
  status?: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR';
  current_video_id?: string;
  current_video_title?: string;
  current_frame?: number;
  total_frames?: number;
  progress_percent?: number;
  model_version?: string;
  error_message?: string;
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
      console.error('[vision-agent-status] Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: StatusPayload = await req.json();
    console.log('[vision-agent-status] Received status update:', {
      user_id: user.id,
      status: payload.status,
      video_id: payload.current_video_id,
      progress: payload.progress_percent,
    });

    // Build update object with only provided fields
    const updateData: any = {
      last_heartbeat: new Date().toISOString(),
    };

    if (payload.status !== undefined) {
      updateData.status = payload.status;
    }
    if (payload.current_video_id !== undefined) {
      updateData.current_video_id = payload.current_video_id;
    }
    if (payload.current_video_title !== undefined) {
      updateData.current_video_title = payload.current_video_title;
    }
    if (payload.current_frame !== undefined) {
      updateData.current_frame = payload.current_frame;
    }
    if (payload.total_frames !== undefined) {
      updateData.total_frames = payload.total_frames;
    }
    if (payload.progress_percent !== undefined) {
      updateData.progress_percent = payload.progress_percent;
    }
    if (payload.model_version !== undefined) {
      updateData.model_version = payload.model_version;
    }

    // Try to update existing state
    const { data: existingState } = await supabase
      .from('vision_agent_state')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;
    if (existingState) {
      // Update existing state
      const { data, error } = await supabase
        .from('vision_agent_state')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[vision-agent-status] Error updating state:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update agent state', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      result = data;
      console.log('[vision-agent-status] State updated successfully');
    } else {
      // Create new state
      const { data, error } = await supabase
        .from('vision_agent_state')
        .insert({
          user_id: user.id,
          ...updateData,
        })
        .select()
        .single();

      if (error) {
        console.error('[vision-agent-status] Error creating state:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create agent state', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      result = data;
      console.log('[vision-agent-status] State created successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        state: result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[vision-agent-status] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
