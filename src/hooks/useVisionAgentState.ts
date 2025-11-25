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

  return {
    agentState,
    isLoading,
    initializeAgent: initializeAgent.mutate,
    updateAgent: updateAgent.mutate,
    isInitializing: initializeAgent.isPending,
    isUpdating: updateAgent.isPending,
  };
};
