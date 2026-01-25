'use client';

import { useRef, useState } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';

interface MagneticButtonProps {
    children: React.ReactNode;
    className?: string;
    strength?: number; // Factor for movement (default 0.3)
    triggerRadius?: number; // Distance to trigger effect (default 150)
}

export const MagneticButton = ({ 
    children, 
    className, 
    strength = 0.3, 
    triggerRadius = 150 
}: MagneticButtonProps) => {
    const ref = useRef<HTMLDivElement>(null);

    // Filtered Motion Values (Spring Physics)
    // Stiffness 150 (Soft elastic), Damping 15 (Smooth, no jitter), Mass 0.5 (Lightweight)
    const springConfig = { stiffness: 150, damping: 15, mass: 0.5 };
    
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        // PERFORMANCE OPTIMIZATION: Disable on mobile/touch devices
        if (typeof window !== 'undefined' && window.innerWidth < 768) return;

        const rect = ref.current.getBoundingClientRect();
        
        // Calculate center of button
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Distance from cursor to center
        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        if (distance < triggerRadius) {
            // "Stick" to cursor with strength factor
            x.set(distanceX * strength);
            y.set(distanceY * strength);
        } else {
            // Reset if out of zone
            x.set(0);
            y.set(0);
        }
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x: springX, y: springY }}
            className={cn("relative inline-block", className)}
        >
            {children}
        </motion.div>
    );
};
