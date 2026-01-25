import React from 'react';
import { motion } from 'framer-motion';

export const CyberLock = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative w-80 h-80 flex items-center justify-center ${className} perspective-[1200px]`}>
        {/* Ambient Glow - Dark in Light Mode, White in Dark */}
        <div className="absolute inset-0 bg-zinc-900/5 dark:bg-white/5 blur-[60px] rounded-full animate-pulse-slow" />

        <div className="relative w-64 h-64 preserve-3d group">
            
            {/* Outer Ring: Rotating Dashed Border */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-zinc-900/20 dark:border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
            />

            {/* Middle Container: The "Mechanism" */}
            <motion.div 
                className="absolute inset-8 preserve-3d"
                whileHover={{ rotateX: 20, rotateY: 20, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                 {/* Octagon Layers - Clearer, Less Blur */}
                 {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute inset-0 border border-zinc-900/40 dark:border-white/40 bg-zinc-900/5 dark:bg-white/5" // Reduced bg opacity, removed blur
                        style={{ 
                            clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                            translateZ: i * 30 // Increased spacing for 3D depth
                        }}
                        initial={{ rotate: i * 45 }}
                        animate={{ rotate: [i * 45, i * 45 + 360] }}
                        transition={{ duration: 20 + i * 5, repeat: Infinity, ease: "linear", repeatType: "reverse" }}
                        // Using class-based hover for border color instead of motion value to support dark mode
                        className={`absolute inset-0 border border-zinc-900/40 dark:border-white/40 bg-zinc-900/5 dark:bg-white/5 hover:border-zinc-900 dark:hover:border-white transition-colors duration-300`}
                    />
                 ))}

                {/* The "Keyhole" Core - Sharpened */}
                <motion.div 
                    className="absolute inset-[28%] bg-white dark:bg-black/90 rounded-xl border-2 border-zinc-900/50 dark:border-white/50 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.3)] z-20"
                    style={{ translateZ: 100 }} // Push forward significantly
                    whileHover={{ rotateY: 180 }}
                >
                    <div className="w-10 h-16 border-4 border-zinc-900 dark:border-white shadow-lg bg-zinc-100 dark:bg-black/50 rounded-t-full rounded-b-lg relative flex items-center justify-center">
                         {/* Keyhole shape - High Contrast */}
                         <div className="w-4 h-4 bg-zinc-900 dark:bg-white rounded-full absolute top-3 shadow-[0_0_10px_rgba(0,0,0,0.5)] dark:shadow-[0_0_10px_white]" />
                         <div className="w-2 h-6 bg-zinc-900 dark:bg-white absolute bottom-3 shadow-[0_0_10px_rgba(0,0,0,0.5)] dark:shadow-[0_0_10px_white]" />
                    </div>
                </motion.div>
            </motion.div>

            {/* Hover Effect: Explosive Particles / Orbitals */}
            <div className="absolute inset-0 preserve-3d pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                {[...Array(4)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-40 h-40 border border-zinc-900/20 dark:border-white/20 rounded-full"
                        style={{ 
                            rotateX: 60,
                            rotateY: i * 45,
                        }}
                        animate={{ rotateZ: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
                    />
                ))}
            </div>

            {/* Digital Decode Text */}
             <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center w-full">
                <motion.div 
                    initial={{ opacity: 0.5 }}
                    whileHover={{ opacity: 1, letterSpacing: "0.2em" }}
                    className="text-zinc-900 dark:text-white font-mono text-xs font-bold transition-all duration-300"
                >
                    ENCRYPTED GATEWAY
                </motion.div>
                <div className="text-[10px] text-zinc-500 dark:text-white/50 font-mono mt-1">STATUS: LOCKED</div>
            </div>

        </div>
    </div>
  );
};
