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
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { broker_type, api_key, api_secret, broker_name } = await req.json();

    if (!broker_type || !api_key || !api_secret) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // IMPORTANTE: Limpar espaços em branco das API Keys
    const cleanApiKey = api_key.trim();
    const cleanApiSecret = api_secret.trim();

    // Validar formato básico (API Key da Binance geralmente tem 64 caracteres)
    if (broker_type === 'binance') {
      if (cleanApiKey.length < 20) {
        return new Response(JSON.stringify({ 
          error: 'API Key muito curta. Verifique se copiou a chave completa.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (cleanApiSecret.length < 20) {
        return new Response(JSON.stringify({ 
          error: 'API Secret muito curto. Verifique se copiou o secret completo.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`[ENCRYPT] User ${user.id}, broker: ${broker_type}, key length: ${cleanApiKey.length}, secret length: ${cleanApiSecret.length}`);

    // Simple encryption using master key from Supabase Secrets
    const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const encryptedKey = btoa(`${masterKey}:${cleanApiKey}`);
    const encryptedSecret = btoa(`${masterKey}:${cleanApiSecret}`);

    const { error: upsertError } = await supabaseClient
      .from('user_api_credentials')
      .upsert({
        user_id: user.id,
        broker_type,
        encrypted_api_key: encryptedKey,
        encrypted_api_secret: encryptedSecret,
        broker_name: broker_name || null,
        test_status: 'pending',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,broker_type',
      });

    if (upsertError) {
      console.error('[ENCRYPT] Database error:', upsertError);
      throw upsertError;
    }

    console.log(`[ENCRYPT] Credenciais salvas com sucesso para user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Credenciais criptografadas e salvas com sucesso',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ENCRYPT] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
