import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wifi, Lock, Activity } from 'lucide-react';

interface TerminalStep {
  prompt: string;
  cmd: string;
  color?: string;
}

interface CyberTerminalProps {
  commands: TerminalStep[];
  className?: string;
}

export const CyberTerminal: React.FC<CyberTerminalProps> = ({ commands, className }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [history, setHistory] = useState<TerminalStep[]>([]); // Stores fully typed lines

  useEffect(() => {
    // 1. If index is out of bounds, we are in the 'Pause' state before reset
    if (currentLineIndex >= commands.length) {
      const resetTimeout = setTimeout(() => {
        setHistory([]);
        setCurrentLineIndex(0);
        setCurrentText('');
      }, 2000); // Wait 2s then restart
      return () => clearTimeout(resetTimeout);
    }

    const targetLine = commands[currentLineIndex];
    const fullText = targetLine.cmd;

    // 2. Typing Logic
    if (currentText.length < fullText.length) {
      const typeTimeout = setTimeout(() => {
        setCurrentText(fullText.slice(0, currentText.length + 1));
      }, 50); 
      return () => clearTimeout(typeTimeout);
    } 
    
    // 3. Line Finished Logic
    else {
      const nextLineTimeout = setTimeout(() => {
        // Move completed line to history
        setHistory(prev => [...prev, targetLine]);
        setCurrentText(''); 
        
        // ALWAYS increment index. 
        // If it was the last line, this moves index to 'length' (triggering step 1 above).
        setCurrentLineIndex(prev => prev + 1); 
      }, 500);
      return () => clearTimeout(nextLineTimeout);
    }
  }, [currentText, currentLineIndex, commands]);

  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [0, -10, 0] }}
      transition={{ 
        duration: 4, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      whileHover={{ 
        scale: 1.01,
        filter: "brightness(1.1)"
      }}
      className={`relative w-full max-w-lg mx-auto ${className}`}
    >
      {/* HUD Brackets - Corners */}
      <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-primary/50 rounded-tl-lg z-20" />
      <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-primary/50 rounded-tr-lg z-20" />
      <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-primary/50 rounded-bl-lg z-20" />
      <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-primary/50 rounded-br-lg z-20" />

      {/* Main Chassis */}
      <div className="relative overflow-hidden rounded-xl bg-white dark:bg-black/90 backdrop-blur-[25px] border border-zinc-200 dark:border-white/10 shadow-2xl transition-all duration-300">
        
        {/* Scanline Effect */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-xl opacity-10">
          <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/5 dark:via-white/5 to-transparent animate-scanline" />
        </div>

        {/* Header / Bezel */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="text-[10px] font-mono text-zinc-500 dark:text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Lock className="w-3 h-3" />
            root@bugchase:~
          </div>
        </div>

        {/* Terminal Content */}
        <div className="relative z-10 p-6 font-mono text-sm h-72 overflow-hidden flex flex-col font-medium">
          {/* Render History (Completed Lines) */}
          {history.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2 break-all leading-relaxed">
              <span className={`shrink-0 select-none ${line.prompt === '>>' ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-700 dark:text-emerald-500'}`}>{line.prompt}</span>
              <span className={`${line.color || 'text-zinc-800 dark:text-white'} drop-shadow-sm dark:drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]`}>{line.cmd}</span>
            </div>
          ))}

          {/* Render Current Typing Line (Active) */}
          {commands && currentLineIndex < commands.length && (
            <div className="flex gap-2 mb-2 break-all leading-relaxed">
              <span className="text-emerald-700 dark:text-emerald-500 shrink-0 select-none">{commands[currentLineIndex].prompt}</span>
              <span className={`${commands[currentLineIndex].color || 'text-zinc-800 dark:text-white'} drop-shadow-sm dark:drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]`}>
                {currentText}
                <span className="inline-block w-2 h-4 bg-zinc-900 dark:bg-white/80 animate-pulse ml-1 align-middle" />
              </span>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="relative z-10 flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-black/40 border-t border-zinc-200 dark:border-white/5 text-[10px] font-mono text-zinc-500 dark:text-gray-500 uppercase tracking-wider">
            <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                    <Activity className="w-3 h-3" />
                    LATENCY: 12ms
                </span>
                <span className="flex items-center gap-1.5 hidden sm:flex">
                    <Wifi className="w-3 h-3" />
                    AES-256 ENCRYPTED
                </span>
            </div>
            <div className="flex items-center gap-2 text-red-500 animate-pulse font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                LIVE
            </div>
        </div>

      </div>
    </motion.div>
  );
};
