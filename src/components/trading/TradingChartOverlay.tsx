import { useEffect } from "react";
import type { MTFAnalysis } from "@/hooks/useMultiTimeframeAnalysis";

interface TradingChartOverlayProps {
  smcData: MTFAnalysis | null;
}

export const TradingChartOverlay = ({ smcData }: TradingChartOverlayProps) => {
  useEffect(() => {
    if (!smcData?.currentTimeframe) {
      return;
    }

    const currentData = smcData.currentTimeframe;
    console.log("🎨 Estruturas SMC detectadas:");
    console.log(`  📊 FVGs: ${currentData.fvgs?.length || 0}`);
    console.log(`  📦 Order Blocks: ${currentData.orderBlocks?.length || 0}`);
    console.log(`  🎯 POIs: ${currentData.pois?.length || 0}`);
    console.log(`  ⚠️ Zonas de Manipulação: ${currentData.manipulationZones?.length || 0}`);
  }, [smcData]);

  if (!smcData?.currentTimeframe) {
    return null;
  }

  const currentData = smcData.currentTimeframe;
  const hasStructures = 
    (currentData.fvgs && currentData.fvgs.length > 0) ||
    (currentData.orderBlocks && currentData.orderBlocks.length > 0) ||
    (currentData.pois && currentData.pois.length > 0) ||
    (currentData.manipulationZones && currentData.manipulationZones.length > 0);

  if (!hasStructures) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg max-w-xs">
      <div className="space-y-2 text-xs font-mono">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-bold text-foreground">ESTRUTURAS SMC ATIVAS</span>
        </div>

        {currentData.fvgs && currentData.fvgs.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">📊 FVGs:</span>
              <span className="font-bold text-foreground">{currentData.fvgs.length}</span>
            </div>
            {currentData.fvgs.slice(0, 3).map((fvg, i) => (
              <div key={i} className="pl-4 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${fvg.type === 'bullish' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={fvg.type === 'bullish' ? 'text-green-500' : 'text-red-500'}>
                  {fvg.type === 'bullish' ? '↑' : '↓'} {fvg.top.toFixed(2)} - {fvg.bottom.toFixed(2)}
                </span>
                {fvg.isFilled && <span className="text-muted-foreground text-[10px]">(FILLED)</span>}
              </div>
            ))}
          </div>
        )}

        {currentData.orderBlocks && currentData.orderBlocks.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">📦 Order Blocks:</span>
              <span className="font-bold text-foreground">{currentData.orderBlocks.length}</span>
            </div>
            {currentData.orderBlocks.slice(0, 3).map((ob, i) => (
              <div key={i} className="pl-4 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${ob.type === 'bullish' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                <span className={ob.type === 'bullish' ? 'text-blue-500' : 'text-orange-500'}>
                  {ob.type === 'bullish' ? '↑' : '↓'} {ob.strength}% strength
                </span>
                {ob.confirmed && <span className="text-green-500 text-[10px]">✓</span>}
              </div>
            ))}
          </div>
        )}

        {currentData.pois && currentData.pois.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">🎯 POIs:</span>
              <span className="font-bold text-primary">{currentData.pois.length}</span>
            </div>
            {currentData.pois.slice(0, 2).map((poi, i) => (
              <div key={poi.id} className="pl-4 space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${poi.type === 'bullish' ? 'bg-purple-500' : 'bg-pink-500'}`} />
                  <span className={poi.type === 'bullish' ? 'text-purple-500' : 'text-pink-500'}>
                    {poi.type === 'bullish' ? 'LONG' : 'SHORT'} • {poi.confluenceScore}% • RR:{poi.riskReward.toFixed(1)}
                  </span>
                </div>
                <div className="pl-4 text-[10px] text-muted-foreground">
                  Entry: {poi.entry.toFixed(2)} | SL: {poi.stopLoss.toFixed(2)} | TP: {poi.takeProfit.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        {currentData.manipulationZones && currentData.manipulationZones.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">⚠️</span>
              <span className="text-amber-500 font-bold">
                {currentData.manipulationZones.length} Zona{currentData.manipulationZones.length > 1 ? 's' : ''} de Manipulação
              </span>
            </div>
            {currentData.manipulationZones.slice(0, 2).map((zone, i) => (
              <div key={i} className="pl-4 text-amber-500/80 text-[10px]">
                {zone.type.replace('_', ' ').toUpperCase()} @ {zone.price.toFixed(2)}
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground text-center">
          Atualizado em tempo real
        </div>
      </div>
    </div>
  );
};
