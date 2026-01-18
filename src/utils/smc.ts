
export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface SwingPoint {
    index: number;
    price: number;
    type: 'high' | 'low';
    time: number;
}

export interface StructureResult {
    trend: 'ALTA' | 'BAIXA' | 'NEUTRO';
    lastBOS: number | null; // timestamp
    lastCHOCH: number | null; // timestamp
}

export const fetchBinanceCandles = async (symbol: string, interval: string, limit: number = 200): Promise<Candle[]> => {
    // Map interval to Binance format if needed (usually matches: 1m, 5m, 1h, 4h, 1d)
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    const data = await response.json();

    return data.map((d: any) => ({
        time: d[0],
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
    }));
};

export const findSwingPoints = (candles: Candle[], leftBars: number = 5, rightBars: number = 5): SwingPoint[] => {
    const swings: SwingPoint[] = [];

    for (let i = leftBars; i < candles.length - rightBars; i++) {
        const current = candles[i];

        // Check for Swing High
        let isHigh = true;
        for (let j = 1; j <= leftBars; j++) {
            if (candles[i - j].high > current.high) isHigh = false;
        }
        for (let j = 1; j <= rightBars; j++) {
            if (candles[i + j].high > current.high) isHigh = false;
        }

        if (isHigh) {
            swings.push({ index: i, price: current.high, type: 'high', time: current.time });
        }

        // Check for Swing Low
        let isLow = true;
        for (let j = 1; j <= leftBars; j++) {
            if (candles[i - j].low < current.low) isLow = false;
        }
        for (let j = 1; j <= rightBars; j++) {
            if (candles[i + j].low < current.low) isLow = false;
        }

        if (isLow) {
            swings.push({ index: i, price: current.low, type: 'low', time: current.time });
        }
    }

    return swings.sort((a, b) => a.index - b.index);
};

export const analyzeStructure = (candles: Candle[]): StructureResult => {
    const swings = findSwingPoints(candles, 3, 3); // Using 3 bars for faster detection on lower timeframes

    let trend: 'ALTA' | 'BAIXA' | 'NEUTRO' = 'NEUTRO';
    let lastBOS: number | null = null;
    let lastCHOCH: number | null = null;

    // Need at least a few swings to determine structure
    if (swings.length < 4) return { trend, lastBOS, lastCHOCH };

    // Iterate through swings to find breaks
    // Simplified logic:
    // Uptrend: Higher Highs, Higher Lows.
    // BOS in Uptrend: Break above previous High.
    // CHOCH in Uptrend: Break below previous Low.

    // We'll track the "current" valid structure points
    let lastHigh: SwingPoint | null = null;
    let lastLow: SwingPoint | null = null;

    // Initialize trend based on first few points if possible, or default to neutral
    // For simplicity, let's look at the sequence of breaks

    for (let i = 1; i < swings.length; i++) {
        const prev = swings[i - 1];
        const curr = swings[i];

        // This is a very simplified state machine for structure
        // In a real SMC engine, this would be more complex handling internal vs swing structure

        if (trend === 'NEUTRO') {
            if (curr.type === 'high' && lastHigh && curr.price > lastHigh.price) trend = 'ALTA';
            else if (curr.type === 'low' && lastLow && curr.price < lastLow.price) trend = 'BAIXA';
        }

        if (curr.type === 'high') {
            if (lastHigh && curr.price > lastHigh.price) {
                if (trend === 'ALTA') lastBOS = curr.time;
                else if (trend === 'BAIXA') {
                    lastCHOCH = curr.time;
                    trend = 'ALTA';
                }
            }
            lastHigh = curr;
        } else if (curr.type === 'low') {
            if (lastLow && curr.price < lastLow.price) {
                if (trend === 'BAIXA') lastBOS = curr.time;
                else if (trend === 'ALTA') {
                    lastCHOCH = curr.time;
                    trend = 'BAIXA';
                }
            }
            lastLow = curr;
        }
    }

    // Refine lastBOS/CHOCH with candle closes for confirmation if needed
    // For now, using swing points is a good approximation for the UI

    return { trend, lastBOS, lastCHOCH };
};
