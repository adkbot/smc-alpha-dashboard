import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, X, AlertTriangle, RefreshCw } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testingBinance, setTestingBinance] = useState(false);
  const [testingForex, setTestingForex] = useState(false);
  const [syncingBalance, setSyncingBalance] = useState(false);
  
  // Account Settings
  const [balance, setBalance] = useState("10000");
  const [leverage, setLeverage] = useState("20");
  const [riskPerTrade, setRiskPerTrade] = useState("0.06");
  const [maxPositions, setMaxPositions] = useState("3");
  const [paperMode, setPaperMode] = useState(true);
  
  // Binance API
  const [binanceKey, setBinanceKey] = useState("");
  const [binanceSecret, setBinanceSecret] = useState("");
  const [binanceStatus, setBinanceStatus] = useState<"success" | "failed" | "pending">("pending");
  
  // Forex API
  const [forexBroker, setForexBroker] = useState("metatrader");
  const [forexKey, setForexKey] = useState("");
  const [forexSecret, setForexSecret] = useState("");
  const [forexStatus, setForexStatus] = useState<"success" | "failed" | "pending">("pending");

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settings) {
        setBalance(settings.balance.toString());
        setLeverage(settings.leverage?.toString() || "20");
        // Converter de decimal para porcentagem para exibição (0.06 -> 6)
        const riskValue = settings.risk_per_trade || 0.06;
        setRiskPerTrade(riskValue < 1 ? (riskValue * 100).toString() : riskValue.toString());
        setMaxPositions(settings.max_positions?.toString() || "3");
        setPaperMode(settings.paper_mode ?? true);
      }

      const { data: credentials } = await supabase
        .from("user_api_credentials")
        .select("broker_type, test_status, broker_name")
        .eq("user_id", user.id);

      if (credentials) {
        credentials.forEach((cred) => {
          if (cred.broker_type === "binance") {
            setBinanceStatus(cred.test_status as any || "pending");
          } else if (cred.broker_type === "forex") {
            setForexStatus(cred.test_status as any || "pending");
            if (cred.broker_name) setForexBroker(cred.broker_name);
          }
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const saveAccountSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Usar UPSERT em vez de UPDATE para criar se não existir
      // Converter risk_per_trade para decimal se for maior que 1 (ex: 10% -> 0.10)
      let riskValue = parseFloat(riskPerTrade);
      if (riskValue > 1) {
        riskValue = riskValue / 100; // Converter porcentagem para decimal
      }
      
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          balance: parseFloat(balance),
          leverage: parseInt(leverage),
          risk_per_trade: riskValue,
          max_positions: parseInt(maxPositions),
          paper_mode: paperMode,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Se desativou paper mode e tem Binance conectado, sincronizar saldo
      if (!paperMode && binanceStatus === "success") {
        await syncRealBalance();
      }

      toast({
        title: "Configurações salvas",
        description: paperMode 
          ? "Suas configurações foram atualizadas com sucesso."
          : "Modo REAL ativado. Saldo sincronizado da Binance.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncRealBalance = async () => {
    setSyncingBalance(true);
    try {
      // Buscar da conta FUTURES por padrão (onde geralmente está o saldo de trading)
      const { data, error } = await supabase.functions.invoke("sync-real-balance", {
        body: { broker_type: "binance", account_type: "futures" },
      });

      if (error) throw error;

      if (data?.success) {
        setBalance(data.balance.toString());
        const spotInfo = data.spotBalance > 0 ? `SPOT: $${data.spotBalance.toFixed(2)}` : '';
        const futuresInfo = data.futuresBalance > 0 ? `FUTURES: $${data.futuresBalance.toFixed(2)}` : '';
        const accountInfo = [spotInfo, futuresInfo].filter(Boolean).join(' | ');
        
        toast({
          title: "Saldo Sincronizado",
          description: `Total: $${data.balance.toFixed(2)}${accountInfo ? ` (${accountInfo})` : ''}`,
        });
      } else if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error: any) {
      console.error("Erro ao sincronizar saldo:", error);
      toast({
        title: "Erro ao sincronizar saldo",
        description: error.message || "Falha ao sincronizar",
        variant: "destructive",
      });
    } finally {
      setSyncingBalance(false);
    }
  };

  const saveBinanceKeys = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("encrypt-api-credentials", {
        body: {
          broker_type: "binance",
          api_key: binanceKey,
          api_secret: binanceSecret,
        },
      });

      if (error) throw error;

      setBinanceStatus("pending");
      toast({
        title: "API Keys salvas",
        description: "Suas credenciais da Binance foram criptografadas e salvas.",
      });
      
      setBinanceKey("");
      setBinanceSecret("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testBinanceConnection = async () => {
    setTestingBinance(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-broker-connection", {
        body: { broker_type: "binance" },
      });

      if (error) throw error;

      setBinanceStatus(data.status);
      
      if (data.status === "success") {
        toast({
          title: "Conexão bem-sucedida",
          description: data.message,
        });

        // Se não está em paper mode, sincronizar saldo automaticamente
        if (!paperMode) {
          await syncRealBalance();
        }
      } else {
        toast({
          title: "Falha na conexão",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setBinanceStatus("failed");
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingBinance(false);
    }
  };

  const saveForexKeys = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("encrypt-api-credentials", {
        body: {
          broker_type: "forex",
          api_key: forexKey,
          api_secret: forexSecret,
          broker_name: forexBroker,
        },
      });

      if (error) throw error;

      setForexStatus("pending");
      toast({
        title: "API Keys salvas",
        description: "Suas credenciais Forex foram criptografadas e salvas.",
      });
      
      setForexKey("");
      setForexSecret("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testForexConnection = async () => {
    setTestingForex(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-broker-connection", {
        body: { broker_type: "forex" },
      });

      if (error) throw error;

      setForexStatus(data.status);
      toast({
        title: data.status === "success" ? "Conexão bem-sucedida" : "Falha na conexão",
        description: data.message,
        variant: data.status === "success" ? "default" : "destructive",
      });
    } catch (error: any) {
      setForexStatus("failed");
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingForex(false);
    }
  };

  const StatusBadge = ({ status }: { status: "success" | "failed" | "pending" }) => {
    const variants = {
      success: { variant: "default" as const, icon: Check, text: "Conectado" },
      failed: { variant: "destructive" as const, icon: X, text: "Falha" },
      pending: { variant: "secondary" as const, icon: null, text: "Não testado" },
    };
    
    const { variant, icon: Icon, text } = variants[status];
    
    return (
      <Badge variant={variant} className="gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {text}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account">Conta</TabsTrigger>
            <TabsTrigger value="binance">Binance</TabsTrigger>
            <TabsTrigger value="forex">Forex</TabsTrigger>
            <TabsTrigger value="preferences">Preferências</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            {/* Aviso se modo REAL sem credenciais validadas */}
            {!paperMode && binanceStatus !== "success" && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-sm text-destructive">
                  <strong>Atenção:</strong> Modo REAL ativado mas credenciais Binance não validadas. 
                  Configure e teste suas credenciais na aba Binance.
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="balance">Saldo ($)</Label>
                {!paperMode && binanceStatus === "success" && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={syncRealBalance}
                    disabled={syncingBalance}
                    className="h-7 text-xs"
                  >
                    {syncingBalance ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Sincronizar Binance
                  </Button>
                )}
              </div>
              <Input
                id="balance"
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                disabled={!paperMode && binanceStatus === "success"}
              />
              {!paperMode && binanceStatus === "success" && (
                <p className="text-xs text-muted-foreground">
                  Saldo sincronizado da Binance. Use o botão para atualizar.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="leverage">Alavancagem</Label>
              <Input
                id="leverage"
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk">Risco por Operação (%)</Label>
              <Input
                id="risk"
                type="number"
                step="0.01"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxpos">Posições Simultâneas</Label>
              <Input
                id="maxpos"
                type="number"
                value={maxPositions}
                onChange={(e) => setMaxPositions(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <div>
                <Label htmlFor="paper" className="text-base">Modo Paper Trading</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {paperMode 
                    ? "Operações simuladas, sem dinheiro real" 
                    : "⚠️ MODO REAL - Operações com dinheiro real na Binance"}
                </p>
              </div>
              <Switch
                id="paper"
                checked={paperMode}
                onCheckedChange={setPaperMode}
              />
            </div>

            <Button onClick={saveAccountSettings} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </TabsContent>

          <TabsContent value="binance" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Status da Conexão</h3>
              <StatusBadge status={binanceStatus} />
            </div>

            {binanceStatus === "pending" && (
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-md flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="text-sm text-warning">
                  Credenciais não testadas. Clique em "Testar Conexão" para validar.
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="binance-key">API Key</Label>
              <Input
                id="binance-key"
                type="password"
                value={binanceKey}
                onChange={(e) => setBinanceKey(e.target.value)}
                placeholder="Sua API Key da Binance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="binance-secret">API Secret</Label>
              <Input
                id="binance-secret"
                type="password"
                value={binanceSecret}
                onChange={(e) => setBinanceSecret(e.target.value)}
                placeholder="Seu API Secret da Binance"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveBinanceKeys} disabled={loading || !binanceKey || !binanceSecret} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
              <Button onClick={testBinanceConnection} disabled={testingBinance} variant="outline">
                {testingBinance && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Conexão
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="forex" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Status da Conexão</h3>
              <StatusBadge status={forexStatus} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="broker">Broker</Label>
              <Select value={forexBroker} onValueChange={setForexBroker}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metatrader">MetaTrader</SelectItem>
                  <SelectItem value="xm">XM</SelectItem>
                  <SelectItem value="exness">Exness</SelectItem>
                  <SelectItem value="ic_markets">IC Markets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forex-key">API Key</Label>
              <Input
                id="forex-key"
                type="password"
                value={forexKey}
                onChange={(e) => setForexKey(e.target.value)}
                placeholder="Sua API Key Forex"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="forex-secret">API Secret</Label>
              <Input
                id="forex-secret"
                type="password"
                value={forexSecret}
                onChange={(e) => setForexSecret(e.target.value)}
                placeholder="Seu API Secret Forex"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveForexKeys} disabled={loading || !forexKey || !forexSecret} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
              <Button onClick={testForexConnection} disabled={testingForex} variant="outline">
                {testingForex && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Conexão
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configurações adicionais estarão disponíveis em breve.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};