import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface TradingChartProps {
  symbol: string;
  interval: string;
}

// Converter intervalo do formato "15m" para formato TradingView "15"
const convertInterval = (interval: string): string => {
  const mapping: Record<string, string> = {
    '1m': '1',
    '3m': '3',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '2h': '120',
    '4h': '240',
    '1d': 'D',
    '1w': 'W',
    '1M': 'M',
  };
  return mapping[interval] || interval;
};

export const TradingChart = ({ symbol, interval }: TradingChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Carregar script do TradingView uma única vez
  useEffect(() => {
    if (typeof (window as any).TradingView !== "undefined") {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error("Erro ao carregar script do TradingView");
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Não remover o script do DOM para evitar recarregamentos
    };
  }, []);

  // Criar/atualizar widget quando script estiver carregado ou símbolo/intervalo mudarem
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;

    // Destruir widget anterior se existir
    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
        widgetRef.current = null;
      } catch (error) {
        console.error("Erro ao remover widget:", error);
      }
    }

    // Limpar container
    containerRef.current.innerHTML = "";

    // Criar novo widget
    try {
      const tvInterval = convertInterval(interval);
      
      widgetRef.current = new (window as any).TradingView.widget({
        container_id: "tradingview_chart",
        width: "100%",
        height: "100%",
        symbol: `BINANCE:${symbol}`,
        interval: tvInterval,
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
        studies: ["Volume@tv-basicstudies"],
        hide_top_toolbar: false,
        hide_legend: false,
        withdateranges: true,
        hide_volume: false,
        support_host: "https://www.tradingview.com",
        onChartReady: () => {
          console.log("Gráfico TradingView carregado:", symbol, tvInterval);
          setIsLoading(false);
        },
      });
    } catch (error) {
      console.error("Erro ao criar widget TradingView:", error);
      setIsLoading(false);
    }

    return () => {
      // Cleanup será feito no próximo render
    };
  }, [scriptLoaded, symbol, interval]);

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
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};
