import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, X } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testingBinance, setTestingBinance] = useState(false);
  const [testingForex, setTestingForex] = useState(false);

  // Account Settings
  const [balance, setBalance] = useState("10000");
  const [leverage, setLeverage] = useState("20");
  const [riskPerTrade, setRiskPerTrade] = useState("0.06");
  const [maxPositions, setMaxPositions] = useState("3");
  const [paperMode, setPaperMode] = useState(true);
  const [autoTrading, setAutoTrading] = useState(false);

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
        .single();

      if (settings) {
        setBalance(settings.balance.toString());
        setLeverage(settings.leverage?.toString() || "20");
        setRiskPerTrade(settings.risk_per_trade?.toString() || "0.06");
        setMaxPositions(settings.max_positions?.toString() || "3");
        setPaperMode(settings.paper_mode ?? true);
        setAutoTrading(settings.auto_trading_enabled ?? false);
      }

      const { data: credentials } = await supabase
        .from("user_api_credentials")
        .select("broker_type, test_status, broker_name, encrypted_api_key, encrypted_api_secret")
        .eq("user_id", user.id);

      if (credentials) {
        credentials.forEach((cred) => {
          if (cred.broker_type === "binance") {
            setBinanceStatus(cred.test_status as any || "pending");
            setBinanceStatus(cred.test_status as any || "pending");
            // Only set keys if they are NOT masked/encrypted (legacy check)
            // Ideally backend should return masked version or nothing.
            // For now, we leave empty to force user to re-enter if they want to edit.
            // Or we could show a placeholder.
            if (cred.encrypted_api_key && !cred.encrypted_api_key.startsWith('eyJh')) {
              // If it looks like a real key (64 chars), show it? 
              // Security risk to show full key. Better to show empty or placeholder.
              // User asked: "trocar máscara por string vazia ao abrir"
              setBinanceKey("");
            }
            if (cred.encrypted_api_secret) setBinanceSecret("");
          } else if (cred.broker_type === "forex") {
            setForexStatus(cred.test_status as any || "pending");
            if (cred.broker_name) setForexBroker(cred.broker_name);
            if (cred.encrypted_api_key) setForexKey(cred.encrypted_api_key);
            if (cred.encrypted_api_secret) setForexSecret(cred.encrypted_api_secret);
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

      const { error } = await supabase
        .from("user_settings")
        .update({
          balance: parseFloat(balance),
          leverage: parseInt(leverage),
          risk_per_trade: parseFloat(riskPerTrade),
          max_positions: parseInt(maxPositions),
          paper_mode: paperMode,
          auto_trading_enabled: autoTrading,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "Suas configurações foram atualizadas com sucesso.",
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

  const saveBinanceKeys = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // TEMPORARY FIX: Saving keys directly (unencrypted) because backend cannot decrypt Edge Function keys yet.
      // The Edge Function call is disabled to ensure backend can read the keys.
      /*
      const { data, error } = await supabase.functions.invoke("encrypt-api-credentials", {
        body: {
          broker_type: "binance",
          api_key: binanceKey,
          api_secret: binanceSecret,
        },
      });

      if (error) {
        console.error("Edge function failed, trying direct insert", error);
      }
      */

      // Direct insert (Unencrypted for now)
      const trimmedKey = binanceKey.trim();
      const trimmedSecret = binanceSecret.trim();

      // If keys are empty, just delete the credentials (disconnect)
      if (!trimmedKey && !trimmedSecret) {
        await supabase
          .from("user_api_credentials")
          .delete()
          .eq("user_id", user.id)
          .eq("broker_type", "binance");

        setBinanceStatus("pending");
        toast({
          title: "Credenciais Removidas",
          description: "Suas chaves da Binance foram removidas com sucesso.",
        });
        setLoading(false);
        return;
      }

      if (!trimmedKey || !trimmedSecret) {
        throw new Error("Para conectar, você precisa preencher ambos os campos (Key e Secret). Para remover, limpe ambos.");
      }

      // Force delete existing credentials first to ensure clean state
      await supabase
        .from("user_api_credentials")
        .delete()
        .eq("user_id", user.id)
        .eq("broker_type", "binance");

      const { error: directError } = await supabase
        .from("user_api_credentials")
        .insert({
          user_id: user.id,
          broker_type: "binance",
          encrypted_api_key: trimmedKey, // Storing plain text
          encrypted_api_secret: trimmedSecret,
          test_status: "pending"
        });

      if (directError) throw directError;

      // Automatically disable Paper Mode and Enable Auto Trading when keys are added
      const { error: settingsError } = await supabase
        .from("user_settings")
        .update({
          paper_mode: false,
          auto_trading_enabled: true
        })
        .eq("user_id", user.id);

      if (settingsError) {
        console.error("Failed to auto-update settings:", settingsError);
      } else {
        setPaperMode(false);
        setAutoTrading(true);
        toast({
          title: "Modo Real Ativado",
          description: "Sua conta foi configurada para operar em Modo Real automaticamente.",
        });
      }

      setBinanceStatus("pending");
      toast({
        title: "API Keys salvas",
        description: "Suas credenciais da Binance foram salvas (Modo Direto).",
      });

      // Keys are NOT cleared so the user can see them
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

  const resetBinanceCredentials = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Call backend to delete keys
      const response = await fetch('http://localhost:3000/api/binance/keys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset credentials');
      }

      setBinanceKey("");
      setBinanceSecret("");
      setBinanceStatus("pending");

      toast({
        title: "Credenciais Resetadas",
        description: "Suas credenciais da Binance foram removidas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao resetar",
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate inputs before sending
      const trimmedKey = binanceKey.trim();
      const trimmedSecret = binanceSecret.trim();

      if (!trimmedKey || !trimmedSecret) {
        throw new Error("Preencha API Key e Secret para testar.");
      }

      if (trimmedKey.includes('••••') || trimmedSecret.includes('••••')) {
        throw new Error("Não é possível testar com valores mascarados. Digite as chaves reais.");
      }

      // Call backend to test connection
      const response = await fetch('http://localhost:3000/api/binance/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: trimmedKey,
          apiSecret: trimmedSecret,
          userId: user.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha na conexão');
      }

      setBinanceStatus("success");
      toast({
        title: "Conexão bem-sucedida",
        description: "Credenciais válidas e conexão estabelecida!",
      });
    } catch (error: any) {
      setBinanceStatus("failed");
      toast({
        title: "Erro na Conexão",
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

      if (error) {
        console.error("Edge function failed, trying direct insert", error);
        // Fallback: Direct insert (WARNING: Not encrypted)
        const { error: directError } = await supabase
          .from("user_api_credentials")
          .upsert({
            user_id: user.id,
            broker_type: "forex",
            broker_name: forexBroker,
            encrypted_api_key: forexKey, // Storing plain text as fallback
            encrypted_api_secret: forexSecret,
            test_status: "pending"
          }, { onConflict: "user_id, broker_type" });

        if (directError) throw directError;
      }

      setForexStatus("pending");
      toast({
        title: "API Keys salvas",
        description: "Suas credenciais Forex foram salvas.",
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
          <DialogDescription>
            Gerencie suas configurações de conta, APIs e preferências.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account">Conta</TabsTrigger>
            <TabsTrigger value="binance">Binance</TabsTrigger>
            <TabsTrigger value="forex">Forex</TabsTrigger>
            <TabsTrigger value="preferences">Preferências</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Saldo Inicial ($)</Label>
              <Input
                id="balance"
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
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

            <div className="flex items-center justify-between">
              <Label htmlFor="paper">Modo Paper Trading</Label>
              <Switch
                id="paper"
                checked={paperMode}
                onCheckedChange={setPaperMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="autotrading">Auto Trading (Executar Sinais)</Label>
              <Switch
                id="autotrading"
                checked={autoTrading}
                onCheckedChange={setAutoTrading}
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

            <div className="flex gap-2 flex-wrap">
              <Button onClick={saveBinanceKeys} disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
              <Button onClick={testBinanceConnection} disabled={testingBinance} variant="outline">
                {testingBinance && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Conexão
              </Button>
              <Button onClick={resetBinanceCredentials} disabled={loading} variant="destructive">
                Resetar Credenciais
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
