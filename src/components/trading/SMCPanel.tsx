import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";
import { useMultiTimeframeAnalysis } from "@/hooks/useMultiTimeframeAnalysis";
import { Skeleton } from "@/components/ui/skeleton";

interface SMCPanelProps {
  symbol: string;
  interval: string;
}

const getTrendIcon = (trend: string) => {
  if (trend === "ALTA") return <TrendingUp className="h-4 w-4 text-success" />;
  if (trend === "BAIXA") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const getTrendColorClass = (trend: string) => {
  if (trend === "ALTA") return "text-success";
  if (trend === "BAIXA") return "text-destructive";
  return "text-muted-foreground";
};

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

  // Multi-Timeframe Analysis
  const { data: mtfData, loading: mtfLoading } = useMultiTimeframeAnalysis(symbol, interval);

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

      {/* CONTEXTO SUPERIOR - TOP-DOWN */}
      {mtfLoading ? (
        <div className="p-4 border-b border-border">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : mtfData ? (
        <>
          <div className="p-3 border-b-2 border-primary bg-gradient-to-br from-primary/10 to-card">
            <h3 className="text-xs font-bold text-primary mb-2 uppercase flex items-center gap-1">
              🎯 Contexto Superior (Top-Down)
            </h3>
            
            {/* Grid dos 3 Timeframes Superiores */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <Card className="p-2 bg-secondary/50">
                <div className="text-[9px] text-muted-foreground mb-1">DIÁRIO</div>
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${getTrendColorClass(mtfData.higherTimeframes["1d"].trend)}`}>
                    {mtfData.higherTimeframes["1d"].trend}
                  </Badge>
                  {getTrendIcon(mtfData.higherTimeframes["1d"].trend)}
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">
                  BOS: {mtfData.higherTimeframes["1d"].lastBOS ? "✓" : "✗"} | 
                  CHOCH: {mtfData.higherTimeframes["1d"].lastCHOCH ? "✓" : "✗"}
                </div>
              </Card>
              
              <Card className="p-2 bg-secondary/50">
                <div className="text-[9px] text-muted-foreground mb-1">4 HORAS</div>
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${getTrendColorClass(mtfData.higherTimeframes["4h"].trend)}`}>
                    {mtfData.higherTimeframes["4h"].trend}
                  </Badge>
                  {getTrendIcon(mtfData.higherTimeframes["4h"].trend)}
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">
                  BOS: {mtfData.higherTimeframes["4h"].lastBOS ? "✓" : "✗"} | 
                  CHOCH: {mtfData.higherTimeframes["4h"].lastCHOCH ? "✓" : "✗"}
                </div>
              </Card>
              
              <Card className="p-2 bg-secondary/50">
                <div className="text-[9px] text-muted-foreground mb-1">1 HORA</div>
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${getTrendColorClass(mtfData.higherTimeframes["1h"].trend)}`}>
                    {mtfData.higherTimeframes["1h"].trend}
                  </Badge>
                  {getTrendIcon(mtfData.higherTimeframes["1h"].trend)}
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">
                  BOS: {mtfData.higherTimeframes["1h"].lastBOS ? "✓" : "✗"} | 
                  CHOCH: {mtfData.higherTimeframes["1h"].lastCHOCH ? "✓" : "✗"}
                </div>
              </Card>
            </div>
            
            {/* VIÉS DOMINANTE */}
            <Card className={`p-2 border-2 ${
              mtfData.dominantBias.bias === "ALTA" 
                ? "bg-success/10 border-success" 
                : mtfData.dominantBias.bias === "BAIXA"
                ? "bg-destructive/10 border-destructive"
                : "bg-secondary border-border"
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold">VIÉS DOMINANTE:</span>
                <div className="flex items-center gap-1">
                  <Badge className={`text-sm font-bold ${getTrendColorClass(mtfData.dominantBias.bias)}`}>
                    {mtfData.dominantBias.bias}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">
                    {mtfData.dominantBias.strength}
                  </Badge>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground">
                {mtfData.dominantBias.reasoning}
              </p>
            </Card>
          </div>

          {/* ANÁLISE DO TIMEFRAME ATUAL */}
          <div className="p-3 border-b border-border">
            <div className="p-3 border-2 rounded-lg bg-card/50" style={{
              borderColor: mtfData.currentTimeframe.alignedWithHigherTF 
                ? "hsl(var(--success))" 
                : "hsl(var(--warning))"
            }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold flex items-center gap-1">
                  📊 {mtfData.currentTimeframe.timeframe.toUpperCase()}
                </h3>
                <Badge variant={mtfData.currentTimeframe.alignedWithHigherTF ? "default" : "secondary"}>
                  {mtfData.currentTimeframe.alignedWithHigherTF ? "✓ ALINHADO" : "⚠ DIVERGENTE"}
                </Badge>
              </div>
              
              <Card className="p-2 mb-2 bg-secondary/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs">Tendência:</span>
                  <div className="flex items-center gap-1">
                    <Badge className={getTrendColorClass(mtfData.currentTimeframe.trend)}>
                      {mtfData.currentTimeframe.trend}
                    </Badge>
                    {getTrendIcon(mtfData.currentTimeframe.trend)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[9px] mt-2">
                  <div>
                    <span className="text-muted-foreground">BOS:</span> 
                    <span className="ml-1 font-bold">{mtfData.currentTimeframe.lastBOS ? "✓" : "✗"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CHOCH:</span> 
                    <span className="ml-1 font-bold">{mtfData.currentTimeframe.lastCHOCH ? "✓" : "✗"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conf:</span> 
                    <span className="ml-1 font-bold">{mtfData.currentTimeframe.confidence}%</span>
                  </div>
                </div>
              </Card>
              
              <div className="p-2 bg-muted/50 rounded text-[10px] mb-2">
                {mtfData.currentTimeframe.interpretation}
              </div>
              
              {mtfData.currentTimeframe.tradingOpportunity && (
                <Badge className="w-full justify-center bg-accent text-accent-foreground">
                  🎯 SETUP IDENTIFICADO
                </Badge>
              )}
            </div>
          </div>

          {/* OVERVIEW DE TODOS OS TIMEFRAMES */}
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-bold text-muted-foreground mb-2">Visão Geral</h3>
            <div className="grid grid-cols-7 gap-1">
              {mtfData.allTimeframes.map((tf) => (
                <div
                  key={tf.timeframe}
                  className={`p-1.5 rounded border text-center ${
                    tf.timeframe === interval 
                      ? 'border-primary bg-primary/20' 
                      : 'border-border bg-secondary/50'
                  }`}
                >
                  <div className="text-[9px] text-muted-foreground font-medium mb-0.5">
                    {tf.timeframe.toUpperCase()}
                  </div>
                  <Badge
                    variant={
                      tf.trend === "ALTA" 
                        ? "default" 
                        : tf.trend === "BAIXA"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-[8px] px-1 py-0 h-4"
                  >
                    {tf.trend === "ALTA" ? "▲" : tf.trend === "BAIXA" ? "▼" : "─"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

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
