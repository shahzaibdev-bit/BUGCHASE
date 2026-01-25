
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
import { Input } from '@/components/ui/input';
import { AlertTriangle, Ban } from 'lucide-react';

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

  const handleConfirm = async () => {
    const finalReason = reason === 'Other' ? customReason : reason;
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
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
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
          <DialogDescription className="text-zinc-400">
            You are about to <strong>{actionType}</strong> the user <span className="text-white font-mono">{userName}</span>.
            This action will restrict their access. Please provide a reason.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-zinc-900/50 border-zinc-800 focus:ring-0 focus:ring-offset-0 font-mono text-sm">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {reasons.map((r) => (
                  <SelectItem key={r} value={r} className="font-mono text-sm focus:bg-zinc-800 focus:text-zinc-100">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === 'Other' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Specific Reason</label>
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter specific reason..."
                className="bg-zinc-900/50 border-zinc-800 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-zinc-900 hover:text-white font-mono uppercase text-xs"
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
