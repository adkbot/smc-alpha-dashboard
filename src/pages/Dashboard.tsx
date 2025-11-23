import { useState } from "react";
import { TradingChart } from "@/components/trading/TradingChart";
import { AccountPanel } from "@/components/trading/AccountPanel";
import { SMCPanel } from "@/components/trading/SMCPanel";
import { TopBar } from "@/components/trading/TopBar";

const Dashboard = () => {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("15m");

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
          <TradingChart symbol={symbol} interval={interval} />
        </div>
        
        <div className="w-96 flex flex-col border-l border-border">
          <div className="h-full overflow-y-auto pb-4">
            <AccountPanel />
            <SMCPanel symbol={symbol} interval={interval} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
