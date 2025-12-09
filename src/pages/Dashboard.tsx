import { useState, useEffect } from "react";
import { TradingChart } from "@/components/trading/TradingChart";
import { AccountPanel } from "@/components/trading/AccountPanel";
import { SMCPanel } from "@/components/trading/SMCPanel";
import { TopBar } from "@/components/trading/TopBar";
import { BotControlPanel } from "@/components/trading/BotControlPanel";
import { ActivePositionsPanel } from "@/components/trading/ActivePositionsPanel";
import { TradingLogsPanel } from "@/components/trading/TradingLogsPanel";
import { VisionAgentPanel } from "@/components/vision/VisionAgentPanel";
import { VisionAgentLogs } from "@/components/vision/VisionAgentLogs";
import { VisionAgentVideos } from "@/components/vision/VisionAgentVideos";
import { VisionAgentStrategies } from "@/components/vision/VisionAgentStrategies";
import { VisionAgentSignals } from "@/components/vision/VisionAgentSignals";
import { useMultiTimeframeAnalysis } from "@/hooks/useMultiTimeframeAnalysis";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("15m");
  const [timeframeLoaded, setTimeframeLoaded] = useState(false);
  const { data: mtfData } = useMultiTimeframeAnalysis(symbol, interval);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Carregar timeframe preferido do usuário
  useEffect(() => {
    const loadPreferredTimeframe = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: settings } = await supabase
          .from('user_settings')
          .select('preferred_timeframe')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settings?.preferred_timeframe) {
          setInterval(settings.preferred_timeframe);
        }
        setTimeframeLoaded(true);
      } catch (error) {
        console.error('Erro ao carregar timeframe preferido:', error);
        setTimeframeLoaded(true);
      }
    };

    loadPreferredTimeframe();
  }, []);

  // Salvar timeframe quando usuário mudar
  const handleIntervalChange = async (newInterval: string) => {
    setInterval(newInterval);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_settings')
        .upsert({ 
          user_id: user.id, 
          preferred_timeframe: newInterval 
        }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Erro ao salvar timeframe preferido:', error);
    }
  };

  // Listener para mudanças de estado de autenticação
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token renovado com sucesso');
      }
      
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        console.log('Sessão encerrada, redirecionando para login');
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const SidebarContent = () => (
    <div className="h-full overflow-y-auto pb-4 space-y-2">
      <BotControlPanel />
      <VisionAgentPanel />
      <VisionAgentStrategies />
      <VisionAgentSignals />
      <ActivePositionsPanel />
      <AccountPanel />
      <SMCPanel symbol={symbol} interval={interval} mtfData={mtfData} />
      <VisionAgentLogs />
      <VisionAgentVideos />
      <TradingLogsPanel />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar 
        symbol={symbol}
        interval={interval}
        onSymbolChange={setSymbol}
        onIntervalChange={handleIntervalChange}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <TradingChart 
            symbol={symbol} 
            interval={interval}
            smcData={mtfData}
          />
          
          {/* Mobile: Floating button to open sidebar */}
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  size="lg"
                  className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
                >
                  <PanelRight className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[90vw] max-w-md p-0 overflow-hidden">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle>Painel de Controle</SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100vh-60px)] overflow-y-auto p-2">
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        
        {/* Desktop: Fixed sidebar */}
        {!isMobile && (
          <div className="w-96 flex flex-col border-l border-border">
            <SidebarContent />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
