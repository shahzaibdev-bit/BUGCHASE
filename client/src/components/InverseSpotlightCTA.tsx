
import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Ghost, ChevronRight } from 'lucide-react';
import { InvertedTiltCard } from './InvertedTiltCard';
import { MagneticButton } from '@/components/MagneticButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const InverseSpotlightCTA = () => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [spotlightPos, setSpotlightPos] = useState({ x: '50%', y: '50%' });
    const [glitch, setGlitch] = useState(false);

    // Glitch Timer
    useEffect(() => {
        const interval = setInterval(() => {
            setGlitch(true);
            setTimeout(() => setGlitch(false), 200); // Short glitch burst
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        
        // PERFORMANCE OPTIMIZATION: Disable on mobile/touch devices
        if (typeof window !== 'undefined' && window.innerWidth < 768) return;

        const rect = cardRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate percentage positions
        const xPct = (mouseX / rect.width) * 100;
        const yPct = (mouseY / rect.height) * 100;

        // Inverse Logic: 100 - pct
        const inverseX = 100 - xPct;
        const inverseY = 100 - yPct;

        setSpotlightPos({ x: `${inverseX}%`, y: `${inverseY}%` });
    };

    const handleMouseLeave = () => {
        setSpotlightPos({ x: '50%', y: '50%' });
    };

    return (
        <section className="relative z-10 py-32">
            <div className="container mx-auto px-4">
                <InvertedTiltCard intensity={15} className="w-full max-w-4xl mx-auto">
                    <div 
                        ref={cardRef}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        className="relative overflow-hidden rounded-2xl bg-zinc-50/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-black/15 dark:border-white/10 p-12 md:p-16 text-center group shadow-2xl shadow-zinc-400/50 dark:shadow-none"
                    >
                        {/* Inverse Spotlight Layer */}
                        <div 
                            className="absolute inset-0 pointer-events-none transition-all duration-75 ease-out opacity-0 group-hover:opacity-100"
                            style={{
                                background: `radial-gradient(600px circle at ${spotlightPos.x} ${spotlightPos.y}, rgba(0, 0, 0, 0.05), transparent 40%)` // Darker Logic needs verification, or maybe keep white spotlight for both but inverted logic? Wait, inverse spotlight usually means DARK.
                                // Actually let's stick to a subtle light glow for now, or just keep it simple.
                            }}
                        />
                        {/* REVERTING SPOTLIGHT LOGIC for simplicity - ensuring visibility first */}
                        <div 
                             className="absolute inset-0 pointer-events-none transition-all duration-75 ease-out opacity-0 group-hover:opacity-100 mix-blend-overlay"
                             style={{
                                 background: `radial-gradient(600px circle at ${spotlightPos.x} ${spotlightPos.y}, rgba(255, 255, 255, 0.1), transparent 40%)`
                             }}
                        />


                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center">
                            
                            {/* Glitch-Ghost Icon */}
                            <div className="mb-8 relative w-16 h-16 flex items-center justify-center">
                                {/* Base Ghost - Floating */}
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="relative z-10"
                                >
                                    <Ghost 
                                        className={cn("w-12 h-12 text-zinc-900 dark:text-white transition-transform duration-100", glitch && "translate-x-[2px] skew-x-12 opacity-80")} 
                                        strokeWidth={1.5} 
                                        style={{ filter: "drop-shadow(0 0 15px rgba(255,255,255,0.4))" }} 
                                    />
                                </motion.div>

                                {/* Chromatic Aberration Layer (Red) - Only visible during glitch or subtle offset */}
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                                    className={cn("absolute inset-0 z-0 opacity-0", glitch && "opacity-50 -translate-x-1")}
                                >
                                    <Ghost className="w-12 h-12 text-gray-500 mix-blend-screen" strokeWidth={1.5} />
                                </motion.div>
                                
                                {/* Chromatic Aberration Layer (Blue) */}
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: -0.1 }}
                                    className={cn("absolute inset-0 z-0 opacity-0", glitch && "opacity-50 translate-x-1")}
                                >
                                    <Ghost className="w-12 h-12 text-gray-300 mix-blend-screen" strokeWidth={1.5} />
                                </motion.div>
                            </div>

                            {/* Headline */}
                            <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-6 uppercase tracking-tight">
                                READY TO <span className="text-zinc-500 dark:text-white italic">START?</span>
                            </h2>

                            {/* Subtext */}
                            <p className="text-zinc-600 dark:text-white/40 font-mono text-sm uppercase tracking-wider mb-10 max-w-lg mx-auto leading-relaxed">
                                Join the professional platform of ethical researchers or secure your infrastructure today.
                            </p>

                            {/* Power Cell Tactical Button */}
                            <MagneticButton strength={0.4} triggerRadius={200}>
                                <motion.button
                                    whileHover="hover"
                                    whileTap={{ scale: 0.95 }}
                                    className="relative overflow-hidden group/btn"
                                    style={{
                                        clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
                                        filter: "drop-shadow(0 0 10px rgba(0,0,0,0.1)) dark:drop-shadow(0 0 10px rgba(255,255,255,0.3))"
                                    }}
                                >
                                    <div className="absolute inset-0 bg-zinc-900 dark:bg-white mix-blend-normal z-0" />
                                    
                                    {/* Active Background: Scrolling Data Lines */}
                                    <div className="absolute inset-0 z-0 opacity-30">
                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] bg-[length:4px_100%]" />
                                        {/* Scrolling lines */}
                                        <div className="absolute inset-0 animate-[shimmer_2s_linear_infinite]" 
                                             style={{ 
                                                 backgroundImage: "linear-gradient(0deg, transparent 45%, rgba(255,255,255,0.6) 50%, transparent 55%)",
                                                 backgroundSize: "100% 4px"
                                             }} 
                                        />
                                    </div>

                                    {/* Main Button Content */}
                                    <div className="relative z-10 h-14 px-12 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold flex items-center gap-3 transition-colors duration-300">
                                        {/* Glitching Text on Hover */}
                                        <motion.span 
                                            className="font-mono text-xl tracking-tight relative"
                                            variants={{
                                                hover: { 
                                                    textShadow: [
                                                        "2px 0px 0px rgba(255,0,0,0.5), -2px 0px 0px rgba(0,0,255,0.5)",
                                                        "-2px 0px 0px rgba(255,0,0,0.5), 2px 0px 0px rgba(0,0,255,0.5)",
                                                        "0px 0px 0px transparent"
                                                    ],
                                                    transition: { repeat: Infinity, duration: 0.1 }
                                                }
                                            }}
                                        >
                                            GET STARTED
                                        </motion.span>
                                    </div>
                                    
                                    {/* Intense Scanner Sweep */}
                                    <motion.div
                                        className="absolute inset-0 w-[100%] h-full bg-gradient-to-r from-transparent via-white to-transparent skew-x-[-20deg] z-20 mix-blend-overlay pointer-events-none"
                                        initial={{ x: '-150%' }}
                                        variants={{
                                            hover: { x: '150%', transition: { duration: 0.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5 } }
                                        }}
                                    />
                                    
                                </motion.button>
                            </MagneticButton>
                            <style>{`
                                @keyframes shimmer {
                                    from { background-position: 0 0; }
                                    to { background-position: 0 50px; }
                                }
                            `}</style>

                        </div>

                        {/* Grid Overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-50" />
                    
                    </div>
                </InvertedTiltCard>
            </div>
        </section>
    );
};
