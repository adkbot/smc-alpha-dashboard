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

    const { broker_type } = await req.json();

    const { data: credentials, error: credError } = await supabaseClient
      .from('user_api_credentials')
      .select('encrypted_api_key, encrypted_api_secret')
      .eq('user_id', user.id)
      .eq('broker_type', broker_type)
      .single();

    if (credError || !credentials) {
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          message: 'No credentials found. Please save your API keys first.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt credentials
    const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const apiKey = atob(credentials.encrypted_api_key).replace(`${masterKey}:`, '');
    const apiSecret = atob(credentials.encrypted_api_secret).replace(`${masterKey}:`, '');

    let testResult = { status: 'failed', message: 'Unknown error' };

    if (broker_type === 'binance') {
      // Test Binance connection
      try {
        const timestamp = Date.now();
        const params = `timestamp=${timestamp}`;
        
        const encoder = new TextEncoder();
        const keyData = encoder.encode(apiSecret);
        const msgData = encoder.encode(params);
        
        const key = await globalThis.crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        
        const signature = await globalThis.crypto.subtle.sign("HMAC", key, msgData);
        const signatureHex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const response = await fetch(
          `https://api.binance.com/api/v3/account?${params}&signature=${signatureHex}`,
          {
            headers: {
              'X-MBX-APIKEY': apiKey,
            },
          }
        );

        if (response.ok) {
          testResult = { 
            status: 'success',
            message: 'Binance connection successful',
          };
        } else {
          const errorData = await response.json();
          testResult = {
            status: 'failed',
            message: `Binance error: ${errorData.msg || 'Invalid credentials'}`,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        testResult = {
          status: 'failed',
          message: `Binance connection failed: ${errorMessage}`,
        };
      }
    } else if (broker_type === 'forex') {
      // For Forex, we'll just validate the credentials exist
      // Real broker connection would require specific broker API
      testResult = {
        status: 'pending',
        message: 'Forex credentials saved. Real connection test requires broker-specific implementation.',
      };
    }

    // Update test status in database
    await supabaseClient
      .from('user_api_credentials')
      .update({ 
        test_status: testResult.status,
        last_tested_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('broker_type', broker_type);

    return new Response(
      JSON.stringify(testResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in test-broker-connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        status: 'failed',
        message: errorMessage,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
