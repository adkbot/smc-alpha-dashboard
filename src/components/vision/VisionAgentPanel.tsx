import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, Loader2, Eye, Video, Youtube, Save, Check, ExternalLink, GraduationCap, BookOpen, Target, TrendingUp, Shield } from "lucide-react";
import { useVisionAgentState } from "@/hooks/useVisionAgentState";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { VisionAgentAuth } from "./VisionAgentAuth";

export const VisionAgentPanel = () => {
  const { agentState, isLoading, learningStats, connectionStatus, initializeAgent, updateAgent, isUpdating } =
    useVisionAgentState();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(10);

  // Check authentication on mount
  useEffect(() => {
    const auth = sessionStorage.getItem("vision_admin_auth");
    setIsAuthenticated(auth === "true");
  }, []);

  // Sync states with database
  useEffect(() => {
    if (agentState) {
      setPlaylistUrl(agentState.playlist_url || "");
      if (agentState.config) {
        const config = agentState.config as any;
        setConfidenceThreshold((config.confidence_threshold || 0.70) * 100);
        setMaxTradesPerDay(config.max_trades_day || 10);
      }
    }
  }, [agentState]);

  // Render authentication modal if not authenticated
  if (!isAuthenticated) {
    return <VisionAgentAuth isOpen={!isAuthenticated} onAuthenticated={() => setIsAuthenticated(true)} />;
  }

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

  const handleSaveUrl = () => {
    if (playlistUrl.trim()) {
      updateAgent({ playlist_url: playlistUrl.trim() });
    }
  };

  const handleSaveConfig = () => {
    const config = (agentState?.config as any) || {};
    updateAgent({
      config: {
        ...config,
        confidence_threshold: confidenceThreshold / 100,
        max_trades_day: maxTradesPerDay,
      },
    });
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

  const hasLearning = (learningStats?.strategiesLearned || 0) > 0;
  const channelName = (agentState?.config as any)?.channel_name || "Rafael Oliveira Trader Raiz";

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-yellow-500" />
            Vision Agent (Admin)
          </h3>
          <div className="flex items-center gap-2">
            {connectionStatus && (
              <Badge variant={connectionStatus.variant as any} className="text-xs">
                {connectionStatus.icon} {connectionStatus.label}
              </Badge>
            )}
            <Badge className={statusColors[agentState.status as keyof typeof statusColors] || "bg-gray-500"}>
              {agentState.status}
            </Badge>
          </div>
        </div>

        {/* Strategy Status Badge */}
        {hasLearning ? (
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <GraduationCap className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-500">
                  ✅ Estratégia do Professor Ativa
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {channelName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {learningStats?.strategiesLearned} técnicas • {learningStats?.videosWatched} vídeos • {learningStats?.setupsIdentified} setups
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Loader2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  ⏳ Aguardando Aprendizado
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure o canal e inicie o agente
                </p>
              </div>
            </div>
          </div>
        )}

        {/* YouTube URL Configuration */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs flex items-center gap-1.5">
            <Youtube className="h-3.5 w-3.5 text-red-500" />
            Canal/Playlist do YouTube
          </Label>
          <div className="flex gap-1.5">
            <Input
              placeholder="https://www.youtube.com/@RafaelOliveira..."
              value={playlistUrl || agentState.playlist_url || ""}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              disabled={agentState.status === "RUNNING" || isUpdating}
              className="text-xs h-8"
            />
            <Button 
              size="sm" 
              onClick={handleSaveUrl}
              disabled={!playlistUrl.trim() || isUpdating}
              className="h-8 px-2"
            >
              <Save className="h-3 w-3" />
            </Button>
          </div>
          {agentState.playlist_url && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-green-500 flex items-center gap-1">
                <Check className="h-3 w-3" />
                URL configurada
              </p>
              <a 
                href={agentState.playlist_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Mode Selection */}
        <div className="space-y-1 pt-2 border-t">
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

        {/* Advanced Configuration */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-xs font-medium">Configurações</p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Confiança Mínima</Label>
              <span className="text-xs text-muted-foreground">{confidenceThreshold}%</span>
            </div>
            <Slider
              value={[confidenceThreshold]}
              onValueChange={(v) => setConfidenceThreshold(v[0])}
              min={50}
              max={95}
              step={5}
              disabled={agentState.status === "RUNNING" || isUpdating}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Max Trades por Dia</Label>
            <Input
              type="number"
              value={maxTradesPerDay}
              onChange={(e) => setMaxTradesPerDay(parseInt(e.target.value) || 0)}
              disabled={agentState.status === "RUNNING" || isUpdating}
              min={1}
              max={100}
              className="text-xs h-8"
            />
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={agentState.status === "RUNNING" || isUpdating}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Save className="h-3 w-3 mr-1" />
            Salvar Configurações
          </Button>
        </div>

        {/* Learning Statistics */}
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Aprendizado
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Video className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Vídeos</p>
              </div>
              <p className="text-lg font-bold">{learningStats?.videosWatched || 0}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <GraduationCap className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Estratégias</p>
              </div>
              <p className="text-lg font-bold">{learningStats?.strategiesLearned || 0}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Setups</p>
              </div>
              <p className="text-lg font-bold">{learningStats?.setupsIdentified || 0}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Sinais</p>
              </div>
              <p className="text-lg font-bold">{learningStats?.signalsGenerated || 0}</p>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 pt-2">
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
