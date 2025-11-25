import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

interface ExtractedStrategy {
  setup_type: string;
  strategy_name: string;
  description: string;
  conditions: any;
  entry_rules: any;
  exit_rules: any;
  confidence_score: number;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Processing videos for user:', user.id);

    // Buscar estado do agente
    const { data: agentState, error: stateError } = await supabase
      .from('vision_agent_state')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (stateError || !agentState) {
      throw new Error('Agent state not found');
    }

    // Verificar se tem playlist URL configurada
    if (!agentState.playlist_url) {
      throw new Error('Playlist URL not configured');
    }

    // Extrair channel ID da URL
    const channelId = extractChannelId(agentState.playlist_url);
    console.log('Channel ID:', channelId);

    // Buscar vídeos do canal
    const videos = await fetchChannelVideos(youtubeApiKey, channelId);
    console.log(`Found ${videos.length} videos`);

    // Atualizar status para PROCESSING
    await supabase
      .from('vision_agent_state')
      .update({
        status: 'PROCESSING',
        last_heartbeat: new Date().toISOString(),
        current_video_title: videos.length > 0 ? videos[0].title : null,
        total_frames: videos.length,
        current_frame: 0,
        progress_percent: 0,
      })
      .eq('user_id', user.id);

    // Processar cada vídeo
    let processedCount = 0;
    let learnedStrategiesCount = 0;
    let learnedSetupsCount = 0;

    for (const video of videos) {
      try {
        console.log(`Processing video: ${video.title}`);

        // Registrar vídeo na tabela
        const { data: videoRecord } = await supabase
          .from('vision_agent_videos')
          .insert({
            user_id: user.id,
            video_id: video.id,
            youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
            title: video.title,
            channel: 'Rafael Oliveira Trader Raiz',
            status: 'processing',
            processing_started_at: new Date().toISOString(),
            model_version: agentState.model_version || 'gemini-2.5-flash',
          })
          .select()
          .single();

        // Analisar thumbnail com Gemini Vision
        const analysis = await analyzeVideoWithGemini(
          lovableApiKey,
          video.thumbnail,
          video.title,
          video.description
        );

        if (analysis) {
          // Salvar estratégia aprendida
          const { data: strategyData } = await supabase
            .from('vision_learned_strategies')
            .insert({
              user_id: user.id,
              setup_type: analysis.setup_type,
              strategy_name: analysis.strategy_name,
              description: analysis.description,
              conditions: analysis.conditions,
              entry_rules: analysis.entry_rules,
              exit_rules: analysis.exit_rules,
              confidence_score: analysis.confidence_score,
              learned_from_video_id: video.id,
              visual_reference_url: video.thumbnail,
            })
            .select()
            .single();

          if (strategyData) {
            learnedStrategiesCount++;

            // Salvar setup específico
            await supabase
              .from('vision_learned_setups')
              .insert({
                user_id: user.id,
                video_id: video.id,
                strategy_id: strategyData.id,
                frame_index: 0,
                asset: 'WIN$',
                timeframe: analysis.conditions?.timeframe || '15m',
                setup_context: analysis.reasoning,
                screenshot_url: video.thumbnail,
                reasoning: analysis.reasoning,
                entry_price: analysis.entry_rules?.price || null,
                stop_loss: analysis.exit_rules?.stop_loss || null,
                take_profit: analysis.exit_rules?.take_profit || null,
                risk_reward: analysis.exit_rules?.risk_reward || null,
                visual_elements: {
                  thumbnail: video.thumbnail,
                  title: video.title,
                  description: video.description,
                },
              });

            learnedSetupsCount++;
          }
        }

        // Atualizar status do vídeo
        if (videoRecord) {
          await supabase
            .from('vision_agent_videos')
            .update({
              status: 'completed',
              processing_completed_at: new Date().toISOString(),
              processed_frames: 1,
              total_frames: 1,
              signals_generated: analysis ? 1 : 0,
            })
            .eq('id', videoRecord.id);
        }

        processedCount++;

        // Atualizar progresso
        const progress = Math.round((processedCount / videos.length) * 100);
        await supabase
          .from('vision_agent_state')
          .update({
            current_frame: processedCount,
            progress_percent: progress,
            current_video_title: video.title,
            last_heartbeat: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        console.log(`Progress: ${progress}% (${processedCount}/${videos.length})`);

      } catch (videoError) {
        console.error(`Error processing video ${video.title}:`, videoError);
        // Continuar com próximo vídeo
        continue;
      }
    }

    // Finalizar processamento
    await supabase
      .from('vision_agent_state')
      .update({
        status: 'ACTIVE',
        progress_percent: 100,
        current_frame: videos.length,
        last_heartbeat: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    console.log(`Processing complete: ${processedCount} videos, ${learnedStrategiesCount} strategies, ${learnedSetupsCount} setups`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Video processing completed',
        stats: {
          videos_processed: processedCount,
          strategies_learned: learnedStrategiesCount,
          setups_identified: learnedSetupsCount,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in vision-agent-process-videos:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Extrair Channel ID da URL do YouTube
function extractChannelId(url: string): string {
  // Exemplos:
  // https://www.youtube.com/@RafaelOliveiraTraderRaiz
  // https://www.youtube.com/channel/UCxxxxx
  // https://www.youtube.com/c/ChannelName
  
  const patterns = [
    /@([a-zA-Z0-9_-]+)/,           // @username
    /channel\/([a-zA-Z0-9_-]+)/,   // channel/ID
    /c\/([a-zA-Z0-9_-]+)/,          // c/name
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  throw new Error('Could not extract channel ID from URL');
}

// Buscar vídeos do canal usando YouTube Data API v3
async function fetchChannelVideos(apiKey: string, channelId: string): Promise<YouTubeVideo[]> {
  try {
    // Primeiro, buscar o canal pelo username/handle
    let actualChannelId = channelId;
    
    // Se é um handle (@username), precisamos buscar o channel ID real
    if (!channelId.startsWith('UC')) {
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${channelId}&key=${apiKey}`
      );
      
      if (!searchResponse.ok) {
        throw new Error('Failed to search channel');
      }
      
      const searchData = await searchResponse.json();
      if (searchData.items && searchData.items.length > 0) {
        actualChannelId = searchData.items[0].snippet.channelId;
      }
    }

    console.log('Fetching videos for channel:', actualChannelId);

    // Buscar playlist de uploads do canal
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${actualChannelId}&key=${apiKey}`
    );

    if (!channelResponse.ok) {
      throw new Error('Failed to fetch channel details');
    }

    const channelData = await channelResponse.json();
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found');
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    console.log('Uploads playlist ID:', uploadsPlaylistId);

    // Buscar vídeos da playlist (limitando a 50 para não sobrecarregar)
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`
    );

    if (!playlistResponse.ok) {
      throw new Error('Failed to fetch playlist items');
    }

    const playlistData = await playlistResponse.json();
    
    const videos: YouTubeVideo[] = playlistData.items.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.maxres?.url || 
                 item.snippet.thumbnails.high?.url || 
                 item.snippet.thumbnails.medium?.url,
      publishedAt: item.snippet.publishedAt,
    }));

    console.log(`Found ${videos.length} videos`);
    return videos;

  } catch (error) {
    console.error('Error fetching channel videos:', error);
    throw error;
  }
}

// Analisar vídeo com Gemini Vision
async function analyzeVideoWithGemini(
  apiKey: string,
  thumbnailUrl: string,
  videoTitle: string,
  videoDescription: string
): Promise<ExtractedStrategy | null> {
  try {
    // Download da thumbnail
    const imageResponse = await fetch(thumbnailUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um analisador especializado em estratégias de trading. Analise vídeos de trading do YouTube e extraia METODOLOGIA COMPLETA ensinada pelo instrutor.

IMPORTANTE: Extraia estratégias reais de trading, não apenas descrição visual. Identifique:
- Técnica ensinada (ex: FVG Bullish, Order Block, Break of Structure)
- Condições EXATAS para aplicar (timeframe, contexto de mercado, confluências)
- Regras de ENTRADA (onde entrar, por quê)
- Regras de SAÍDA (Stop Loss, Take Profit, trailing)
- Risk/Reward ratio recomendado
- Sinais visuais importantes (linhas, zonas, padrões)

Retorne JSON estruturado com estratégia extraída.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analise este vídeo de trading e extraia a estratégia/técnica ensinada:

Título: ${videoTitle}
Descrição: ${videoDescription}

Retorne JSON no formato:
{
  "setup_type": "tipo do setup (ex: FVG_BULLISH, ORDER_BLOCK_LONG)",
  "strategy_name": "nome da estratégia",
  "description": "descrição completa da técnica",
  "conditions": {
    "timeframe": "timeframe recomendado",
    "market_context": "contexto necessário",
    "confluences": ["confluência 1", "confluência 2"]
  },
  "entry_rules": {
    "where": "onde entrar",
    "why": "por que entrar",
    "price": "nível de preço (se mencionado)"
  },
  "exit_rules": {
    "stop_loss": "onde colocar SL",
    "take_profit": "onde colocar TP",
    "risk_reward": "ratio R:R"
  },
  "confidence_score": 0.85,
  "reasoning": "explicação do que foi identificado"
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Gemini response:', content);

    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const strategy = JSON.parse(jsonMatch[0]);
      return strategy;
    }

    return null;

  } catch (error) {
    console.error('Error analyzing with Gemini:', error);
    return null;
  }
}
