import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Activity, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { MTFAnalysis, TraderRaizChecklist, IALearningData } from "@/hooks/useMultiTimeframeAnalysis";
import { Skeleton } from "@/components/ui/skeleton";

interface SMCPanelProps {
  symbol: string;
  interval: string;
  mtfData?: MTFAnalysis | null;
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

export const SMCPanel = ({ symbol, interval, mtfData }: SMCPanelProps) => {
  const [trend] = useState<"ALTA" | "BAIXA" | "NEUTRO">("ALTA");

  const mtfLoading = !mtfData;
  
  // Real-time price state
  const [realtimePrice, setRealtimePrice] = useState<number | null>(null);
  const [realtimePercentage, setRealtimePercentage] = useState<number | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"PREMIUM" | "EQUILIBRIUM" | "DISCOUNT" | null>(null);

  // Generate signals based on POIs - SINCRONIZADO com checklist Trader Raiz
  const signals = useMemo(() => {
    if (!mtfData?.currentTimeframe?.pois || !realtimePrice) return [];
    
    // Ordenar POIs por R:R descendente para priorizar os melhores
    const sortedPois = [...mtfData.currentTimeframe.pois].sort((a, b) => b.riskReward - a.riskReward);
    
    return sortedPois
      .filter(poi => {
        // Confluência mínima 60% (sincronizado com checklist)
        if (poi.confluenceScore < 60) return false;
        
        // Preço próximo do POI (até 2% de distância)
        const distance = Math.abs(realtimePrice - poi.price) / poi.price;
        if (distance > 0.02) return false;
        
        // RR mínimo de 3:1 (Trade Raiz)
        if (poi.riskReward < 3.0) return false;
        
        return true;
      })
      .map(poi => ({
        id: poi.id,
        type: poi.type === "bullish" ? "COMPRA" as const : "VENDA" as const,
        entry: poi.entry,
        sl: poi.stopLoss,
        tp: poi.takeProfit,
        rr: poi.riskReward,
        time: new Date().toLocaleTimeString(),
        confidence: poi.confluenceScore,
        factors: poi.factors,
        targetSwing: poi.targetSwing
      }));
  }, [mtfData, realtimePrice]);
  
  // Real-time price state

  // Debug logs
  useEffect(() => {
    console.log("🔍 MTF Data recebida:", mtfData);
    console.log("📊 Premium/Discount:", mtfData?.currentTimeframe?.premiumDiscount);
  }, [mtfData]);

  // Fetch real-time price from Binance
  useEffect(() => {
    const fetchRealtimePrice = async () => {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const data = await response.json();
        const currentPrice = parseFloat(data.price);
        setRealtimePrice(currentPrice);

        // Calculate real-time percentage if we have range data
        if (mtfData?.currentTimeframe?.premiumDiscount) {
          const { rangeHigh, rangeLow } = mtfData.currentTimeframe.premiumDiscount;
          const rangeSize = rangeHigh - rangeLow;
          const percentage = rangeSize > 0 
            ? ((currentPrice - rangeLow) / rangeSize) * 100 
            : 50;
          setRealtimePercentage(Math.max(0, Math.min(100, percentage)));

          // Update status based on percentage
          if (percentage >= 60) {
            setRealtimeStatus("PREMIUM");
          } else if (percentage <= 40) {
            setRealtimeStatus("DISCOUNT");
          } else {
            setRealtimeStatus("EQUILIBRIUM");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar preço em tempo real:", error);
      }
    };

    // Initial fetch
    fetchRealtimePrice();

    // Update every 3 seconds
    const interval = setInterval(fetchRealtimePrice, 3000);

    return () => clearInterval(interval);
  }, [symbol, mtfData?.currentTimeframe?.premiumDiscount]);

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

        {/* IA Learning Indicator */}
        {mtfData?.iaLearning && (
          <Card className={`p-2 mt-2 border text-xs ${
            mtfData.iaLearning.confianca === 'ALTA' ? 'bg-success/10 border-success/30' :
            mtfData.iaLearning.confianca === 'BAIXA' ? 'bg-destructive/10 border-destructive/30' :
            'bg-muted/30 border-muted'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold">🧠 IA:</span>
                <Badge variant={
                  mtfData.iaLearning.confianca === 'ALTA' ? 'default' :
                  mtfData.iaLearning.confianca === 'BAIXA' ? 'destructive' :
                  'secondary'
                } className="text-[9px] px-1 py-0">
                  {mtfData.iaLearning.taxaAcerto.toFixed(0)}%
                </Badge>
              </div>
              <span className="text-[9px] text-muted-foreground">
                {mtfData.iaLearning.vezesTestado} trades
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 truncate">
              {mtfData.iaLearning.ajusteAplicado}
            </p>
          </Card>
        )}
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
                    tf.timeframe.toLowerCase() === interval.toLowerCase() 
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

      {/* Market Structure - Exibição aprimorada de BOS/CHOCH */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Estrutura de Mercado
          </h3>
          <Badge variant="outline" className={`${
            mtfData?.currentTimeframe?.trend === "ALTA" 
              ? "text-success border-success" 
              : mtfData?.currentTimeframe?.trend === "BAIXA"
              ? "text-destructive border-destructive"
              : "text-muted-foreground border-muted"
          }`}>
            {mtfData?.currentTimeframe?.trend || "NEUTRO"}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Card className={`p-3 border-2 ${
            mtfData?.currentTimeframe?.lastBOS 
              ? "bg-success/10 border-success" 
              : "bg-secondary border-border"
          }`}>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              {mtfData?.currentTimeframe?.lastBOS && <span className="text-success">✓</span>}
              Último BOS
            </div>
            <div className="text-sm font-bold text-foreground font-mono">
              {mtfData?.currentTimeframe?.lastBOS 
                ? new Date(mtfData.currentTimeframe.lastBOS).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : "—"}
            </div>
            <div className="text-[9px] text-muted-foreground mt-1">
              {mtfData?.currentTimeframe?.bosCount 
                ? `${mtfData.currentTimeframe.bosCount} quebra(s)` 
                : "Nenhuma quebra"}
            </div>
          </Card>
          
          <Card className={`p-3 border-2 ${
            mtfData?.currentTimeframe?.lastCHOCH 
              ? "bg-warning/10 border-warning" 
              : "bg-secondary border-border"
          }`}>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              {mtfData?.currentTimeframe?.lastCHOCH && <span className="text-warning">⚡</span>}
              Último CHOCH
            </div>
            <div className="text-sm font-bold text-foreground font-mono">
              {mtfData?.currentTimeframe?.lastCHOCH 
                ? new Date(mtfData.currentTimeframe.lastCHOCH).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : "—"}
            </div>
            <div className="text-[9px] text-muted-foreground mt-1">
              {mtfData?.currentTimeframe?.chochCount 
                ? `${mtfData.currentTimeframe.chochCount} mudança(s)` 
                : "Sem mudança"}
            </div>
          </Card>
        </div>
        
        {/* Indicador de estrutura do checklist */}
        {mtfData?.checklist && (
          <div className={`mt-2 p-2 rounded text-[10px] ${
            mtfData.checklist.structureBroken 
              ? "bg-success/20 text-success" 
              : "bg-muted text-muted-foreground"
          }`}>
            {mtfData.checklist.structureBroken 
              ? `✓ ${mtfData.checklist.structureType} confirmado em $${mtfData.checklist.structurePrice?.toFixed(2) || '—'}`
              : "⏳ Aguardando quebra de estrutura"}
          </div>
        )}
      </div>

      {/* POIs (Points of Interest) - Apenas 2 cards: melhor LONG + melhor SHORT */}
      {mtfData?.currentTimeframe?.pois && mtfData.currentTimeframe.pois.length > 0 && (() => {
        // Filtrar melhor POI bullish (LONG) e melhor POI bearish (SHORT) por R:R
        const bestBullishPOI = mtfData.currentTimeframe.pois
          .filter(p => p.type === "bullish")
          .sort((a, b) => b.riskReward - a.riskReward)[0];
        const bestBearishPOI = mtfData.currentTimeframe.pois
          .filter(p => p.type === "bearish")
          .sort((a, b) => b.riskReward - a.riskReward)[0];
        const displayPOIs = [bestBullishPOI, bestBearishPOI].filter(Boolean);
        
        if (displayPOIs.length === 0) return null;
        
        return (
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
              🎯 Points of Interest
              <Badge variant="outline" className="text-[9px]">
                {displayPOIs.length > 1 ? "LONG + SHORT" : displayPOIs[0]?.type === "bullish" ? "LONG" : "SHORT"}
              </Badge>
            </h3>
            
            <div className="space-y-2">
              {displayPOIs.map((poi) => (
              <Card key={poi.id} className={`p-3 ${
                poi.type === "bullish" 
                  ? "border-success bg-success/10" 
                  : "border-destructive bg-destructive/10"
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <Badge variant={poi.type === "bullish" ? "default" : "destructive"}>
                    {poi.type === "bullish" ? "🟢 LONG" : "🔴 SHORT"}
                  </Badge>
                  <Badge variant="outline" className="bg-background text-[9px]">
                    {poi.confluenceScore}% ⭐
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-muted-foreground text-[9px]">ENTRADA</span>
                    <div className="font-mono font-bold">${poi.entry.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[9px]">STOP LOSS</span>
                    <div className="font-mono text-destructive">${poi.stopLoss.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[9px]">TAKE PROFIT</span>
                    <div className="font-mono text-success">${poi.takeProfit.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[9px]">RISCO/RETORNO</span>
                    <div className="font-mono font-bold text-accent">1:{poi.riskReward.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="text-[9px] text-muted-foreground mb-2 p-1 bg-background/50 rounded">
                  🎯 Target: {poi.targetSwing.type === "high" ? "Topo" : "Fundo"} em ${poi.targetSwing.price.toFixed(2)}
                </div>
                
                <div className="text-[9px] text-muted-foreground border-t pt-2">
                  {poi.factors.join(" • ")}
                </div>
              </Card>
            ))}
            </div>
          </div>
        );
      })()}

      {/* Fair Value Gaps */}
      {mtfData?.currentTimeframe?.fvgs && mtfData.currentTimeframe.fvgs.length > 0 && (
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-bold mb-3">📊 Fair Value Gaps</h3>
          
          <div className="space-y-2">
            {mtfData.currentTimeframe.fvgs.slice(0, 3).map((fvg, i) => (
              <Card key={i} className={`p-2 ${
                fvg.type === "bullish" 
                  ? "bg-success/5 border-success/20" 
                  : "bg-destructive/5 border-destructive/20"
              }`}>
                <div className="flex justify-between items-center">
                  <Badge variant={fvg.type === "bullish" ? "default" : "destructive"}>
                    {fvg.type === "bullish" ? "▲ Bullish FVG" : "▼ Bearish FVG"}
                  </Badge>
                  <span className="text-xs font-mono">${fvg.midpoint.toFixed(2)}</span>
                </div>
                
                <div className="text-[9px] text-muted-foreground mt-1 flex justify-between">
                  <span>Top: ${fvg.top.toFixed(2)}</span>
                  <span>Bot: ${fvg.bottom.toFixed(2)}</span>
                </div>
                
                {!fvg.isFilled && (
                  <Badge variant="outline" className="mt-1 text-[8px]">
                    🔓 Não Preenchido
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Order Blocks */}
      {mtfData?.currentTimeframe?.orderBlocks && mtfData.currentTimeframe.orderBlocks.length > 0 && (
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-bold mb-3">📦 Order Blocks</h3>
          
          <div className="space-y-2">
            {mtfData.currentTimeframe.orderBlocks.map((ob, i) => (
              <Card key={i} className={`p-2 ${
                ob.type === "bullish"
                  ? "bg-success/5 border-success/20"
                  : "bg-destructive/5 border-destructive/20"
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <Badge variant={ob.type === "bullish" ? "default" : "destructive"}>
                    {ob.type === "bullish" ? "▲ Bullish OB" : "▼ Bearish OB"}
                  </Badge>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[9px]">
                      💪 {Math.round(ob.strength)}%
                    </Badge>
                    {ob.confirmed && (
                      <Badge className="text-[8px] bg-accent">✓</Badge>
                    )}
                  </div>
                </div>
                
                <div className="text-[9px] text-muted-foreground">
                  <div>Entry Zone: ${ob.midpoint.toFixed(2)}</div>
                  <div className="flex justify-between mt-1">
                    <span>Top: ${ob.top.toFixed(2)}</span>
                    <span>Bot: ${ob.bottom.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Manipulation Zones Alert */}
      {mtfData?.currentTimeframe?.manipulationZones && mtfData.currentTimeframe.manipulationZones.length > 0 && (
        <div className="p-4 border-b border-destructive/50 bg-destructive/5">
          <h3 className="text-xs font-bold mb-2 text-destructive flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Zonas de Manipulação Detectadas
          </h3>
          
          <div className="space-y-2">
            {mtfData.currentTimeframe.manipulationZones.map((zone, i) => (
              <Card key={i} className="p-2 bg-destructive/10 border-destructive/30">
                <div className="flex justify-between items-center">
                  <Badge variant="destructive" className="text-[9px]">
                    {zone.type === "equal_highs" ? "= Topos" : zone.type === "equal_lows" ? "= Fundos" : "Sweep"}
                  </Badge>
                  <span className="text-xs font-mono">${zone.price.toFixed(2)}</span>
                </div>
                
                <div className="text-[9px] text-muted-foreground mt-1">
                  🚫 Evitar operações {zone.danger >= 80 ? "CRÍTICO" : "nesta área"}
                </div>
              </Card>
            ))}
          </div>
          
          <p className="text-[9px] text-destructive/80 mt-2">
            ⚠️ Estas zonas atraem liquidez e podem causar reversões bruscas
          </p>
        </div>
      )}

      {/* Range & Filtro */}
      {mtfLoading ? (
        <div className="p-4 border-b border-border">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : mtfData?.currentTimeframe?.premiumDiscount && 
         typeof mtfData.currentTimeframe.premiumDiscount === 'object' &&
         mtfData.currentTimeframe.premiumDiscount.currentPrice > 0 ? (
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Range & Filtro
          </h3>
          
          <Card className={`p-3 border-2 ${
            (realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "PREMIUM" 
              ? "bg-destructive/10 border-destructive" 
              : (realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "DISCOUNT"
              ? "bg-success/10 border-success"
              : "bg-secondary border-border"
          }`}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-muted-foreground">Posição no Range</span>
              <Badge className={
                (realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "PREMIUM" 
                  ? "bg-destructive" 
                  : (realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "DISCOUNT"
                  ? "bg-success"
                  : "bg-secondary"
              }>
                {realtimeStatus === "PREMIUM" 
                  ? "Zona de Venda (Premium)" 
                  : realtimeStatus === "DISCOUNT"
                  ? "Zona de Compra (Discount)"
                  : realtimeStatus === "EQUILIBRIUM"
                  ? "Equilíbrio"
                  : mtfData.currentTimeframe.premiumDiscount.statusDescription}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
              <div>
                <span className="text-muted-foreground">High:</span>
                <div className="font-mono font-bold">
                  ${mtfData.currentTimeframe.premiumDiscount.rangeHigh.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Atual:</span>
                <div className="font-mono font-bold text-primary">
                  ${(realtimePrice || mtfData.currentTimeframe.premiumDiscount.currentPrice).toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Low:</span>
                <div className="font-mono font-bold">
                  ${mtfData.currentTimeframe.premiumDiscount.rangeLow.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
                <div className="w-1/2 bg-success/40 border-r-2 border-foreground"></div>
                <div className="w-1/2 bg-destructive/40"></div>
              </div>
              
              <div 
                className="w-1.5 h-5 bg-primary border-2 border-foreground absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 rounded-sm shadow-lg"
                style={{ left: `${realtimePercentage !== null ? realtimePercentage : mtfData.currentTimeframe.premiumDiscount.rangePercentage}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary whitespace-nowrap">
                  {(realtimePercentage !== null ? realtimePercentage : mtfData.currentTimeframe.premiumDiscount.rangePercentage).toFixed(0)}%
                </div>
              </div>
            </div>
            
            <div className="flex justify-between text-[9px] text-muted-foreground mt-2">
              <span>← DISCOUNT (Compra)</span>
              <span>PREMIUM (Venda) →</span>
            </div>
          </Card>
          
          <Card className={`p-2 mt-2 ${
            ((realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "PREMIUM" && mtfData.dominantBias.bias === "ALTA") ||
            ((realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "DISCOUNT" && mtfData.dominantBias.bias === "BAIXA")
              ? "bg-warning/20 border-warning"
              : "bg-muted/50"
          }`}>
            <p className="text-[10px] text-muted-foreground">
              {(realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "PREMIUM" && 
               mtfData.dominantBias.bias === "BAIXA" && (
                "✅ Preço em zona premium + viés de baixa = Zona ideal para SHORT"
              )}
              {(realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "DISCOUNT" && 
               mtfData.dominantBias.bias === "ALTA" && (
                "✅ Preço em zona discount + viés de alta = Zona ideal para LONG"
              )}
              {(realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "EQUILIBRIUM" && (
                "⏸️ Preço em equilíbrio - Aguardar movimento para zona premium ou discount"
              )}
              {(realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "PREMIUM" && 
               mtfData.dominantBias.bias === "ALTA" && (
                <>
                  <span className="text-warning font-bold">⚠️ VIÉS x ZONA DESALINHADOS</span>
                  <br />
                  <span>Viés ALTA + Preço em PREMIUM = NÃO COMPRAR (não comprar caro)</span>
                  <br />
                  <span className="text-muted-foreground/70">Aguardar pullback para zona DISCOUNT antes de entrada LONG</span>
                </>
              )}
              {(realtimeStatus || mtfData.currentTimeframe.premiumDiscount.status) === "DISCOUNT" && 
               mtfData.dominantBias.bias === "BAIXA" && (
                <>
                  <span className="text-warning font-bold">⚠️ VIÉS x ZONA DESALINHADOS</span>
                  <br />
                  <span>Viés BAIXA + Preço em DISCOUNT = NÃO VENDER (não vender barato)</span>
                  <br />
                  <span className="text-muted-foreground/70">Aguardar rejeição em zona PREMIUM antes de entrada SHORT</span>
                </>
              )}
            </p>
          </Card>
        </div>
      ) : (
        <div className="p-4 border-b border-border">
          <Card className="p-3 bg-muted">
            <p className="text-xs text-muted-foreground text-center">
              ⏳ Calculando Range & Filtro...
            </p>
          </Card>
        </div>
      )}

      {/* 🆕 3 CAMADAS: CONTEXT + SETUPS + DECISION */}
      {mtfData?.checklist && (
        <div className="border-b-2 border-primary">
          {/* 🔷 CAMADA 1: CONTEXTO */}
          <div className={`p-3 border-b ${
            mtfData.checklist.context?.ready 
              ? "bg-primary/10" 
              : "bg-muted/50"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                🔷 CAMADA 1: CONTEXTO
              </h3>
              <Badge variant={mtfData.checklist.context?.ready ? "default" : "secondary"}>
                {mtfData.checklist.context?.ready ? "PRONTO" : "AGUARDANDO"}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-2 bg-card/50">
                <div className="text-[9px] text-muted-foreground">BIAS</div>
                <div className={`text-sm font-bold ${
                  mtfData.checklist.context?.bias === "BULL" ? "text-success" :
                  mtfData.checklist.context?.bias === "BEAR" ? "text-destructive" :
                  "text-muted-foreground"
                }`}>
                  {mtfData.checklist.context?.bias || "—"}
                </div>
              </Card>
              
              <Card className="p-2 bg-card/50">
                <div className="text-[9px] text-muted-foreground">FORÇA</div>
                <div className="text-sm font-bold">
                  {mtfData.checklist.context?.biasStrength || "—"}
                </div>
              </Card>
              
              <Card className="p-2 bg-card/50">
                <div className="text-[9px] text-muted-foreground">SESSÃO</div>
                <div className={`text-sm font-bold ${
                  mtfData.checklist.context?.session === "LONDON" || mtfData.checklist.context?.session === "NY" 
                    ? "text-accent" 
                    : "text-muted-foreground"
                }`}>
                  {mtfData.checklist.context?.session || "—"}
                </div>
              </Card>
            </div>
            
            <div className="text-[9px] text-muted-foreground mt-2 text-center">
              Range: ${mtfData.checklist.context?.rangeLow?.toFixed(2) || "—"} - ${mtfData.checklist.context?.rangeHigh?.toFixed(2) || "—"}
            </div>
          </div>
          
          {/* 🔷 CAMADA 2: SETUPS (Informativos) */}
          <div className="p-3 border-b bg-secondary/30">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 mb-2">
              🔷 CAMADA 2: SETUPS DETECTADOS
            </h3>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {mtfData.checklist.sweepDetected && (
                <Badge variant="outline" className="text-[9px] bg-success/10 border-success/30">
                  ✓ Sweep {mtfData.checklist.sweepType}
                </Badge>
              )}
              {mtfData.checklist.fvgPresent && (
                <Badge variant="outline" className="text-[9px] bg-success/10 border-success/30">
                  ✓ FVG {mtfData.checklist.fvgType}
                </Badge>
              )}
              {mtfData.checklist.structureConfirmed && (
                <Badge variant="outline" className="text-[9px] bg-success/10 border-success/30">
                  ✓ {mtfData.checklist.structureType}
                </Badge>
              )}
              {mtfData.checklist.zoneCorrect && (
                <Badge variant="outline" className="text-[9px] bg-success/10 border-success/30">
                  ✓ Zona {mtfData.checklist.zoneName}
                </Badge>
              )}
              {mtfData.checklist.orderBlockLocated && (
                <Badge variant="outline" className="text-[9px] bg-success/10 border-success/30">
                  ✓ Order Block
                </Badge>
              )}
              {!mtfData.checklist.sweepDetected && !mtfData.checklist.fvgPresent && !mtfData.checklist.structureConfirmed && (
                <Badge variant="outline" className="text-[9px] text-muted-foreground">
                  Nenhum setup ativo
                </Badge>
              )}
            </div>
            
            {/* Confluence Score Mini */}
            <div className="flex items-center gap-2">
              <div className="text-[9px] text-muted-foreground">Confluência:</div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    (mtfData.checklist.confluencePercentage || 0) >= 60 
                      ? "bg-success" 
                      : (mtfData.checklist.confluencePercentage || 0) >= 40
                      ? "bg-warning"
                      : "bg-destructive"
                  }`}
                  style={{ width: `${Math.min(mtfData.checklist.confluencePercentage || 0, 100)}%` }}
                />
              </div>
              <div className="text-[9px] font-bold">
                {(mtfData.checklist.confluenceScore || 0).toFixed(1)}/10
              </div>
            </div>
          </div>
          
          {/* 🔷 CAMADA 3: DECISION ENGINE */}
          <div className={`p-3 ${
            mtfData.checklist.decision?.execute 
              ? "bg-success/10" 
              : mtfData.checklist.context?.ready
              ? "bg-warning/10"
              : "bg-destructive/10"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                🔷 CAMADA 3: DECISÃO
              </h3>
              <Badge className={`text-xs font-bold ${
                mtfData.checklist.decision?.execute
                  ? "bg-success"
                  : mtfData.checklist.context?.ready
                  ? "bg-warning text-warning-foreground"
                  : "bg-destructive"
              }`}>
                {mtfData.checklist.decision?.execute ? "EXECUTAR" : "HOLD"}
              </Badge>
            </div>
            
            {/* Combined Score Bar */}
            <Card className="p-2 bg-card/50 border mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-muted-foreground">Score Combinado</span>
                <span className={`text-sm font-bold ${
                  (mtfData.checklist.decision?.combinedScore || 0) >= 55 
                    ? "text-success" 
                    : "text-warning"
                }`}>
                  {(mtfData.checklist.decision?.combinedScore || 0).toFixed(0)}/100
                </span>
              </div>
              
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-1">
                <div 
                  className={`h-full transition-all duration-500 ${
                    (mtfData.checklist.decision?.combinedScore || 0) >= 55 
                      ? "bg-success" 
                      : "bg-warning"
                  }`}
                  style={{ width: `${Math.min(mtfData.checklist.decision?.combinedScore || 0, 100)}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[9px] mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confluência:</span>
                  <span className="font-bold">{(mtfData.checklist.decision?.confluenceScore || 0).toFixed(1)}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pattern:</span>
                  <span className="font-bold">{mtfData.checklist.decision?.patternScore || 0}/100</span>
                </div>
              </div>
            </Card>
            
            {/* Decision Reason */}
            <div className={`text-[10px] p-2 rounded border ${
              mtfData.checklist.decision?.execute 
                ? "bg-success/20 border-success/30 text-success" 
                : "bg-muted border-border text-muted-foreground"
            }`}>
              {mtfData.checklist.decision?.reason || "Aguardando análise..."}
            </div>
            
            {/* R:R */}
            <div className="flex items-center justify-between mt-2 text-[9px]">
              <span className="text-muted-foreground">Risco/Retorno:</span>
              <Badge variant={mtfData.checklist.riskRewardValid ? "default" : "secondary"}>
                1:{mtfData.checklist.riskRewardValue?.toFixed(1) || "0"} {mtfData.checklist.riskRewardValid ? "✓" : "(min 2.5)"}
              </Badge>
            </div>
          </div>
        </div>
      )}


      {/* Active Signals - Apenas 2 cards: melhor COMPRA + melhor VENDA */}
      <div className="p-4 flex-1">
        {(() => {
          // Filtrar melhor sinal COMPRA e melhor sinal VENDA por R:R
          const bestBuySignal = signals
            .filter(s => s.type === "COMPRA")
            .sort((a, b) => b.rr - a.rr)[0];
          const bestSellSignal = signals
            .filter(s => s.type === "VENDA")
            .sort((a, b) => b.rr - a.rr)[0];
          const displaySignals = [bestBuySignal, bestSellSignal].filter(Boolean);
          
          return (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Sinais Ativos
                </h3>
                {displaySignals.length > 0 && (
                  <Badge variant="default" className="animate-pulse text-[9px]">
                    {displaySignals.length > 1 ? "COMPRA + VENDA" : displaySignals[0]?.type}
                  </Badge>
                )}
              </div>
              
              {displaySignals.length > 0 ? (
                <div className="space-y-3">
                  {displaySignals.map((signal) => (
              <Card
                key={signal.id}
                className={`p-3 border-2 ${
                  signal.type === "COMPRA"
                    ? "border-success bg-success/10"
                    : "border-destructive bg-destructive/10"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <Badge 
                    variant={signal.type === "COMPRA" ? "default" : "destructive"}
                    className="text-sm font-bold"
                  >
                    {signal.type === "COMPRA" ? "🟢 COMPRA" : "🔴 VENDA"}
                  </Badge>
                  <Badge variant="outline" className="bg-background">
                    {signal.confidence}% ⭐
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-background/50 p-2 rounded">
                    <div className="text-muted-foreground text-[9px]">ENTRADA</div>
                    <div className="font-mono font-bold text-sm">${signal.entry.toFixed(2)}</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <div className="text-muted-foreground text-[9px]">STOP LOSS</div>
                    <div className="font-mono text-destructive text-sm">${signal.sl.toFixed(2)}</div>
                  </div>
                  <div className="bg-background/50 p-2 rounded">
                    <div className="text-muted-foreground text-[9px]">TAKE PROFIT</div>
                    <div className="font-mono text-success text-sm">${signal.tp.toFixed(2)}</div>
                  </div>
                  <div className="bg-accent/20 p-2 rounded">
                    <div className="text-muted-foreground text-[9px]">RISCO/RETORNO</div>
                    <div className="font-mono font-bold text-accent text-sm">1:{signal.rr.toFixed(2)}</div>
                  </div>
                </div>
                
                {signal.targetSwing && (
                  <div className="text-[9px] bg-background/70 p-2 rounded mb-2">
                    🎯 Alvo: {signal.targetSwing.type === "high" ? "Topo" : "Fundo"} estrutural em ${signal.targetSwing.price.toFixed(2)}
                  </div>
                )}
                
                {signal.factors && (
                  <div className="text-[9px] text-muted-foreground border-t pt-2">
                    <div className="font-semibold mb-1">Confluência:</div>
                    {signal.factors.join(" • ")}
                  </div>
                )}
                
                <div className="text-[8px] text-muted-foreground/60 mt-2">
                  Detectado às {signal.time}
                </div>
              </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-4 bg-muted">
                  <div className="flex flex-col items-center justify-center text-center gap-2">
                    <Activity className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">
                      Aguardando Setup com Confluência
                    </p>
                    <p className="text-[9px] text-muted-foreground/60">
                      POIs sendo monitorados em tempo real
                    </p>
                  </div>
                </Card>
              )}
            </>
          );
        })()}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border text-center">
        <span className="text-[10px] text-muted-foreground">
          SMC Engine v3.0 PRO • TP Dinâmico • Powered by Gemini & Binance
        </span>
      </div>
    </div>
  );
};
