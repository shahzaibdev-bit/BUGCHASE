import React from 'react';
import { cn } from '@/lib/utils';

export const HoloDiamond = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative w-96 h-96 flex items-center justify-center perspective-[1000px] group/diamond pointer-events-none", className)}>
        
        {/* The Diamond Container */}
        <div className="relative w-40 h-40 transform-style-3d animate-diamond-spin transition-all duration-700 ease-in-out group-hover:scale-110">
            
            <style>{`
                @keyframes diamond-spin {
                    0% { transform: rotate3d(1, 1, 0, 0deg); }
                    100% { transform: rotate3d(1, 1, 0, 360deg); }
                }
                .animate-diamond-spin {
                    animation: diamond-spin 20s linear infinite;
                }
                /* Trigger from parent group (hero) or local hover */
                .group:hover .animate-diamond-spin,
                .group\\/diamond:hover .animate-diamond-spin {
                    animation-duration: 3s;
                }
            `}</style>
            
            {/* Core Dot (Always facing camera approx, or just a ball in center) */}
            <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_30px_white] -translate-x-1/2 -translate-y-1/2 transform-style-3d z-0" />

            {/* Geometry Wrapper to center projection */}
            <div className="absolute inset-0 transform-style-3d -translate-y-10">
                {/* Top Pyramid - 4 Faces */}
                {[0, 90, 180, 270].map((deg, i) => (
                    <div 
                        key={`top-${i}`}
                        className="absolute left-0 top-0 w-40 h-40 origin-bottom transition-all duration-700"
                        style={{ 
                            transform: `rotateY(${deg}deg) translateZ(20px) rotateX(35deg)`,
                        }}
                    >
                         {/* Triangle Shape */}
                         <div 
                            className="w-full h-full bg-black/20 border-l border-r border-b border-white/40 transition-all duration-700 group-hover:border-white group-hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.2)] backdrop-blur-[2px]"
                            style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
                         />
                    </div>
                ))}
                
                {/* Bottom Pyramid - 4 Faces */}
                {[0, 90, 180, 270].map((deg, i) => (
                    <div 
                        key={`bottom-${i}`}
                        className="absolute left-0 top-full w-40 h-40 origin-top transition-all duration-700"
                        style={{ 
                            transform: `rotateY(${deg}deg) translateZ(20px) rotateX(-35deg)`,
                        }}
                    >
                         {/* Triangle Shape (Inverted) */}
                         <div 
                            className="w-full h-full bg-black/20 border-l border-r border-t border-white/40 transition-all duration-700 group-hover:border-white group-hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.2)] backdrop-blur-[2px]"
                            style={{ clipPath: "polygon(50% 100%, 0% 0%, 100% 0%)" }}
                         />
                    </div>
                ))}
            </div>

        </div>
    </div>
  );
};
