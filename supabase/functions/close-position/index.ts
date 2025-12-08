import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface para regras de trading da Binance
interface ExchangeInfo {
  symbol: string;
  minQty: number;
  maxQty: number;
  stepSize: number;
  quantityPrecision: number;
  pricePrecision: number;
  tickSize: number;
}

// Buscar regras de trading da Binance FUTURES
async function getExchangeInfo(symbol: string): Promise<ExchangeInfo> {
  try {
    console.log(`[EXCHANGE-INFO] Buscando regras para ${symbol}...`);
    
    const response = await fetch(`https://fapi.binance.com/fapi/v1/exchangeInfo?symbol=${symbol}`);
    
    if (!response.ok) {
      throw new Error(`Falha ao buscar exchangeInfo: ${response.status}`);
    }
    
    const data = await response.json();
    const symbolInfo = data.symbols?.find((s: any) => s.symbol === symbol);
    
    if (!symbolInfo) {
      throw new Error(`Símbolo ${symbol} não encontrado na Binance`);
    }
    
    const filters = symbolInfo.filters || [];
    const lotSizeFilter = filters.find((f: any) => f.filterType === 'LOT_SIZE') || {};
    const priceFilter = filters.find((f: any) => f.filterType === 'PRICE_FILTER') || {};
    
    const exchangeInfo: ExchangeInfo = {
      symbol: symbolInfo.symbol,
      minQty: parseFloat(lotSizeFilter.minQty || '0.001'),
      maxQty: parseFloat(lotSizeFilter.maxQty || '1000'),
      stepSize: parseFloat(lotSizeFilter.stepSize || '0.001'),
      quantityPrecision: symbolInfo.quantityPrecision || 3,
      pricePrecision: symbolInfo.pricePrecision || 2,
      tickSize: parseFloat(priceFilter.tickSize || '0.01'),
    };
    
    console.log(`[EXCHANGE-INFO] ✅ Regras: stepSize=${exchangeInfo.stepSize}, quantityPrecision=${exchangeInfo.quantityPrecision}`);
    
    return exchangeInfo;
  } catch (error) {
    console.error(`[EXCHANGE-INFO] ❌ Erro:`, error);
    return {
      symbol,
      minQty: 0.001,
      maxQty: 1000,
      stepSize: 0.001,
      quantityPrecision: 3,
      pricePrecision: 2,
      tickSize: 0.10,
    };
  }
}

// Arredondar quantidade para stepSize
function roundToStepSize(quantity: number, stepSize: number, precision: number): number {
  const factor = 1 / stepSize;
  const rounded = Math.floor(quantity * factor) / factor;
  return parseFloat(rounded.toFixed(precision));
}

// Função para criar assinatura HMAC-SHA256 (igual ao execute-order)
async function createBinanceSignature(queryString: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(queryString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { positionId, exitPrice, result } = await req.json();

    console.log(`[CLOSE-POSITION] Fechando posição ${positionId} | Resultado: ${result}`);

    // 1. Buscar dados da posição
    const { data: position, error: positionError } = await supabase
      .from('active_positions')
      .select('*')
      .eq('id', positionId)
      .single();

    if (positionError || !position) {
      throw new Error('Posição não encontrada');
    }

    // 2. Buscar exchangeInfo para validar quantidade
    const symbol = position.asset.replace('/', '').toUpperCase();
    const exchangeInfo = await getExchangeInfo(symbol);

    // 3. Calcular quantidade e PnL final
    const quantity = position.projected_profit / Math.abs(position.take_profit - position.entry_price);
    
    // Arredondar quantidade para stepSize
    const validatedQuantity = roundToStepSize(quantity, exchangeInfo.stepSize, exchangeInfo.quantityPrecision);
    
    let finalPnL = 0;

    if (position.direction === 'LONG') {
      finalPnL = (exitPrice - position.entry_price) * validatedQuantity;
    } else {
      finalPnL = (position.entry_price - exitPrice) * validatedQuantity;
    }

    console.log(`[CLOSE-POSITION] Quantidade original: ${quantity.toFixed(6)}`);
    console.log(`[CLOSE-POSITION] Quantidade validada: ${validatedQuantity} (stepSize: ${exchangeInfo.stepSize})`);
    console.log(`[CLOSE-POSITION] PnL calculado: $${finalPnL.toFixed(2)}`);

    // 4. Buscar configurações do usuário
    const { data: settings } = await supabase
      .from('user_settings')
      .select('paper_mode, balance')
      .eq('user_id', position.user_id)
      .single();

    // 5. Executar fechamento na Binance FUTURES (se Real Mode)
    let binanceOrderId = `PAPER_CLOSE_${Date.now()}`;

    if (settings && !settings.paper_mode) {
      console.log(`[CLOSE-POSITION] Modo REAL - Executando ordem na Binance FUTURES`);
      
      const { data: credentials } = await supabase
        .from('user_api_credentials')
        .select('encrypted_api_key, encrypted_api_secret')
        .eq('user_id', position.user_id)
        .eq('broker_type', 'binance')
        .eq('is_active', true)
        .single();

      if (credentials) {
        // Decriptação corrigida - remover prefixo masterKey se existir
        let apiKey = '';
        let apiSecret = '';
        
        try {
          const encryptedKey = credentials.encrypted_api_key || '';
          const encryptedSecret = credentials.encrypted_api_secret || '';
          
          const decodedKey = atob(encryptedKey);
          const decodedSecret = atob(encryptedSecret);
          
          if (decodedKey.includes(':')) {
            apiKey = decodedKey.split(':').slice(1).join(':');
          } else {
            apiKey = decodedKey;
          }
          
          if (decodedSecret.includes(':')) {
            apiSecret = decodedSecret.split(':').slice(1).join(':');
          } else {
            apiSecret = decodedSecret;
          }
          
          console.log(`[CLOSE-POSITION] Credenciais decriptadas com sucesso`);
        } catch (decryptError) {
          console.error(`[CLOSE-POSITION] Erro ao decriptar credenciais:`, decryptError);
          throw new Error('Falha ao decriptar credenciais da Binance');
        }

        if (!apiKey || !apiSecret) {
          throw new Error('Credenciais da Binance não encontradas ou inválidas');
        }

        // Preparar parâmetros para ordem FUTURES
        const timestamp = Date.now();
        const side = position.direction === 'LONG' ? 'SELL' : 'BUY';
        const quantityFormatted = validatedQuantity.toFixed(exchangeInfo.quantityPrecision);
        
        const params = new URLSearchParams({
          symbol: symbol,
          side: side,
          type: 'MARKET',
          quantity: quantityFormatted,
          timestamp: timestamp.toString(),
        });

        // Criar assinatura HMAC-SHA256 correta
        const signature = await createBinanceSignature(params.toString(), apiSecret);
        params.append('signature', signature);

        console.log(`[CLOSE-POSITION] Parâmetros da ordem FUTURES:`, {
          symbol,
          side,
          quantity: quantityFormatted,
          timestamp,
        });

        // Usar endpoint FUTURES correto
        const binanceResponse = await fetch(`https://fapi.binance.com/fapi/v1/order?${params}`, {
          method: 'POST',
          headers: {
            'X-MBX-APIKEY': apiKey,
          },
        });

        const binanceData = await binanceResponse.json();

        if (binanceResponse.ok) {
          binanceOrderId = binanceData.orderId?.toString() || `FUTURES_${Date.now()}`;
          console.log(`[CLOSE-POSITION] ✅ Ordem REAL fechada na Binance FUTURES: ${binanceOrderId}`);
        } else {
          console.error(`[CLOSE-POSITION] ❌ Erro na Binance FUTURES:`, binanceData);
          console.error(`[CLOSE-POSITION] Status: ${binanceResponse.status}`);
          console.error(`[CLOSE-POSITION] Detalhes: code=${binanceData.code}, msg=${binanceData.msg}`);
        }
      } else {
        console.log(`[CLOSE-POSITION] Credenciais Binance não encontradas para usuário`);
      }
    } else {
      console.log(`[CLOSE-POSITION] Modo PAPER - Simulando fechamento`);
    }

    // 6. Deletar de active_positions
    await supabase
      .from('active_positions')
      .delete()
      .eq('id', positionId);

    // 7. Atualizar operations
    const { error: updateError } = await supabase
      .from('operations')
      .update({
        exit_price: exitPrice,
        exit_time: new Date().toISOString(),
        pnl: finalPnL,
        result: result,
      })
      .eq('user_id', position.user_id)
      .eq('asset', position.asset)
      .eq('entry_price', position.entry_price)
      .is('exit_time', null);

    if (updateError) {
      console.error('[CLOSE-POSITION] Erro ao atualizar operations:', updateError);
    }

    // 8. Atualizar user_settings (balance)
    if (settings) {
      const newBalance = settings.balance + finalPnL;
      await supabase
        .from('user_settings')
        .update({ balance: newBalance })
        .eq('user_id', position.user_id);
      
      console.log(`[CLOSE-POSITION] Balance atualizado: $${settings.balance.toFixed(2)} → $${newBalance.toFixed(2)}`);
    }

    // 9. Log
    await supabase.from('agent_logs').insert({
      user_id: position.user_id,
      agent_name: 'POSITION_CLOSER',
      status: 'SUCCESS',
      asset: position.asset,
      data: {
        positionId,
        exitPrice,
        pnl: finalPnL,
        result,
        binanceOrderId,
        paperMode: settings?.paper_mode || true,
        quantityValidated: validatedQuantity,
        exchangeInfo: {
          stepSize: exchangeInfo.stepSize,
          quantityPrecision: exchangeInfo.quantityPrecision,
        },
      },
    });

    console.log(`[CLOSE-POSITION] ✅ Posição fechada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        positionId,
        exitPrice,
        pnl: finalPnL,
        result,
        binanceOrderId,
        message: `Posição fechada com ${result}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[CLOSE-POSITION] ❌ Erro:', error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
