/**
 * Liquidity Sweep & Sniper Entry Strategy
 * 
 * Esta estratégia identifica zonas de manipulação de liquidez (liquidity sweeps)
 * e executa entradas precisas (sniper entries) baseadas nos conceitos de SMC.
 * 
 * Conceitos principais:
 * 1. Identificação de zonas de manipulação (liquidity pools)
 * 2. Detecção de sweeps (varredura de stops)
 * 3. Confirmação de reversão (change of character)
 * 4. Entry preciso em discount/premium zones
 */

export interface LiquidityZone {
  id: string;
  price: number;
  type: 'buy_side' | 'sell_side';
  strength: number; // 0-100
  timestamp: number;
  swept: boolean;
}

export interface SweepSignal {
  id: string;
  zone: LiquidityZone;
  sweepPrice: number;
  reversalPrice: number;
  timestamp: number;
  confirmed: boolean;
}

export interface EntryPoint {
  id: string;
  price: number;
  type: 'long' | 'short';
  stopLoss: number;
  takeProfit: number[];
  riskRewardRatio: number;
  confidence: number; // 0-100
  timestamp: number;
}

export class LiquiditySweepStrategy {
  private liquidityZones: LiquidityZone[] = [];
  private sweepSignals: SweepSignal[] = [];
  private entryPoints: EntryPoint[] = [];
  
  // Parâmetros da estratégia
  private config = {
    lookbackPeriod: 50, // candles para análise
    sweepThreshold: 0.001, // 0.1% além da zona para confirmar sweep
    minZoneStrength: 60, // mínimo de força da zona (0-100)
    riskRewardMin: 2, // mínimo R:R ratio
    maxSimultaneousEntries: 3
  };

  /**
   * Identifica zonas de liquidez nos dados de preço
   */
  identifyLiquidityZones(candles: any[]): LiquidityZone[] {
    const zones: LiquidityZone[] = [];
    
    // Identifica topos e fundos significativos
    for (let i = 2; i < candles.length - 2; i++) {
      const current = candles[i];
      const prev2 = candles[i - 2];
      const prev1 = candles[i - 1];
      const next1 = candles[i + 1];
      const next2 = candles[i + 2];
      
      // Topo (Buy-side liquidity)
      if (current.high > prev2.high && 
          current.high > prev1.high && 
          current.high > next1.high && 
          current.high > next2.high) {
        zones.push({
          id: `buy_${current.timestamp}`,
          price: current.high,
          type: 'buy_side',
          strength: this.calculateZoneStrength(candles, i, 'high'),
          timestamp: current.timestamp,
          swept: false
        });
      }
      
      // Fundo (Sell-side liquidity)
      if (current.low < prev2.low && 
          current.low < prev1.low && 
          current.low < next1.low && 
          current.low < next2.low) {
        zones.push({
          id: `sell_${current.timestamp}`,
          price: current.low,
          type: 'sell_side',
          strength: this.calculateZoneStrength(candles, i, 'low'),
          timestamp: current.timestamp,
          swept: false
        });
      }
    }
    
    this.liquidityZones = zones;
    return zones;
  }

  /**
   * Calcula a força da zona de liquidez
   */
  private calculateZoneStrength(candles: any[], index: number, type: 'high' | 'low'): number {
    const current = candles[index];
    let touches = 0;
    let volume = 0;
    
    // Conta quantas vezes o preço testou essa zona
    for (let i = Math.max(0, index - this.config.lookbackPeriod); i < candles.length; i++) {
      if (i === index) continue;
      
      const candle = candles[i];
      const threshold = current[type] * 0.001; // 0.1% de tolerância
      
      if (type === 'high' && Math.abs(candle.high - current.high) <= threshold) {
        touches++;
        volume += candle.volume;
      } else if (type === 'low' && Math.abs(candle.low - current.low) <= threshold) {
        touches++;
        volume += candle.volume;
      }
    }
    
    // Força baseada em número de toques e volume
    const touchScore = Math.min(touches * 20, 50);
    const volumeScore = Math.min(volume / 1000000, 50);
    
    return Math.min(touchScore + volumeScore, 100);
  }

  /**
   * Detecta liquidity sweeps
   */
  detectSweeps(currentPrice: number, candles: any[]): SweepSignal[] {
    const signals: SweepSignal[] = [];
    const latestCandle = candles[candles.length - 1];
    
    for (const zone of this.liquidityZones) {
      if (zone.swept) continue;
      if (zone.strength < this.config.minZoneStrength) continue;
      
      const sweepThreshold = zone.price * this.config.sweepThreshold;
      
      // Detecta sweep em zona buy-side (topo)
      if (zone.type === 'buy_side' && latestCandle.high > zone.price + sweepThreshold) {
        // Verifica se houve reversão
        if (latestCandle.close < zone.price) {
          zone.swept = true;
          signals.push({
            id: `sweep_${zone.id}`,
            zone: zone,
            sweepPrice: latestCandle.high,
            reversalPrice: latestCandle.close,
            timestamp: latestCandle.timestamp,
            confirmed: true
          });
        }
      }
      
      // Detecta sweep em zona sell-side (fundo)
      if (zone.type === 'sell_side' && latestCandle.low < zone.price - sweepThreshold) {
        // Verifica se houve reversão
        if (latestCandle.close > zone.price) {
          zone.swept = true;
          signals.push({
            id: `sweep_${zone.id}`,
            zone: zone,
            sweepPrice: latestCandle.low,
            reversalPrice: latestCandle.close,
            timestamp: latestCandle.timestamp,
            confirmed: true
          });
        }
      }
    }
    
    this.sweepSignals.push(...signals);
    return signals;
  }

  /**
   * Calcula entry points baseados nos sweeps detectados
   */
  calculateEntryPoints(sweep: SweepSignal, candles: any[]): EntryPoint | null {
    // Limita número de entries simultâneos
    if (this.entryPoints.filter(e => e.timestamp > Date.now() - 3600000).length >= this.config.maxSimultaneousEntries) {
      return null;
    }
    
    const latestCandle = candles[candles.length - 1];
    
    // Entry LONG após sweep de sell-side liquidity
    if (sweep.zone.type === 'sell_side') {
      const entry = sweep.reversalPrice;
      const stopLoss = sweep.sweepPrice * 0.999; // 0.1% abaixo do sweep
      const risk = entry - stopLoss;
      
      const entryPoint: EntryPoint = {
        id: `entry_long_${sweep.id}`,
        price: entry,
        type: 'long',
        stopLoss: stopLoss,
        takeProfit: [
          entry + risk * 2,  // TP1: 2R
          entry + risk * 3,  // TP2: 3R
          entry + risk * 5   // TP3: 5R
        ],
        riskRewardRatio: 2,
        confidence: sweep.zone.strength,
        timestamp: latestCandle.timestamp
      };
      
      this.entryPoints.push(entryPoint);
      return entryPoint;
    }
    
    // Entry SHORT após sweep de buy-side liquidity
    if (sweep.zone.type === 'buy_side') {
      const entry = sweep.reversalPrice;
      const stopLoss = sweep.sweepPrice * 1.001; // 0.1% acima do sweep
      const risk = stopLoss - entry;
      
      const entryPoint: EntryPoint = {
        id: `entry_short_${sweep.id}`,
        price: entry,
        type: 'short',
        stopLoss: stopLoss,
        takeProfit: [
          entry - risk * 2,  // TP1: 2R
          entry - risk * 3,  // TP2: 3R
          entry - risk * 5   // TP3: 5R
        ],
        riskRewardRatio: 2,
        confidence: sweep.zone.strength,
        timestamp: latestCandle.timestamp
      };
      
      this.entryPoints.push(entryPoint);
      return entryPoint;
    }
    
    return null;
  }

  /**
   * Análise completa - processa novos dados
   */
  analyze(candles: any[]): {
    zones: LiquidityZone[];
    sweeps: SweepSignal[];
    entries: EntryPoint[];
  } {
    // 1. Identifica zonas de liquidez
    const zones = this.identifyLiquidityZones(candles);
    
    // 2. Detecta sweeps
    const currentPrice = candles[candles.length - 1].close;
    const sweeps = this.detectSweeps(currentPrice, candles);
    
    // 3. Calcula entry points para sweeps confirmados
    const newEntries: EntryPoint[] = [];
    for (const sweep of sweeps) {
      if (sweep.confirmed) {
        const entry = this.calculateEntryPoints(sweep, candles);
        if (entry) {
          newEntries.push(entry);
        }
      }
    }
    
    return {
      zones,
      sweeps,
      entries: newEntries
    };
  }

  /**
   * Retorna dados para visualização
   */
  getVisualizationData() {
    return {
      liquidityZones: this.liquidityZones,
      sweepSignals: this.sweepSignals,
      entryPoints: this.entryPoints,
      activeEntries: this.entryPoints.filter(e => e.timestamp > Date.now() - 3600000)
    };
  }

  /**
   * Limpa dados antigos
   */
  cleanup(maxAge: number = 86400000) { // 24 horas por padrão
    const now = Date.now();
    this.liquidityZones = this.liquidityZones.filter(z => now - z.timestamp < maxAge);
    this.sweepSignals = this.sweepSignals.filter(s => now - s.timestamp < maxAge);
    this.entryPoints = this.entryPoints.filter(e => now - e.timestamp < maxAge);
  }
}

export default LiquiditySweepStrategy;
