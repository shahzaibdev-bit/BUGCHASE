import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProgramRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => void;
}

export function ProgramRejectionModal({ isOpen, onClose, onConfirm }: ProgramRejectionModalProps) {
  const [reason, setReason] = useState('scope_vague');
  const [customNote, setCustomNote] = useState('');

  const handleConfirm = () => {
    onConfirm(reason, customNote);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500 font-mono tracking-tight text-lg">
            <AlertTriangle className="h-5 w-5" />
            REJECT_SUBMISSION
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-mono uppercase">Reason for Rejection</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 focus:ring-red-500/20">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="scope_vague">Scope definitions are too vague</SelectItem>
                <SelectItem value="rewards_low">Rewards below platform minimums</SelectItem>
                <SelectItem value="duplicate">Duplicate Program detected</SelectItem>
                <SelectItem value="asset_failed">Asset verification failed</SelectItem>
                <SelectItem value="other">Other (Write details)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-mono uppercase">
              Additional Feedback {reason === 'other' && <span className="text-red-500">*</span>}
            </Label>
            <Textarea 
              placeholder="Provide specific feedback to the company..."
              className="bg-zinc-900 border-zinc-800 min-h-[100px] resize-none focus-visible:ring-red-500/20"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="hover:bg-zinc-900 text-muted-foreground hover:text-foreground">
            CANCEL
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={reason === 'other' && !customNote.trim()}
            className="bg-red-600 hover:bg-red-700 text-white font-mono font-bold tracking-tight shadow-[0_0_15px_-3px_rgba(220,38,38,0.4)]"
          >
            CONFIRM_REJECTION
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
