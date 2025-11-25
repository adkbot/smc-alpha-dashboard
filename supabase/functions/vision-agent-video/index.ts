import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoPayload {
  video_id: string;
  video_title: string;
  video_url: string;
  channel_name?: string;
  duration_seconds?: number;
  total_frames?: number;
}

interface VideoUpdatePayload {
  frames_processed?: number;
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  signals_detected?: number;
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
      console.error('[vision-agent-video] Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle GET request - list videos
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      let query = supabase
        .from('vision_videos_processed')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[vision-agent-video] Error fetching videos:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch videos', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[vision-agent-video] Retrieved ${data.length} videos for user ${user.id}`);
      return new Response(
        JSON.stringify({ videos: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request - register new video
    if (req.method === 'POST') {
      const payload: VideoPayload = await req.json();
      console.log('[vision-agent-video] Registering new video:', {
        user_id: user.id,
        video_id: payload.video_id,
        video_title: payload.video_title,
      });

      if (!payload.video_id || !payload.video_title || !payload.video_url) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: video_id, video_title, video_url' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('vision_videos_processed')
        .insert({
          user_id: user.id,
          video_id: payload.video_id,
          video_title: payload.video_title,
          video_url: payload.video_url,
          channel_name: payload.channel_name || 'Rafael Oliveira Trader Raiz',
          duration_seconds: payload.duration_seconds,
          total_frames: payload.total_frames,
          status: 'PENDING',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('[vision-agent-video] Error registering video:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to register video', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[vision-agent-video] Video registered successfully:', data.id);
      return new Response(
        JSON.stringify({ success: true, video: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PUT request - update video progress
    if (req.method === 'PUT') {
      const url = new URL(req.url);
      const videoId = url.searchParams.get('video_id');
      
      if (!videoId) {
        return new Response(
          JSON.stringify({ error: 'Missing video_id query parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload: VideoUpdatePayload = await req.json();
      console.log('[vision-agent-video] Updating video progress:', {
        user_id: user.id,
        video_id: videoId,
        updates: payload,
      });

      const updateData: any = {};
      if (payload.frames_processed !== undefined) {
        updateData.frames_processed = payload.frames_processed;
      }
      if (payload.status !== undefined) {
        updateData.status = payload.status;
        if (payload.status === 'COMPLETED') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (payload.signals_detected !== undefined) {
        updateData.signals_detected = payload.signals_detected;
      }
      if (payload.error_message !== undefined) {
        updateData.error_message = payload.error_message;
      }

      const { data, error } = await supabase
        .from('vision_videos_processed')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .select()
        .single();

      if (error) {
        console.error('[vision-agent-video] Error updating video:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update video', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[vision-agent-video] Video updated successfully');
      return new Response(
        JSON.stringify({ success: true, video: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[vision-agent-video] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
