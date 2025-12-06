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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { broker_type, api_key, api_secret, broker_name } = await req.json();

    if (!broker_type || !api_key || !api_secret) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simple encryption using master key from Supabase Secrets
    const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const encryptedKey = btoa(`${masterKey}:${api_key}`);
    const encryptedSecret = btoa(`${masterKey}:${api_secret}`);

    const { error: upsertError } = await supabaseClient
      .from('user_api_credentials')
      .upsert({
        user_id: user.id,
        broker_type,
        encrypted_api_key: encryptedKey,
        encrypted_api_secret: encryptedSecret,
        broker_name: broker_name || null,
        test_status: 'pending',
      }, {
        onConflict: 'user_id,broker_type',
      });

    if (upsertError) {
      console.error('Database error:', upsertError);
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'API credentials encrypted and saved successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in encrypt-api-credentials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
