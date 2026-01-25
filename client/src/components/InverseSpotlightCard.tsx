'use client';

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface InverseSpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    spotlightColor?: string;
    spotlightRadius?: number;
}

export const InverseSpotlightCard = ({ 
    children, 
    className, 
    spotlightColor,
    spotlightRadius = 400, // Default radius
    ...props 
}: InverseSpotlightCardProps) => {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Determine default color based on theme if not provided
    const defaultColor = mounted && theme === 'light' 
        ? "rgba(0, 0, 0, 0.05)" 
        : "rgba(255, 255, 255, 0.15)";
        
    const finalSpotlightColor = spotlightColor || defaultColor;
    const cardRef = useRef<HTMLDivElement>(null);
    const [spotlightPos, setSpotlightPos] = useState({ x: '50%', y: '50%' });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        
        // PERFORMANCE OPTIMIZATION: Disable on mobile/touch devices
        if (typeof window !== 'undefined' && window.innerWidth < 768) return;

        const rect = cardRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate percentage positions
        const xPct = (mouseX / rect.width) * 100;
        const yPct = (mouseY / rect.height) * 100;

        // Inverse Logic: Spotlight moves opposite to cursor
        const inverseX = 100 - xPct;
        const inverseY = 100 - yPct;

        setSpotlightPos({ x: `${inverseX}%`, y: `${inverseY}%` });
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
        // Optional: Reset position or leave it at last point
    };

    return (
        <div 
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={cn("relative overflow-hidden group", className)}
            {...props}
        >
            {/* Inverse Spotlight Layer */}
            <div 
                className="absolute inset-0 pointer-events-none transition-opacity duration-500 ease-out"
                style={{
                    opacity,
                    background: `radial-gradient(${spotlightRadius}px circle at ${spotlightPos.x} ${spotlightPos.y}, ${finalSpotlightColor}, transparent 40%)`
                }}
            />
            {children}
        </div>
    );
};
