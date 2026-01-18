import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Códigos de erro que indicam problema de credenciais (não devem atualizar saldo)
const CREDENTIAL_ERROR_CODES = ['-2015', '-1022', '-2014', '-2008'];

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
          message: 'Configure suas credenciais API primeiro nas configurações.',
          errorType: 'NO_CREDENTIALS'
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
    let hasCredentialError = false;
    let credentialErrorMessage = '';
    let credentialErrorCode = '';

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

      // Helper to check if error is credential-related
      const isCredentialError = (errorCode: string) => {
        return CREDENTIAL_ERROR_CODES.includes(errorCode);
      };

      // Helper to get user-friendly error message
      const getErrorMessage = (code: string, defaultMsg: string) => {
        const messages: Record<string, string> = {
          '-2015': 'API Key inválida ou expirada. Gere uma nova chave na Binance.',
          '-1022': 'Assinatura inválida. Verifique o API Secret.',
          '-2014': 'IP não autorizado. Remova a restrição de IP na Binance ou adicione o IP do servidor.',
          '-2008': 'Permissões insuficientes. Habilite Futures na sua API Key.',
        };
        return messages[code] || defaultMsg;
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
            const errorData = await spotResponse.json();
            const errorCode = errorData.code?.toString() || '';
            console.error('❌ SPOT API Error:', spotResponse.status, JSON.stringify(errorData));
            
            if (isCredentialError(errorCode)) {
              hasCredentialError = true;
              credentialErrorCode = errorCode;
              credentialErrorMessage = getErrorMessage(errorCode, errorData.msg);
            }
            balanceDetails.spotError = errorData.msg || 'Erro desconhecido';
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
            const errorData = await futuresResponse.json();
            const errorCode = errorData.code?.toString() || '';
            console.error('❌ FUTURES API Error:', futuresResponse.status, JSON.stringify(errorData));
            
            if (isCredentialError(errorCode)) {
              hasCredentialError = true;
              credentialErrorCode = errorCode;
              credentialErrorMessage = getErrorMessage(errorCode, errorData.msg);
            }
            balanceDetails.futuresError = errorData.msg || 'Erro desconhecido';
          }
        } catch (error) {
          console.error('❌ FUTURES fetch error:', error);
          balanceDetails.futuresError = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      // IMPORTANTE: NÃO modificar test_status aqui - isso é responsabilidade do test-broker-connection
      // Se FUTURES falhou, SEMPRE tentar SPOT como fallback (independente do tipo de erro)
      let spotFallbackCredentialError = false;
      if (account_type === 'futures' && balanceDetails.futuresError) {
        console.log('📊 FUTURES falhou, tentando SPOT como fallback...');
        try {
          const spotParams = `timestamp=${Date.now()}`;
          const spotSignature = await createSignature(spotParams);
          
          const spotResponse = await fetch(
            `https://api.binance.com/api/v3/account?${spotParams}&signature=${spotSignature}`,
            { headers: { 'X-MBX-APIKEY': apiKey } }
          );

          if (spotResponse.ok) {
            const spotData = await spotResponse.json();
            const usdtBalance = spotData.balances?.find((b: any) => b.asset === 'USDT');
            spotBalance = parseFloat(usdtBalance?.free || '0') + parseFloat(usdtBalance?.locked || '0');
            console.log('✅ SPOT fallback USDT Balance:', spotBalance);
            balanceDetails.spotFallback = true;
            balanceDetails.spot = { usdt: spotBalance };
            // Se SPOT funcionou, limpar o erro de credenciais (era só problema de FUTURES)
            hasCredentialError = false;
          } else {
            const errorData = await spotResponse.json();
            const errorCode = errorData.code?.toString() || '';
            console.error('❌ SPOT fallback também falhou:', errorData);
            if (isCredentialError(errorCode)) {
              spotFallbackCredentialError = true;
            }
          }
        } catch (fallbackError) {
          console.error('❌ SPOT fallback erro:', fallbackError);
        }
      }

      // Só retornar erro de credenciais se AMBOS falharam (FUTURES + SPOT fallback)
      const finalCredentialError = hasCredentialError && (spotFallbackCredentialError || spotBalance === 0);
      if (finalCredentialError && spotBalance === 0 && futuresBalance === 0) {
        console.error('🚨 Credential error em todas as tentativas, retornando erro (sem modificar test_status)');
        return new Response(
          JSON.stringify({ 
            success: false,
            error: credentialErrorMessage,
            errorType: 'CREDENTIAL_ERROR',
            errorCode: credentialErrorCode,
            message: `Erro de credenciais: ${credentialErrorMessage}. Verifique suas API Keys nas configurações.`,
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Calculate total - usar o que estiver disponível
      if (account_type === 'spot') {
        totalBalance = spotBalance;
      } else if (account_type === 'futures') {
        // Se FUTURES falhou mas SPOT funcionou via fallback, usar SPOT
        totalBalance = futuresBalance > 0 ? futuresBalance : spotBalance;
      } else {
        totalBalance = spotBalance + futuresBalance;
      }

      console.log('💰 Final balance calculation:', {
        spotBalance,
        futuresBalance,
        totalBalance,
        accountType: account_type,
        usedFallback: balanceDetails.spotFallback || false
      });

    } else if (broker_type === 'forex') {
      throw new Error('Forex balance sync not yet implemented for this broker');
    }

    // Only update if we have a valid response (no credential errors)
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
        message: `Saldo sincronizado: $${totalBalance.toFixed(2)} (SPOT: $${spotBalance.toFixed(2)}, FUTURES: $${futuresBalance.toFixed(2)})`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in sync-real-balance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        errorType: 'UNKNOWN_ERROR',
        message: 'Falha ao sincronizar saldo. Verifique suas configurações.',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
