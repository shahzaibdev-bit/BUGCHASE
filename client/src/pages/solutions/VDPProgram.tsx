import React from 'react';
import { SolutionsLayout } from '@/components/solutions/SolutionsLayout';
import { FlickerText } from '@/components/solutions/TextEffects';
import { CyberLock } from '@/components/solutions/CyberLock';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { Badge } from '@/components/ui/badge';
import { Users, Zap, TrendingDown, Eye, ShieldCheck, Lock } from 'lucide-react';

const vdpStats = [
    {
        title: "GLOBAL INTELLIGENCE",
        value: "500K+",
        label: "ACTIVE RESEARCHERS",
        desc: "Tap into the world's largest collective of ethical hackers immediately upon launch.",
        icon: Users,
        trend: "+12% this month"
    },
    {
        title: "RISK VELOCITY",
        value: "-72%",
        label: "MEAN TIME TO REMEDIATE",
        desc: "Identify and patch critical vulnerabilities faster than traditional penetrations testing.",
        icon: Zap,
        trend: "Industry Leader"
    },
    {
        title: "COST EFFICIENCY",
        value: "10x",
        label: "ROI VS PENTEST",
        desc: "Pay only for valid, unique results. Zero false positives. Zero wasted budget.",
        icon: TrendingDown,
        trend: "Optimized Spend"
    }
];

const engagementFeatures = [
    {
        title: "Silent Watch",
        desc: "24/7 passive reconnaissance by top-tier researchers.",
        icon: Eye
    },
    {
        title: "Legal Shield",
        desc: "Automated Safe Harbor enforcement for all submissions.",
        icon: ShieldCheck
    },
    {
        title: "Encrypted Pipes",
        desc: "Military-grade PGP encryption for all report data.",
        icon: Lock
    }
];

const VDPProgram = () => {
  return (
    <SolutionsLayout>
      <div className="container mx-auto px-4 py-12 md:pb-0">
        
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-24">
          <div className="flex-1 space-y-8">
            <div className="inline-block px-3 py-1 bg-zinc-100 dark:bg-white/10 border border-black/15 dark:border-white/20 rounded-full text-zinc-900 dark:text-white text-xs font-mono tracking-widest animate-pulse-slow">
              🔴 LIVE THREAT INTELLIGENCE
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[0.9]">
              VULNERABILITY <br />
              <div className="text-zinc-900 dark:text-white">
                <FlickerText text="DISCLOSURE" className="text-zinc-900 dark:text-white" glowColor="currentColor" />
              </div>
            </h1>
            
            <p className="text-xl text-zinc-500 dark:text-white/50 max-w-2xl leading-relaxed font-light">
              Don't wait for a breach to test your defenses. 
              <span className="text-zinc-900 dark:text-white font-medium"> Invite the world's best hackers </span> 
              to find your weak spots before the bad guys do.
            </p>

            {/* Engagement Metrics / Small Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg"> 
                {engagementFeatures.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-black/15 dark:border-white/5 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors">
                        <feat.icon className="w-5 h-5 text-zinc-900 dark:text-white mt-0.5" />
                        <div>
                            <div className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{feat.title}</div>
                            <p className="text-xs text-zinc-500 dark:text-white/40 leading-snug">{feat.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

          </div>
          
          <div className="flex-1 flex justify-center md:justify-end relative">
             {/* Background Decoration */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-zinc-200/50 dark:bg-white/5 blur-[100px] rounded-full pointer-events-none" />
             <CyberLock className="drop-shadow-2xl" />
          </div>
        </div>

        {/* Company Value Prop Grid */}
        <div className="pb-12">
            <div className="flex items-end justify-between mb-10 border-b border-black/15 dark:border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">WHY LAUNCH A VDP?</h2>
                    <p className="text-zinc-500 dark:text-white/40 font-mono text-sm">Quantifiable security impact</p>
                </div>
                <div className="hidden md:block text-right">
                    <div className="text-zinc-900 dark:text-white font-mono text-2xl font-bold">14,203</div>
                    <div className="text-[10px] text-zinc-500 dark:text-white/30 uppercase tracking-widest">Vulnerabilities Resolved</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {vdpStats.map((stat, idx) => (
                    <InvertedTiltCard key={idx} intensity={15} className="h-full">
                        <InverseSpotlightCard 
                            className="h-full bg-white dark:bg-[#050505] border border-black/15 dark:border-white/10 p-8 rounded-2xl flex flex-col justify-between group hover:border-black/50 dark:hover:border-white/30 transition-all relative overflow-hidden shadow-xl shadow-zinc-200/50 dark:shadow-none"
                        >
                           {/* Noise & Scanlines */}
                           <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
                           <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.02)_50%,transparent_100%)] dark:bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] bg-[length:100%_4px] pointer-events-none" />

                           {/* Header */}
                           <div className="relative z-10">
                               <div className="flex justify-between items-start mb-6">
                                   <Badge variant="outline" className="border-black/15 dark:border-white/20 text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/10 font-mono text-[10px] py-0.5">
                                       {stat.label}
                                   </Badge>
                                   <stat.icon className="w-6 h-6 text-zinc-700 dark:text-white opacity-60" />
                               </div>
                               
                               <div className="flex items-baseline gap-2 mb-2">
                                    <h3 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">
                                        {stat.value}
                                    </h3>
                               </div>
                               
                               <div className="w-full h-px bg-gradient-to-r from-zinc-300 dark:from-white/50 to-transparent my-4" />

                               <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 font-display">{stat.title}</h4>
                               <p className="text-zinc-600 dark:text-white/50 text-sm leading-relaxed">
                                   {stat.desc}
                               </p>
                           </div>

                           {/* Footer / Animation */}
                           <div className="pt-6 mt-4 relative z-10 flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
                               <span className="text-xs font-mono text-zinc-500 dark:text-gray-400">{stat.trend}</span>
                           </div>
                        </InverseSpotlightCard>
                    </InvertedTiltCard>
                ))}
            </div>
        </div>

      </div>
    </SolutionsLayout>
  );
};

export default VDPProgram;
