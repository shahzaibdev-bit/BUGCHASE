import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SubmissionData } from './types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

interface StepReviewProps {
    data: SubmissionData;
    updateData: (updates: Partial<SubmissionData>) => void;
}

export const StepReview = ({ data, updateData }: StepReviewProps) => {
    const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

    return (
        <div className="space-y-8 animate-fade-in relative block">
            
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

                {/* Attachments Preview */}
                {data.files && data.files.length > 0 && (
                    <div className="p-6">
                        <h4 className="text-xs font-mono font-bold text-zinc-500 uppercase mb-4">Attachments ({data.files.length})</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {data.files.map((file, index) => {
                                const isImage = file.type.startsWith('image/');
                                const isVideo = file.type.startsWith('video/');
                                const isMedia = isImage || isVideo;
                                const objectUrl = URL.createObjectURL(file);
                                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

                                return (
                                    <div 
                                        key={index} 
                                        onClick={() => {
                                            if (isMedia) {
                                                setPreviewMedia({ url: objectUrl, type: isImage ? 'image' : 'video' });
                                            } else {
                                                window.open(objectUrl, '_blank');
                                            }
                                        }}
                                        className="group relative rounded-lg border border-border bg-muted/30 overflow-hidden aspect-square flex flex-col cursor-pointer hover:border-foreground/50 transition-colors"
                                    >
                                        <div className="flex-1 bg-black/5 flex items-center justify-center overflow-hidden">
                                            {isImage ? (
                                                <img 
                                                    src={objectUrl} 
                                                    alt={`Attachment ${index + 1}`} 
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                            ) : isVideo ? (
                                                <video 
                                                    src={objectUrl} 
                                                    className="w-full h-full object-cover bg-black"
                                                />
                                            ) : (
                                                 <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                                                    <div className="mb-2 opacity-50 transition-transform group-hover:scale-110 group-hover:text-foreground">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                    </div>
                                                    <span className="text-xs font-medium uppercase tracking-wider">{file.name.split('.').pop() || 'FILE'}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 border-t border-border bg-background text-xs truncate font-mono text-center relative z-10 transition-colors group-hover:bg-muted" title={file.name}>
                                            <div className="truncate text-foreground font-semibold">{file.name}</div>
                                            <div className="text-[10px] text-muted-foreground">{sizeMB} MB</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
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

            {/* Fullscreen Preview Modal */}
            {previewMedia && createPortal(
                <div 
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 md:p-12 animate-in fade-in duration-200"
                    onClick={() => setPreviewMedia(null)}
                >
                    <button 
                        onClick={() => setPreviewMedia(null)}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-[100000]"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    <div 
                        className="relative max-w-full max-h-full rounded-lg overflow-hidden flex items-center justify-center outline-none"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the media itself
                    >
                        {previewMedia.type === 'image' ? (
                            <img 
                                src={previewMedia.url} 
                                alt="Preview" 
                                className="max-w-full max-h-[85vh] object-contain rounded-md"
                            />
                        ) : previewMedia.type === 'video' ? (
                            <video 
                                src={previewMedia.url} 
                                controls
                                autoPlay
                                className="max-w-full max-h-[85vh] rounded-md ring-1 ring-white/20 shadow-2xl bg-black"
                            />
                        ) : null}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
