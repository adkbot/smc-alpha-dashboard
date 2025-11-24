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

export const TradingChart = ({ symbol, interval, smcData }: TradingChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Carregar script do TradingView uma única vez
  useEffect(() => {
    if (typeof (window as any).TradingView !== "undefined") {
      console.log("✅ TradingView já está disponível globalmente");
      setScriptLoaded(true);
      return;
    }

    console.log("📥 Carregando script do TradingView...");
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      console.log("✅ Script TradingView carregado com sucesso");
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error("❌ Erro ao carregar script do TradingView");
      setIsLoading(false);
      setHasError(true);
    };

    document.head.appendChild(script);

    return () => {
      // Não remover o script do DOM para evitar recarregamentos
    };
  }, []);

  // Criar/atualizar widget quando script estiver carregado ou símbolo/intervalo mudarem
  useEffect(() => {
    console.log("🔄 useEffect de criação do widget disparado", { 
      scriptLoaded, 
      hasContainer: !!containerRef.current,
      symbol,
      interval 
    });

    if (!scriptLoaded || !containerRef.current) {
      console.log("⏸️ Aguardando script ou container");
      return;
    }

    // Verificar se TradingView está disponível
    if (typeof (window as any).TradingView === "undefined") {
      console.error("❌ TradingView não está disponível globalmente");
      setIsLoading(false);
      setHasError(true);
      return;
    }

    if (typeof (window as any).TradingView.widget !== "function") {
      console.error("❌ TradingView.widget não é uma função");
      setIsLoading(false);
      setHasError(true);
      return;
    }

    console.log("🚀 Iniciando criação do widget TradingView");
    setIsLoading(true);
    setHasError(false);

    // Destruir widget anterior se existir
    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
        widgetRef.current = null;
        console.log("🗑️ Widget anterior removido");
      } catch (error) {
        console.error("⚠️ Erro ao remover widget:", error);
      }
    }

    // Limpar container
    containerRef.current.innerHTML = "";

    // Criar novo widget
    try {
      const tvInterval = convertInterval(interval);
      console.log("📊 Criando widget com config:", {
        symbol: `BINANCE:${symbol}`,
        interval: tvInterval
      });
      
      widgetRef.current = new (window as any).TradingView.widget({
        container_id: "tradingview_chart",
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

      console.log("📌 Widget criado, referência salva");

      // ESTRATÉGIA 1: Detectar quando iframe do TradingView aparecer
      const checkInterval = setInterval(() => {
        const iframe = containerRef.current?.querySelector('iframe');
        if (iframe) {
          console.log("✅ Iframe do TradingView detectado! Gráfico carregado");
          setIsLoading(false);
          clearInterval(checkInterval);
        }
      }, 500);

      // ESTRATÉGIA 2: Timeout de segurança (10 segundos)
      const timeoutId = setTimeout(() => {
        console.warn("⏱️ Timeout: Forçando remoção do loading após 10s");
        setIsLoading(false);
        clearInterval(checkInterval);
      }, 10000);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
      };
    } catch (error) {
      console.error("❌ Erro crítico ao criar widget TradingView:", error);
      setIsLoading(false);
      setHasError(true);
    }
  }, [scriptLoaded, symbol, interval]);

  // Effect para desenhar estruturas SMC quando dados mudarem
  useEffect(() => {
    if (widgetRef.current && smcData && !isLoading) {
      console.log("🔄 Dados SMC atualizados, redesenhando estruturas");
    }
  }, [smcData, isLoading]);

  return (
    <div className="relative w-full h-full bg-background">
      <TradingChartOverlay 
        smcData={smcData || null}
      />
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
              Verifique o console para mais detalhes
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
        id="tradingview_chart"
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};
