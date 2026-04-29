import React, { useEffect, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Ban } from 'lucide-react';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';

export const SUSPEND_PRESET_REASONS = [
  'Terms of service violation',
  'Non-payment of bounties',
  'Security concerns',
  'Inactive program',
  'Investigating reports',
  'Other',
] as const;

export const BAN_PRESET_REASONS = [
  'Severe terms of service violation',
  'Fraud or abuse',
  'Repeated out-of-scope / spam submissions',
  'Legal or compliance hold',
  'Platform integrity — coordinated abuse',
  'Other',
] as const;

export const BAN_DURATION_OPTIONS = [
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'permanent', label: 'Permanent (until admin reactivates)' },
] as const;

export type ModerateProgramPayload = {
  presetReason: string;
  otherSpecify: string;
  commentHtml: string;
  banDurationKey: string;
};

interface ModerateProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'suspend' | 'ban';
  programName: string;
  onSubmit: (payload: ModerateProgramPayload) => Promise<void>;
}

export default function ModerateProgramDialog({
  isOpen,
  onClose,
  mode,
  programName,
  onSubmit,
}: ModerateProgramDialogProps) {
  const [preset, setPreset] = useState('');
  const [otherSpecify, setOtherSpecify] = useState('');
  const [commentHtml, setCommentHtml] = useState('');
  const [banDurationKey, setBanDurationKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = mode === 'ban' ? BAN_PRESET_REASONS : SUSPEND_PRESET_REASONS;

  useEffect(() => {
    if (isOpen) {
      setPreset('');
      setOtherSpecify('');
      setCommentHtml('');
      setBanDurationKey(mode === 'ban' ? '24h' : '');
      setIsSubmitting(false);
    }
  }, [isOpen, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preset) return;
    if (preset === 'Other' && !otherSpecify.trim()) return;
    if (mode === 'ban' && !banDurationKey) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        presetReason: preset,
        otherSpecify: otherSpecify.trim(),
        commentHtml,
        banDurationKey: mode === 'ban' ? banDurationKey : '',
      });
      onClose();
    } catch {
      /* parent shows toast; keep dialog open */
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBan = mode === 'ban';
  const Icon = isBan ? Ban : AlertTriangle;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-700">
            <Icon className={`h-6 w-6 ${isBan ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`} />
          </div>
          <DialogTitle className="text-center text-xl font-mono uppercase tracking-tight">
            {isBan ? 'Ban program' : 'Suspend program'}
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400 font-mono text-xs">
            {isBan
              ? `Ban "${programName}". Submissions will be blocked.`
              : `Suspend "${programName}". This pauses new submissions until reactivated.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase text-muted-foreground">
              {isBan ? 'Reason for ban' : 'Reason for suspension'}
            </Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 font-mono text-sm">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r} className="font-mono text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === 'Other' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Specify reason</Label>
              <Input
                value={otherSpecify}
                onChange={(e) => setOtherSpecify(e.target.value)}
                placeholder="Describe the reason…"
                required
                className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 font-mono text-sm"
              />
            </div>
          )}

          {isBan && (
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Ban duration</Label>
              <Select value={banDurationKey} onValueChange={setBanDurationKey}>
                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 font-mono text-sm">
                  <SelectValue placeholder="How long should the ban last?" />
                </SelectTrigger>
                <SelectContent>
                  {BAN_DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground font-mono">
                Timed bans lift automatically and return the program to Active. Permanent bans stay until an admin reactivates.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase text-muted-foreground">Additional notes (optional)</Label>
            <div className="min-h-[140px] border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden">
              <CyberpunkEditor
                content={commentHtml}
                onChange={setCommentHtml}
                placeholder="Personal comments to include with the moderation record…"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex-col gap-2 sm:gap-0 sm:flex-row">
            <Button type="button" variant="ghost" onClick={onClose} className="font-mono" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className={
                isBan
                  ? 'font-mono bg-red-600 text-white hover:bg-red-700'
                  : 'font-mono bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
              }
              disabled={
                !preset ||
                (preset === 'Other' && !otherSpecify.trim()) ||
                (isBan && !banDurationKey) ||
                isSubmitting
              }
            >
              {isSubmitting ? 'Saving…' : isBan ? 'Confirm ban' : 'Confirm suspend'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
