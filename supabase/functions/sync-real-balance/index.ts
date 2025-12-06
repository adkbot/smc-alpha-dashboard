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
    console.log('🔄 Starting balance sync...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User authenticated:', user.id);

    const { broker_type, account_type = 'futures' } = await req.json();
    console.log('📋 Request params:', { broker_type, account_type });

    const { data: credentials, error: credError } = await supabaseClient
      .from('user_api_credentials')
      .select('encrypted_api_key, encrypted_api_secret')
      .eq('user_id', user.id)
      .eq('broker_type', broker_type)
      .single();

    if (credError || !credentials) {
      console.error('❌ Credentials error:', credError);
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

    console.log('✅ Credentials found');

    // Decrypt credentials
    const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const apiKey = atob(credentials.encrypted_api_key).replace(`${masterKey}:`, '');
    const apiSecret = atob(credentials.encrypted_api_secret).replace(`${masterKey}:`, '');
    
    console.log('🔑 API Key (first 8 chars):', apiKey.substring(0, 8) + '...');

    let spotBalance = 0;
    let futuresBalance = 0;
    let totalBalance = 0;
    let balanceDetails: any = {};

    if (broker_type === 'binance') {
      const timestamp = Date.now();
      
      // Helper function to create signature
      const createSignature = async (params: string) => {
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
        return Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      };

      // Fetch SPOT balance
      if (account_type === 'spot' || account_type === 'both') {
        try {
          console.log('📊 Fetching SPOT balance...');
          const spotParams = `timestamp=${timestamp}`;
          const spotSignature = await createSignature(spotParams);
          
          const spotResponse = await fetch(
            `https://api.binance.com/api/v3/account?${spotParams}&signature=${spotSignature}`,
            {
              headers: { 'X-MBX-APIKEY': apiKey },
            }
          );

          if (spotResponse.ok) {
            const spotData = await spotResponse.json();
            const usdtBalance = spotData.balances?.find((b: any) => b.asset === 'USDT');
            spotBalance = parseFloat(usdtBalance?.free || '0') + parseFloat(usdtBalance?.locked || '0');
            console.log('✅ SPOT USDT Balance:', spotBalance);
            balanceDetails.spot = {
              usdt: spotBalance,
              allAssets: spotData.balances?.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
            };
          } else {
            const errorText = await spotResponse.text();
            console.error('❌ SPOT API Error:', spotResponse.status, errorText);
            balanceDetails.spotError = errorText;
          }
        } catch (error) {
          console.error('❌ SPOT fetch error:', error);
          balanceDetails.spotError = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      // Fetch FUTURES balance
      if (account_type === 'futures' || account_type === 'both') {
        try {
          console.log('📊 Fetching FUTURES balance...');
          const futuresTimestamp = Date.now();
          const futuresParams = `timestamp=${futuresTimestamp}`;
          const futuresSignature = await createSignature(futuresParams);
          
          const futuresResponse = await fetch(
            `https://fapi.binance.com/fapi/v2/balance?${futuresParams}&signature=${futuresSignature}`,
            {
              headers: { 'X-MBX-APIKEY': apiKey },
            }
          );

          if (futuresResponse.ok) {
            const futuresData = await futuresResponse.json();
            console.log('📋 FUTURES raw response:', JSON.stringify(futuresData).substring(0, 500));
            
            const usdtAsset = futuresData?.find((b: any) => b.asset === 'USDT');
            futuresBalance = parseFloat(usdtAsset?.balance || '0');
            console.log('✅ FUTURES USDT Balance:', futuresBalance);
            balanceDetails.futures = {
              usdt: futuresBalance,
              availableBalance: parseFloat(usdtAsset?.availableBalance || '0'),
              crossWalletBalance: parseFloat(usdtAsset?.crossWalletBalance || '0'),
              allAssets: futuresData?.filter((b: any) => parseFloat(b.balance) > 0)
            };
          } else {
            const errorText = await futuresResponse.text();
            console.error('❌ FUTURES API Error:', futuresResponse.status, errorText);
            balanceDetails.futuresError = errorText;
          }
        } catch (error) {
          console.error('❌ FUTURES fetch error:', error);
          balanceDetails.futuresError = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      // Calculate total based on account type preference
      if (account_type === 'spot') {
        totalBalance = spotBalance;
      } else if (account_type === 'futures') {
        totalBalance = futuresBalance;
      } else {
        totalBalance = spotBalance + futuresBalance;
      }

      console.log('💰 Final balance calculation:', {
        spotBalance,
        futuresBalance,
        totalBalance,
        accountType: account_type
      });

    } else if (broker_type === 'forex') {
      throw new Error('Forex balance sync not yet implemented for this broker');
    }

    // Update user settings with new balance
    const { error: updateError } = await supabaseClient
      .from('user_settings')
      .update({ balance: totalBalance })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw updateError;
    }

    console.log('✅ Balance updated in database:', totalBalance);

    return new Response(
      JSON.stringify({ 
        success: true,
        balance: totalBalance,
        spotBalance,
        futuresBalance,
        accountType: account_type,
        details: balanceDetails,
        message: `Balance synchronized: $${totalBalance.toFixed(2)} (SPOT: $${spotBalance.toFixed(2)}, FUTURES: $${futuresBalance.toFixed(2)})`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in sync-real-balance:', error);
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
