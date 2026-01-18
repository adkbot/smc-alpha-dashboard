import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { MTFAnalysis } from "@/hooks/useMultiTimeframeAnalysis";
import { TradingChartOverlay } from "./TradingChartOverlay";

interface TradingChartProps {
  symbol: string;
  interval: string;
  smcData?: MTFAnalysis | null;
}

// Converter intervalo do formato "15m" para formato TradingView "15"
function convertInterval(interval: string) {
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
}

export const TradingChart = ({ symbol, interval, smcData }: TradingChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef("");
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Carregar script do TradingView uma única vez
  useEffect(() => {
    if (typeof (window as any).TradingView !== "undefined") {
      console.log("✅ TradingView já está disponível");
      setScriptLoaded(true);
      return;
    }

    console.log("📥 Carregando script do TradingView...");
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      console.log("✅ Script TradingView carregado");
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error("❌ Erro ao carregar script");
      setIsLoading(false);
      setHasError(true);
    };

    document.head.appendChild(script);
  }, []);

  // Criar/atualizar widget
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) {
      return;
    }

    if (typeof (window as any).TradingView === "undefined") {
      console.error("❌ TradingView não disponível");
      setIsLoading(false);
      setHasError(true);
      return;
    }

    if (typeof (window as any).TradingView.widget !== "function") {
      console.error("❌ TradingView.widget não é função");
      setIsLoading(false);
      setHasError(true);
      return;
    }

    console.log("🚀 Criando widget TradingView");
    setIsLoading(true);
    setHasError(false);

    // ID único para o widget
    const uniqueId = `tv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    widgetIdRef.current = uniqueId;

    // Limpar e criar container
    const parent = containerRef.current;
    if (parent) {
      // Remover filhos de forma segura
      while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
      }

      // Criar div para o widget
      const widgetDiv = document.createElement('div');
      widgetDiv.id = uniqueId;
      widgetDiv.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0';
      parent.appendChild(widgetDiv);
    }

    // Criar widget após pequeno delay
    const createTimeout = setTimeout(() => {
      try {
        const tvInterval = convertInterval(interval);

        new (window as any).TradingView.widget({
          container_id: uniqueId,
          autosize: true,
          symbol: `BINANCE:${symbol}`,
          interval: tvInterval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "pt_BR",
          toolbar_bg: "#0a0a0f",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          hide_top_toolbar: false,
          hide_legend: false,
          studies: ["Volume@tv-basicstudies"],
          support_host: "https://www.tradingview.com",
        });

        console.log("✅ Widget criado");

        // Detectar iframe
        const checkInterval = setInterval(() => {
          const element = document.getElementById(uniqueId);
          const iframe = element?.querySelector('iframe');
          if (iframe) {
            console.log("✅ Iframe detectado");
            setIsLoading(false);
            clearInterval(checkInterval);
          }
        }, 500);

        // Timeout de segurança
        const timeoutId = setTimeout(() => {
          console.warn("⏱️ Timeout loading");
          setIsLoading(false);
          clearInterval(checkInterval);
        }, 10000);

        return () => {
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
        };
      } catch (error) {
        console.error("❌ Erro ao criar widget:", error);
        setIsLoading(false);
        setHasError(true);
      }
    }, 300);

    return () => {
      clearTimeout(createTimeout);
    };
  }, [scriptLoaded, symbol, interval]);

  return (
    <div className="relative w-full h-full bg-background">
      <TradingChartOverlay smcData={smcData || null} />

      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 z-10 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground font-mono mb-1">
            CARREGANDO DADOS DE MERCADO...
          </p>
          <p className="text-xs text-muted-foreground/60 font-mono">
            {symbol} • {interval}
          </p>
          <div className="mt-4 w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="text-center">
            <p className="text-destructive font-mono mb-2 text-sm">
              ❌ Erro ao carregar gráfico
            </p>
            <p className="text-muted-foreground text-xs mb-4">
              Verifique sua conexão
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm text-primary-foreground bg-primary rounded hover:bg-primary/90 transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full relative"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};
