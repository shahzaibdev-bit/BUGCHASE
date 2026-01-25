import React from 'react';
import { motion } from 'motion/react';
import { MorphingNavbar } from '../MorphingNavbar';
import AnimatedBackground from '../effects/AnimatedBackground'; 
import { SolutionsFooter } from './SolutionsFooter'; 

export const SolutionsLayout = ({ children }) => {
    
    // Ensure mouse position is tracked for the global background
    // If usage of AnimatedBackground requires props or context, we handle it here.
    // Assuming AnimatedBackground works globally or is self-contained.
    
    return (   <div className="min-h-screen text-white relative overflow-hidden font-sans">
            {/* Transparent Container to show Global Background */}

            {/* Main Content Area - No Sidebar Padding */}
            <motion.main
                className="relative z-10 pt-24 min-h-screen flex flex-col"
                initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                transition={{ duration: 0.5, ease: "circOut" }}
            >
                <div className="flex-grow">
                   {children}
                </div>

                {/* Context-Aware Hacker Footer */}
                <SolutionsFooter />
            </motion.main>
             
             {/* Grid Overlay Texture (Optional high-tech feel) */}
             <div className="fixed inset-0 pointer-events-none z-[5] opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
    );
};
