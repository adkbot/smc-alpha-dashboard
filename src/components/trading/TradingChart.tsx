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
const convertInterval = (interval: string): string =\u003e {
  const mapping: Record\u003cstring, string\u003e = {
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

export const TradingChart = ({ symbol, interval, smcData }: TradingChartProps) =\u003e {
  const containerRef = useRef\u003cHTMLDivElement\u003e(null);
const widgetIdRef = useRef\u003cstring\u003e("");
const [isLoading, setIsLoading] = useState(true);
const [scriptLoaded, setScriptLoaded] = useState(false);
const [hasError, setHasError] = useState(false);

// Carregar script do TradingView uma única vez
useEffect(() =\u003e {
  if(typeof (window as any).TradingView !== "undefined") {
  console.log("✅ TradingView já está disponível globalmente");
  setScriptLoaded(true);
  return;
}

console.log("📥 Carregando script do TradingView...");
const script = document.createElement("script");
script.src = "https://s3.tradingview.com/tv.js";
script.async = true;
script.onload = () =\u003e {
  console.log("✅ Script TradingView carregado com sucesso");
  setScriptLoaded(true);
};
script.onerror = () =\u003e {
  console.error("❌ Erro ao carregar script do TradingView");
  setIsLoading(false);
  setHasError(true);
};

document.head.appendChild(script);
  }, []);

// Criar/atualizar widget quando script estiver carregado ou símbolo/intervalo mudarem
useEffect(() =\u003e {
  console.log("🔄 useEffect de criação do widget disparado", {
    scriptLoaded,
    hasContainer: !!containerRef.current,
    symbol,
    interval
  });

  if(!scriptLoaded || !containerRef.current) {
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

// Criar ID único para este widget
const uniqueId = `tradingview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
widgetIdRef.current = uniqueId;

// Criar container para o widget de forma segura
if (containerRef.current) {
  // Limpar container de forma super segura
  try {
    const parent = containerRef.current;
    // Remover todos os filhos de forma segura
    while (parent.firstChild) {
      try {
        parent.firstChild.remove();
      } catch (e) {
        // Se falhar, tentar de outra forma
        try {
          parent.removeChild(parent.firstChild);
        } catch (e2) {
          // Última tentativa: quebrar o loop se não conseguir remover
          break;
        }
      }
    }

    // Criar novo div para o widget
    const widgetDiv = document.createElement('div');
    widgetDiv.id = uniqueId;
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    widgetDiv.style.position = 'absolute';
    widgetDiv.style.top = '0';
    widgetDiv.style.left = '0';

    parent.appendChild(widgetDiv);
    console.log("✅ Container criado com ID:", uniqueId);
  } catch (error) {
    console.error("❌ Erro ao criar container:", error);
    setIsLoading(false);
    setHasError(true);
    return;
  }
}

// Delay para garantir que o DOM está pronto
const createTimeout = setTimeout(() =\u003e {
  try {
    const tvInterval = convertInterval(interval);
    console.log("📊 Criando widget TradingView:", {
      container_id: uniqueId,
      symbol: `BINANCE:${symbol}`,
      interval: tvInterval
    });

    new(window as any).TradingView.widget({
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

    console.log("✅ Widget TradingView iniciado");

    // Detectar quando o iframe aparecer
    const checkInterval = setInterval(() =\u003e {
      const element = document.getElementById(uniqueId);
      const iframe = element?.querySelector('iframe');
      if(iframe) {
        console.log("✅ Iframe do TradingView detectado! Gráfico carregado");
        setIsLoading(false);
        clearInterval(checkInterval);
      }
    }, 500);

    // Timeout de segurança
    const timeoutId = setTimeout(() =\u003e {
      console.warn("⏱️ Timeout: Removendo loading após 10s");
      setIsLoading(false);
          clearInterval(checkInterval);
    }, 10000);

    return() =\u003e {
  clearTimeout(timeoutId);
          clearInterval(checkInterval);
};
      } catch (error) {
  console.error("❌ Erro ao criar widget:", error);
  setIsLoading(false);
  setHasError(true);
}
    }, 300);

return () =\u003e {
  clearTimeout(createTimeout);
};
  }, [scriptLoaded, symbol, interval]);

// Effect para desenhar estruturas SMC quando dados mudarem
useEffect(() =\u003e {
  if(smcData \u0026\u0026 !isLoading) {
    console.log("🔄 Dados SMC atualizados");
  }
}, [smcData, isLoading]);

return (
\u003cdiv className = "relative w-full h-full bg-background"\u003e
\u003cTradingChartOverlay
smcData = { smcData || null}
      /\u003e
{
  isLoading \u0026\u0026!hasError \u0026\u0026(
    \u003cdiv className = "absolute inset-0 flex flex-col items-center justify-center bg-background/95 z-10 backdrop-blur-sm"\u003e
    \u003cLoader2 className = "w-8 h-8 text-primary animate-spin mb-3" /\u003e
    \u003cp className = "text-sm text-muted-foreground font-mono mb-1"\u003e
            CARREGANDO DADOS DE MERCADO...
    \u003c / p\u003e
    \u003cp className = "text-xs text-muted-foreground/60 font-mono"\u003e
            { symbol } • { interval }
    \u003c / p\u003e
    \u003cdiv className = "mt-4 w-48 h-1 bg-muted rounded-full overflow-hidden"\u003e
    \u003cdiv className = "h-full bg-primary animate-pulse" style = {{ width: '60%' }} \u003e\u003c / div\u003e
\u003c / div\u003e
\u003c / div\u003e
      )}

{
  hasError \u0026\u0026(
    \u003cdiv className = "absolute inset-0 flex items-center justify-center bg-background z-10"\u003e
    \u003cdiv className = "text-center"\u003e
    \u003cp className = "text-destructive font-mono mb-2 text-sm"\u003e
              ❌ Erro ao carregar gráfico
    \u003c / p\u003e
    \u003cp className = "text-muted-foreground text-xs mb-4"\u003e
              Verifique sua conexão e tente novamente
    \u003c / p\u003e
    \u003cbutton
              onClick = {() =\u003e window.location.reload()}
className = "px-4 py-2 text-sm text-primary-foreground bg-primary rounded hover:bg-primary/90 transition-colors"
\u003e
              Recarregar página
\u003c / button\u003e
\u003c / div\u003e
\u003c / div\u003e
      )}

\u003cdiv
ref = { containerRef }
className = "w-full h-full relative"
style = {{ minHeight: '400px' }}
      /\u003e
\u003c / div\u003e
  );
};
