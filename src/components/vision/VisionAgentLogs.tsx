import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, MinusCircle } from "lucide-react";

export const VisionAgentLogs = () => {
  const { user } = useAuth();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["visionAgentLogs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("vision_agent_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "ENTER":
        return <TrendingUp className="h-3 w-3" />;
      case "EXIT":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <MinusCircle className="h-3 w-3" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "ENTER":
        return "bg-green-500";
      case "EXIT":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Vision Agent Signals</h3>
        <ScrollArea className="h-[200px]">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading logs...</p>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded border border-border/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <Badge className={getActionColor(log.action)}>
                      <span className="flex items-center gap-1">
                        {getActionIcon(log.action)}
                        {log.action}
                      </span>
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {(log.confidence * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {log.symbol || "WIN$"}
                    </span>
                    <span className="text-muted-foreground">
                      Frame {log.frame_index}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at || "").toLocaleString()}
                  </p>
                  {log.executed && (
                    <Badge variant="secondary" className="text-xs">
                      Executed: {log.execution_result}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No signals detected yet
            </p>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
};
