import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

interface SuspendProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  programName: string;
}

const SUSPENSION_REASONS = [
    "Terms of Service Violation",
    "Non-Payment of Bounties",
    "Security Concerns",
    "Inactive Program",
    "Investigating Reports",
    "Other"
];

export default function SuspendProgramDialog({ isOpen, onClose, onSubmit, programName }: SuspendProgramDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setIsSubmitting(true);
    const finalReason = reason === 'Other' ? customReason : reason;
    await onSubmit(finalReason);
    setIsSubmitting(false);
    onClose();
    // Reset
    setReason('');
    setCustomReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-700">
            <AlertTriangle className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
          </div>
          <DialogTitle className="text-center text-xl font-mono uppercase tracking-tight">Suspend Program</DialogTitle>
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400 font-mono text-xs">
            Are you sure you want to suspend "{programName}"? This will pause all bounty submissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
             <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs font-mono uppercase text-muted-foreground">Reason for Suspension</Label>
                <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 font-mono text-sm focus:ring-zinc-500">
                        <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                        {SUSPENSION_REASONS.map((r) => (
                            <SelectItem key={r} value={r} className="font-mono text-xs">{r.toUpperCase()}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {reason === 'Other' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                    <Label htmlFor="customReason" className="text-xs font-mono uppercase text-muted-foreground">Specify Reason</Label>
                    <Input
                        id="customReason"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Enter specific reason..."
                        required
                        className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 font-mono text-sm focus-visible:ring-zinc-500"
                    />
                </div>
            )}

            <DialogFooter className="mt-6 flex-col gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={onClose} className="font-mono" disabled={isSubmitting}>
                    CANCEL
                </Button>
                <Button 
                    type="submit" 
                    className="font-mono bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    disabled={!reason || (reason === 'Other' && !customReason) || isSubmitting}
                >
                    {isSubmitting ? 'SUSPENDING...' : 'CONFIRM_SUSPENSION'}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
