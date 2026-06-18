import { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/config';
import { LifeBuoy, Loader2, FileText } from 'lucide-react';

export interface SupportReportContext {
    /** Mongo _id of the report. */
    id: string;
    /** Human-friendly label, e.g. "RPT-1234 — XSS in login". */
    label?: string;
}

interface ContactSupportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** When provided, the issue is linked to this report and posted into its thread. */
    report?: SupportReportContext;
}

type IssueOption = { value: string; category: string };

const COMMON_ISSUES: Record<string, IssueOption[]> = {
    researcher: [
        { value: 'Bounty / payout not received', category: 'payout' },
        { value: 'Disagree with duplicate decision', category: 'duplicate' },
        { value: 'Disagree with severity rating', category: 'severity' },
        { value: 'Scope clarification needed', category: 'scope' },
        { value: 'Report stuck / no response', category: 'other' },
        { value: 'Triager conduct concern', category: 'conduct' },
        { value: 'Account or access problem', category: 'other' },
    ],
    company: [
        { value: 'Billing / escrow issue', category: 'payout' },
        { value: 'Disagree with triage decision', category: 'severity' },
        { value: 'Report quality concern', category: 'other' },
        { value: 'Researcher conduct concern', category: 'conduct' },
        { value: 'Program configuration issue', category: 'scope' },
        { value: 'Account or access problem', category: 'other' },
    ],
    triager: [
        { value: 'Report assignment issue', category: 'other' },
        { value: 'Report content / data problem', category: 'other' },
        { value: 'Need to escalate a report', category: 'other' },
        { value: 'Platform / tooling bug', category: 'other' },
        { value: 'Account or access problem', category: 'other' },
    ],
};

const FALLBACK_ISSUES: IssueOption[] = [
    { value: 'General question', category: 'other' },
    { value: 'Account or access problem', category: 'other' },
    { value: 'Report a bug', category: 'other' },
];

const OTHER_VALUE = '__other__';

export default function ContactSupportDialog({ open, onOpenChange, report }: ContactSupportDialogProps) {
    const { user } = useAuth();
    const [issueType, setIssueType] = useState('');
    const [customIssue, setCustomIssue] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const issueOptions = useMemo(() => {
        return (user?.role && COMMON_ISSUES[user.role]) || FALLBACK_ISSUES;
    }, [user?.role]);

    // Reset the form whenever the dialog is opened fresh.
    useEffect(() => {
        if (open) {
            setIssueType('');
            setCustomIssue('');
            setDescription('');
            setSubmitting(false);
        }
    }, [open]);

    const isOther = issueType === OTHER_VALUE;
    const resolvedSubject = isOther ? customIssue.trim() : issueType;
    const descriptionIsEmpty =
        !description || description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;

    const canSubmit = Boolean(resolvedSubject) && !descriptionIsEmpty && !submitting;

    const handleSubmit = async () => {
        if (!resolvedSubject) {
            toast({
                title: 'Select an issue',
                description: 'Choose a common issue or describe your own.',
                variant: 'destructive',
            });
            return;
        }
        if (descriptionIsEmpty) {
            toast({
                title: 'Description required',
                description: 'Please describe the issue in more detail.',
                variant: 'destructive',
            });
            return;
        }

        const category = isOther
            ? 'other'
            : issueOptions.find((o) => o.value === issueType)?.category || 'other';

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/disputes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({
                    subject: resolvedSubject,
                    description,
                    category,
                    reportRef: report?.id,
                    reportLabel: report?.label,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((data as any)?.message || 'Failed to submit your request');

            toast({
                title: 'Support request sent',
                description: report
                    ? "We've recorded your issue and posted it to the report thread. Track it under Support in the navbar."
                    : "We've recorded your issue. Track it under Support in the navbar. A confirmation email is on its way.",
            });
            onOpenChange(false);
        } catch (e: any) {
            toast({
                title: 'Could not send request',
                description: e?.message || 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-xl max-h-[88vh] overflow-y-auto overflow-x-hidden bg-card dark:bg-[#090909] border border-border p-5 sm:p-6">
                <DialogHeader className="min-w-0 pr-6">
                    <DialogTitle className="flex items-center gap-2">
                        <LifeBuoy className="w-5 h-5 shrink-0" /> Contact Support
                    </DialogTitle>
                    <DialogDescription className="break-words">
                        Tell us what's going on and our support team will get back to you.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-w-0 space-y-4 py-2">
                    {/* Requester details (auto-filled, read-only) */}
                    <div className="min-w-0 rounded-lg border border-border bg-muted/40 dark:bg-white/5 p-3 space-y-1">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                            Your details
                        </div>
                        <div className="text-sm font-medium text-foreground truncate">
                            {user?.name || 'Unknown user'}
                        </div>
                        <div className="text-xs text-muted-foreground break-all">
                            {user?.email}
                            {user?.role ? <span className="ml-2 capitalize opacity-70">· {user.role}</span> : null}
                        </div>
                    </div>

                    {/* Linked report (auto-filled when opened from a report) */}
                    {report?.id && (
                        <div className="min-w-0 rounded-lg border border-border bg-muted/40 dark:bg-white/5 p-3 flex items-start gap-2">
                            <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                                    Related report
                                </div>
                                <div className="max-w-full truncate text-sm font-medium text-foreground" title={report.label || report.id}>
                                    {report.label || report.id}
                                </div>
                                <div className="text-[11px] text-muted-foreground break-words">
                                    This issue will be posted to the report thread.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Issue type */}
                    <div className="min-w-0 space-y-2">
                        <Label>Issue</Label>
                        <Select value={issueType} onValueChange={setIssueType}>
                            <SelectTrigger className="w-full bg-background dark:bg-[#151515]">
                                <SelectValue placeholder="Select the issue you're facing" />
                            </SelectTrigger>
                            <SelectContent>
                                {issueOptions.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.value}
                                    </SelectItem>
                                ))}
                                <SelectItem value={OTHER_VALUE}>Other (describe below)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Custom issue title when "Other" is chosen */}
                    {isOther && (
                        <div className="min-w-0 space-y-2">
                            <Label>Your issue</Label>
                            <Input
                                value={customIssue}
                                onChange={(e) => setCustomIssue(e.target.value)}
                                placeholder="Briefly summarize your issue"
                                maxLength={160}
                                className="bg-background dark:bg-[#151515]"
                            />
                        </div>
                    )}

                    {/* Description (rich text) */}
                    <div className="min-w-0 space-y-2 [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:max-w-full [&_.ProseMirror]:break-words [&_.ProseMirror]:[overflow-wrap:anywhere] [&_.ProseMirror]:whitespace-pre-wrap [&_.tiptap]:max-w-full">
                        <Label>Description</Label>
                        <div className="max-w-full overflow-hidden [&>div]:min-h-[190px] [&>div]:max-w-full [&>div]:overflow-hidden [&>div>div:first-child]:min-w-0 [&>div>div:first-child]:max-w-full [&>div>div:first-child]:overflow-x-hidden">
                            <CyberpunkEditor
                                content={description}
                                onChange={setDescription}
                                placeholder="Describe the issue in detail. Include what you expected and what happened."
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
