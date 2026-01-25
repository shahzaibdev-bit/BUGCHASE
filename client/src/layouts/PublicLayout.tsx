import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AnimatedBackground from '../components/effects/AnimatedBackground';
import { MorphingNavbar } from '../components/MorphingNavbar';

export const PublicLayout = ({ simpleNavbar = false }: { simpleNavbar?: boolean }) => {
    // Only show Navbar on routes that aren't strictly guarded? 
    // Actually, user said global background on ALL public pages.
    
    // We can conditionally render Navbar if needed, but for now we put it here.
    
    return (
        <div className="relative min-h-screen">
             {/* Global Animated Background - Fixed Z-0 */}
             <AnimatedBackground />
             
             {/* Static Noise Overlay (Optional global texture) */}
             <div className="fixed inset-0 z-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] brightness-100" />
             
             {/* Navbar - Fixed Z-50 */}
             <MorphingNavbar simple={simpleNavbar} />
             
             {/* Main Content */}
             <main className="relative z-10">
                <Outlet />
             </main>
        </div>
    );
};
