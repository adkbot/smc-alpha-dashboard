import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Target, Activity } from "lucide-react";
import { useState } from "react";
import { useMultiTimeframeAnalysis } from "@/hooks/useMultiTimeframeAnalysis";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Multi-Timeframe Analysis
  const { data: mtfData, loading: mtfLoading } = useMultiTimeframeAnalysis(symbol, interval);
  
  // Encontrar análise do timeframe atual
  const currentTFAnalysis = mtfData?.analysis.find(tf => tf.timeframe === interval);

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

      {/* Análise do Timeframe Atual */}
      <div className="p-4 border-b border-border bg-gradient-to-br from-primary/5 to-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
              Análise {interval.toUpperCase()}
            </h3>
          </div>
          <Badge variant="outline" className="text-xs border-primary text-primary">
            Ativo
          </Badge>
        </div>
        
        {mtfLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : currentTFAnalysis ? (
          <Card className="p-3 bg-secondary/50 border-primary/30">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Tendência:</span>
                <Badge 
                  variant="outline" 
                  className={`text-sm font-bold ${
                    currentTFAnalysis.trend === 'ALTA' 
                      ? 'text-success border-success' 
                      : currentTFAnalysis.trend === 'BAIXA'
                      ? 'text-destructive border-destructive'
                      : 'text-muted-foreground border-muted'
                  }`}
                >
                  {currentTFAnalysis.trend} {currentTFAnalysis.trend === 'ALTA' ? '↑' : currentTFAnalysis.trend === 'BAIXA' ? '↓' : '─'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Confiança:</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        currentTFAnalysis.confidence >= 70 ? 'bg-success' : 
                        currentTFAnalysis.confidence >= 40 ? 'bg-warning' : 
                        'bg-destructive'
                      }`}
                      style={{ width: `${currentTFAnalysis.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {currentTFAnalysis.confidence}%
                  </span>
                </div>
              </div>
              
              {currentTFAnalysis.lastBOS && (
                <div className="flex justify-between items-center pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground">Último BOS:</span>
                  <span className="text-xs font-mono text-foreground">
                    {new Date(currentTFAnalysis.lastBOS).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="text-center text-xs text-muted-foreground py-4">
            Sem dados para este timeframe
          </div>
        )}
      </div>

      {/* Multi-Timeframe Overview */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Contexto Multi-Timeframe
          </h3>
        </div>
        
        {mtfLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : mtfData ? (
          <>
            {/* Compact Timeframes Grid */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {mtfData.analysis.map((tf) => (
                <div 
                  key={tf.timeframe} 
                  className={`p-1 text-center rounded ${
                    tf.timeframe === interval 
                      ? 'bg-primary/20 border border-primary' 
                      : 'bg-secondary'
                  }`}
                >
                  <div className="text-[10px] font-bold text-muted-foreground">
                    {tf.timeframe}
                  </div>
                  <div className={`text-xs font-bold ${
                    tf.trend === 'ALTA' 
                      ? 'text-success' 
                      : tf.trend === 'BAIXA'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}>
                    {tf.trend === 'ALTA' ? '↑' : tf.trend === 'BAIXA' ? '↓' : '─'}
                  </div>
                </div>
              ))}
            </div>

            {/* Alignment Status */}
            <Card className="p-2 bg-secondary/50 border-border">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Alinhamento:</span>
                <Badge 
                  variant="outline"
                  className={`text-[10px] ${
                    mtfData.alignmentPercentage >= 70 
                      ? 'text-success border-success'
                      : mtfData.alignmentPercentage >= 40
                      ? 'text-warning border-warning'
                      : 'text-destructive border-destructive'
                  }`}
                >
                  {mtfData.alignmentPercentage >= 70 ? '🟢' : mtfData.alignmentPercentage >= 40 ? '🟡' : '🔴'} 
                  {' '}{mtfData.alignmentPercentage}% • {mtfData.dominantBias}
                </Badge>
              </div>
            </Card>
          </>
        ) : (
          <div className="text-center text-xs text-muted-foreground py-4">
            Erro ao carregar análise
          </div>
        )}
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
