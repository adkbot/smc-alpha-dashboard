import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeFrameRequest {
  video_id: string;
  frame_index: number;
  frame_data: string; // Base64 encoded frame image
  timestamp_in_video: number;
}

interface ExtractedKnowledge {
  setup_type: string; // e.g., "FVG_15MIN_BULLISH"
  description: string;
  conditions: Record<string, any>;
  entry_rules: Record<string, any>;
  exit_rules: Record<string, any>;
  confidence: number;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: AnalyzeFrameRequest = await req.json();

    // Call Gemini Vision to analyze the frame
    const analysisPrompt = `Você é um especialista em Smart Money Concepts (SMC) e análise técnica de trading.

Analise esta imagem de um vídeo educacional de trading e extraia o máximo de informações possível sobre a estratégia que está sendo ensinada.

Identifique:
1. **Tipo de Setup**: Qual estratégia está sendo demonstrada? (ex: FVG, Order Block, Liquidity Sweep, etc)
2. **Condições de Entrada**: Quais condições devem estar presentes para entrar neste trade?
3. **Ponto de Entrada**: Onde exatamente entrar? (ex: "50% do FVG", "topo do Order Block")
4. **Stop Loss**: Onde colocar o stop loss? (ex: "abaixo do FVG com 10% margem")
5. **Take Profit**: Onde colocar o take profit? (ex: "swing high anterior", "1:3 R:R")
6. **Contexto de Mercado**: Qual tendência/bias deve estar presente? (ALTA, BAIXA, neutro)
7. **Timeframes**: Quais timeframes usar?
8. **Elementos Visuais**: Que linhas, zonas, marcações estão visíveis na tela?

Responda em formato JSON estruturado com os campos:
{
  "setup_type": "string (ex: FVG_15MIN_BULLISH)",
  "description": "string (descrição clara do setup)",
  "conditions": {
    "trend_bias": "string (ALTA/BAIXA/NEUTRO)",
    "timeframe_primary": "string",
    "timeframe_entry": "string",
    "required_structures": ["array de estruturas necessárias"]
  },
  "entry_rules": {
    "entry_point": "string (descrição precisa)",
    "entry_zone": "string (descrição da zona)"
  },
  "exit_rules": {
    "stop_loss": "string (descrição precisa)",
    "take_profit": "string (descrição precisa)",
    "min_risk_reward": "number"
  },
  "confidence": number (0-1, quão claro está o ensinamento),
  "reasoning": "string (explicação detalhada do que você viu)",
  "visual_elements": {
    "lines_drawn": ["array de linhas/marcações visíveis"],
    "zones_marked": ["array de zonas marcadas"],
    "text_visible": ["array de textos visíveis na tela"]
  }
}

Se a imagem não mostrar nenhum ensinamento de trading claro, retorne confidence=0 e reasoning explicando o motivo.`;

    console.log("Calling Gemini Vision to analyze frame...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${body.frame_data}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini Vision error:", aiResponse.status, errorText);
      throw new Error(`Gemini Vision error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    console.log("Gemini Vision response:", content);

    // Parse JSON from response
    let extracted: ExtractedKnowledge;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      extracted = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", e);
      throw new Error("Failed to parse AI response");
    }

    // Only store if confidence is high enough (>= 60%)
    if (extracted.confidence >= 0.6) {
      // Check if this strategy already exists
      const { data: existingStrategy } = await supabase
        .from("vision_learned_strategies")
        .select("*")
        .eq("user_id", user.id)
        .eq("setup_type", extracted.setup_type)
        .single();

      let strategyId: string;

      if (existingStrategy) {
        // Update existing strategy
        const { data: updated } = await supabase
          .from("vision_learned_strategies")
          .update({
            description: extracted.description,
            conditions: extracted.conditions,
            entry_rules: extracted.entry_rules,
            exit_rules: extracted.exit_rules,
            confidence_score: extracted.confidence,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingStrategy.id)
          .select()
          .single();

        strategyId = updated!.id;
        console.log("Updated existing strategy:", strategyId);
      } else {
        // Create new strategy
        const { data: created } = await supabase
          .from("vision_learned_strategies")
          .insert({
            user_id: user.id,
            strategy_name: extracted.setup_type,
            setup_type: extracted.setup_type,
            description: extracted.description,
            conditions: extracted.conditions,
            entry_rules: extracted.entry_rules,
            exit_rules: extracted.exit_rules,
            confidence_score: extracted.confidence,
            learned_from_video_id: body.video_id,
          })
          .select()
          .single();

        strategyId = created!.id;
        console.log("Created new strategy:", strategyId);
      }

      // Create a learned setup entry
      await supabase.from("vision_learned_setups").insert({
        user_id: user.id,
        strategy_id: strategyId,
        video_id: body.video_id,
        frame_index: body.frame_index,
        timestamp_in_video: body.timestamp_in_video,
        asset: "WIN$",
        timeframe: extracted.conditions?.timeframe_entry || "15m",
        setup_context: extracted.reasoning,
        visual_elements: (extracted as any).visual_elements || {},
        reasoning: extracted.reasoning,
      });

      console.log("Learned setup stored successfully");
    } else {
      console.log("Confidence too low, skipping storage:", extracted.confidence);
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted,
        stored: extracted.confidence >= 0.6,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in vision-agent-analyze-frame:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
