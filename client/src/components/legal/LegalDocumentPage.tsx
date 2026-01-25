import React from 'react';
import { motion } from 'framer-motion';
import { MorphingNavbar } from '@/components/MorphingNavbar';
import { TypewriterText, DecryptionText } from '@/components/solutions/TextEffects';
import { FileText, Shield, Download, Lock } from 'lucide-react';

interface Section {
    header: string;
    content: string;
}

interface LegalDocumentPageProps {
    title: string;
    classification?: string;
    lastUpdated?: string;
    docId?: string;
    intro: string;
    sections: Section[];
    downloadHash?: string;
}

export const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({
    title,
    classification = "PUBLIC // READ_ONLY",
    lastUpdated = "2024-03-15",
    docId = "#7A9S-LEGAL",
    intro,
    sections,
    downloadHash = "7a9s8d7f9a8sd7f98as7df"
}) => {
    return (
        <div className="relative min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white font-mono overflow-hidden transition-colors duration-300">
            {/* 1. Global Layout & Theme: Static Gradient */}
            <div className="fixed inset-0 z-0 bg-gradient-to-b from-white via-zinc-50 to-zinc-100 dark:from-[#050505] dark:via-[#0a0a0a] dark:to-[#000000]" />
            <div className="fixed inset-0 z-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.02]" />
            
            {/* Navigation */}
            <MorphingNavbar />
            
            <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 flex flex-col items-center min-h-screen pt-24 md:pt-32">
                
                {/* A. Header Section (The 'File Stamp') */}
                <div className="w-full max-w-4xl mb-8">
                    <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter text-zinc-900 dark:text-white uppercase">
                        <DecryptionText text={title} className="text-zinc-900 dark:text-white" />
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 md:gap-8 border-b border-zinc-300 dark:border-white/20 pb-4 text-xs md:text-sm text-zinc-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-zinc-900 dark:text-white" />
                            <span className="font-bold text-zinc-900 dark:text-white">CLASSIFICATION:</span>
                            <span className="text-zinc-600 dark:text-gray-300">{classification}</span>
                        </div>
                        <div className="hidden md:block w-[1px] h-4 bg-zinc-300 dark:bg-white/20" />
                        <div>
                            <span className="font-bold text-zinc-700 dark:text-white/70">LAST_UPDATED:</span> <span className="text-zinc-500 dark:text-gray-400">{lastUpdated}</span>
                        </div>
                        <div className="hidden md:block w-[1px] h-4 bg-zinc-300 dark:bg-white/20" />
                        <div>
                            <span className="font-bold text-zinc-700 dark:text-white/70">DOC_ID:</span> <span className="text-zinc-500 dark:text-gray-400">{docId}</span>
                        </div>
                    </div>
                </div>

                {/* B. The Document Body (The 'Terminal Window') */}
                <div className="w-full max-w-4xl relative group">
                    {/* Container */}
                    <div className="relative bg-white/60 dark:bg-black/40 backdrop-blur-md border border-black/15 dark:border-white/10 p-6 md:p-12 min-h-[60vh] overflow-hidden rounded-sm hover:border-black/50 dark:hover:border-white/30 transition-colors duration-500 shadow-xl shadow-zinc-200/50 dark:shadow-none">
                        
                        {/* Visual Decor: Corner Brackets (Theme Aware) */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-zinc-900 dark:border-white/20" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-zinc-900 dark:border-white/20" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-zinc-900 dark:border-white/20" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-zinc-900 dark:border-white/20" />

                        {/* Visual Decor: Scan Line (Theme Aware) */}
                        <motion.div 
                            className="absolute left-0 right-0 h-[1px] bg-zinc-900/10 dark:bg-white/10 z-0 pointer-events-none"
                            animate={{ top: ["0%", "100%"] }}
                            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Content Styling */}
                        <div className="relative z-10 space-y-12">
                            {/* Intro */}
                            <div className="text-lg md:text-xl text-zinc-700 dark:text-gray-200 font-bold border-l-4 border-zinc-900 dark:border-white pl-4">
                                <TypewriterText text={intro} delay={20} />
                            </div>

                            {/* Sections */}
                            <div className="space-y-8">
                                {sections.map((section, index) => (
                                    <motion.div 
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.2 }}
                                    >
                                        <h3 className="text-zinc-900 dark:text-white font-bold mb-4 text-xl tracking-tight">
                                            {section.header}
                                        </h3>
                                        <div className="text-zinc-600 dark:text-gray-400 leading-relaxed text-base space-y-4 whitespace-pre-line">
                                            {section.content}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* C. Action Footer (Download Action) */}
                <div className="w-full max-w-4xl mt-8 flex flex-col md:flex-row items-center justify-between gap-4 mb-20">
                    <button className="flex items-center gap-3 px-6 py-3 border border-zinc-300 dark:border-white/30 text-zinc-900 dark:text-white hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 group shadow-lg shadow-zinc-200/50 dark:shadow-none">
                        <Download className="w-5 h-5 group-hover:animate-bounce" />
                        <span className="font-bold tracking-widest">DOWNLOAD_PDF</span>
                    </button>
                    
                    <div className="text-[10px] text-zinc-400 dark:text-gray-500 font-mono break-all text-center md:text-right">
                        <div>HASH_VERIFICATION_KEY</div>
                        <div>{downloadHash}</div>
                    </div>
                </div>

            </div>

             {/* Footer */}
             <footer className="relative z-10 py-12 border-t border-black/15 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-md">
                <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-zinc-900 dark:bg-white/20 flex items-center justify-center rounded-sm text-white">
                            <span className="text-xs font-bold">B</span>
                        </div>
                        <span className="font-display font-bold tracking-wider text-zinc-900 dark:text-white">BUGCHASE</span>
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-gray-500 font-mono">
                        &copy; 2024 BUGCHASE PLATFORM. ALL RIGHTS RESERVED.
                    </div>
                </div>
            </footer>
        </div>
    );
};
