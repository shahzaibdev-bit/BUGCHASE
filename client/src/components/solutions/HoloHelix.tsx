import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export const HoloHelix = ({ className = "" }: { className?: string }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth out the mouse movement
  const springConfig = { damping: 20, stiffness: 100 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        // Normalize mouse position from -0.5 to 0.5
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className={`relative w-96 h-96 flex items-center justify-center ${className} perspective-[1000px]`}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-white/5 blur-[80px] rounded-full animate-pulse-slow pointer-events-none" />

        <motion.div 
            className="relative w-64 h-80 preserve-3d group"
            style={{
                rotateX,
                rotateY,
            }}
        >
            
            {/* The Helix Structure */}
            <motion.div 
                className="absolute inset-0 preserve-3d"
                animate={{ rotateY: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            >
                {/* Generating DNA rungs */}
                {[...Array(20)].map((_, i) => {
                    const y = i * 15 - 140; // Spread vertically
                    const rot = i * 20; // Rotate each rung
                    return (
                        <div key={i} className="absolute top-1/2 left-1/2 w-40 h-[2px] preserve-3d"
                            style={{ 
                                transform: `translate(-50%, ${y}px) rotateY(${rot}deg)`,
                            }}
                        >
                            {/* Connector Line */}
                            <div className="absolute inset-0 bg-white/20" />
                            
                            {/* Nucleotides (Ends) */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_#ffffff] animate-pulse" />
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-300 rounded-full shadow-[0_0_10px_#cccccc] animate-pulse" 
                                 style={{ animationDelay: '0.5s' }}
                            />
                        </div>
                    );
                })}
            </motion.div>

             {/* Central Axis / Core (Optional, maybe a beam) */}
             <div className="absolute inset-0 w-[2px] bg-gradient-to-b from-transparent via-white/10 to-transparent left-1/2 -translate-x-1/2 blur-sm" />

             {/* Hover info */}
            <div 
                className="absolute inset-x-0 -bottom-10 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ transform: "translateZ(100px)" }}
            >
                 <div className="bg-black/90 border border-white/30 px-4 py-2 rounded-md text-xs text-white font-mono shadow-xl">
                    SEQUENCE: OPTIMIZED
                </div>
            </div>

        </motion.div>
    </div>
  );
};
