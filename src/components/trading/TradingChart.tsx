import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface TradingChartProps {
  symbol: string;
  interval: string;
}

export const TradingChart = ({ symbol, interval }: TradingChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear existing chart
    containerRef.current.innerHTML = "";

    // Create TradingView widget
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView !== "undefined") {
        new (window as any).TradingView.widget({
          container_id: containerRef.current?.id || "tradingview_chart",
          autosize: true,
          symbol: `BINANCE:${symbol}`,
          interval: interval,
          timezone: "America/Sao_Paulo",
          theme: "dark",
          style: "1",
          locale: "pt",
          toolbar_bg: "#0a0a0f",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          save_image: false,
          backgroundColor: "#0a0a0f",
          gridColor: "#1a1a1f",
          studies: [
            "Volume@tv-basicstudies",
          ],
          hide_top_toolbar: false,
          hide_legend: false,
          withdateranges: true,
          hide_volume: false,
          support_host: "https://www.tradingview.com",
        });
        setIsLoading(false);
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol, interval]);

  return (
    <div className="relative w-full h-full bg-background">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-mono">
              CARREGANDO DADOS DE MERCADO...
            </p>
          </div>
        </div>
      )}
      <div
        id="tradingview_chart"
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  );
};
