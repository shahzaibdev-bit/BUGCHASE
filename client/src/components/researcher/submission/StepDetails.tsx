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
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
          updateData({
            files: [...data.files, ...Array.from(e.target.files!)],
          });
        }
    };
    
    const removeFile = (index: number) => {
        updateData({
            files: data.files.filter((_, i) => i !== index),
        });
    };

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
                 <Label className="text-zinc-500 uppercase font-mono text-xs">Impact <span className="text-red-500">*</span></Label>
                 <CyberpunkEditor 
                     content={data.impact}
                     onChange={(html) => updateData({ impact: html })}
                     placeholder="Describe the impact of this vulnerability..."
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

            {/* File Upload */}
            <div className="space-y-2">
                <Label className="text-zinc-500 uppercase font-mono text-xs">Attachments (Optional)</Label>
                <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 text-center group">
                    <Upload className="w-8 h-8 mx-auto mb-4 text-zinc-400 group-hover:text-emerald-500" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium mb-2">Drag files here or click to browse</p>
                    <p className="text-xs text-zinc-400">Up to 50MB (Images, Videos, Logs)</p>
                    <input type="file" className="hidden" id="file-upload" multiple onChange={handleFileUpload} />
                    <label htmlFor="file-upload">
                        <Button variant="outline" size="sm" className="mt-4 cursor-pointer">Select Files</Button>
                    </label>
                </div>
                {data.files.length > 0 && (
                    <div className="space-y-2 mt-4">
                        {data.files.map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5">
                                <span className="text-sm font-mono truncate max-w-[200px]">{file.name}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-red-500" onClick={() => removeFile(i)}>
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
