import React from 'react';
import { cn } from '@/lib/utils';
import { Lock, FileCode, Binary } from 'lucide-react';

export const HoloBlackBox = ({ className }: { className?: string }) => {
  const size = 80; // Half-width (radius) of the cube
  const explode = 140; // Distance to translate on hover

  return (
    <div className={cn("relative w-96 h-96 flex items-center justify-center perspective-[1000px] group/box pointer-events-none", className)}>
        
        {/* The Cube Container */}
        <div className="relative w-40 h-40 transform-style-3d animate-cube-spin transition-all duration-700 ease-out group-hover:animate-none group-hover:[transform:rotateX(-20deg)_rotateY(-30deg)]">
            
            <style>{`
                @keyframes cube-spin {
                    0% { transform: rotateX(0deg) rotateY(0deg); }
                    100% { transform: rotateX(360deg) rotateY(360deg); }
                }
                .animate-cube-spin {
                    animation: cube-spin 20s linear infinite;
                }
            `}</style>
            
            {/* The Core (Hidden Bounty) */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-[0_0_20px_white] transition-all duration-700 transform-style-3d z-0 opacity-50 blur-sm group-hover:opacity-100 group-hover:blur-md group-hover:shadow-[0_0_50px_white] group-hover:scale-150" />

            {/* FACES - Using inline styles for precise transform handling since arbitrary values in tailwind for complex 3d can be verbose */}
            
            {/* Front */}
            <div className="absolute inset-0 bg-black/90 border border-white/30 flex items-center justify-center transform-style-3d transition-all duration-500 ease-out group-hover:border-white group-hover:bg-black/80 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]"
                 style={{ transform: `rotateY(0deg) translateZ(${size}px)` }}
            >
                {/* We use a custom class/selector to target the hover state transform specifically without overriding the base style in a messy way, or just use group-hover on the element itself if we can swap the style. 
                   Actually, best is to use Tailwind for the dynamic part if we can, or just style.
                   Let's use a dynamic style approach for the variable distance.
                   Wait, we can simply apply the hover transform in style with a CSS variable or just group-hover tailwind class if we hardcode.
                   Let's hardcode for simplicity and reliability.
                */}
                <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:translate-z-[60px]" /> {/* Pseudo-pusher? No. */}
                
                {/* Re-doing the standard way: The DIV itself moves. */}
            </div>
            
            {/* Front (Actual) */}
            <div className={`absolute inset-0 bg-black/90 border border-white/30 flex items-center justify-center transform-style-3d transition-all duration-500 ease-out group-hover:border-white group-hover:bg-black/80 backface-visible`}
                 style={{ transform: `rotateY(0deg) translateZ(${size}px)` }}
            >  
                 {/* This wrapper handles the hover expansion */}
                 <div className="absolute inset-0 bg-black/90 border border-white/30 flex items-center justify-center transition-all duration-500 ease-out group-hover:translate-z-[60px]">
                    <Lock className="w-12 h-12 text-white/50" />
                 </div>
            </div>

            {/* Implementation Note: 
               Applying the transform directly to the face div means 'rotateY(0) translateZ(80px)'.
               On hover we want 'rotateY(0) translateZ(140px)'.
               Tailwind doesn't support 'group-hover:rotateY(0) group-hover:translateZ(140px)' easily without plugin or arbitrary values that might conflict.
               I will use specific classes for each face.
            */}

            {/* Front */}
            <div className="absolute inset-0 bg-black/90 border border-white/30 flex items-center justify-center transform-style-3d transition-all duration-500 ease-out [transform:rotateY(0deg)_translateZ(80px)] group-hover:[transform:rotateY(0deg)_translateZ(140px)] group-hover:border-white group-hover:bg-black/80">
                <Lock className="w-10 h-10 text-white/50" />
                {/* Circuit lines */}
                <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/30" />
                <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/30" />
            </div>

            {/* Back */}
            <div className="absolute inset-0 bg-black/90 border border-white/30 flex items-center justify-center transform-style-3d transition-all duration-500 ease-out [transform:rotateY(180deg)_translateZ(80px)] group-hover:[transform:rotateY(180deg)_translateZ(140px)] group-hover:border-white group-hover:bg-black/80">
                <Binary className="w-10 h-10 text-white/20" />
            </div>
            
            {/* Right */}
            <div className="absolute inset-0 bg-black/90 border border-white/30 flex items-center justify-center transform-style-3d transition-all duration-500 ease-out [transform:rotateY(90deg)_translateZ(80px)] group-hover:[transform:rotateY(90deg)_translateZ(140px)] group-hover:border-white group-hover:bg-black/80">
                 <div className="text-xs font-mono text-white/20 select-none">0101</div>
            </div>

            {/* Left */}
            <div className="absolute inset-0 bg-black/90 border border-white/30 flex items-center justify-center transform-style-3d transition-all duration-500 ease-out [transform:rotateY(-90deg)_translateZ(80px)] group-hover:[transform:rotateY(-90deg)_translateZ(140px)] group-hover:border-white group-hover:bg-black/80">
                 <div className="text-xs font-mono text-white/20 select-none">1010</div>
            </div>

            {/* Top */}
            <div className="absolute inset-0 bg-black/90 border border-white/30 flex items-center justify-center transform-style-3d transition-all duration-500 ease-out [transform:rotateX(90deg)_translateZ(80px)] group-hover:[transform:rotateX(90deg)_translateZ(140px)] group-hover:border-white group-hover:bg-black/80">
            </div>

            {/* Bottom */}
            <div className="absolute inset-0 bg-black/90 border border-white/30 flex items-center justify-center transform-style-3d transition-all duration-500 ease-out [transform:rotateX(-90deg)_translateZ(80px)] group-hover:[transform:rotateX(-90deg)_translateZ(140px)] group-hover:border-white group-hover:bg-black/80">
            </div>

        </div>
    </div>
  );
};
