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

      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          balance: parseFloat(balance),
          leverage: parseInt(leverage),
          risk_per_trade: parseFloat(riskPerTrade),
          max_positions: parseInt(maxPositions),
          paper_mode: paperMode,
        });

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
      toast({
        title: data.status === "success" ? "Conexão bem-sucedida" : "Falha na conexão",
        description: data.message,
        variant: data.status === "success" ? "default" : "destructive",
      });
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
