import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, RefreshCw, LogOut, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-2 md:px-4 shrink-0">
      {/* Left side - Logo and selectors */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1 md:gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <h1 className="text-sm md:text-lg font-bold tracking-wider">
            <span className="text-foreground">SMC</span>
            <span className="text-primary ml-1">PRO</span>
            {!isMobile && (
              <span className="text-xs text-accent ml-2 px-2 py-0.5 border border-accent rounded">
                AI POWERED
              </span>
            )}
          </h1>
        </div>
        
        {!isMobile && <div className="h-6 w-px bg-border"></div>}
        
        <Select value={symbol} onValueChange={onSymbolChange}>
          <SelectTrigger className="w-[100px] md:w-[140px] h-8 text-xs md:text-sm bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
            <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
            <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
            <SelectItem value="XRPUSDT">XRP/USDT</SelectItem>
            <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={interval} onValueChange={onIntervalChange}>
          <SelectTrigger className="w-[70px] md:w-[120px] h-8 text-xs md:text-sm bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">1 Minuto</SelectItem>
            <SelectItem value="5m">5 Minutos</SelectItem>
            <SelectItem value="15m">15 Minutos</SelectItem>
            <SelectItem value="30m">30 Minutos</SelectItem>
            <SelectItem value="1h">1 Hora</SelectItem>
            <SelectItem value="4h">4 Horas</SelectItem>
            <SelectItem value="1d">1 Dia</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Right side - Actions */}
      <div className="flex items-center gap-2 md:gap-4 text-sm">
        {/* Mobile: Menu dropdown */}
        {isMobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-10 w-10 p-0">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button size="sm" variant="outline" className="h-8">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
            
            <div className="h-6 w-px bg-border"></div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
              <span className="text-muted-foreground text-xs">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            
            <span className="font-mono text-foreground">{time}</span>
          </>
        )}
        
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </header>
  );
};
