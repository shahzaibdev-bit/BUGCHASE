import React from 'react';
import { motion } from 'motion/react';

interface TesseractProps {
  theme?: 'green' | 'red' | 'blue' | 'yellow' | 'purple' | 'white';
  className?: string;
}

export const Tesseract = ({ theme = 'green', className = '' }: TesseractProps) => {
  
  const colors = {
    green: { border: 'border-white/50', shadow: 'shadow-[0_0_10px_rgba(255,255,255,0.2)]', bg: 'bg-white', glow: 'group-hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]' },
    red: { border: 'border-red-500', shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]', bg: 'bg-red-500', glow: 'group-hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]' },
    blue: { border: 'border-blue-500', shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]', bg: 'bg-blue-500', glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]' },
    yellow: { border: 'border-yellow-500', shadow: 'shadow-[0_0_10px_rgba(234,179,8,0.2)]', bg: 'bg-yellow-500', glow: 'group-hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]' },
    purple: { border: 'border-purple-500', shadow: 'shadow-[0_0_10px_rgba(168,85,247,0.2)]', bg: 'bg-purple-500', glow: 'group-hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]' },
    white: { border: 'border-white', shadow: 'shadow-[0_0_10px_rgba(255,255,255,0.2)]', bg: 'bg-white', glow: 'group-hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]' }
  };

  const c = colors[theme];

  return (
    <div className={`group relative cursor-pointer w-64 h-64 flex items-center justify-center perspective-[1000px] ${className}`}>
        
        {/* Floating Text Above (Optional or Contextual) */}
        <div className="absolute -top-16 text-center space-y-2 transition-all duration-500 group-hover:-translate-y-4 pointer-events-none">
            {/* <div className="text-xs font-mono tracking-[0.5em] text-white/40">SYSTEM CORE</div> */}
        </div>

        {/* THE CUBE */}
        <div className={`relative w-32 h-32 transform-style-3d transition-all duration-700 ease-out group-hover:scale-125`}>
            {/* Inner Spinning Core */}
            <motion.div 
                className="absolute inset-0 transform-style-3d"
                animate={{ rotateX: [0, 360], rotateY: [0, 360] }}
                transition={{ 
                    duration: 10, 
                    repeat: Infinity, 
                    ease: "linear",
                }}
            >
                {/* CSS Animation Wrapper for Hover Speedup */}
                <div className="w-full h-full transform-style-3d animate-[spin_10s_linear_infinite] group-hover:animate-[spin_2s_linear_infinite]">
                    {/* 6 Faces */}
                    {[...Array(6)].map((_, i) => {
                        const transforms = [
                            "translateZ(64px)", // Front
                            "translateZ(-64px) rotateY(180deg)", // Back
                            "translateX(64px) rotateY(90deg)", // Right
                            "translateX(-64px) rotateY(-90deg)", // Left
                            "translateY(-64px) rotateX(90deg)", // Top
                            "translateY(64px) rotateX(-90deg)" // Bottom
                        ];
                        return (
                            <div 
                                key={i}
                                className={`absolute inset-0 border-2 bg-black/20 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/5 ${c.glow} ${c.border} ${c.shadow}`}
                                style={{ transform: transforms[i] }}
                            />
                        );
                    })}
                </div>
            </motion.div>
            
            {/* Static Inner Core (The 'Prize') */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full blur-md animate-pulse ${c.bg}`} />
        </div>
    </div>
  );
};
