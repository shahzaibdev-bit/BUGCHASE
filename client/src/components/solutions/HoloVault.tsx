import React from 'react';
import { cn } from '@/lib/utils';

export const HoloVault = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative w-96 h-96 flex items-center justify-center perspective-[1000px] group/vault pointer-events-none", className)}>
        
        {/* The Vault Container */}
        <div className="relative w-64 h-64 transform-style-3d transition-all duration-700 ease-out group-hover:scale-105">
            
            <style>{`
                @keyframes spin-x {
                    0% { transform: rotateX(0deg) rotateY(0deg); }
                    100% { transform: rotateX(360deg) rotateY(45deg); }
                }
                @keyframes spin-y-rev {
                    0% { transform: rotateY(0deg) rotateX(0deg); }
                    100% { transform: rotateY(-360deg) rotateX(30deg); }
                }
                @keyframes spin-z {
                    0% { transform: rotateZ(0deg); }
                    100% { transform: rotateZ(360deg); }
                }
                
                @keyframes lock-align {
                    0% { transform: rotateX(70deg) rotateY(0deg); }
                    50% { transform: rotateX(70deg) rotateY(2deg); }
                    100% { transform: rotateX(70deg) rotateY(0deg); }
                }
                
                /* Idle Animations */
                .animate-ring-outer { animation: spin-x 20s linear infinite; }
                .animate-ring-middle { animation: spin-y-rev 15s linear infinite; }
                
                /* Hover: Lock Alignment (Overrides Idle) */
                .group:hover .animate-ring-outer,
                .group\\/vault:hover .animate-ring-outer {
                    animation: lock-align 0.2s linear infinite; /* Hum vibration */
                    transform: rotateX(70deg); /* Snap to flat angle */
                }
                
                .group:hover .animate-ring-middle,
                .group\\/vault:hover .animate-ring-middle {
                    animation: lock-align 0.3s linear infinite reverse;
                    transform: rotateX(70deg) scale(0.8);
                }
            `}</style>

            {/* Outer Ring */}
            <div className="absolute inset-0 rounded-full border border-white/30 border-dashed animate-ring-outer transform-style-3d bg-white/5 transition-all duration-500 group-hover:border-white group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                 {/* Decorative Notches */}
                 <div className="absolute top-0 left-1/2 w-4 h-1 bg-white/50 -translate-x-1/2" />
                 <div className="absolute bottom-0 left-1/2 w-4 h-1 bg-white/50 -translate-x-1/2" />
                 <div className="absolute left-0 top-1/2 w-1 h-4 bg-white/50 -translate-y-1/2" />
                 <div className="absolute right-0 top-1/2 w-1 h-4 bg-white/50 -translate-y-1/2" />
            </div>

            {/* Middle Ring */}
            <div className="absolute inset-8 rounded-full border border-white/30 animate-ring-middle transform-style-3d transition-all duration-500 group-hover:border-white group-hover:border-double group-hover:border-4">
                 {/* Data Tracks */}
                 <div className="absolute inset-2 rounded-full border border-white/10" />
            </div>

            {/* Inner Core (The Prize) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform-style-3d">
                <div className="w-16 h-16 bg-white rounded-full blur-md opacity-50 animate-pulse group-hover:opacity-100 group-hover:blur-xl group-hover:scale-150 transition-all duration-300" />
                <div className="absolute inset-0 w-16 h-16 bg-white rounded-full border-2 border-black group-hover:border-transparent flex items-center justify-center overflow-hidden">
                    <div className="w-full h-[1px] bg-black animate-[spin_2s_linear_infinite]" />
                    <div className="h-full w-[1px] bg-black animate-[spin_2s_linear_infinite]" />
                </div>
            </div>

        </div>
    </div>
  );
};
