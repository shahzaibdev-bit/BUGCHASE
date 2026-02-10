import React from 'react';
import { SubmissionData } from './types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface StepReviewProps {
    data: SubmissionData;
    updateData: (updates: Partial<SubmissionData>) => void;
}

export const StepReview = ({ data, updateData }: StepReviewProps) => {
    return (
        <div className="space-y-8 animate-fade-in">
            
            {/* Header Section */}
            <div className="space-y-1">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Review and submit your report</h2>
                <p className="text-zinc-500 text-sm">
                    Please review your report details before submitting your report as editing after report submission is possible only 5min.
                </p>
            </div>

            {/* Review Content */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden divide-y divide-zinc-200 dark:divide-white/10">
                
                {/* Target & Type */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <h4 className="text-xs font-mono font-bold text-zinc-500 uppercase mb-1">Target</h4>
                         <p className="text-zinc-900 dark:text-white font-medium">{data.target || '-'}</p>
                         <Badge variant="secondary" className="mt-2 text-xs font-normal bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                             {data.assetType || '-'}
                         </Badge>
                    </div>
                </div>

                {/* Category & Severity */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                         <h4 className="text-xs font-mono font-bold text-zinc-500 uppercase mb-1">Category</h4>
                         <p className="text-zinc-900 dark:text-white font-medium">{data.bugType || data.category || '-'}</p>
                         {data.cwe && <span className="text-xs text-zinc-500 font-mono mt-1 block">{data.cwe}</span>}
                    </div>
                    <div>
                         <h4 className="text-xs font-mono font-bold text-zinc-500 uppercase mb-1">Severity</h4>
                         <Badge className={cn(
                             "text-sm px-3 py-1 font-mono uppercase tracking-wide",
                             data.severity === 'Critical' ? "bg-red-500 hover:bg-red-600" :
                             data.severity === 'Critical' ? "bg-red-500 hover:bg-red-600" :
                             data.severity === 'High' ? "bg-orange-500 hover:bg-orange-600" :
                             data.severity === 'Medium' ? "bg-yellow-500 hover:bg-yellow-600" : "bg-black dark:bg-white dark:text-black hover:bg-zinc-800"
                         )}>
                             {data.severity}
                         </Badge>
                    </div>
                </div>

                {/* Title */}
                <div className="p-6">
                    <h4 className="text-xs font-mono font-bold text-zinc-500 uppercase mb-1">Title</h4>
                    <p className="text-zinc-900 dark:text-white font-bold">{data.title || '-'}</p>
                </div>

                {/* Impact (Rich Text) */}
                <div className="p-6">
                    <h4 className="text-xs font-mono font-bold text-zinc-500 uppercase mb-2">Impact</h4>
                    <div 
                        className="prose prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-black/20 p-4 rounded-lg border border-zinc-200 dark:border-white/5 font-sans"
                        dangerouslySetInnerHTML={{ __html: data.impact || '-' }}
                    />
                </div>

                {/* Vulnerability Details (Rich Text) */}
                <div className="p-6">
                    <h4 className="text-xs font-mono font-bold text-zinc-500 uppercase mb-2">Vulnerability details</h4>
                    <div 
                        className="prose prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-black/20 p-4 rounded-lg border border-zinc-200 dark:border-white/5 font-sans"
                        dangerouslySetInnerHTML={{ __html: data.vulnerabilityDetails || '-' }}
                    />
                </div>

                {/* Validation Steps (Rich Text) */}
                <div className="p-6">
                    <h4 className="text-xs font-mono font-bold text-zinc-500 uppercase mb-2">Validation steps</h4>
                    <div 
                        className="prose prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-black/20 p-4 rounded-lg border border-zinc-200 dark:border-white/5 font-sans"
                        dangerouslySetInnerHTML={{ __html: data.validationSteps || '-' }}
                    />
                </div>
            </div>

            {/* Legal / Confirmation */}
            <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                     <Checkbox 
                        id="terms" 
                        checked={data.agreedToTerms} 
                        onCheckedChange={(c) => updateData({ agreedToTerms: c as boolean })}
                        className="mt-1 data-[state=checked]:bg-black data-[state=checked]:border-black dark:data-[state=checked]:bg-white dark:data-[state=checked]:border-white dark:data-[state=checked]:text-black"
                     />
                     <div className="space-y-1">
                         <label htmlFor="terms" className="text-sm font-bold text-zinc-900 dark:text-white cursor-pointer select-none">
                             I verify that this report is accurate and compliant with the program policy.
                         </label>
                         <p className="text-xs text-zinc-500">
                             By submitting, you agree to the platform Terms of Service and Non-Disclosure Agreement.
                         </p>
                     </div>
                </div>
            </div>
        </div>
    );
};
