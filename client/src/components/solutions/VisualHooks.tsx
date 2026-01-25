import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Shield, Activity, Lock, Globe, Server } from 'lucide-react';

// --- Holo Trophy ---
export const HoloTrophy = () => {
    return (
        <div className="relative w-64 h-64 flex items-center justify-center perspective-[1000px]">
            {/* Rotating Base */}
             <motion.div
                className="absolute inset-0 rounded-full border border-white/20"
                style={{ rotateX: 70 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
             />
             
             {/* Hologram Beams */}
             <div className="absolute bottom-10 w-full flex justify-center overflow-hidden h-40">
                <div className="w-40 h-full bg-gradient-to-t from-white/10 to-transparent blur-md transform scale-x-150" 
                     style={{ clipPath: "polygon(20% 100%, 80% 100%, 100% 0, 0 0)" }}
                />
             </div>

             {/* Floating Trophy Icon */}
             <motion.div
                className="relative z-10"
                animate={{ y: [-10, 10, -10], rotateY: [0, 360] }}
                transition={{ 
                    y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                    rotateY: { duration: 8, repeat: Infinity, ease: "linear" }
                }}
             >
                <Trophy className="w-32 h-32 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" strokeWidth={1} />
                
                {/* Glitch Overlay */}
                <motion.div 
                    className="absolute inset-0 text-white/50 mix-blend-overlay"
                    animate={{ x: [-2, 2, -2], opacity: [0, 0.5, 0] }}
                    transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
                >
                    <Trophy className="w-32 h-32" strokeWidth={1} />
                </motion.div>
             </motion.div>
        </div>
    );
};

// --- Shield Guard ---
export const ShieldGuard = () => {
    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Pulse Rings */}
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    className="absolute inset-0 border border-white/10 rounded-full"
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                />
            ))}

            {/* Central Shield */}
            <motion.div
                className="relative z-10"
                whileHover={{ scale: 1.1 }}
            >
                <Shield className="w-32 h-32 text-white fill-white/5 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" strokeWidth={1.5} />
                <Lock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-black/90" />
            </motion.div>

            {/* Incoming Particles (Attacks getting blocked) */}
            {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                    key={`p-${i}`}
                    className="absolute w-2 h-2 bg-white/40 rounded-full blur-[1px]"
                    initial={{ x: "200%", y: (Math.random() - 0.5) * 100, opacity: 0 }}
                    animate={{ x: "30%", opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() * 2, ease: "linear" }}
                />
            ))}
        </div>
    );
};

// --- Radar Scan ---
export const RadarScan = () => {
    return (
        <div className="relative w-64 h-64 rounded-full border border-white/20 bg-black/40 backdrop-blur-sm overflow-hidden flex items-center justify-center">
            {/* Grid */}
            <div className="absolute inset-0 border border-white/10 rounded-full scale-50" />
            <div className="absolute inset-0 border border-white/10 rounded-full scale-75" />
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/10" />
            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-white/10" />

            {/* Scanner Line */}
            <motion.div
                className="absolute w-1/2 h-1/2 top-0 left-1/2 origin-bottom-left bg-gradient-to-l from-white/30 to-transparent"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }} // Quarter slice look
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            {/* Blips */}
            <motion.div 
                className="absolute top-1/4 right-1/4 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
            />
             <motion.div 
                className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white]"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1.8 }}
            />
            {/* Neutralized Blip */}
            <motion.div 
                className="absolute top-1/2 right-1/3 w-3 h-3 bg-white/50 rounded-full shadow-[0_0_10px_white]"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5] }}
                transition={{ duration: 3, repeat: Infinity, delay: 2.2 }}
            />
        </div>
    );
};
