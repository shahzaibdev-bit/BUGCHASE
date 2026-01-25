import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export const BountyToken = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative group w-64 h-64 flex items-center justify-center perspective-[1000px]", className)}>
        
        {/* The Coin Container */}
        <div className="relative w-48 h-48 transform-style-3d animate-[spin_10s_linear_infinite] group-hover:animate-[spin_2s_linear_infinite] transition-all duration-500">
            
            {/* Front Face */}
            <div 
                className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-black to-white/5 border border-white/20 flex items-center justify-center backface-hidden"
                style={{ transform: "rotateY(0deg) translateZ(10px)" }}
            >
                {/* Shine Effect */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] animate-shimmer" />
                </div>
                
                {/* Content - $ Sign */}
                <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 drop-shadow-2xl font-mono">
                    $
                </div>
                
                {/* Ring Detail */}
                <div className="absolute inset-4 rounded-full border border-white/10 border-dashed animate-[spin_20s_linear_infinite]" />
            </div>

            {/* Back Face */}
            <div 
                className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-black to-white/5 border border-white/20 flex items-center justify-center backface-hidden"
                style={{ transform: "rotateY(180deg) translateZ(10px)" }}
            >
                 <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 drop-shadow-2xl font-display tracking-tighter">
                    BUG
                </div>
            </div>

            {/* Thickness / Rim ( Simulated with multiple layers or just Z-fighting fix? ) */}
            {/* Let's try to simulate thickness by adding a few layers in between or a side strip */}
            {/* Simple approach for "Holographic" feel: Just the 2 faces with spacing is often enough if they are transparent. */}
            
            {/* Glowing Core */}
             <div className="absolute inset-0 rounded-full bg-white/5 blur-xl transform translate-z-0" />

        </div>

         {/* Floating Ring Orbit */}
         <div className="absolute inset-0 border border-white/10 rounded-full rotate-x-[75deg] animate-[spin_8s_linear_infinite_reverse] scale-125" />
    </div>
  );
};
