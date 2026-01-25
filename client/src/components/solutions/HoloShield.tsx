import React from 'react';
import { motion } from 'framer-motion';

export const HoloShield = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative w-96 h-96 flex items-center justify-center ${className} perspective-[1000px]`}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-white/5 blur-[80px] rounded-full animate-pulse-slow pointer-events-none" />

        <div className="relative w-80 h-80 preserve-3d group">
            
            {/* Shield Layers */}
            <motion.div 
                className="absolute inset-0 border border-white/20 rounded-full"
                animate={{ rotateZ: 360, rotateX: 10 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Hexagon Mesh Pattern on Shield */}
                <div className="absolute inset-4 rounded-full border border-dashed border-white/10 blur-[1px]" />
            </motion.div>

            {/* Core Shield Shape (Holographic) */}
            <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 bg-white/5 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)] clip-path-shield"
                style={{ 
                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", // Hex-shield shape
                    transform: "translateZ(50px)"
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="w-20 h-20 border border-white/30 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
                </div>
            </motion.div>

            {/* Orbiting Defense Nodes */}
             {[0, 120, 240].map((deg, i) => (
                 <motion.div 
                    key={i}
                    className="absolute top-1/2 left-1/2 w-8 h-8 border-2 border-white/30 rounded-full flex items-center justify-center"
                    style={{ 
                        transform: `rotateZ(${deg}deg) translateX(120px) rotateZ(-${deg}deg)`
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 >
                     <div className="w-1 h-1 bg-white rounded-full" />
                 </motion.div>
             ))}

        </div>
    </div>
  );
};
