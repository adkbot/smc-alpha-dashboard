import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AgentLog {
  id: string;
  agent_name: string;
  status: string;
  asset: string;
  created_at: string;
  data: any;
}

export const TradingLogsPanel = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AgentLog[]>([]);

  const fetchLogs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("agent_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <Card className="p-4 m-4">
      <h3 className="font-bold mb-3 text-foreground">Logs de Execução</h3>

      <ScrollArea className="h-[80px]">
        {logs.map((log) => (
          <div
            key={log.id}
            className="text-xs mb-2 p-2 bg-muted rounded border border-border"
          >
            <div className="flex justify-between items-start mb-1">
              <Badge
                variant={log.status === "SUCCESS" ? "default" : "destructive"}
                className="text-[10px]"
              >
                {log.agent_name}
              </Badge>
              <span className="text-muted-foreground text-[10px]">
                {new Date(log.created_at).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-foreground">{log.asset}</span>
              <span
                className={
                  log.status === "SUCCESS" ? "text-success" : "text-destructive"
                }
              >
                {log.status}
              </span>
            </div>
            {log.data && (
              <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                {log.data.direction && `${log.data.direction} `}
                {log.data.executedPrice && `@ $${log.data.executedPrice}`}
              </div>
            )}
          </div>
        ))}

        {logs.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            Nenhum log ainda
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
