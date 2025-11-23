import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Settings } from "lucide-react";
import { useState } from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";

export const AccountPanel = () => {
  const [balance] = useState(10000.00);
  const [pnl] = useState(450.23);
  const [pnlPercent] = useState(4.5);
  const [trades] = useState({ wins: 23, losses: 7, total: 30 });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const winRate = ((trades.wins / trades.total) * 100).toFixed(1);

  return (
    <div className="p-4 border-b border-border bg-card/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Conta de Trading
          </h3>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="w-3 h-3" />
        </Button>
        
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>

      {/* Balance Card */}
      <Card className="p-4 mb-3 bg-gradient-to-br from-card to-secondary border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase">Saldo Total</span>
          <Badge variant="outline" className="text-xs">
            Binance
          </Badge>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold font-mono text-foreground">
            ${balance.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {pnl >= 0 ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-destructive" />
          )}
          <span className={`text-sm font-mono ${pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
            ${Math.abs(pnl).toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent}%)
          </span>
          <span className="text-xs text-muted-foreground">hoje</span>
        </div>
      </Card>

      {/* Trading Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 bg-secondary border-border">
          <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
          <div className="text-lg font-bold text-success">{winRate}%</div>
        </Card>
        
        <Card className="p-3 bg-secondary border-border">
          <div className="text-xs text-muted-foreground mb-1">Wins</div>
          <div className="text-lg font-bold text-success">{trades.wins}</div>
        </Card>
        
        <Card className="p-3 bg-secondary border-border">
          <div className="text-xs text-muted-foreground mb-1">Losses</div>
          <div className="text-lg font-bold text-destructive">{trades.losses}</div>
        </Card>
      </div>

      {/* Sync Status */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Última sincronização</span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
          <span className="text-foreground font-mono">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};
