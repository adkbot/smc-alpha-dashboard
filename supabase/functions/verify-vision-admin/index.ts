import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple JWT-like token generation (base64 encoded payload with expiration)
function generateToken(expiresInHours: number = 24): string {
  const payload = {
    type: 'vision_admin',
    exp: Date.now() + (expiresInHours * 60 * 60 * 1000),
    iat: Date.now(),
  };
  return btoa(JSON.stringify(payload));
}

// Verify token validity
function verifyToken(token: string): { valid: boolean; expired?: boolean } {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.type !== 'vision_admin') {
      return { valid: false };
    }
    if (Date.now() > payload.exp) {
      return { valid: false, expired: true };
    }
    return { valid: true };
  } catch {
    return { valid: false };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, password, token } = await req.json();
    
    console.log(`[verify-vision-admin] Action: ${action}`);

    // Action: verify existing token
    if (action === 'verify') {
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Token não fornecido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result = verifyToken(token);
      console.log(`[verify-vision-admin] Token verification result:`, result);
      
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: authenticate with password
    if (action === 'authenticate') {
      if (!password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Senha não fornecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const adminPassword = Deno.env.get('VISION_ADMIN_PASSWORD');
      
      if (!adminPassword) {
        console.error('[verify-vision-admin] VISION_ADMIN_PASSWORD not configured');
        return new Response(
          JSON.stringify({ success: false, error: 'Sistema não configurado' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (password === adminPassword) {
        const newToken = generateToken(24); // Token válido por 24 horas
        console.log('[verify-vision-admin] Authentication successful, token generated');
        
        return new Response(
          JSON.stringify({ success: true, token: newToken }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('[verify-vision-admin] Authentication failed - incorrect password');
        return new Response(
          JSON.stringify({ success: false, error: 'Senha incorreta' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-vision-admin] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
