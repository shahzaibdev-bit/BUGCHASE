import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export const DataStreamSidebar = () => {
    const [stream, setStream] = useState<string[]>([]);
    
    // Generate random binary column
    useEffect(() => {
        const generateBinary = () => {
            const lines = [];
            for (let i = 0; i < 50; i++) {
                let line = "";
                for (let j = 0; j < 6; j++) {
                    line += Math.random() > 0.5 ? "1" : "0";
                }
                lines.push(line);
            }
            return lines;
        };
        setStream(generateBinary());
        
        const interval = setInterval(() => {
            setStream(prev => {
                const newLines = [...prev];
                newLines.shift(); // Remove top
                // Add new bottom line
                let line = "";
                for (let j = 0; j < 6; j++) {
                    line += Math.random() > 0.5 ? "1" : "0";
                }
                newLines.push(line);
                return newLines;
            });
        }, 100);
        
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed left-0 top-0 bottom-0 w-12 bg-black/20 backdrop-blur-sm border-r border-white/5 z-0 hidden lg:flex flex-col items-center justify-center overflow-hidden font-mono text-[10px] text-white/10 select-none pointer-events-none">
             <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10" />
             
             <motion.div 
                className="flex flex-col gap-1 items-center"
                // Simulate simple scroll flow visual
             >
                 {stream.map((line, i) => (
                     <div key={i} className={`tracking-widest ${Math.random() > 0.9 ? 'text-white/40 font-bold' : ''}`}>
                         {line}
                     </div>
                 ))}
             </motion.div>
        </div>
    );
};
