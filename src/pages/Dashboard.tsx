import { useState } from "react";
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

const Dashboard = () => {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("15m");
  const { data: mtfData } = useMultiTimeframeAnalysis(symbol, interval);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar 
        symbol={symbol}
        interval={interval}
        onSymbolChange={setSymbol}
        onIntervalChange={setInterval}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <TradingChart 
            symbol={symbol} 
            interval={interval}
            smcData={mtfData}
          />
        </div>
        
        <div className="w-96 flex flex-col border-l border-border">
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
