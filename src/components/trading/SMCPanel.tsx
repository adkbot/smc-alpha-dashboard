import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Target } from "lucide-react";
import { useState } from "react";

interface SMCPanelProps {
  symbol: string;
  interval: string;
}

export const SMCPanel = ({ symbol, interval }: SMCPanelProps) => {
  const [trend] = useState<"ALTA" | "BAIXA" | "NEUTRO">("ALTA");
  const [pdStatus] = useState("Discount (Barato)");
  const [signals] = useState([
    {
      id: 1,
      type: "COMPRA",
      entry: 42350.50,
      sl: 42100.00,
      tp: 42975.00,
      rr: 2.5,
      time: new Date().toLocaleTimeString(),
    }
  ]);

  const getTrendColor = () => {
    if (trend === "ALTA") return "text-success border-success";
    if (trend === "BAIXA") return "text-destructive border-destructive";
    return "text-muted-foreground border-muted";
  };

  return (
    <div className="flex flex-col">
      {/* AI Copilot Section */}
      <div className="p-4 border-b border-border bg-gradient-to-br from-accent/10 to-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h3 className="text-xs font-bold text-accent uppercase tracking-wider">
              SMC AI Copilot
            </h3>
          </div>
          <Badge variant="outline" className="text-xs border-accent text-accent">
            Gemini
          </Badge>
        </div>
        
        <Button 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mb-3"
          size="sm"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Analisar Viés de Mercado
        </Button>

        <Card className="p-3 bg-secondary/50 border-accent/30 text-xs text-muted-foreground">
          <p className="mb-2">
            <strong className="text-foreground">Viés Atual:</strong> Estrutura de alta confirmada com BOS recente.
          </p>
          <p>
            <strong className="text-foreground">Recomendação:</strong> Aguardar pullback para zona de desconto antes de entrada.
          </p>
        </Card>
      </div>

      {/* Market Structure */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Estrutura de Mercado
          </h3>
          <Badge variant="outline" className={getTrendColor()}>
            {trend}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3 bg-secondary border-border">
            <div className="text-xs text-muted-foreground mb-1">Último BOS</div>
            <div className="text-sm font-bold text-foreground font-mono">14:32:15</div>
          </Card>
          
          <Card className="p-3 bg-secondary border-border">
            <div className="text-xs text-muted-foreground mb-1">Último CHOCH</div>
            <div className="text-sm font-bold text-foreground font-mono">12:15:08</div>
          </Card>
        </div>
      </div>

      {/* Premium/Discount */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Range & Filtro
        </h3>
        
        <Card className="p-3 bg-secondary border-border relative overflow-hidden">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Posição no Range</span>
            <span className="font-bold text-foreground">{pdStatus}</span>
          </div>
          
          {/* PD Bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
            <div className="w-1/2 bg-destructive/30 border-r border-border"></div>
            <div className="w-1/2 bg-success/30"></div>
          </div>
          
          <div 
            className="w-1 h-3 bg-foreground absolute top-10 transition-all duration-500"
            style={{ left: '35%' }}
          ></div>
          
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Premium (Venda)</span>
            <span>Discount (Compra)</span>
          </div>
        </Card>
      </div>

      {/* Active Signals */}
      <div className="p-4 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Sinais Ativos
          </h3>
        </div>
        
        {signals.length > 0 ? (
          <div className="space-y-2">
            {signals.map((signal) => (
              <Card
                key={signal.id}
                className={`p-3 border-l-4 ${
                  signal.type === "COMPRA"
                    ? "border-l-success bg-success/5"
                    : "border-l-destructive bg-destructive/5"
                } animate-pulse-slow`}
              >
                <div className="flex justify-between items-center mb-2">
                  <Badge
                    variant={signal.type === "COMPRA" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {signal.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {signal.time}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Entrada:</span>
                  <span className="text-foreground font-mono font-bold">
                    ${signal.entry.toFixed(2)}
                  </span>
                  
                  <span className="text-muted-foreground">Stop:</span>
                  <span className="text-destructive font-mono">
                    ${signal.sl.toFixed(2)}
                  </span>
                  
                  <span className="text-muted-foreground">Alvo:</span>
                  <span className="text-success font-mono">
                    ${signal.tp.toFixed(2)}
                  </span>
                  
                  <span className="text-muted-foreground">R:R:</span>
                  <span className="text-primary font-mono font-bold">
                    1:{signal.rr}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-xs py-8">
            Aguardando formação de estrutura...
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border text-center">
        <span className="text-[10px] text-muted-foreground">
          SMC Engine v2.0 • Powered by Gemini & Binance
        </span>
      </div>
    </div>
  );
};
