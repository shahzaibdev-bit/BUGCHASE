import React from 'react';
import { SubmissionData } from './types';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, MousePointer2 } from 'lucide-react';

interface StepSeverityProps {
    data: SubmissionData;
    updateData: (updates: Partial<SubmissionData>) => void;
}

const manualSeverities = ['None', 'Low', 'Medium', 'High', 'Critical'] as const;

// Simplified CVSS Logic for Demo
const cvssMetrics = {
    AV: { label: 'Attack Vector', options: [{ k: 'N', l: 'Network' }, { k: 'A', l: 'Adjacent' }, { k: 'L', l: 'Local' }, { k: 'P', l: 'Physical' }] },
    AC: { label: 'Attack Complexity', options: [{ k: 'L', l: 'Low' }, { k: 'H', l: 'High' }] },
    PR: { label: 'Privileges Required', options: [{ k: 'N', l: 'None' }, { k: 'L', l: 'Low' }, { k: 'H', l: 'High' }] },
    UI: { label: 'User Interaction', options: [{ k: 'N', l: 'None' }, { k: 'R', l: 'Required' }] },
    S:  { label: 'Scope', options: [{ k: 'U', l: 'Unchanged' }, { k: 'C', l: 'Changed' }] },
    C:  { label: 'Confidentiality', options: [{ k: 'H', l: 'High' }, { k: 'L', l: 'Low' }, { k: 'N', l: 'None' }] },
    I:  { label: 'Integrity', options: [{ k: 'H', l: 'High' }, { k: 'L', l: 'Low' }, { k: 'N', l: 'None' }] },
    A:  { label: 'Availability', options: [{ k: 'H', l: 'High' }, { k: 'L', l: 'Low' }, { k: 'N', l: 'None' }] },
};

export const StepSeverity = ({ data, updateData }: StepSeverityProps) => {
    
    // Very Basic Calculator Logic
    const calculateScore = (vector: Record<string, string>) => {
        // This is a mock calculation. In real app, import 'cvss' library.
        let base = 0;
        if (vector.C === 'H') base += 3;
        if (vector.I === 'H') base += 3;
        if (vector.A === 'H') base += 3;
        if (vector.AV === 'N') base += 1;
        
        const score = Math.min(10, Math.max(0, base));
        return score;
    };

    const handleMetricChange = (metric: string, value: string) => {
        const newVector = { ...data.cvssVector, [metric]: value };
        const score = calculateScore(newVector);
        
        let severity: SubmissionData['severity'] = 'None';
        if (score > 0) severity = 'Low';
        if (score >= 4.0) severity = 'Medium';
        if (score >= 7.0) severity = 'High';
        if (score >= 9.0) severity = 'Critical';

        updateData({ 
            cvssVector: newVector, 
            cvssScore: score,
            severity: severity
        });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Mode Toggle */}
            <div className="flex items-center justify-center">
                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
                    <button
                        onClick={() => updateData({ severityMode: 'manual' })}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all",
                            data.severityMode === 'manual' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500"
                        )}
                    >
                        <MousePointer2 className="w-4 h-4" />
                        Manual
                    </button>
                    <button
                        onClick={() => updateData({ severityMode: 'calculator' })}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all",
                            data.severityMode === 'calculator' ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500"
                        )}
                    >
                        <Calculator className="w-4 h-4" />
                        CVSS 3.1
                    </button>
                </div>
            </div>

            {data.severityMode === 'manual' ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {manualSeverities.map((sev) => (
                         <div
                            key={sev}
                            onClick={() => updateData({ severity: sev })}
                            className={cn(
                                "cursor-pointer rounded-xl border p-4 text-center transition-all duration-200 hover:scale-105",
                                data.severity === sev
                                    ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                    : "border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 opacity-60 hover:opacity-100"
                            )}
                        >
                            <div className={cn(
                                "font-bold font-mono uppercase tracking-wider",
                                data.severity === sev ? "text-emerald-500" : "text-zinc-500 dark:text-zinc-400"
                            )}>
                                {sev}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Simplified CVSS Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                         {Object.entries(cvssMetrics).map(([key, metric]) => (
                            <div key={key} className="space-y-2">
                                <Label className="text-xs font-mono uppercase text-zinc-500">{metric.label} ({key})</Label>
                                <div className="flex flex-wrap gap-2">
                                    {metric.options.map((opt) => (
                                        <button
                                            key={opt.k}
                                            onClick={() => handleMetricChange(key, opt.k)}
                                            className={cn(
                                                "px-3 py-1.5 text-xs font-bold rounded border transition-colors",
                                                data.cvssVector[key] === opt.k
                                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                                    : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-300"
                                            )}
                                        >
                                            {opt.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                         ))}
                    </div>

                    {/* Score Display */}
                    <div className="mt-8 p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                        <div>
                            <div className="text-zinc-500 text-sm font-mono mb-1">CALCULATED SCORE</div>
                            <div className="text-4xl font-bold font-mono text-white tracking-tighter">
                                {data.cvssScore.toFixed(1)} <span className="text-lg text-zinc-600">/ 10</span>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-zinc-500 text-sm font-mono mb-1">SEVERITY</div>
                             <div className={cn(
                                 "text-2xl font-bold font-mono uppercase tracking-widest",
                                 data.severity === 'Critical' ? "text-red-500" :
                                 data.severity === 'High' ? "text-orange-500" :
                                 data.severity === 'Medium' ? "text-yellow-500" : 
                                 data.severity === 'Low' ? "text-blue-500" : "text-zinc-500"
                             )}>
                                 {data.severity}
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
