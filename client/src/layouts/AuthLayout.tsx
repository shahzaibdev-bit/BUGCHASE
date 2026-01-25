import React from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { Fingerprint, Lock } from 'lucide-react';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { motion, AnimatePresence } from 'framer-motion';

export const AuthLayout = () => {
  const location = useLocation();
  const isSignup = location.pathname === '/signup';

  return (
    // LAYOUT FIX: Removed 'items-center', keeping 'pt-32' for fixed top positioning.
    // This prevents the "jumping" effect when the card height changes.
    <div className="min-h-screen w-full flex justify-center pt-32 pb-12 overflow-hidden relative bg-transparent">
      
      {/* Grid: items-start to keep top alignment stable */}
      <div className="w-full max-w-5xl mx-auto px-6 grid lg:grid-cols-2 gap-6 items-start relative z-10">
      
          {/* LEFT COLUMN: STATIC VISUALS */}
          {/* Added AnimatePresence to fade text in/out as requested */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={location.pathname} // Triggers animation on route change
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col justify-center text-center lg:text-left space-y-5 h-full pt-4"
            >
                <div className="select-none group space-y-2">
                    <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-zinc-900 dark:text-white leading-none">
                      SECURE <br />
                      ACCESS
                    </h1>
                </div>

                <div className="h-1 w-20 bg-zinc-900/30 dark:bg-white/30 rounded-full mx-auto lg:mx-0" />
                
                <p className="font-mono text-base text-gray-600 dark:text-gray-300 max-w-sm mx-auto lg:mx-0 leading-relaxed font-medium">
                    Authorized personnel only. Identify yourself to access the platform.
                </p>

                {/* Status Indicators */}
                <div className="flex flex-wrap lg:flex-nowrap gap-4 justify-center lg:justify-start pt-4">
                    <div className="bg-white/90 dark:bg-zinc-900/90 border border-black/15 dark:border-white/20 p-4 rounded-lg min-w-[160px] backdrop-blur-md hover:border-black/50 dark:hover:border-white/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-default group shadow-sm dark:shadow-none">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">Biometric Sync</div>
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-lg">
                            <Fingerprint className="w-5 h-5 text-zinc-900 dark:text-white" />
                            <span className="drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">ACTIVE</span>
                        </div>
                    </div>

                    <div className="bg-white/90 dark:bg-zinc-900/90 border border-black/15 dark:border-white/20 p-4 rounded-lg min-w-[160px] backdrop-blur-md hover:border-black/50 dark:hover:border-white/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-default group shadow-sm dark:shadow-none">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">Encryption</div>
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-lg">
                            <Lock className="w-5 h-5 text-zinc-900 dark:text-white" />
                            <span className="drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">TLS 1.3</span>
                        </div>
                    </div>
                </div>
            </motion.div>
          </AnimatePresence>

          {/* RIGHT COLUMN: CONTENT SHELL (Animated Outlet) */}
          <div className="order-2 lg:order-none w-full max-w-md mx-auto lg:mr-0">
             <InvertedTiltCard intensity={5} className="rounded-xl">
                 <InverseSpotlightCard 
                    spotlightColor="rgba(255, 255, 255, 0.12)" 
                    spotlightRadius={1000}
                    className="bg-white/80 dark:bg-black border border-black/15 dark:border-white/20 hover:border-black/50 dark:hover:border-zinc-600 shadow-xl dark:shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all duration-500 backdrop-blur-xl p-8 rounded-xl relative overflow-hidden"
                 >
                     <AnimatePresence mode='wait' initial={false}>
                        <motion.div
                            key={location.pathname}
                            initial={{ x: isSignup ? 40 : -40, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: isSignup ? -40 : 40, opacity: 0 }}
                            // SLOWER ANIMATION: 0.5s duration, spring physics for smoothness
                            transition={{ 
                                type: "spring",
                                stiffness: 260,
                                damping: 20,
                                duration: 0.5 
                            }}
                            className="w-full"
                        >
                           <Outlet />
                        </motion.div>
                     </AnimatePresence>

                 </InverseSpotlightCard>
             </InvertedTiltCard>
          </div>

      </div>
    </div>
  );
};
