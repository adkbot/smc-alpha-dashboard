import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Eye, Video, TrendingUp, AlertTriangle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { VisionAgentSettings as VisionAgentSettingsType, VisionAgentVideo } from "@/integrations/supabase/types-vision-agent";

const VisionAgentSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Partial<VisionAgentSettingsType>>({
    enabled: false,
    mode: "SHADOW",
    confidence_threshold: 0.70,
    youtube_playlist_url: "",
    youtube_channel_url: "",
    model_version: "model_seq_v20251125.h5",
    auto_process_new_videos: false,
    max_signals_per_day: 50,
    min_video_duration_seconds: 60,
    max_video_duration_seconds: 3600,
    frame_step: 5,
    sequence_length: 30,
    trading_symbol: "BTCUSDT",
    trading_interval: "1m",
    trading_platform: "BINANCE",
  });
  const [videos, setVideos] = useState<VisionAgentVideo[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const handleUnlock = () => {
    if (password === "28034050An") {
      setIsAuthenticated(true);
      toast({
        title: "🔓 Acesso Liberado",
        description: "Você agora tem acesso às configurações.",
      });
    } else {
      toast({
        title: "❌ Senha Incorreta",
        description: "A senha fornecida não é válida.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchVideos();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      // Fetch GLOBAL settings (the first one created, effectively system settings)
      const { data, error } = await supabase
        .from("vision_agent_settings")
        .select("*")
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // If no settings exist, create one for the current user (Admin)
        // This will become the global setting
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchVideos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("vision_agent_videos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar vídeos:", error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Validações
      if (settings.confidence_threshold && (settings.confidence_threshold < 0.5 || settings.confidence_threshold > 1)) {
        throw new Error("Confidence threshold deve estar entre 0.50 e 1.00");
      }

      if (settings.max_signals_per_day && settings.max_signals_per_day < 1) {
        throw new Error("Máximo de sinais por dia deve ser no mínimo 1");
      }

      // Prepare settings for save (remove id if present for insert, keep for update)
      const { id, ...settingsData } = settings;
      const cleanSettings = {
        ...settingsData,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (settings.id) {
        // Update existing global settings
        result = await supabase
          .from("vision_agent_settings")
          .update(cleanSettings)
          .eq("id", settings.id);
        error = updateError;
      } else {
        // Create new global settings
        const { error: insertError } = await supabase
          .from("vision_agent_settings")
          .insert({
            ...cleanSettings,
            user_id: user.id, // Assign to the admin user on creation
          });
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "✅ Configurações salvas",
        description: "As configurações do Vision Agent foram atualizadas com sucesso",
      });

      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVideoStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", color: "bg-gray-500/10 text-gray-500", icon: "⏸️" },
      processing: { label: "Processando", color: "bg-blue-500/10 text-blue-500", icon: "⏳" },
      completed: { label: "Completo", color: "bg-green-500/10 text-green-500", icon: "✅" },
      failed: { label: "Erro", color: "bg-red-500/10 text-red-500", icon: "❌" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant="outline" className={config.color}>
        {config.icon} {config.label}
      </Badge>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <Card className="p-6 w-full max-w-md">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">Acesso Restrito</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Digite a senha de administrador para acessar as configurações do Vision Agent.
            </p>
            {user?.email !== "ks10bot@gmail.com" && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
                ⚠️ Apenas a conta ADMIN (ks10bot@gmail.com) pode alterar estas configurações.
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha..."
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              />
              <Button onClick={handleUnlock} disabled={user?.email !== "ks10bot@gmail.com"}>
                Desbloquear
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Eye className="w-6 h-6" />
                Configurações do Vision Agent
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure o agente de visão computacional para processar vídeos e gerar sinais de trading
              </p>
            </div>
          </div>

          <Button onClick={saveSettings} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="youtube">YouTube</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
            <TabsTrigger value="videos">Vídeos ({videos.length})</TabsTrigger>
          </TabsList>

          {/* Tab: Geral */}
          <TabsContent value="general" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Configurações Gerais</h3>

              <div className="space-y-6">
                {/* Ativar/Desativar */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativar Vision Agent</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite que o agente processe vídeos e gere sinais
                    </p>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enabled: checked })
                    }
                  />
                </div>

                <Separator />

                {/* Modo de Operação */}
                <div className="space-y-2">
                  <Label>Modo de Operação</Label>
                  <Select
                    value={settings.mode}
                    onValueChange={(value: any) => setSettings({ ...settings, mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SHADOW">
                        👁️ SHADOW - Apenas observa (recomendado)
                      </SelectItem>
                      <SelectItem value="PAPER">📄 PAPER - Simulação</SelectItem>
                      <SelectItem value="LIVE">💰 LIVE - Operação real</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {settings.mode === "SHADOW" && "O agente apenas registra sinais sem executar"}
                    {settings.mode === "PAPER" && "Sinais são enviados para o bot em modo paper"}
                    {settings.mode === "LIVE" && "⚠️ Sinais são executados com dinheiro real!"}
                  </p>
                </div>

                {settings.mode === "LIVE" && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-red-500">
                      <p className="font-bold mb-1">⚠️ ATENÇÃO - MODO LIVE</p>
                      <p>
                        Neste modo, o Vision Agent executará ordens REAIS com dinheiro real.
                        Certifique-se de que o modelo foi validado extensivamente antes de ativar.
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Trading Platform */}
                <div className="space-y-2">
                  <Label>Plataforma de Negociação</Label>
                  <Select
                    value={settings.trading_platform || "BINANCE"}
                    onValueChange={(value: any) => setSettings({ ...settings, trading_platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BINANCE">Binance (Crypto)</SelectItem>
                      <SelectItem value="FOREX">Forex (MetaTrader/Oanda)</SelectItem>
                      <SelectItem value="B3">B3 (Bovespa)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selecione a plataforma onde as operações serão realizadas
                  </p>
                </div>

                {/* Trading Symbol */}
                <div className="space-y-2">
                  <Label>Ativo para Operação (Scanner)</Label>
                  <Input
                    value={settings.trading_symbol || "BTCUSDT"}
                    onChange={(e) => setSettings({ ...settings, trading_symbol: e.target.value.toUpperCase() })}
                    placeholder={settings.trading_platform === 'FOREX' ? 'EURUSD' : 'BTCUSDT'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Símbolo do ativo (ex: BTCUSDT para Binance, EURUSD para Forex)
                  </p>
                </div>

                {/* Trading Interval */}
                <div className="space-y-2">
                  <Label>Timeframe (Scanner)</Label>
                  <Select
                    value={settings.trading_interval || "1m"}
                    onValueChange={(value: any) => setSettings({ ...settings, trading_interval: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 Minuto</SelectItem>
                      <SelectItem value="5m">5 Minutos</SelectItem>
                      <SelectItem value="15m">15 Minutos</SelectItem>
                      <SelectItem value="1h">1 Hora</SelectItem>
                      <SelectItem value="4h">4 Horas</SelectItem>
                      <SelectItem value="1d">1 Dia</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Intervalo de tempo para análise em tempo real
                  </p>
                </div>

                <Separator />

                {/* Confidence Threshold */}
                <div className="space-y-2">
                  <Label>Confidence Threshold</Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="1"
                    step="0.01"
                    value={settings.confidence_threshold}
                    onChange={(e) =>
                      setSettings({ ...settings, confidence_threshold: parseFloat(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Confiança mínima para aceitar um sinal (0.50 a 1.00). Recomendado: 0.70 ou superior
                  </p>
                </div>

                {/* Max Signals Per Day */}
                <div className="space-y-2">
                  <Label>Máximo de Sinais por Dia</Label>
                  <Input
                    type="number"
                    min="1"
                    max="200"
                    value={settings.max_signals_per_day}
                    onChange={(e) =>
                      setSettings({ ...settings, max_signals_per_day: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite de sinais que o agente pode gerar por dia
                  </p>
                </div>

                {/* Modelo */}
                <div className="space-y-2">
                  <Label>Versão do Modelo</Label>
                  <Input
                    value={settings.model_version}
                    onChange={(e) => setSettings({ ...settings, model_version: e.target.value })}
                    placeholder="model_seq_v20251125.h5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome do arquivo do modelo LSTM/Transformer a ser utilizado
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab: YouTube */}
          <TabsContent value="youtube" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Configuração do YouTube</h3>

              <div className="space-y-6">
                {/* URL da Playlist */}
                <div className="space-y-2">
                  <Label>URL da Playlist do YouTube</Label>
                  <Input
                    value={settings.youtube_playlist_url || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, youtube_playlist_url: e.target.value })
                    }
                    placeholder="https://www.youtube.com/playlist?list=..."
                  />
                  <p className="text-xs text-muted-foreground">
                    URL completa da playlist do professor que você deseja que o agente assista
                  </p>
                </div>

                {/* URL do Canal */}
                <div className="space-y-2">
                  <Label>URL do Canal (Opcional)</Label>
                  <Input
                    value={settings.youtube_channel_url || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, youtube_channel_url: e.target.value })
                    }
                    placeholder="https://www.youtube.com/@canal"
                  />
                  <p className="text-xs text-muted-foreground">
                    Processar todos os vídeos de um canal específico
                  </p>
                </div>

                {/* Auto Process */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Processar Novos Vídeos Automaticamente</Label>
                    <p className="text-xs text-muted-foreground">
                      O agente verificará periodicamente por novos vídeos
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_process_new_videos}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, auto_process_new_videos: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <Video className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-500">
                    <p className="font-bold mb-1">💡 Dica</p>
                    <p>
                      Cole a URL da playlist ou canal do professor que ensina a técnica de trading.
                      O Vision Agent assistirá todos os vídeos e aprenderá os padrões.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Avançado */}
          <TabsContent value="advanced" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Configurações Avançadas</h3>

              <div className="space-y-6">
                {/* Min Video Duration */}
                <div className="space-y-2">
                  <Label>Duração Mínima do Vídeo (segundos)</Label>
                  <Input
                    type="number"
                    min="10"
                    max="600"
                    value={settings.min_video_duration_seconds}
                    onChange={(e) =>
                      setSettings({ ...settings, min_video_duration_seconds: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Vídeos menores que este valor serão ignorados
                  </p>
                </div>

                {/* Max Video Duration */}
                <div className="space-y-2">
                  <Label>Duração Máxima do Vídeo (segundos)</Label>
                  <Input
                    type="number"
                    min="300"
                    max="10800"
                    value={settings.max_video_duration_seconds}
                    onChange={(e) =>
                      setSettings({ ...settings, max_video_duration_seconds: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Vídeos maiores que este valor serão ignorados
                  </p>
                </div>

                {/* Frame Step */}
                <div className="space-y-2">
                  <Label>Frame Step</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.frame_step}
                    onChange={(e) =>
                      setSettings({ ...settings, frame_step: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Processar 1 frame a cada N frames (maior = mais rápido, menor = mais preciso)
                  </p>
                </div>

                {/* Sequence Length */}
                <div className="space-y-2">
                  <Label>Sequence Length</Label>
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={settings.sequence_length}
                    onChange={(e) =>
                      setSettings({ ...settings, sequence_length: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Número de frames consecutivos usados para inferência do modelo
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Vídeos */}
          <TabsContent value="videos" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Histórico de Vídeos</h3>
                <Button size="sm" variant="outline" onClick={fetchVideos}>
                  Atualizar
                </Button>
              </div>

              {videos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum vídeo processado ainda</p>
                  <p className="text-xs mt-1">
                    Configure uma playlist e ative o agente para começar
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Video className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <h4 className="font-medium text-foreground truncate">
                              {video.title || "Vídeo sem título"}
                            </h4>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>ID: {video.video_id}</span>
                            {video.channel && <span>Canal: {video.channel}</span>}
                          </div>

                          {video.status === "processing" && video.total_frames && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium text-foreground">
                                  {Math.round((video.processed_frames / video.total_frames) * 100)}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 transition-all duration-300"
                                  style={{
                                    width: `${(video.processed_frames / video.total_frames) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {video.status === "completed" && (
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="text-green-500 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {video.signals_generated} sinais gerados
                              </span>
                              <span className="text-muted-foreground">
                                {new Date(video.processing_completed_at!).toLocaleString()}
                              </span>
                            </div>
                          )}

                          {video.status === "failed" && video.error_message && (
                            <p className="text-xs text-red-500 mt-2">{video.error_message}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {getVideoStatusBadge(video.status)}
                          {video.model_version && (
                            <Badge variant="outline" className="text-[10px]">
                              {video.model_version}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VisionAgentSettings;
