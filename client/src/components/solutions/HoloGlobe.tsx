import React from 'react';
import { motion } from 'framer-motion';

export const HoloGlobe = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative w-96 h-96 flex items-center justify-center ${className} perspective-[1000px]`}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-white/5 blur-[80px] rounded-full animate-pulse-slow pointer-events-none" />

        <div className="relative w-80 h-80 preserve-3d group">
            
            {/* Rotating Latitude Lines */}
            <motion.div 
                className="absolute inset-0 rounded-full border border-white/20"
                animate={{ rotateX: 360, rotateY: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                 {[0, 45, 90, 135].map((deg, i) => (
                    <div key={i} className="absolute inset-0 rounded-full border border-white/10"
                        style={{ transform: `rotateX(${deg}deg)` }}
                    />
                 ))}
                 {[0, 45, 90, 135].map((deg, i) => (
                    <div key={i} className="absolute inset-0 rounded-full border border-white/10"
                        style={{ transform: `rotateY(${deg}deg)` }}
                    />
                 ))}
            </motion.div>

            {/* Core */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 backdrop-blur-sm rounded-full border border-white/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                 <div className="text-[10px] text-white/70 font-mono animate-pulse">GLOBAL_INTEL</div>
            </div>

            {/* Orbiting Nodes */}
             {[0, 120, 240].map((deg, i) => (
                 <motion.div 
                    key={i}
                    className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_white]"
                    style={{ 
                        transform: `rotateZ(${deg}deg) translateX(140px)`
                    }}
                    animate={{ rotateZ: 360 }} 
                 />
             ))}
             
             {/* Actual Orbit Animation */}
             <motion.div 
                className="absolute inset-0"
                animate={{ rotateZ: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
             >
                <div className="absolute top-1/2 left-4 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />
                <div className="absolute top-4 left-1/2 w-2 h-2 bg-white rounded-full" />
             </motion.div>

        </div>
    </div>
  );
};
