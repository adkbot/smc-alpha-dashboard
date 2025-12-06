import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LiquiditySweepStrategy, { 
  LiquidityZone, 
  SweepSignal, 
  EntryPoint 
} from '@/strategies/LiquiditySweepStrategy';

interface LiquiditySweepPanelProps {
  candles: any[];
  isActive: boolean;
}

export const LiquiditySweepPanel: React.FC<LiquiditySweepPanelProps> = ({ 
  candles, 
  isActive 
}) => {
  const [strategy] = useState(() => new LiquiditySweepStrategy());
  const [zones, setZones] = useState<LiquidityZone[]>([]);
  const [sweeps, setSweeps] = useState<SweepSignal[]>([]);
  const [entries, setEntries] = useState<EntryPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!isActive || !candles || candles.length < 50) return;

    const runAnalysis = () => {
      setIsAnalyzing(true);
      try {
        const result = strategy.analyze(candles);
        setZones(result.zones);
        setSweeps(result.sweeps);
        setEntries(result.entries);
      } catch (error) {
        console.error('Erro na análise:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    runAnalysis();
    const interval = setInterval(runAnalysis, 5000); // Atualiza a cada 5s

    return () => clearInterval(interval);
  }, [candles, isActive, strategy]);

  const getZoneColor = (zone: LiquidityZone) => {
    if (zone.swept) return 'text-gray-400';
    return zone.type === 'buy_side' ? 'text-red-500' : 'text-green-500';
  };

  const getEntryBadge = (type: 'long' | 'short') => {
    return type === 'long' ? (
      <Badge className="bg-green-500 hover:bg-green-600">LONG</Badge>
    ) : (
      <Badge className="bg-red-500 hover:bg-red-600">SHORT</Badge>
    );
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">
          Liquidity Sweep & Sniper Entry
        </h3>
        {isAnalyzing && (
          <Badge variant="outline" className="animate-pulse">
            Analisando...
          </Badge>
        )}
      </div>

      {/* Status */}
      <Card className="bg-gray-800/50 border-gray-700 p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gray-400 text-sm">Zonas Ativas</p>
            <p className="text-2xl font-bold text-white">
              {zones.filter(z => !z.swept).length}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Sweeps Detectados</p>
            <p className="text-2xl font-bold text-yellow-500">
              {sweeps.length}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Entry Points</p>
            <p className="text-2xl font-bold text-blue-500">
              {entries.length}
            </p>
          </div>
        </div>
      </Card>

      {/* Zonas de Liquidez */}
      <Card className="bg-gray-800/50 border-gray-700 p-4">
        <h4 className="text-md font-semibold text-white mb-3">
          Zonas de Liquidez
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {zones.slice(-10).reverse().map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between p-2 bg-gray-700/30 rounded"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    zone.type === 'buy_side' ? 'bg-red-500' : 'bg-green-500'
                  }`}
                />
                <span className={`font-mono text-sm ${getZoneColor(zone)}`}>
                  ${zone.price.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {zone.type === 'buy_side' ? 'Buy-Side' : 'Sell-Side'}
                </Badge>
                <span className="text-xs text-gray-400">
                  Força: {zone.strength.toFixed(0)}%
                </span>
                {zone.swept && (
                  <Badge className="bg-yellow-600 text-xs">SWEPT</Badge>
                )}
              </div>
            </div>
          ))}
          {zones.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              Nenhuma zona identificada
            </p>
          )}
        </div>
      </Card>

      {/* Sweeps Recentes */}
      {sweeps.length > 0 && (
        <Card className="bg-gray-800/50 border-gray-700 p-4">
          <h4 className="text-md font-semibold text-white mb-3">
            Sweeps Detectados
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sweeps.slice(-5).reverse().map((sweep) => (
              <div
                key={sweep.id}
                className="p-3 bg-yellow-900/20 border border-yellow-600/30 rounded"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-yellow-500 font-semibold text-sm">
                    🎯 SWEEP CONFIRMADO
                  </span>
                  <Badge variant="outline">
                    {sweep.zone.type === 'buy_side' ? 'Bearish' : 'Bullish'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>Zona: ${sweep.zone.price.toFixed(2)}</div>
                  <div>Sweep: ${sweep.sweepPrice.toFixed(2)}</div>
                  <div>Reversão: ${sweep.reversalPrice.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Entry Points */}
      {entries.length > 0 && (
        <Card className="bg-gray-800/50 border-gray-700 p-4">
          <h4 className="text-md font-semibold text-white mb-3">
            🎯 Entry Points (Sniper)
          </h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {entries.slice(-5).reverse().map((entry) => (
              <div
                key={entry.id}
                className={`p-3 rounded border-2 ${
                  entry.type === 'long'
                    ? 'bg-green-900/20 border-green-600/50'
                    : 'bg-red-900/20 border-red-600/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {getEntryBadge(entry.type)}
                  <span className="text-xs text-gray-400">
                    Confiança: {entry.confidence.toFixed(0)}%
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span>Entry:</span>
                    <span className="font-mono font-bold">
                      ${entry.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stop Loss:</span>
                    <span className="font-mono text-red-400">
                      ${entry.stopLoss.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>TP1 (2R):</span>
                    <span className="font-mono text-green-400">
                      ${entry.takeProfit[0].toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>TP2 (3R):</span>
                    <span className="font-mono text-green-400">
                      ${entry.takeProfit[1].toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>TP3 (5R):</span>
                    <span className="font-mono text-green-400">
                      ${entry.takeProfit[2].toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-gray-600">
                    <span>R:R Ratio:</span>
                    <span className="font-bold text-blue-400">
                      1:{entry.riskRewardRatio}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Instruções */}
      <Card className="bg-blue-900/20 border-blue-600/30 p-4">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">
          📚 Como Funciona
        </h4>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• <strong>Zonas de Liquidez:</strong> Topos/fundos onde stops estão acumulados</li>
          <li>• <strong>Sweeps:</strong> Preço varre a liquidez e reverte rapidamente</li>
          <li>• <strong>Sniper Entry:</strong> Entrada precisa após confirmação do sweep</li>
          <li>• <strong>Buy-Side:</strong> Liquidez acima (resistências)</li>
          <li>• <strong>Sell-Side:</strong> Liquidez abaixo (suportes)</li>
        </ul>
      </Card>
    </div>
  );
};

export default LiquiditySweepPanel;
