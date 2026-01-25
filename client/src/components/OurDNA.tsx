import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Users, Zap } from 'lucide-react';
import { InvertedTiltCard } from './InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { cn } from '@/lib/utils';

const TABS = [
  {
    id: 'sovereign',
    title: 'Sovereign Architecture',
    subText: 'DATA RESIDENCY',
    description: 'Full data residency compliance with national security protocols. Your infrastructure remains under sovereign control.',
    icon: Shield,
    statusText: 'DATA RESIDENCY / SYSTEM STATUS: OPTIMAL'
  },
  {
    id: 'intelligence',
    title: 'Elite Intelligence',
    subText: 'VETTED RESEARCHERS',
    description: 'Curated access to top-tier ethical hackers, vetted for skill and integrity through rigor. Not just a crowd; an army.',
    icon: Users,
    statusText: 'VETTED RESEARCHERS / SYSTEM STATUS: OPTIMAL'
  },
  {
    id: 'evolution',
    title: 'Continuous Evolution',
    subText: 'REAL-TIME DEFENSE',
    description: 'Adaptive defense mechanisms that evolve in real-time against emerging threats. Stay ahead of the exploit curve.',
    icon: Zap,
    statusText: 'REAL-TIME DEFENSE / SYSTEM STATUS: OPTIMAL'
  }
];

export const OurDNA = () => {
    const [activeTab, setActiveTab] = useState(TABS[0]);

    return (
        <section className="relative z-10 py-24 overflow-hidden">
            <div className="container mx-auto px-4">
                
                {/* Section Header */}
                <div className="mb-16">
                     <div className="inline-block mb-4 px-3 py-1 border-[0.2px] border-black dark:border-white/20 rounded-sm">
                        <span className="text-[10px] font-bold text-zinc-900 dark:text-white font-mono tracking-widest uppercase">
                            [ OUR_DNA ]
                        </span>
                    </div>
                    {/* Typography: Large Split Heading */}
                    <h2 className="font-display text-5xl md:text-6xl font-bold text-zinc-900 dark:text-white mb-6 tracking-tight leading-[0.9]">
                        ARCHITECTS OF <br />
                        <span className="text-zinc-500 dark:text-white">RESILIENCE.</span>
                    </h2>
                    {/* Subtext: Small and Dimmed */}
                    <p className="text-zinc-600 dark:text-white/60 text-sm max-w-xl font-light leading-relaxed">
                        BugChase isn't just a platform; it's a national defense initiative. We bridge the gap between critical infrastructure and the world's most creative ethical hackers.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    
                    {/* Left Column: Interactive Tabs */}
                    <div className="flex flex-col gap-4">
                        {TABS.map((tab) => (
                             <motion.div 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab)} 
                                // Hover Interaction: Horizontal Slide 8px
                                whileHover={{ x: 8 }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className="cursor-pointer rounded-lg transition-all duration-300 relative group"
                             >
                                <InverseSpotlightCard
                                    className={cn(
                                        "p-5 rounded-lg border transition-all duration-300 h-full",
                                        // Darker Base Opacity
                                        activeTab.id === tab.id 
                                            ? "bg-zinc-100 dark:bg-white/5 border-zinc-400 dark:border-white/10 shadow-lg shadow-zinc-200/50 dark:shadow-[0_0_20px_rgba(255,255,255,0.05)]" 
                                            : "bg-zinc-50/80 dark:bg-[#0f0f0f]/85 border border-black/15 dark:border-white/5 hover:border-black/50 dark:hover:border-white/10 backdrop-blur-[20px] shadow-md shadow-zinc-200/30 dark:shadow-none"
                                    )}
                                >
                                    {/* Active Indicator Line */}
                                    {activeTab.id === tab.id && (
                                            <motion.div 
                                                layoutId="active-line"
                                                className="absolute left-0 top-0 bottom-0 w-1.5 bg-zinc-900 dark:bg-white z-20"
                                            />
                                    )}

                                    <div className="flex items-start gap-5 relative z-10">
                                        {/* Icon Styling */}
                                        <div className={cn(
                                            "w-10 h-10 rounded-md flex items-center justify-center border transition-all duration-300 shrink-0",
                                            activeTab.id === tab.id 
                                                ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black shadow-lg dark:shadow-[0_0_15px_-3px_rgba(255,255,255,0.4)]" 
                                                // Idle vs Hover State for Icon
                                                : "bg-zinc-100 dark:bg-white/5 border-[0.2px] border-black dark:border-white/10 text-zinc-400 dark:text-white/40 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:bg-zinc-200 dark:group-hover:bg-white/10"
                                        )}>
                                            <tab.icon className="w-5 h-5" />
                                        </div>

                                        {/* Text Content */}
                                        <div className="flex-1 pt-0.5">
                                            <div className="flex justify-between items-center mb-1">
                                                {/* Typography Colors */}
                                                <h3 className={cn(
                                                    "text-base font-bold uppercase tracking-tight transition-colors duration-300", 
                                                    activeTab.id === tab.id 
                                                        ? "text-zinc-900 dark:text-white" 
                                                        : "text-zinc-400 dark:text-white/40 group-hover:text-zinc-900 dark:group-hover:text-white"
                                                )}>
                                                    {tab.title}
                                                </h3>
                                            </div>
                                            <p className="text-[10px] font-mono text-zinc-500 dark:text-white/80 tracking-widest uppercase mb-2">
                                                {tab.subText}
                                            </p>
                                            
                                            {/* Downward Collapse */}
                                            <AnimatePresence>
                                                {activeTab.id === tab.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    >
                                                        <p className="text-xs text-zinc-600 dark:text-white/50 leading-relaxed max-w-[95%]">
                                                            {tab.description}
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </InverseSpotlightCard>
                             </motion.div>
                        ))}
                    </div>

                    {/* Right Column: Compact HUD Card + Complex Radar */}
                    <div className="relative w-full flex items-center justify-center min-h-[400px]">
                        {/* Radar Background - VISIBLE */}
                        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 pointer-events-none">
                             <div className="w-[300px] h-[300px] border border-dashed border-zinc-300 dark:border-white/10 rounded-full animate-pulse" />
                             <div className="absolute w-[380px] h-[380px] border border-dashed border-zinc-200 dark:border-white/5 rounded-full animate-pulse delay-75" />
                             
                             <div className="absolute w-[300px] h-[300px] animate-[spin_20s_linear_infinite]">
                                  <div className="w-1.5 h-1.5 bg-zinc-900 dark:bg-white rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_10px_black] dark:shadow-[0_0_10px_white]" />
                             </div>
                             <div className="absolute w-[380px] h-[380px] animate-[spin_30s_linear_infinite_reverse]">
                                  <div className="w-1.5 h-1.5 bg-zinc-400 dark:bg-white/50 rounded-full absolute bottom-0 left-1/2 -translate-x-1/2" />
                             </div>
                             <div className="absolute w-[240px] h-[240px] animate-[spin_15s_linear_infinite]">
                                  <div className="w-1 h-1 bg-zinc-300 dark:bg-white/40 rounded-full absolute top-1/2 right-0 -translate-y-1/2" />
                             </div>
                        </div>

                        {/* HUD Card Container - Compact Square */}
                        <div className="w-[280px] md:w-[300px] aspect-square relative z-10 text-left"> 
                            {/* Black Hole Transition Wrapper */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab.id}
                                    initial={{ scale: 0, opacity: 0, filter: "blur(10px)" }}
                                    animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                                    exit={{ scale: 0, opacity: 0, filter: "blur(10px)" }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                    className="w-full h-full"
                                >
                                    <InvertedTiltCard intensity={20} className="w-full h-full">
                                        <div className="w-full h-full glass-card bg-zinc-50/90 dark:bg-black/80 backdrop-blur-3xl border-[0.2px] border-black dark:border-white/20 rounded-lg overflow-hidden relative flex flex-col items-center justify-center text-center shadow-2xl shadow-zinc-400/50 dark:shadow-[0_0_50px_-10px_rgba(255,255,255,0.15)]">
                                            {/* Decorations */}
                                            <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-zinc-400 dark:border-white/60 rounded-tl-sm" />
                                            <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-zinc-400 dark:border-white/60 rounded-tr-sm" />
                                            <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-zinc-400 dark:border-white/60 rounded-bl-sm" />
                                            <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-zinc-400 dark:border-white/60 rounded-br-sm" />

                                            {/* Infinite Scan Line - FIXED */}
                                            <div className="absolute left-0 right-0 h-[2px] bg-zinc-900 dark:bg-white shadow-[0_0_15px_2px_rgba(0,0,0,0.2)] dark:shadow-[0_0_15px_2px_rgba(255,255,255,0.6)] z-20 animate-scan pointer-events-none" />
                                            <style>{`
                                                @keyframes scan {
                                                    0% { top: 0%; opacity: 0; }
                                                    10% { opacity: 1; }
                                                    90% { opacity: 1; }
                                                    100% { top: 100%; opacity: 0; }
                                                }
                                                .animate-scan {
                                                    animation: scan 2s linear infinite;
                                                }
                                            `}</style>
                                            
                                            {/* Inner Content */}
                                            <div className="flex flex-col items-center relative z-10 px-6 w-full">
                                                <div className="inline-block p-4 bg-zinc-100 dark:bg-white/5 border border-black/15 dark:border-white/10 rounded-full text-zinc-900 dark:text-white mb-6 animate-pulse-slow relative overflow-hidden">
                                                     <activeTab.icon className="w-10 h-10 text-zinc-900 dark:text-white relative z-10" />
                                                     <div className="absolute inset-0 bg-zinc-200 dark:bg-white/5 blur-xl opacity-30" />
                                                </div>
                                                
                                                <h3 className="text-2xl font-display font-bold text-zinc-900 dark:text-white mb-3 uppercase tracking-wide leading-none">
                                                    {activeTab.title}
                                                </h3>
                                                
                                                <div className="w-full flex justify-center">
                                                    <div className="border border-black/15 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl px-4 py-2 rounded-md flex items-center justify-center gap-2 mt-2 w-auto min-w-[140px]">
                                                        <div className="w-2 h-2 bg-green-500 dark:bg-white rounded-full animate-pulse shadow-[0_0_5px_rgba(74,222,128,0.5)] dark:shadow-[0_0_8px_white]" />
                                                        <span className="text-[10px] font-mono text-zinc-600 dark:text-white/80 tracking-[0.2em] uppercase">
                                                            SYSTEM: ONLINE
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                                        </div>
                                    </InvertedTiltCard>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
