import { Button } from "@/components/ui/button";
import { Settings, LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface TopBarProps {
  symbol: string;
  interval: string;
  onSymbolChange: (symbol: string) => void;
  onIntervalChange: (interval: string) => void;
}

export const TopBar = ({ symbol, interval, onSymbolChange, onIntervalChange }: TopBarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
      {/* Left side - Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <h1 className="text-lg font-bold tracking-wider">
            <span className="text-foreground">SMC</span>
            <span className="text-primary ml-1">PRO</span>
            <span className="text-xs text-accent ml-2 px-2 py-0.5 border border-accent rounded">
              AI POWERED
            </span>
          </h1>
        </div>

        <div className="h-6 w-px bg-border"></div>

        {/* Simplified Selectors - Using Native HTML */}
        <select
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="h-8 px-3 text-sm bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="BTCUSDT">BTC/USDT</option>
          <option value="ETHUSDT">ETH/USDT</option>
          <option value="SOLUSDT">SOL/USDT</option>
          <option value="XRPUSDT">XRP/USDT</option>
          <option value="BNBUSDT">BNB/USDT</option>
        </select>

        <select
          value={interval}
          onChange={(e) => onIntervalChange(e.target.value)}
          className="h-8 px-3 text-sm bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="1m">1 Minuto</option>
          <option value="5m">5 Minutos</option>
          <option value="15m">15 Minutos</option>
          <option value="30m">30 Minutos</option>
          <option value="1h">1 Hora</option>
          <option value="4h">4 Horas</option>
          <option value="1d">1 Dia</option>
        </select>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-4">
        <Button
          size="sm"
          variant="ghost"
          className="h-8"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success"></div>
          <span className="text-muted-foreground text-xs">Conectado</span>
        </div>
      </div>
    </header>
  );
};
