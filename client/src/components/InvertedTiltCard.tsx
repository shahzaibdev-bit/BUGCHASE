import React, { useRef, useState } from 'react';

interface InvertedTiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number; // Max tilt degrees
}

export const InvertedTiltCard = ({ 
  children, 
  className = '',
  intensity = 10 // Reduced default from 15 to 10 as requested
}: InvertedTiltCardProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;

    // PERFORMANCE OPTIMIZATION: Disable on mobile/touch devices
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Normalized coordinates (-1 to 1)
    const mouseX = (x - centerX) / centerX;
    const mouseY = (y - centerY) / centerY;

    // INVERTED LOGIC (Push Back):
    const rX = mouseY * -intensity; 
    const rY = mouseX * intensity;

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    // 1. The Wrapper (Static - Handles Events)
    <div 
      ref={wrapperRef}
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: "1000px" }}
    >
      {/* 2. The Card (Animated - Receives Transform) */}
      <div 
        className={`w-full h-full transition-transform duration-200 ease-out will-change-transform ${className}`}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1, 1, 1)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
