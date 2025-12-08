import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapear erros da Binance para mensagens em português
const binanceErrorMessages: Record<string, string> = {
  '-2015': 'API Key inválida ou expirada. Gere uma nova chave na Binance.',
  '-1022': 'Assinatura inválida. Verifique se o API Secret está correto.',
  '-2014': 'IP não autorizado. Adicione o IP do servidor na whitelist da Binance ou remova a restrição de IP.',
  '-1021': 'Timestamp fora de sincronização. Tente novamente.',
  '-1102': 'Parâmetros obrigatórios ausentes.',
  '-2008': 'Ação não permitida. Verifique as permissões da API Key.',
  '-1003': 'Muitas requisições. Aguarde alguns minutos.',
  '-1015': 'Muitas ordens. Aguarde alguns minutos.',
  '-2010': 'Saldo insuficiente.',
  '-1013': 'Quantidade mínima não atingida.',
};

function getBinanceErrorMessage(code: string, defaultMsg: string): string {
  return binanceErrorMessages[code] || defaultMsg;
}

async function generateSignature(secret: string, params: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
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
}

async function testBinanceSpot(apiKey: string, apiSecret: string): Promise<{ success: boolean; message: string; errorCode?: string }> {
  try {
    const timestamp = Date.now();
    const params = `timestamp=${timestamp}`;
    const signatureHex = await generateSignature(apiSecret, params);

    console.log('[SPOT] Testando conexão com Binance SPOT...');
    
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
      const usdtBalance = data.balances?.find((b: any) => b.asset === 'USDT');
      const hasBalance = usdtBalance ? (parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked)) : 0;
      console.log('[SPOT] Conexão bem-sucedida, USDT:', hasBalance);
      return { 
        success: true, 
        message: `Binance SPOT conectado! USDT: $${hasBalance.toFixed(2)}` 
      };
    } else {
      const errorData = await response.json();
      console.log('[SPOT] Erro:', JSON.stringify(errorData));
      const errorCode = errorData.code?.toString() || '';
      return {
        success: false,
        message: getBinanceErrorMessage(errorCode, errorData.msg || 'Erro desconhecido'),
        errorCode
      };
    }
  } catch (error) {
    console.error('[SPOT] Exceção:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro de conexão',
    };
  }
}

async function testBinanceFutures(apiKey: string, apiSecret: string): Promise<{ success: boolean; message: string; errorCode?: string }> {
  try {
    const timestamp = Date.now();
    const params = `timestamp=${timestamp}`;
    const signatureHex = await generateSignature(apiSecret, params);

    console.log('[FUTURES] Testando conexão com Binance FUTURES...');
    
    const response = await fetch(
      `https://fapi.binance.com/fapi/v2/balance?${params}&signature=${signatureHex}`,
      {
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const usdtAsset = data?.find((b: any) => b.asset === 'USDT');
      const hasBalance = usdtAsset ? parseFloat(usdtAsset.balance) : 0;
      console.log('[FUTURES] Conexão bem-sucedida, USDT:', hasBalance);
      return { 
        success: true, 
        message: `Binance FUTURES conectado! USDT: $${hasBalance.toFixed(2)}` 
      };
    } else {
      const errorData = await response.json();
      console.log('[FUTURES] Erro:', JSON.stringify(errorData));
      const errorCode = errorData.code?.toString() || '';
      return {
        success: false,
        message: getBinanceErrorMessage(errorCode, errorData.msg || 'Erro desconhecido'),
        errorCode
      };
    }
  } catch (error) {
    console.error('[FUTURES] Exceção:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro de conexão',
    };
  }
}

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
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { broker_type } = await req.json();
    console.log(`[TEST-CONNECTION] Testando conexão para user ${user.id}, broker: ${broker_type}`);

    const { data: credentials, error: credError } = await supabaseClient
      .from('user_api_credentials')
      .select('encrypted_api_key, encrypted_api_secret')
      .eq('user_id', user.id)
      .eq('broker_type', broker_type)
      .single();

    if (credError || !credentials) {
      console.log('[TEST-CONNECTION] Credenciais não encontradas:', credError);
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          message: 'Credenciais não encontradas. Salve suas API Keys primeiro.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt credentials
    const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const apiKey = atob(credentials.encrypted_api_key).replace(`${masterKey}:`, '').trim();
    const apiSecret = atob(credentials.encrypted_api_secret).replace(`${masterKey}:`, '').trim();

    console.log(`[TEST-CONNECTION] API Key length: ${apiKey.length}, Secret length: ${apiSecret.length}`);

    let testResult = { status: 'failed', message: 'Erro desconhecido', details: '', spotOk: false, futuresOk: false };

    if (broker_type === 'binance') {
      // Testar AMBOS os endpoints (SPOT e FUTURES)
      const spotResult = await testBinanceSpot(apiKey, apiSecret);
      const futuresResult = await testBinanceFutures(apiKey, apiSecret);
      
      console.log('[TEST-CONNECTION] SPOT result:', spotResult);
      console.log('[TEST-CONNECTION] FUTURES result:', futuresResult);

      // Determinar status geral
      if (spotResult.success || futuresResult.success) {
        // Pelo menos um funcionou = sucesso
        const workingApis: string[] = [];
        if (spotResult.success) workingApis.push('SPOT');
        if (futuresResult.success) workingApis.push('FUTURES');
        
        testResult = { 
          status: 'success',
          message: `Binance conectado! APIs funcionando: ${workingApis.join(', ')}`,
          details: `${spotResult.success ? spotResult.message : `SPOT: ${spotResult.message}`}\n${futuresResult.success ? futuresResult.message : `FUTURES: ${futuresResult.message}`}`,
          spotOk: spotResult.success,
          futuresOk: futuresResult.success,
        };
      } else {
        // Ambos falharam - mostrar erro mais detalhado
        const isIpError = spotResult.errorCode === '-2014' || futuresResult.errorCode === '-2014';
        const isKeyError = spotResult.errorCode === '-2015' || futuresResult.errorCode === '-2015';
        const isSignatureError = spotResult.errorCode === '-1022' || futuresResult.errorCode === '-1022';
        const isPermissionError = spotResult.errorCode === '-2008' || futuresResult.errorCode === '-2008';
        
        let helpMessage = '\n\n💡 Dica: ';
        if (isIpError) {
          helpMessage += 'Na Binance, vá em API Management e remova a restrição de IP ou adicione todos os IPs permitidos.';
        } else if (isKeyError) {
          helpMessage += 'Verifique se a API Key foi copiada completamente, sem espaços extras. Gere uma nova chave se necessário.';
        } else if (isSignatureError) {
          helpMessage += 'Verifique se o API Secret foi copiado completamente, sem espaços extras.';
        } else if (isPermissionError) {
          helpMessage += 'Sua API Key não tem permissões necessárias. Crie uma nova chave com permissões de Futures habilitadas.';
        } else {
          helpMessage += 'Verifique suas credenciais e tente novamente. Se o problema persistir, gere novas chaves na Binance.';
        }
        
        testResult = {
          status: 'failed',
          message: `Falha na conexão.\n\nSPOT: ${spotResult.message}\nFUTURES: ${futuresResult.message}${helpMessage}`,
          details: `Códigos de erro: SPOT=${spotResult.errorCode || 'N/A'}, FUTURES=${futuresResult.errorCode || 'N/A'}`,
          spotOk: false,
          futuresOk: false,
        };
      }
    } else if (broker_type === 'forex') {
      testResult = {
        status: 'pending',
        message: 'Credenciais Forex salvas. Teste de conexão requer implementação específica do broker.',
        details: '',
        spotOk: false,
        futuresOk: false,
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

    console.log(`[TEST-CONNECTION] Resultado final: ${testResult.status}`);

    return new Response(
      JSON.stringify(testResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TEST-CONNECTION] Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        status: 'failed',
        message: `Erro interno: ${errorMessage}`,
        details: ''
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
