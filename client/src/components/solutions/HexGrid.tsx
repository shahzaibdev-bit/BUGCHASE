import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export const HexGrid = ({ className = "" }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Motion values for tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth spring physics for the tilt
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [20, -20]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-20, 20]), { stiffness: 150, damping: 20 });
  const scale = useSpring(useTransform(x, [-0.5, 0, 0.5], [1, 1.1, 1])); // Gentle scale breath

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate normalized position (-0.5 to 0.5)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = (mouseX / width) - 0.5;
    const yPct = (mouseY / height) - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className={`relative w-96 h-96 flex items-center justify-center ${className} perspective-[1200px]`}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-zinc-900/5 dark:bg-white/5 blur-[80px] rounded-full animate-pulse-slow pointer-events-none" />

        <motion.div 
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative w-80 h-80 preserve-3d group cursor-pointer"
            style={{ 
                rotateX, 
                rotateY,
                scale: 1 // Base scale, can be augmented
            }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
            
            {/* Layer 1: The Core Plane - Rotating Hex Base */}
            <motion.div 
                className="absolute inset-0 border border-zinc-900/20 dark:border-white/20 rounded-full"
                animate={{ rotateZ: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                 {/* Internal Rings */}
                 <div className="absolute inset-4 border border-dashed border-zinc-900/30 dark:border-white/30 rounded-full" />
                 <div className="absolute inset-16 border border-zinc-900/10 dark:border-white/10 rounded-full" />
                 
                 {/* Scanner Pointer */}
                 <motion.div 
                    className="absolute top-1/2 left-1/2 w-[50%] h-[2px] bg-gradient-to-r from-transparent to-zinc-900 dark:to-white origin-left"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                 />
            </motion.div>

            {/* Layer 2: Floating Hexacons - The "Network" */}
            <motion.div 
                className="absolute inset-0 w-full h-full flex items-center justify-center preserve-3d"
                animate={{ rotateY: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-16 h-16 bg-zinc-900/5 dark:bg-white/5 backdrop-blur-[1px] border border-zinc-900/20 dark:border-white/20 flex items-center justify-center group-hover:border-zinc-900 dark:group-hover:border-white"
                        style={{ 
                            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                            transform: `rotateY(${deg}deg) translateZ(120px)`,
                        }}
                        whileHover={{ scale: 1.5 }}
                    >
                         <div className="w-1 h-1 bg-zinc-900 dark:bg-white rounded-full animate-ping" />
                    </motion.div>
                ))}
            </motion.div>

            {/* Layer 3: Central Core - "The Eye" */}
             <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white dark:bg-black/80 rounded-full border-2 border-zinc-900/50 dark:border-white/50 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(255,255,255,0.4)] z-20"
                style={{ transform: "translateZ(80px)" }}
                animate={{ y: [0, -10, 0] }}
                whileHover={{ scale: 1.2 }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                 <div className="absolute inset-2 border border-dashed border-zinc-900/30 dark:border-white/30 rounded-full animate-spin-slow" />
                 <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-full blur-[4px]" />
                 <div className="absolute w-2 h-2 bg-white dark:bg-black rounded-full" />
            </motion.div>

            {/* Hover Interaction: Data Projection */}
            <div 
                className="absolute inset-x-0 -bottom-20 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ transform: "translateZ(100px)" }}
            >
                 <div className="bg-white dark:bg-black/90 border border-zinc-900/50 dark:border-white/50 px-4 py-2 rounded-md text-xs text-zinc-900 dark:text-white/80 font-mono shadow-xl animate-pulse">
                    SYSTEM: ONLINE
                    <br/>
                    <span className="text-zinc-500 dark:text-white">SCANNING PORT 443...</span>
                </div>
            </div>

        </motion.div>
    </div>
  );
};
