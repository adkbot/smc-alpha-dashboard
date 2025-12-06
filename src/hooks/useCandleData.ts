import { useState, useEffect } from 'react';

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const useCandleData = (symbol: string, interval: string) => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandles = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch historical candles from Binance
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch candles');
        }

        const data = await response.json();
        
        const formattedCandles: Candle[] = data.map((candle: any[]) => ({
          timestamp: candle[0],
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5]),
        }));

        setCandles(formattedCandles);
      } catch (err: any) {
        console.error('Error fetching candles:', err);
        setError(err.message || 'Failed to fetch candles');
      } finally {
        setLoading(false);
      }
    };

    fetchCandles();

    // Update candles every 30 seconds
    const interval_id = setInterval(fetchCandles, 30000);

    return () => clearInterval(interval_id);
  }, [symbol, interval]);

  return { candles, loading, error };
};
