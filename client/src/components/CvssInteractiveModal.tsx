
import React, { useState } from 'react';
import { 
  Calculator, 
  Brain, 
  Bug, 
  User, 
  Lock, 
  Activity, 
  ArrowLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- CVSS v3.1 Implementation ---
const CVSS31_WEIGHTS = {
    AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
    AC: { L: 0.77, H: 0.44 },
    PR: {
        N: { U: 0.85, C: 0.85 },
        L: { U: 0.62, C: 0.68 },
        H: { U: 0.27, C: 0.5 }
    },
    UI: { N: 0.85, R: 0.62 },
    S:  { U: 0, C: 0 }, // Handled explicitly below
    C:  { H: 0.56, L: 0.22, N: 0 },
    I:  { H: 0.56, L: 0.22, N: 0 },
    A:  { H: 0.56, L: 0.22, N: 0 }
};

const roundup = (output: number): number => {
    let intOutput = Math.round(output * 100000);
    if (intOutput % 10000 === 0) return intOutput / 100000;
    return (Math.floor(intOutput / 10000) + 1) / 10;
};

// Calculate Base Score given a valid CVSS v3.1 Vector String
const calculateCvssVersion31 = (vector: string): number => {
    if (!vector || !vector.startsWith('CVSS:3.1/')) return 0;
    
    const parts = vector.replace('CVSS:3.1/', '').split('/');
    const metrics: Record<string, string> = {};
    parts.forEach(p => {
        const [k, v] = p.split(':');
        metrics[k] = v;
    });

    // Need all 8 base metrics to calculate a valid score
    if (!['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'].every(m => metrics[m])) return 0;

    // Exploitability Subscore (ESC)
    const esc = 8.22 * 
        (CVSS31_WEIGHTS.AV as any)[metrics.AV] * 
        (CVSS31_WEIGHTS.AC as any)[metrics.AC] * 
        ((CVSS31_WEIGHTS.PR as any)[metrics.PR] as any)[metrics.S] * 
        (CVSS31_WEIGHTS.UI as any)[metrics.UI];

    // Impact Subscore (ISCBase)
    const iscBase = 1 - (
        (1 - (CVSS31_WEIGHTS.C as any)[metrics.C]) *
        (1 - (CVSS31_WEIGHTS.I as any)[metrics.I]) *
        (1 - (CVSS31_WEIGHTS.A as any)[metrics.A])
    );

    let isc = 0;
    if (metrics.S === 'U') {
        isc = 6.42 * iscBase;
    } else {
        isc = 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15);
    }

    // Base Score Math
    if (isc <= 0) return 0;
    
    if (metrics.S === 'U') {
        return roundup(Math.min(isc + esc, 10));
    } else {
        return roundup(Math.min(1.08 * (isc + esc), 10));
    }
};

const CVSS_LABELS: Record<string, string> = {
    'AV:N': 'Network', 'AV:A': 'Adjacent', 'AV:L': 'Local', 'AV:P': 'Physical',
    'AC:L': 'Low', 'AC:H': 'High',
    'PR:N': 'None', 'PR:L': 'Low', 'PR:H': 'High',
    'UI:N': 'None', 'UI:R': 'Required',
    'S:U': 'Unchanged', 'S:C': 'Changed',
    'C:H': 'High', 'C:L': 'Low', 'C:N': 'None',
    'I:H': 'High', 'I:L': 'Low', 'I:N': 'None',
    'A:H': 'High', 'A:L': 'Low', 'A:N': 'None',
};

export const CvssInteractiveModal = ({ 
    isOpen, 
    onClose, 
    aiVector, 
    researcherVector,
    triagerVector,
    currentVector, 
    onSave 
}: { 
    isOpen: boolean;
    onClose: () => void;
    aiVector?: string; // Optional for Company View
    researcherVector: string;
    triagerVector?: string; // Optional for Company View
    currentVector: string;
    onSave: (vector: string, score: number) => void;
}) => {
    // CVSS canonical metric order
    const METRIC_ORDER = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];

    // Parse a CVSS vector string into a metrics map
    const parseVector = (vec: string): Record<string, string> => {
        if (!vec || !vec.startsWith('CVSS:3.1/')) return {};
        const result: Record<string, string> = {};
        vec.replace('CVSS:3.1/', '').split('/').forEach(part => {
            const [k, v] = part.split(':');
            if (k && v) result[k] = v;
        });
        return result;
    };

    // Reconstruct a properly-ordered CVSS vector from a metrics map
    const buildVector = (metrics: Record<string, string>): string => {
        const parts = METRIC_ORDER.map(k => metrics[k] ? `${k}:${metrics[k]}` : null).filter(Boolean);
        if (parts.length === 0) return '';
        return `CVSS:3.1/${parts.join('/')}`;
    };

    const [metrics, setMetrics] = useState<Record<string, string>>(
        parseVector(currentVector || aiVector || researcherVector || '')
    );

    const localVector = buildVector(metrics);
    
    // Scores
    const aiScore = aiVector ? calculateCvssVersion31(aiVector) : 0;
    const researcherScore = calculateCvssVersion31(researcherVector);
    const triagerScore = triagerVector ? calculateCvssVersion31(triagerVector) : 0;
    const localScore = calculateCvssVersion31(localVector);

    // Apply a specific metric card from a source vector
    const applyVector = (vec: string) => setMetrics(parseVector(vec));

    // Toggle a single metric value — exact key lookup, no substring issues
    const updateMetric = (metric: string, value: string) => {
        setMetrics(prev => ({ ...prev, [metric]: value }));
    };

    const MetricBtn = ({ code, val }: { code: string, val: string }) => {
        const label = CVSS_LABELS[`${code}:${val}`] || val;
        // Exact key lookup — zero substring matching bugs
        const isActive = metrics[code] === val;
        
        return (
            <button 
               onClick={() => updateMetric(code, val)}
               className={`px-3 py-2 text-xs font-mono font-medium border rounded transition-all active:scale-95 flex-1 text-center ${
                   isActive 
                       ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-sm' 
                       : 'bg-transparent text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
               }`}
            >
                {label}
            </button>
        );
    };

    const getSeverityLabel = (score: number) => {
        if (score === 0) return { label: 'NONE', color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800' };
        if (score < 4.0) return { label: 'LOW', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
        if (score < 7.0) return { label: 'MEDIUM', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' };
        if (score < 9.0) return { label: 'HIGH', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
        return { label: 'CRITICAL', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' };
    };

    const ScoreCard = ({ title, score, vector, icon: Icon, colorClass, borderClass, onClick }: any) => {
        const severity = getSeverityLabel(score);
        return (
            <div 
                onClick={onClick}
                className={`p-4 rounded-xl border ${borderClass} bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden group transition-all cursor-pointer hover:shadow-md`}
            >
                <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${colorClass}`} />
                        <span className={`font-bold text-xs uppercase tracking-wider ${colorClass}`}>{title}</span>
                    </div>
                    <div className="text-right">
                        <span className={`font-mono font-bold text-2xl ${colorClass} block leading-5`}>{score.toFixed(1)}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${severity.bg} ${severity.color}`}>
                            {severity.label}
                        </span>
                    </div>
                </div>
                <code className="block text-[10px] font-mono opacity-60 break-all leading-tight relative z-10">{vector || 'N/A'}</code>
                {onClick && vector && (
                    <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${colorClass}`}>
                        Click to Apply <ArrowLeft className="h-3 w-3 rotate-180" />
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden gap-0 shadow-2xl">
                <DialogHeader className="p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10">
                    <DialogTitle className="font-mono text-lg tracking-tight flex items-center gap-2">
                        <Calculator className="h-4 w-4" /> CVSS 3.1 CALCULATOR
                    </DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-12 h-[550px]">
                    {/* Left: Comparison Panel (4 Cols) */}
                    <div className="md:col-span-4 bg-zinc-50/50 dark:bg-zinc-900/10 border-r border-zinc-100 dark:border-zinc-900 p-6 space-y-4 overflow-y-auto">
                         <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Sources</h4>
                         
                         {aiVector && (
                             <ScoreCard 
                                title="AI Estimate" 
                                score={aiScore} 
                                vector={aiVector} 
                                icon={Brain} 
                                colorClass="text-cyan-600 dark:text-cyan-400" 
                                borderClass="border-cyan-100 dark:border-cyan-900/30 hover:border-cyan-300"
                                onClick={() => applyVector(aiVector)}
                             />
                         )}

                         <ScoreCard 
                            title="Researcher" 
                            score={researcherScore} 
                            vector={researcherVector} 
                            icon={Bug} 
                            colorClass="text-indigo-600 dark:text-indigo-400" 
                            borderClass="border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-300"
                            onClick={() => applyVector(researcherVector)}
                         />

                         {triagerVector && (
                             <ScoreCard 
                                title="Triager" 
                                score={triagerScore} 
                                vector={triagerVector} 
                                icon={User} 
                                colorClass="text-purple-600 dark:text-purple-400" 
                                borderClass="border-purple-100 dark:border-purple-900/30 hover:border-purple-300"
                                onClick={() => applyVector(triagerVector)}
                             />
                         )}

                         <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                             <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Active Score</h4>
                             <div className="p-5 rounded-xl bg-black dark:bg-white border border-black dark:border-white shadow-lg relative overflow-hidden text-white dark:text-black">
                                 <div className="flex items-center justify-between mb-3 relative z-10">
                                     <div className="flex items-center gap-2">
                                         <User className="h-4 w-4" />
                                         <span className="font-bold text-xs uppercase tracking-wider">YOUR SCORE</span>
                                     </div>
                                     <div className="text-right">
                                        <span className={`font-mono font-bold text-4xl block leading-8`}>{localScore.toFixed(1)}</span>
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${getSeverityLabel(localScore).bg} ${getSeverityLabel(localScore).color}`}>
                                            {getSeverityLabel(localScore).label}
                                        </span>
                                     </div>
                                 </div>
                                 <code className="block text-[10px] font-mono opacity-70 break-all leading-tight relative z-10">{localVector || 'Select a vector'}</code>
                             </div>
                         </div>
                    </div>

                    {/* Right: Calculator Controls (8 Cols) */}
                    <ScrollArea className="md:col-span-8 bg-white dark:bg-zinc-950 p-8">
                        <div className="space-y-8 pb-20">
                            <div className="space-y-4">
                                <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Lock className="h-3 w-3"/> Base Metric Group</label>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Attack Vector (AV)</span>
                                        <div className="flex gap-2"><MetricBtn code="AV" val="N" /><MetricBtn code="AV" val="A" /><MetricBtn code="AV" val="L" /><MetricBtn code="AV" val="P" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Attack Complexity (AC)</span>
                                        <div className="flex gap-2"><MetricBtn code="AC" val="L" /><MetricBtn code="AC" val="H" /></div>
                                    </div>
                                     <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Privileges Required (PR)</span>
                                        <div className="flex gap-2"><MetricBtn code="PR" val="N" /><MetricBtn code="PR" val="L" /><MetricBtn code="PR" val="H" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">User Interaction (UI)</span>
                                        <div className="flex gap-2"><MetricBtn code="UI" val="N" /><MetricBtn code="UI" val="R" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Scope (S)</span>
                                        <div className="flex gap-2"><MetricBtn code="S" val="U" /><MetricBtn code="S" val="C" /></div>
                                    </div>
                                </div>
                            </div>
                            
                            <Separator className="bg-zinc-100 dark:bg-zinc-900" />
                            
                            <div className="space-y-4">
                                <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Activity className="h-3 w-3"/> Impact Metric Group</label>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Confidentiality (C)</span>
                                        <div className="flex gap-2"><MetricBtn code="C" val="H" /><MetricBtn code="C" val="L" /><MetricBtn code="C" val="N" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Integrity (I)</span>
                                        <div className="flex gap-2"><MetricBtn code="I" val="H" /><MetricBtn code="I" val="L" /><MetricBtn code="I" val="N" /></div>
                                    </div>
                                     <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Availability (A)</span>
                                        <div className="flex gap-2"><MetricBtn code="A" val="H" /><MetricBtn code="A" val="L" /><MetricBtn code="A" val="N" /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-end gap-3 z-20 relative">
                    <Button variant="ghost" onClick={onClose} className="hover:bg-zinc-100 dark:hover:bg-zinc-900">CANCEL</Button>
                    <Button 
                        disabled={localScore === 0}
                        className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold px-6" 
                        onClick={() => { 
                            if(localVector && localScore > 0) {
                                onSave(localVector, localScore); 
                                onClose(); 
                            }
                        }}>
                        {localScore === 0 ? "INCOMPLETE VECTOR" : "CONFIRM & UPDATE SEVERITY"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
