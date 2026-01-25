import React, { useEffect, useState } from 'react';
import FaultyTerminal from '@/components/FaultyTerminal';
import { useMousePosition } from '@/hooks/useMousePosition';
import { useTheme } from 'next-themes';
import { useIsMobile } from '@/hooks/use-mobile';

interface AnimatedBackgroundProps {
    opacity?: number;
    maskColor?: string;
}

const AnimatedBackground = ({ opacity = 1, maskColor: customMaskColor }: AnimatedBackgroundProps) => {
    // Activate mouse tracking
    useMousePosition();
    const { theme } = useTheme();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);

    // After mounting, we have access to the theme
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const isLight = theme === 'light';

    // Theme Config
    const terminalTint = isLight ? '#808080' : '#404040'; // Gray grid on white vs Gray grid on black
    const terminalBg = isLight ? '#ffffff' : '#000000';   // White vs Black
    const defaultMaskColor = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.50)'; // Dimmer spotlight for Light Mode (Not too harsh)
    const maskColor = customMaskColor || defaultMaskColor;

    // --- MOBILE OPTIMIZATION ---
    // If on mobile, we return a lightweight static background instead of the heavy WebGL shader.
    if (isMobile) {
        return (
             <div 
                className="fixed inset-0 z-0 pointer-events-none transition-colors duration-300"
                style={{ 
                    backgroundColor: terminalBg,
                    opacity: opacity 
                }}
             >
                 {/* Optional: Simple static grid or pattern for mobile if desired, or just clean background */}
                 <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(128,128,128,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(128,128,128,0.5)_1px,transparent_1px)] bg-[size:20px_20px]" />
             </div>
        );
    }

    // --- DESKTOP (Original Behavior) ---
    return (
        <div 
        className="fixed inset-0 z-0 transition-opacity duration-300 pointer-events-none"
        style={{
          opacity: opacity,
          maskImage: `radial-gradient(300px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${maskColor} 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(300px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${maskColor} 0%, transparent 100%)`
        }}
        >
         <FaultyTerminal 
          tint={terminalTint} 
          backgroundColor={terminalBg}
          scale={2} 
          mouseReact={true} 
          pageLoadAnimation={true}
         />
      </div>
    );
};

export default AnimatedBackground;
