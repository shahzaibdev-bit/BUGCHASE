import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { cn } from '@/lib/utils';

// --- Decryption Effect ---
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";

export const DecryptionText = ({ text, className }: { text: string; className?: string }) => {
    const [display, setDisplay] = useState(text);
    const [decryptedCount, setDecryptedCount] = useState(0);

    useEffect(() => {
        let interval;
        let iteration = 0;
        
        const animate = () => {
            interval = setInterval(() => {
                setDisplay(prev => 
                    text.split("").map((char, index) => {
                        if (index < iteration) return text[index];
                        return chars[Math.floor(Math.random() * chars.length)];
                    }).join("")
                );
                
                if (iteration >= text.length) {
                    clearInterval(interval);
                }
                
                iteration += 1/3; // Speed control
            }, 30);
        };

        animate();
        return () => clearInterval(interval);
    }, [text]);

    return (
        <span className={cn("font-mono", className)}>
            {display}
        </span>
    );
};

export const TypewriterText = ({ text, delay = 50, className }: { text: string; delay?: number; className?: string }) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        let i = 0;
        setDisplayedText(""); 
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText((prev) => text.substring(0, i + 1));
                i++;
            } else {
                clearInterval(timer);
            }
        }, delay);

        return () => clearInterval(timer);
    }, [text, delay]);

    return <span className={className}>{displayedText}</span>;
};

// --- Flicker Effect ---
// --- Flicker Effect ---
export const FlickerText = ({ text, className, glowColor = "#ef4444" }: { text: string, className?: string, glowColor?: string }) => {
    return (
        <motion.span
            className={cn("inline-block", className)}
            animate={{
                opacity: [1, 0.8, 1, 0.5, 1, 0.9, 1],
                color: ["#ffffff", glowColor, "#ffffff", glowColor, "#ffffff"], 
                textShadow: [
                    "0 0 5px rgba(255,255,255,0.5)",
                    `0 0 10px ${glowColor}cc`, // 80% opacity
                    "0 0 5px rgba(255,255,255,0.5)",
                    `0 0 10px ${glowColor}cc`,
                    "0 0 5px rgba(255,255,255,0.5)"
                ]
            }}
            transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatType: "reverse",
                times: [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1]
            }}
        >
            {text}
        </motion.span>
    );
};

// --- ScanLine Effect ---
export const ScanLineText = ({ text, className }: { text: string; className?: string }) => {
    return (
        <div className={cn("relative inline-block overflow-hidden", className)}>
            <span className="relative z-10">{text}</span>
            {/* Scan Line */}
            <motion.div
                className="absolute top-0 left-0 w-[2px] h-full bg-white z-20 blur-[1px]"
                animate={{ left: ["0%", "100%"] }}
                transition={{
                    duration: 3,
                    ease: "linear",
                    repeat: Infinity,
                    repeatDelay: 1
                }}
                style={{
                    boxShadow: "0 0 10px 2px rgba(255,255,255,0.8)"
                }}
            />
            {/* Trail Gradient */}
            <motion.div
                 className="absolute top-0 left-0 w-[50px] h-full z-10 bg-gradient-to-r from-transparent to-white/30"
                 animate={{ left: ["-50px", "calc(100% - 50px)"] }}
                 transition={{
                     duration: 3,
                     ease: "linear",
                     repeat: Infinity,
                     repeatDelay: 1
                 }}
            />
        </div>
    );
};
