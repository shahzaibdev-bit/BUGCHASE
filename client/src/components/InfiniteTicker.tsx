import React from 'react';
import { Zap, Activity, Shield, Award } from 'lucide-react';

const TICKER_ITEMS = [
  { label: "SYSTEM HEALTH: 99.9% UPTIME", icon: Activity },
  { label: "ACTIVE PROGRAMS: 42", icon: Zap },
  { label: "TOTAL CAPITAL DEPLOYED: 85.4M PKR", icon: Shield },
  { label: "CRITICAL VULNERABILITY PATCHED IN GOV_SYSTEM", icon: Zap },
  { label: "REWARD DISBURSED: PKR 250,000 TO @BINARYGHOST", icon: Award },
];

export const InfiniteTicker = () => {
  return (
    <div className="w-full bg-white/80 dark:bg-black/40 border-y border-[0.2px] border-black dark:border-white/5 backdrop-blur-sm overflow-hidden py-3 mb-10 group cursor-default">
      <div 
        className="flex select-none w-max animate-linear-scroll"
        style={{ animationDuration: '40s' }}
      >
        {/* Triple the items to create seamless loop for wide screens */}
        {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-white/50 uppercase tracking-widest mx-8">
            <item.icon className="w-3 h-3 text-zinc-400 dark:text-white" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes linear-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-linear-scroll {
          animation: linear-scroll linear infinite;
        }
      `}</style>
    </div>
  );
};
