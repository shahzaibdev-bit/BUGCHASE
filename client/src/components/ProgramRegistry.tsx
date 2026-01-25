import { useRef } from 'react';
import { Shield, Smartphone, Globe, Server, ArrowRight, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Mock Data
const PROGRAMS = [
  {
    name: 'CAREEM RIDES V4',
    type: 'BBP',
    stack: 'MOBILE / API',
    reward: 'PKR 1M',
    icon: Smartphone,
    color: 'text-green-400'
  },
  {
    name: 'JAZZ CASH CORE',
    type: 'VDP',
    stack: 'FINTECH / INFRA',
    reward: 'PKR 750K',
    icon: Server,
    color: 'text-red-400'
  },
  {
    name: 'NAYAPAY GATEWAY',
    type: 'PTAAS',
    stack: 'API / WEB',
    reward: 'PKR 500K',
    icon: Globe,
    color: 'text-blue-400'
  },
  {
    name: 'K-ELECTRIC GRID',
    type: 'BBP',
    stack: 'IOT / SCADA',
    reward: 'PKR 2M',
    icon: Zap,
    color: 'text-yellow-400'
  },
  {
    name: 'DARAZ MALL',
    type: 'VDP',
    stack: 'E-COMMERCE',
    reward: 'PKR 300K',
    icon: Shield,
    color: 'text-purple-400'
  }
];

import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';

const ProgramCard = ({ program }: { program: typeof PROGRAMS[0] }) => {
  return (
    <div className="w-[320px] md:w-[400px] h-full flex-shrink-0 mx-4">
      <div className="h-full">
        <InverseSpotlightCard 
            className="h-full rounded-2xl border border-black/15 dark:border-white/10 bg-zinc-50/90 dark:bg-black/40 backdrop-blur-[25px] hover:bg-[#09090b] dark:hover:bg-black/40 hover:border-white/10 dark:hover:border-white transition-all duration-300 flex flex-col justify-between p-6 shadow-xl shadow-zinc-300/40 dark:shadow-none group/card"
        >
          
          {/* Top Row: Icon + Status */}
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div className={`p-2 rounded-lg bg-zinc-100 dark:bg-white/10 border border-black/15 dark:border-white/20 text-zinc-900 dark:text-white group-hover/card:bg-white/10 group-hover/card:text-white group-hover/card:border-white/20 transition-colors duration-300`}>
              <program.icon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/10 border-[0.2px] border-black dark:border-white/20 group-hover/card:bg-white/10 group-hover/card:border-white/20 group-hover/card:text-white transition-colors duration-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-900 dark:bg-white opacity-75 group-hover/card:bg-white"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-900 dark:bg-white group-hover/card:bg-white"></span>
              </span>
              <span className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider group-hover/card:text-white">LIVE {program.type}</span>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight group-hover/card:text-white transition-colors">{program.name}</h3>
            <p className="text-xs text-zinc-500 dark:text-white/40 font-mono tracking-widest uppercase mb-6 group-hover/card:text-white/60 transition-colors">TECHSTACK: {program.stack}</p>
            
            <div className="flex items-end justify-between border-t border-black dark:border-white/10 pt-4 group-hover/card:border-white/20 transition-colors">
              <div>
                <p className="text-[10px] text-zinc-500 dark:text-white/40 uppercase mb-1 group-hover/card:text-white/60">Max Reward</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight group-hover/card:text-white">{program.reward}</p>
              </div>
              <div className="text-xs text-zinc-500 dark:text-white/40 group-hover/card:text-emerald-400 dark:group-hover/card:text-white flex items-center gap-1 transition-colors font-bold">
                VIEW DETAILS <ArrowRight className="w-3 h-3 group-hover/card:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
          
        </InverseSpotlightCard>
      </div>
    </div>
  );
};

export const ProgramRegistry = () => {

    return (
        <section className="relative z-10 py-24 overflow-hidden">
            {/* 1. Section Header */}
            <div className="container mx-auto px-4 text-center mb-16">
                <Badge variant="outline" className="bg-zinc-100 dark:bg-white/10 border border-black/15 dark:border-white/20 text-black dark:text-white backdrop-blur-md shadow-sm">
                    <span className="text-[10px] font-bold text-zinc-900 dark:text-white font-mono tracking-widest uppercase">
                        [ PROGRAM REGISTRY ]
                    </span>
                </Badge>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4 tracking-tight">
                    ACTIVE PROGRAMS
                </h2>
                <p className="text-[10px] md:text-xs font-mono text-zinc-500 dark:text-white/30 tracking-[0.3em] uppercase">
                    CONTINUOUS SYNCHRONIZATION WITH NATIONAL ASSET REGISTRY
                </p>
            </div>

            {/* 2. Infinite Marquee */}
            <div className="w-full relative group">
                {/* Gradient Masks */}
                <div className="absolute left-0 top-0 bottom-0 w-24 md:w-32 z-20 bg-gradient-to-r from-background to-transparent pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-24 md:w-32 z-20 bg-gradient-to-l from-background to-transparent pointer-events-none" />

                {/* CSS Animation Logic */}
                <style>{`
                    @keyframes marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .animate-marquee {
                        animation: marquee 40s linear infinite;
                    }
                    .group:hover .animate-marquee {
                        animation-play-state: paused;
                    }
                `}</style>

                <div className="flex overflow-hidden">
                    {/* Pure CSS implementation for reliable Pause-On-Hover */}
                    <div 
                        className="flex py-10 animate-marquee w-max"
                        style={{ width: "max-content" }}
                    >
                         {/* 4 sets to ensure smooth loop on wide screens */}
                         {[...PROGRAMS, ...PROGRAMS, ...PROGRAMS, ...PROGRAMS].map((program, idx) => (
                             <ProgramCard key={`${program.name}-${idx}`} program={program} />
                         ))}
                    </div>
                </div>
            </div>
            
            {/* 3. Section Footer */}
            <div className="container mx-auto px-4 mt-12 flex justify-center">
                 <div className="relative group cursor-pointer hover:scale-105 transition-transform duration-300">
                    <Button 
                        variant="ghost" 
                        className="relative h-12 px-8 text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/30 hover:bg-zinc-900 dark:hover:bg-white hover:text-white dark:hover:text-black tracking-widest font-mono text-sm uppercase rounded-sm overflow-hidden transition-all duration-300"
                    >
                        VIEW PROGRAMS
                    </Button>
                    
                    {/* L-shaped Corner Accents - Invert on hover for visibility? Keep subtle. */}
                    <span className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-zinc-400 dark:border-white/50 transition-all duration-300 group-hover:w-3 group-hover:h-3 group-hover:border-zinc-900 dark:group-hover:border-white" />
                    <span className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-zinc-400 dark:border-white/50 transition-all duration-300 group-hover:w-3 group-hover:h-3 group-hover:border-zinc-900 dark:group-hover:border-white" />
                    <span className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b border-l border-zinc-400 dark:border-white/50 transition-all duration-300 group-hover:w-3 group-hover:h-3 group-hover:border-zinc-900 dark:group-hover:border-white" />
                    <span className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b border-r border-zinc-400 dark:border-white/50 transition-all duration-300 group-hover:w-3 group-hover:h-3 group-hover:border-zinc-900 dark:group-hover:border-white" />
                 </div>
            </div>

        </section>
    );
};
