import React from 'react';

export const SolutionsFooter = () => {
    return (
        <footer className="relative z-10 py-12 border-t border-black/15 dark:border-white/10 bg-gray-100 dark:bg-black/60 backdrop-blur-md mt-32">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-zinc-300 dark:bg-white/10 flex items-center justify-center rounded-sm">
                        <span className="text-xs font-bold text-black dark:text-white">B</span>
                    </div>
                    <span className="font-display font-bold tracking-wider text-zinc-900 dark:text-white">BUGCHASE</span>
                </div>
                <div className="text-sm text-zinc-600 dark:text-white/40 font-mono">
                    &copy; 2025 BUGCHASE PLATFORM. ALL RIGHTS RESERVED.
                </div>
            </div>
        </footer>
    );
};
