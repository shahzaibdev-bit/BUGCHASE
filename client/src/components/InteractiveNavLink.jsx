import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import gsap from 'gsap';

export const InteractiveNavLink = ({ 
  href, 
  label, 
  description, 
  className 
}) => {
  const cardRef = useRef(null);
  const [spotlightPos, setSpotlightPos] = useState({ x: '50%', y: '50%' });
  const [opacity, setOpacity] = useState(0);
  const [transform, setTransform] = useState('');
  
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // --- Spotlight Logic (Inverse) ---
    // Calculate percentage
    const xPct = (x / rect.width) * 100;
    const yPct = (y / rect.height) * 100;
    // Inverse: 100 - pct
    const inverseX = 100 - xPct;
    const inverseY = 100 - yPct;
    
    setSpotlightPos({ x: `${inverseX}%`, y: `${inverseY}%` });
    setOpacity(1);

    // --- Tilt Logic (Inverted) ---
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mouseX = (x - centerX) / centerX;
    const mouseY = (y - centerY) / centerY;

    const intensity = 15; // Degrees
    const rotateX = mouseY * -intensity; // Top tilts away
    const rotateY = mouseX * intensity;  // Left tilts away

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05) translateZ(10px)`);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0)');
  };

  return (
    <a
      href={href}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group/link relative flex flex-col items-center justify-center text-center p-3 rounded-md transition-all duration-100 ease-out",
        "border border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-white/5 hover:z-20",
        // Base hover effects
        "hover:border-zinc-400 dark:hover:border-white hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]",
        className
      )}
      style={{
        transform,
        // Using a smooth but snappy transition for the tilt
        transition: 'transform 0.1s cubic-bezier(0.03, 0.98, 0.52, 0.99), border-color 0.3s, box-shadow 0.3s'
      }}
    >
        {/* Spotlight Layer (Clipped to Card, Unclipped to Shadow) */}
        {/* We want the SHADOW to be unclipped (from main container) but the GRADIENT to be inside. */}
        {/* The main container has border and shadow. */}
        
        {/* Internal Gradient Canvas - Perfectly aligned with border */}
        <div className="absolute inset-0 rounded-md overflow-hidden pointer-events-none">
             {/* Dynamic Spotlight Gradient */}
            <div 
                className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                style={{
                    opacity,
                    background: `radial-gradient(200px circle at ${spotlightPos.x} ${spotlightPos.y}, rgba(255, 255, 255, 0.1), transparent 60%)`
                }}
            />
            
            {/* Ambient Background Shine */}
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-transparent group-hover/link:via-zinc-400/10 dark:group-hover/link:via-white/5 transition-all duration-500" />
        </div>

        {/* Text Content - Elevated Z */}
        <div className="flex items-center gap-2 mb-1 relative z-10 pointer-events-none">
            <span className="font-bold text-zinc-900 dark:text-white text-sm group-hover/link:text-black dark:group-hover/link:text-white group-hover/link:underline decoration-zinc-400 dark:decoration-white/50 underline-offset-4 transition-all duration-300">
                {label}
            </span>
        </div>
        {description && (
                <span className="text-[10px] text-zinc-500 dark:text-white/50 group-hover/link:text-zinc-700 dark:group-hover/link:text-white/80 leading-tight relative z-10 transition-colors duration-300 pointer-events-none">
                    {description}
                </span>
        )}
    </a>
  );
};
