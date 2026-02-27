import React from 'react';
import { SubmissionData } from './types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';

interface StepDetailsProps {
    data: SubmissionData;
    updateData: (updates: Partial<SubmissionData>) => void;
}

export const StepDetails = ({ data, updateData }: StepDetailsProps) => {
    
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const rawFiles = Array.from(e.target.files);
            
            // Validate File Sizes (1MB for Images, 5MB for Video/Other)
            const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB
            const MAX_VIDEO_SIZE = 5 * 1024 * 1024; // 5MB

            const validFiles: File[] = [];
            const rejectedFiles: string[] = [];

            rawFiles.forEach(file => {
                if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
                    rejectedFiles.push(`${file.name} (Exceeds 1MB)`);
                } else if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
                    rejectedFiles.push(`${file.name} (Exceeds 5MB)`);
                } else if (file.size > MAX_VIDEO_SIZE) { // Fallback for other files to 5MB
                    rejectedFiles.push(`${file.name} (Exceeds 5MB limit)`);
                } else {
                    validFiles.push(file);
                }
            });

            if (rejectedFiles.length > 0) {
                alert(`The following files were rejected due to size limits:\n\n${rejectedFiles.join('\n')}\n\nImages max 1MB, Videos max 5MB.`);
            }

            const totalAllowed = 5 - data.files.length;
            
            if (validFiles.length > totalAllowed) {
                alert(`You can only upload up to 5 files maximum. Only the first ${totalAllowed} valid files were added.`);
            }

            const allowedFiles = validFiles.slice(0, totalAllowed);

            if (allowedFiles.length > 0) {
                updateData({
                    files: [...data.files, ...allowedFiles],
                });
            }
        }
        // Reset input value so same files can be selected again if removed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const removeFile = (index: number) => {
        updateData({
            files: data.files.filter((_, i) => i !== index),
        });
    };

    // Helper to render preview securely
    const renderPreview = (file: File) => {
        const url = URL.createObjectURL(file);
        
        if (file.type.startsWith('image/')) {
            return <img src={url} alt={file.name} className="w-12 h-12 object-cover rounded-md border border-zinc-200 dark:border-zinc-800" />;
        }
        
        if (file.type.startsWith('video/')) {
            return (
                <video src={url} className="w-12 h-12 object-cover rounded-md border border-zinc-200 dark:border-zinc-800" muted playsInline>
                    <source src={url} type={file.type} />
                </video>
            );
        }

        // Generic File Icon
        return (
            <div className="w-12 h-12 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 rounded-md border border-zinc-300 dark:border-zinc-700">
                <span className="text-xs font-mono font-bold text-zinc-500">{file.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
            </div>
        );
    };

    // Cleanup object URLs on unmount effectively handled by browser or explicit effect if needed
    // For simplicity, browser handles blob cleanup on document unload.

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Title */}
            <div className="space-y-2">
                <Label className="text-zinc-500 uppercase font-mono text-xs">Report Title</Label>
                <Input 
                    placeholder="Briefly describe the vulnerability..."
                    className="font-mono text-lg py-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    value={data.title}
                    onChange={(e) => updateData({ title: e.target.value })}
                />
            </div>

            {/* Rich Text Areas (Simulated with Textarea for now) */}
            {/* Rich Text Areas */}
            <div className="space-y-2">
                 <Label className="text-zinc-500 uppercase font-mono text-xs">Vulnerability Details <span className="text-red-500">*</span></Label>
                 <CyberpunkEditor 
                     content={data.vulnerabilityDetails}
                     onChange={(html) => updateData({ vulnerabilityDetails: html })}
                     placeholder="What is the vulnerability? In clear steps, how do you reproduce it?"
                 />
            </div>

             <div className="space-y-2">
                <Label className="text-zinc-500 uppercase font-mono text-xs">Validation Steps (PoC) <span className="text-red-500">*</span></Label>
                <CyberpunkEditor 
                     content={data.validationSteps}
                     onChange={(html) => updateData({ validationSteps: html })}
                     placeholder="Provide step-by-step instructions to verify this finding..."
                 />
            </div>

            <div className="space-y-2">
                 <Label className="text-zinc-500 uppercase font-mono text-xs">Impact <span className="text-red-500">*</span></Label>
                 <CyberpunkEditor 
                     content={data.impact}
                     onChange={(html) => updateData({ impact: html })}
                     placeholder="Describe the impact of this vulnerability..."
                 />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-zinc-500 uppercase font-mono text-xs">Attachments (Optional)</Label>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500">
                        {data.files.length} / 5
                    </span>
                </div>
                
                {data.files.length < 5 && (
                    <div 
                        className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 text-center group cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-8 h-8 mx-auto mb-4 text-zinc-400 group-hover:text-emerald-500" />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium mb-2">Drag files here or click to browse</p>
                        <p className="text-xs text-zinc-400">Up to 50MB (Images, Videos, Logs)</p>
                        <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileUpload} />
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                        }}>
                            Select Files
                        </Button>
                    </div>
                )}
                
                {data.files.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {data.files.map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5">
                                <div className="flex items-center gap-3 overflow-hidden">
                                     {renderPreview(file)}
                                     <div className="flex flex-col min-w-0">
                                         <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100 truncate">{file.name}</span>
                                         <span className="text-xs font-mono text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                     </div>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 shrink-0 ml-2" onClick={() => removeFile(i)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
