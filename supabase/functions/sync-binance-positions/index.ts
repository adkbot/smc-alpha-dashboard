import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cria assinatura HMAC-SHA256 para Binance
async function createBinanceSignature(queryString: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(queryString);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obter user_id do corpo ou do header de autorização
    let userId: string | null = null;
    
    try {
      const body = await req.json();
      userId = body.user_id;
    } catch {
      // Se não houver body, tentar do header
    }

    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID não fornecido" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar credenciais do usuário
    const { data: credentials, error: credError } = await supabase
      .from("user_api_credentials")
      .select("encrypted_api_key, encrypted_api_secret, test_status, futures_ok")
      .eq("user_id", userId)
      .eq("broker_type", "binance")
      .maybeSingle();

    if (credError || !credentials) {
      console.log("[SYNC-POSITIONS] Sem credenciais configuradas");
      return new Response(
        JSON.stringify({ success: true, positions: [], message: "Sem credenciais" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (credentials.test_status !== "success") {
      console.log("[SYNC-POSITIONS] Credenciais não validadas");
      return new Response(
        JSON.stringify({ success: true, positions: [], message: "Credenciais não validadas" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Descriptografar credenciais
    let apiKey: string;
    let apiSecret: string;

    try {
      const { data: decryptedKey } = await supabase.rpc('decrypt_data', {
        encrypted_data: credentials.encrypted_api_key,
        encryption_key: masterKey,
      });
      
      const { data: decryptedSecret } = await supabase.rpc('decrypt_data', {
        encrypted_data: credentials.encrypted_api_secret,
        encryption_key: masterKey,
      });

      apiKey = decryptedKey?.replace(`${masterKey}:`, '') || '';
      apiSecret = decryptedSecret?.replace(`${masterKey}:`, '') || '';

      if (!apiKey || !apiSecret) {
        throw new Error("Falha na descriptografia");
      }
    } catch (decryptError: any) {
      console.error("[SYNC-POSITIONS] Erro ao descriptografar:", decryptError);
      return new Response(
        JSON.stringify({ success: true, positions: [], message: "Erro de credenciais" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar posições abertas na Binance FUTURES
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = await createBinanceSignature(queryString, apiSecret);

    const positionsResponse = await fetch(
      `https://fapi.binance.com/fapi/v2/positionRisk?${queryString}&signature=${signature}`,
      {
        headers: { 'X-MBX-APIKEY': apiKey },
      }
    );

    if (!positionsResponse.ok) {
      console.error("[SYNC-POSITIONS] Erro da Binance:", await positionsResponse.text());
      return new Response(
        JSON.stringify({ success: true, positions: [], message: "Erro ao consultar Binance" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allPositions = await positionsResponse.json();
    
    // Filtrar apenas posições com quantidade != 0 (realmente abertas)
    const openPositions = allPositions.filter((pos: any) => 
      parseFloat(pos.positionAmt) !== 0
    );

    console.log(`[SYNC-POSITIONS] Binance tem ${openPositions.length} posições abertas`);

    return new Response(
      JSON.stringify({
        success: true,
        positions: openPositions.map((pos: any) => ({
          symbol: pos.symbol,
          side: parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT',
          quantity: Math.abs(parseFloat(pos.positionAmt)),
          entryPrice: parseFloat(pos.entryPrice),
          markPrice: parseFloat(pos.markPrice),
          unrealizedPnl: parseFloat(pos.unRealizedProfit),
          leverage: parseInt(pos.leverage),
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SYNC-POSITIONS] Erro:', error.message);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});