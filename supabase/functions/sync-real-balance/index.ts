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
          error: 'No credentials found',
          message: 'Please configure your API keys first.',
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Decrypt credentials
    const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const apiKey = atob(credentials.encrypted_api_key).replace(`${masterKey}:`, '');
    const apiSecret = atob(credentials.encrypted_api_secret).replace(`${masterKey}:`, '');

    let balance = 0;

    if (broker_type === 'binance') {
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
          const data = await response.json();
          // Calculate USDT balance
          const usdtBalance = data.balances.find((b: any) => b.asset === 'USDT');
          balance = parseFloat(usdtBalance?.free || '0') + parseFloat(usdtBalance?.locked || '0');
        } else {
          throw new Error('Failed to fetch Binance balance');
        }
      } catch (error) {
        console.error('Binance balance fetch error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to sync Binance balance: ${errorMessage}`);
      }
    } else if (broker_type === 'forex') {
      // Forex balance sync would require broker-specific implementation
      throw new Error('Forex balance sync not yet implemented for this broker');
    }

    // Update user settings with new balance
    const { error: updateError } = await supabaseClient
      .from('user_settings')
      .update({ balance })
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        balance,
        message: `Balance synchronized: $${balance.toFixed(2)}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-real-balance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        message: 'Failed to synchronize balance',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
