import React from 'react';
import { motion } from 'framer-motion';

export const HoloTarget = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative w-96 h-96 flex items-center justify-center ${className} perspective-[1000px]`}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-full animate-pulse-slow pointer-events-none" />

        <div className="relative w-80 h-80 preserve-3d group">
            
            {/* Outer Ring - Rotating */}
            <motion.div 
                className="absolute inset-0 border-2 border-dashed border-blue-500/30 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            />
            <motion.div 
                className="absolute inset-4 border border-blue-500/10 rounded-full"
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />

            {/* Crosshairs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-gradient-to-b from-transparent via-blue-500/50 to-transparent" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            
            {/* Brackets */}
            <div className="absolute top-[20%] left-[20%] w-8 h-8 border-l-2 border-t-2 border-blue-400" />
            <div className="absolute top-[20%] right-[20%] w-8 h-8 border-r-2 border-t-2 border-blue-400" />
            <div className="absolute bottom-[20%] left-[20%] w-8 h-8 border-l-2 border-b-2 border-blue-400" />
            <div className="absolute bottom-[20%] right-[20%] w-8 h-8 border-r-2 border-b-2 border-blue-400" />

            {/* Central Scope - Floating and Scaling */}
             <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-blue-900/20 backdrop-blur-sm rounded-full border border-blue-400 flex items-center justify-center shadow-[0_0_20px_#3b82f6]"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]" />
            </motion.div>

            {/* Floating 'Targets' */}
             {[0, 120, 240].map((deg, i) => (
                 <motion.div 
                    key={i}
                    className="absolute top-1/2 left-1/2 w-6 h-6 border border-red-500/50 rounded-sm"
                    style={{ 
                        transform: `rotate(${deg}deg) translateX(100px)`
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                 >
                     <div className="absolute -top-4 -left-2 text-[8px] text-red-400 font-mono">TARGET_LOCKED</div>
                 </motion.div>
             ))}

             {/* Hover info */}
            <div 
                className="absolute inset-x-0 -bottom-10 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ transform: "translateZ(80px)" }}
            >
                 <div className="bg-black/90 border border-blue-500/50 px-4 py-2 rounded-md text-xs text-blue-300 font-mono shadow-xl">
                    RECRUITMENT: ACTIVE
                </div>
            </div>

        </div>
    </div>
  );
};
