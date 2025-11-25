import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Loader2, Eye, Video } from "lucide-react";
import { useVisionAgentState } from "@/hooks/useVisionAgentState";
import { Progress } from "@/components/ui/progress";

export const VisionAgentPanel = () => {
  const { agentState, isLoading, initializeAgent, updateAgent, isUpdating } =
    useVisionAgentState();

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!agentState) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Vision Agent
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Initialize Vision Agent to start analyzing trading videos
          </p>
          <Button
            onClick={() => initializeAgent()}
            disabled={isUpdating}
            size="sm"
            className="w-full"
          >
            Initialize Agent
          </Button>
        </div>
      </Card>
    );
  }

  const handleStart = () => {
    updateAgent({ status: "RUNNING" });
  };

  const handlePause = () => {
    updateAgent({ status: "PAUSED" });
  };

  const handleStop = () => {
    updateAgent({ status: "STOPPED" });
  };

  const handleModeChange = (mode: string) => {
    updateAgent({ mode });
  };

  const statusColors = {
    RUNNING: "bg-green-500",
    PAUSED: "bg-yellow-500",
    STOPPED: "bg-gray-500",
    PROCESSING: "bg-blue-500",
  };

  const modeColors = {
    SHADOW: "bg-purple-500",
    PAPER: "bg-blue-500",
    LIVE: "bg-red-500",
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Vision Agent
          </h3>
          <Badge className={statusColors[agentState.status as keyof typeof statusColors] || "bg-gray-500"}>
            {agentState.status}
          </Badge>
        </div>

        {/* Mode Selection */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Mode</p>
          <div className="flex gap-1">
            {["SHADOW", "PAPER", "LIVE"].map((mode) => (
              <Button
                key={mode}
                onClick={() => handleModeChange(mode)}
                disabled={agentState.status === "RUNNING" || isUpdating}
                size="sm"
                variant={agentState.mode === mode ? "default" : "outline"}
                className="flex-1 text-xs"
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleStart}
            disabled={agentState.status === "RUNNING" || isUpdating}
            size="sm"
            className="flex-1"
          >
            <Play className="h-3 w-3 mr-1" />
            Start
          </Button>
          <Button
            onClick={handlePause}
            disabled={agentState.status !== "RUNNING" || isUpdating}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Pause className="h-3 w-3 mr-1" />
            Pause
          </Button>
          <Button
            onClick={handleStop}
            disabled={agentState.status === "STOPPED" || isUpdating}
            size="sm"
            variant="destructive"
            className="flex-1"
          >
            <Square className="h-3 w-3 mr-1" />
            Stop
          </Button>
        </div>

        {/* Current Video Progress */}
        {agentState.current_video_title && (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Video className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {agentState.current_video_title}
                </p>
                <p className="text-xs text-muted-foreground">
                  Frame {agentState.current_frame || 0} / {agentState.total_frames || 0}
                </p>
              </div>
            </div>
            <Progress value={agentState.progress_percent || 0} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {(agentState.progress_percent || 0).toFixed(1)}%
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Model</p>
            <p className="text-xs font-medium">
              {agentState.model_version || "Not Set"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Update</p>
            <p className="text-xs font-medium">
              {agentState.last_heartbeat
                ? new Date(agentState.last_heartbeat).toLocaleTimeString()
                : "Never"}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
