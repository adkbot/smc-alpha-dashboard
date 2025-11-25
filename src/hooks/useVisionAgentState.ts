import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export const useVisionAgentState = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch agent state
  const { data: agentState, isLoading } = useQuery({
    queryKey: ["visionAgentState", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("vision_agent_state")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch learning statistics
  const { data: learningStats } = useQuery({
    queryKey: ["visionLearningStats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Count processed videos (use vision_agent_videos table)
      const { count: videosCount } = await supabase
        .from("vision_agent_videos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");

      // Count learned strategies
      const { count: strategiesCount } = await supabase
        .from("vision_learned_strategies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Count learned setups
      const { count: setupsCount } = await supabase
        .from("vision_learned_setups")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Count generated signals
      const { count: signalsCount } = await supabase
        .from("vision_agent_signals")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      return {
        videosWatched: videosCount || 0,
        strategiesLearned: strategiesCount || 0,
        setupsIdentified: setupsCount || 0,
        signalsGenerated: signalsCount || 0,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Initialize agent state
  const initializeAgent = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("vision_agent_state")
        .insert({
          user_id: user.id,
          status: "STOPPED",
          mode: "SHADOW",
          playlist_url: null,
          config: {
            seq_len: 30,
            frame_step: 5,
            channel_name: "Rafael Oliveira Trader Raiz",
            max_trades_day: 10,
            confidence_threshold: 0.70,
            safety_stop_loss_pct: 2.0,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visionAgentState"] });
      toast({
        title: "Vision Agent Initialized",
        description: "Agent state created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Initialization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update agent state
  const updateAgent = useMutation({
    mutationFn: async (updates: {
      status?: string;
      mode?: string;
      playlist_url?: string;
      config?: any;
    }) => {
      if (!user?.id || !agentState?.id) throw new Error("No agent state");

      const { data, error } = await supabase
        .from("vision_agent_state")
        .update(updates)
        .eq("id", agentState.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visionAgentState"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch failed videos count
  const { data: failedVideos } = useQuery({
    queryKey: ["visionFailedVideos", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { count } = await supabase
        .from("vision_agent_videos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "error");

      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  // Start video processing
  const startProcessing = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!agentState?.playlist_url) throw new Error("Playlist URL not configured");

      const { data, error } = await supabase.functions.invoke('vision-agent-process-videos', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visionAgentState"] });
      queryClient.invalidateQueries({ queryKey: ["visionLearningStats"] });
      queryClient.invalidateQueries({ queryKey: ["visionFailedVideos"] });
      
      // Handle different result types
      if (data.success === false || data.stats.payment_errors > 0) {
        toast({
          title: "⚠️ Créditos Insuficientes",
          description: "Adicione créditos Lovable AI em Settings → Workspace → Usage",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Processamento Concluído! 🎉",
          description: `${data.stats.videos_processed} vídeos processados, ${data.stats.strategies_learned} estratégias aprendidas!`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no Processamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reprocess failed videos
  const reprocessFailedVideos = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      // Delete failed videos so they can be reprocessed
      await supabase
        .from("vision_agent_videos")
        .delete()
        .eq("user_id", user.id)
        .eq("status", "error");

      // Trigger processing again
      const { data, error } = await supabase.functions.invoke('vision-agent-process-videos', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visionAgentState"] });
      queryClient.invalidateQueries({ queryKey: ["visionLearningStats"] });
      queryClient.invalidateQueries({ queryKey: ["visionFailedVideos"] });
      
      toast({
        title: "Reprocessamento Iniciado! 🔄",
        description: "Processando vídeos com falha novamente...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no Reprocessamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate connection status based on heartbeat
  const connectionStatus = agentState?.last_heartbeat 
    ? (() => {
        const lastHeartbeat = new Date(agentState.last_heartbeat);
        const now = new Date();
        const secondsSinceHeartbeat = (now.getTime() - lastHeartbeat.getTime()) / 1000;

        if (secondsSinceHeartbeat < 60) {
          return { 
            variant: "default", 
            label: "Conectado", 
            icon: "🟢",
            isConnected: true 
          };
        } else if (secondsSinceHeartbeat < 300) {
          return { 
            variant: "secondary", 
            label: "Reconectando", 
            icon: "🟡",
            isConnected: false 
          };
        } else {
          return { 
            variant: "destructive", 
            label: "Desconectado", 
            icon: "🔴",
            isConnected: false 
          };
        }
      })()
    : { 
        variant: "outline", 
        label: "Nunca conectado", 
        icon: "⚪",
        isConnected: false 
      };

  return {
    agentState,
    isLoading,
    learningStats,
    failedVideos,
    connectionStatus,
    initializeAgent: initializeAgent.mutate,
    updateAgent: updateAgent.mutate,
    startProcessing: startProcessing.mutate,
    reprocessFailedVideos: reprocessFailedVideos.mutate,
    isInitializing: initializeAgent.isPending,
    isUpdating: updateAgent.isPending,
    isProcessing: startProcessing.isPending,
    isReprocessing: reprocessFailedVideos.isPending,
  };
};
