
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Ban } from 'lucide-react';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';

interface UserActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  actionType: 'suspend' | 'ban';
  userName: string;
}

const SUSPENSION_REASONS = [
  "Violation of Code of Conduct",
  "Suspicious Activity Detected",
  "Spam or Abusive Behavior",
  "Repeated Failed Login Attempts",
  "Pending Investigation",
  "Other"
];

const BAN_REASONS = [
  "Severe Violation of Terms",
  "Fraudulent Activity",
  "Malicious Exploitation",
  "Harassment or Hate Speech",
  "Platform Security Threat",
  "Other"
];

export function UserActionDialog({ isOpen, onClose, onConfirm, title, actionType, userName }: UserActionDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = actionType === 'ban' ? BAN_REASONS : SUSPENSION_REASONS;
  const isDanger = actionType === 'ban';
  const htmlToText = (html: string) => {
    if (!html) return '';
    const container = document.createElement('div');
    container.innerHTML = html;
    return (container.textContent || container.innerText || '').replace(/\u00a0/g, ' ').trim();
  };

  const handleConfirm = async () => {
    const finalReason = reason === 'Other' ? htmlToText(customReason) : reason;
    if (!finalReason) return;
    
    setIsSubmitting(true);
    await onConfirm(finalReason);
    setIsSubmitting(false);
    onClose();
    setReason('');
    setCustomReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-full ${isDanger ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
              {isDanger ? (
                <Ban className={`h-6 w-6 ${isDanger ? 'text-red-500' : 'text-yellow-500'}`} />
              ) : (
                <AlertTriangle className={`h-6 w-6 ${isDanger ? 'text-red-500' : 'text-yellow-500'}`} />
              )}
            </div>
            <DialogTitle className="text-xl font-bold font-mono uppercase tracking-tight">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription>
            You are about to <strong>{actionType}</strong> the user <span className="text-foreground font-mono">{userName}</span>.
            This action will restrict their access. Please provide a reason.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="font-mono text-sm">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r} className="font-mono text-sm">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === 'Other' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Specific Reason</label>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <CyberpunkEditor
                  content={customReason}
                  onChange={setCustomReason}
                  placeholder="Enter specific reason..."
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="font-mono uppercase text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason || (reason === 'Other' && !customReason) || isSubmitting}
            className={`${
              isDanger 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-zinc-100 hover:bg-white text-black'
            } font-mono uppercase text-xs font-bold tracking-wide`}
          >
            {isSubmitting ? 'Processing...' : `Confirm ${actionType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
