import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, RefreshCw, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useToast } from "@/hooks/use-toast";

interface TopBarProps {
  symbol: string;
  interval: string;
  onSymbolChange: (symbol: string) => void;
  onIntervalChange: (interval: string) => void;
}

export const TopBar = ({ symbol, interval, onSymbolChange, onIntervalChange }: TopBarProps) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [isConnected, setIsConnected] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    // Simulate connection
    setTimeout(() => setIsConnected(true), 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  return (
    <header className="bg-card border-b border-border flex flex-col md:flex-row items-center justify-between p-2 md:px-4 shrink-0 gap-2 md:gap-0 min-h-[3.5rem] md:h-14">
      {/* Top Row on Mobile: Logo and Connection Status */}
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <h1 className="text-lg font-bold tracking-wider flex items-center">
            <span className="text-foreground">SMC</span>
            <span className="text-primary ml-1">PRO</span>
            <span className="text-xs text-accent ml-2 px-2 py-0.5 border border-accent rounded hidden sm:inline-block">
              AI POWERED
            </span>
          </h1>
        </div>

        {/* Connection Status (Visible on Mobile Top Right) */}
        <div className="flex items-center gap-2 md:hidden">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
          <span className="text-muted-foreground text-xs">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Bottom Row on Mobile: Controls and Actions */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end overflow-x-auto no-scrollbar pb-1 md:pb-0">

        <div className="flex items-center gap-2 shrink-0">
          <Select value={symbol} onValueChange={onSymbolChange}>
            <SelectTrigger className="w-[110px] md:w-[140px] h-8 text-xs md:text-sm bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
              <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
              <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
              <SelectItem value="XRPUSDT">XRP/USDT</SelectItem>
              <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
              <SelectItem value="ADAUSDT">ADA/USDT</SelectItem>
              <SelectItem value="DOGEUSDT">DOGE/USDT</SelectItem>
              <SelectItem value="DOTUSDT">DOT/USDT</SelectItem>
              <SelectItem value="MATICUSDT">MATIC/USDT</SelectItem>
              <SelectItem value="LTCUSDT">LTC/USDT</SelectItem>
              <SelectItem value="LINKUSDT">LINK/USDT</SelectItem>
              <SelectItem value="AVAXUSDT">AVAX/USDT</SelectItem>
              <SelectItem value="UNIUSDT">UNI/USDT</SelectItem>
              <SelectItem value="ATOMUSDT">ATOM/USDT</SelectItem>
              <SelectItem value="EURUSDT">EUR/USDT</SelectItem>
              <SelectItem value="GBPUSDT">GBP/USDT</SelectItem>
            </SelectContent>
          </Select>

          <Select value={interval} onValueChange={onIntervalChange}>
            <SelectTrigger className="w-[80px] md:w-[120px] h-8 text-xs md:text-sm bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1m</SelectItem>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="4h">4h</SelectItem>
              <SelectItem value="1d">1d</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-border hidden md:block"></div>

        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-8 px-2 md:px-4">
            <RefreshCw className="w-4 h-4 md:mr-2" />
            <span className="hidden lg:inline">Recarregar</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 md:px-4"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-4 h-4 md:mr-2" />
            <span className="hidden lg:inline">Config</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 md:px-4 text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 md:mr-2" />
            <span className="md:inline">Sair</span>
          </Button>
        </div>

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

        {/* Desktop Connection Status */}
        <div className="hidden md:flex items-center gap-2 ml-2">
          <div className="h-6 w-px bg-border"></div>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
          <span className="text-muted-foreground text-xs">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>
    </header>
  );
};
