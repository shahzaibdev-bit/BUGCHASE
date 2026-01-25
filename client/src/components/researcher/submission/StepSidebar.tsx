import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';
import { STEPS } from './types';

interface StepSidebarProps {
    currentStep: number;
}

export const StepSidebar = ({ currentStep }: StepSidebarProps) => {
    return (
        <div className="sticky top-24 space-y-8">
            <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest font-mono">Security Program</h3>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">Solv Web Application</p>
                <div className="flex gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">KYC Required</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">PoC Required</span>
                </div>
            </div>

            <div className="space-y-0.5 relative">
                {/* Vertical Line */}
                <div className="absolute left-[11px] top-6 bottom-6 w-[2px] bg-zinc-200 dark:bg-zinc-800 -z-10" />

                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;

                    return (
                        <div key={step.id} className="flex items-center gap-4 py-3 group">
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 z-10",
                                isCompleted && "bg-emerald-500 border-emerald-500 text-white",
                                isCurrent && "bg-white dark:bg-black border-emerald-500 text-emerald-500 scale-110",
                                !isCompleted && !isCurrent && "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-400"
                            )}>
                                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                            </div>
                            <span className={cn(
                                "text-sm font-medium transition-colors duration-300",
                                isCompleted && "text-zinc-500 dark:text-zinc-500",
                                isCurrent && "text-zinc-900 dark:text-white font-bold",
                                !isCompleted && !isCurrent && "text-zinc-400 dark:text-zinc-600"
                            )}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
