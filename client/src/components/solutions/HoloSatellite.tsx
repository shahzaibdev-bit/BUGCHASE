import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export const HoloSatellite = ({ className = "" }: { className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [25, -25]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-25, 25]), { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  return (
    <div className={`relative w-96 h-96 flex items-center justify-center ${className} perspective-[1000px]`}>
        {/* Signal Emissions */}
        <div className="absolute inset-0 bg-white/5 blur-[80px] rounded-full animate-pulse-slow pointer-events-none" />

        <motion.div 
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            className="relative w-80 h-80 preserve-3d group cursor-pointer"
            style={{ rotateX, rotateY }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring" }}
        >
            
            {/* Dish Structure: Base Ring */}
            <motion.div 
                className="absolute inset-4 border-2 border-white/20 rounded-full border-dashed"
                animate={{ rotateZ: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Data Packets Orbiting */}
                 {[0, 120, 240].map((deg, i) => (
                    <div key={i} className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_#ffffff]"
                        style={{ transform: `rotate(${deg}deg) translateY(-4px)` }}
                    />
                 ))}
            </motion.div>

            {/* The Dish: Concave Shape */}
            <motion.div 
                className="absolute inset-16 bg-gradient-to-br from-white/10 to-transparent rounded-full border border-white/30 backdrop-blur-sm flex items-center justify-center overflow-hidden"
                style={{ transform: 'translateZ(40px)' }}
            >
                {/* Grid Lines on Dish */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
                
                {/* Pulsing Core */}
                <motion.div 
                    className="w-12 h-12 bg-white/20 rounded-full border border-white/50 flex items-center justify-center shadow-[0_0_30px_#ffffff]"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="w-4 h-4 bg-white rounded-full blur-[2px]" />
                </motion.div>
            </motion.div>

            {/* Signal Beam */}
            <motion.div 
                className="absolute top-1/2 left-1/2 w-[200px] h-[200px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ transformStyle: 'preserve-3d', transform: 'translateZ(80px)' }}
            >
                 {/* Concentric Signal Rings moving outward */}
                 {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute inset-0 border border-white/30 rounded-full text-white/20"
                        initial={{ opacity: 0, scale: 0.2 }}
                        animate={{ opacity: [0, 1, 0], scale: [0.2, 1.5] }}
                        transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            delay: i * 1,
                            ease: "easeOut" 
                        }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] font-mono">UPLINK_SECURE</div>
                    </motion.div>
                 ))}
            </motion.div>

             {/* Status Label */}
            <div 
                className="absolute inset-x-0 -bottom-16 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ transform: "translateZ(100px)" }}
            >
                 <div className="flex items-center gap-2 bg-black/90 border border-white/50 px-4 py-2 rounded-md font-mono text-xs text-white shadow-xl">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    SIGNAL: STRONG
                </div>
            </div>

        </motion.div>
    </div>
  );
};
