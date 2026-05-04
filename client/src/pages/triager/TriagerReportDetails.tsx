import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Lock, 
  Unlock, 
  Clock, 
  Brain, 
  Calculator, 
  ChevronRight, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  Copy,
  Send,
  MoreVertical,
  ShieldAlert,
  Info,
  User,
  Building,
  History,
  ExternalLink,
  CheckSquare,
  Square,
  ArrowLeft,
  Bug,
  RefreshCw
} from 'lucide-react';
import { API_URL } from '@/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { io } from 'socket.io-client';
import { CvssInteractiveModal } from '@/components/CvssInteractiveModal';
import { ReportTimelineNode } from '@/components/reports/ReportTimelineNode';
import type { ReportTimelineEvent } from '@/components/reports/ReportTimelineNode';
import { cn } from '@/lib/utils';

// --- Types ---
import { useAuth } from '@/contexts/AuthContext';
type ReportStatus = 'Submitted' | 'Triaging' | 'Under Review' | 'Needs Info' | 'Triaged' | 'Spam' | 'Duplicate' | 'Out-of-Scope' | 'Resolved' | 'Closed' | 'Paid' | 'NA';

/** Triagers may change status from the Activity dropdown only in these states (excludes e.g. Triaged, Spam, Resolved). */
const STATUSES_ALLOW_STATUS_CHANGE: ReportStatus[] = ['Submitted', 'Triaging', 'Under Review', 'Needs Info'];

interface ReportState {
  status: ReportStatus;
  severity: {
    initial: number;
    final: number;
    vector: string;
    researcherVector: string; // Added field
    level?: string;
  };
  timeline: ReportTimelineEvent[];
  isLocked: boolean;
  validation: {
    reproduced: boolean;
    validAsset: boolean;
  };
}

// --- Mock Data ---
// --- Mock Data Removed ---

// --- CVSS Helpers and Constants removed (moved to CvssInteractiveModal.tsx) ---

// --- Constants ---
const STATUS_REASONS: Record<string, string[]> = {
    'Spam': [
        "Automated scan report with no manual verification.",
        "Irrelevant or nonsensical submission.",
        "Social engineering / Phishing attempt.",
        "Other"
    ],
    'Duplicate': [
        "Report already exists in our system.",
        "Known internal issue already being tracked.",
        "Previously reported by another researcher.",
        "Other"
    ],
    'Out-of-Scope': [
        "Asset not listed in the program scope.",
        "Vulnerability type explicitly excluded in policy.",
        "Third-party service issue not manageable by us.",
        "Performance issue / Best Practice only.",
        "Other"
    ],
    'Needs Info': [
        "Cannot reproduce with provided steps.",
        "Missing proof of concept (PoC).",
        "Clarification needed on security impact.",
        "Video evidence required.",
        "Other"
    ],
    'NA': [
        "Intended functionality, not a vulnerability.",
        "Theoretical risk with no practical exploitability.",
        "Acceptable risk as per company policy.",
        "Browser mechanism / Client-side only behavior.",
        "Other"
    ],
    'Resolved': [
        "Patch verified and deployed.",
        "Mitigation control implemented.",
        "Service decommissioned.",
        "Other"
    ],
    'Triaged': [
        "Valid vulnerability, forwarded to development team.",
        "Severity confirmed, priority assigned.",
        "Reproduced successfully.",
        "Other"
    ],
    'Closed': [
        "Business decision to accept risk.",
        "Informative only.",
        "No longer applicable.",
        "Other"
    ]
};

const ReasonSelectionModal = ({
    isOpen,
    onClose,
    onConfirm,
    status
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    status: ReportStatus | null;
}) => {
    const [selectedReason, setSelectedReason] = useState<string>("");
    const [customReason, setCustomReason] = useState<string>("");
    
    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedReason("");
            setCustomReason("");
        }
    }, [isOpen]);

    const reasons = status ? STATUS_REASONS[status] || ["Other"] : [];

    const handleConfirm = () => {
        if (selectedReason === "Other") {
            onConfirm(customReason);
        } else {
            onConfirm(selectedReason || customReason);
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="font-mono text-lg">Update Status: {status}</DialogTitle>
                    <DialogDescription>
                        Please select a professional reason for this status change.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Reason Category</label>
                        <Select value={selectedReason} onValueChange={setSelectedReason}>
                            <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                <SelectValue placeholder="Select a reason..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                {reasons.map((r) => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {(selectedReason === "Other" || !reasons.length) && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">
                                {selectedReason === "Other" ? "Custom Reason" : "Reason"}
                            </label>
                            <Textarea 
                                value={customReason} 
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Provide specific details for the researcher..."
                                className="min-h-[100px] font-mono text-sm"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>CANCEL</Button>
                    <Button 
                        onClick={handleConfirm}
                        disabled={!selectedReason || (selectedReason === "Other" && !customReason.trim())}
                        className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold"
                    >
                        CONFIRM CHANGE
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Component ---
export default function TriagerReportDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const editorRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    // Initial State - Loading
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [state, setState] = useState<ReportState>({
        status: 'Submitted',
        severity: { 
            initial: 0, 
            final: 0, 
            vector: '',
            researcherVector: '',
            level: 'Info'
        },
        timeline: [],
        isLocked: false,
        validation: { reproduced: false, validAsset: false }
    });

    // Valid statuses for triager to switch between
    const validStatuses: ReportStatus[] = ['Triaging', 'Under Review', 'Needs Info'];

    // UI State
    const [editorContent, setEditorContent] = useState('');
    const [cvssModalOpen, setCvssModalOpen] = useState(false);
    const [reasonModalOpen, setReasonModalOpen] = useState(false);
    const [summaryModalOpen, setSummaryModalOpen] = useState(false);
    const [mobileTab, setMobileTab] = useState<'details' | 'activity' | 'tools'>('details');
    const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' | 'pdf' } | null>(null);


    const [pendingStatus, setPendingStatus] = useState<ReportStatus | null>(null);
    const [statusReason, setStatusReason] = useState('');
    const [duplicateMatches, setDuplicateMatches] = useState<Array<{
        reportMongoId: string;
        score: number;
        similarityPercent: number;
        confidence: 'HIGH_CONFIDENCE' | 'POTENTIAL' | 'LOW';
        metadata?: Record<string, any>;
    }>>([]);
    const [selectedDuplicate, setSelectedDuplicate] = useState<{
        reportMongoId: string;
        score: number;
        similarityPercent: number;
        confidence: 'HIGH_CONFIDENCE' | 'POTENTIAL' | 'LOW';
        metadata?: Record<string, any>;
    } | null>(null);
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [issueReportModalOpen, setIssueReportModalOpen] = useState(false);
    const [issueReportDetails, setIssueReportDetails] = useState('');
    const [issueReportSending, setIssueReportSending] = useState(false);
    const [summaryForm, setSummaryForm] = useState({ title: '', technical: '', remediation: '' });

    const getActorThreadKey = (event: ReportTimelineEvent) => {
        if (event.authorAvatar && event.authorAvatar !== 'default.jpg') return `avatar:${event.authorAvatar}`;
        return `author:${(event.author || '').trim().toLowerCase()}`;
    };

    // Fetch Report Data
    const fetchReport = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/triager/reports/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                const r = data.data.report;
                setReport(r);
                
                // Transform comments to timeline
                const comments: ReportTimelineEvent[] = r.comments && Array.isArray(r.comments) ? r.comments.map((c: any) => ({
                    id: c._id,
                    type: c.type || 'comment',
                    author:
                      c.sender?.role === 'admin'
                        ? (c.sender?.username || c.sender?.name || 'admin')
                        : c.sender?.role !== 'company'
                          ? (c.sender?.username || c.sender?.name || 'Unknown User')
                          : (c.sender?.name || 'Unknown Company'),
                    authorAvatar: c.sender?.avatar,
                    role:
                      c.sender?.role === 'researcher'
                        ? 'Researcher'
                        : c.sender?.role === 'triager'
                          ? 'Triager'
                          : c.sender?.role === 'company'
                            ? 'Company'
                            : c.sender?.role === 'admin'
                              ? 'Admin'
                              : 'System',
                    content: c.content,
                    attachments: c.attachments || [],
                    timestamp: c.createdAt,
                    metadata: c.metadata || {}
                })) : [];

                // Add Initial Submission Event
                const submissionEvent: ReportTimelineEvent = {
                    id: 'submission',
                    type: 'comment',
                    author: r.researcherId?.username || r.researcherId?.name || 'Researcher',
                    authorAvatar: r.researcherId?.avatar,
                    role: 'Researcher',
                    content: `Hi, I found a vulnerability in **${r.assets?.[0] || 'the program'}**. Please verify.`,
                    timestamp: r.createdAt
                };
                
                const finalTimeline = [submissionEvent, ...comments];

                setState({
                    status: r.status,
                    severity: {
                        initial: 0, // Could be prior severity
                        final: r.cvssScore || 0,
                        vector: r.cvssVector || '',
                        researcherVector: r.cvssVector || '', // Assuming we start with this
                        level: r.severity || 'Info'
                    },
                    timeline: finalTimeline, // For now only showing comments in timeline. Ideally would fetch audit logs too.
                    isLocked: !!r.triagerId,
                    validation: { 
                        reproduced: r.isReproduced || false, 
                        validAsset: r.isValidAsset !== undefined ? r.isValidAsset : true 
                    } 
                });

                if (r.title) setSummaryForm(p => ({ ...p, title: r.title }));

                const fromDb = (r.duplicateCandidates || []).map((c: any) => ({
                    reportMongoId: String(c.reportMongoId?._id ?? c.reportMongoId),
                    score: Number(c.similarityScore),
                    similarityPercent: Math.round(Number(c.similarityScore) * 100),
                    confidence:
                        Number(c.similarityScore) > 0.85
                            ? ('HIGH_CONFIDENCE' as const)
                            : ('POTENTIAL' as const),
                    metadata: {
                        title: c.candidateTitle,
                        reportId: c.candidateReportId,
                        submittedAt: c.candidateSubmittedAt,
                    },
                }));
                setDuplicateMatches(fromDb);
                setSelectedDuplicate(fromDb[0] || null);
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load report", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchReport();
    }, [id]);

    // Socket.io integration
    useEffect(() => {
        if (!id) return;
        
        const socketUrl = API_URL.replace(/\/api\/?$/, '');
        const socket = io(socketUrl, {
            withCredentials: true
        });

        socket.on('connect', () => {
            socket.emit('join_report', id);
        });

        socket.on('new_activity', (activity: ReportTimelineEvent) => {
            setState((prev) => {
                // Prevent duplicate entries
                if (prev.timeline.find(e => e.id === activity.id)) return prev;
                return { 
                    ...prev, 
                    timeline: [...prev.timeline, activity] 
                };
            });
            // Show toast if the activity is not from "Me" 
            if (activity.author !== 'Me' && activity.role !== 'System') {
                toast({ title: "New Activity", description: `New ${activity.type} from ${activity.author}` });
            }
        });

        socket.on('report_updated', (data: any) => {
            setState((prev) => ({
                ...prev,
                severity: {
                    ...prev.severity,
                    final: data.cvssScore !== undefined ? data.cvssScore : prev.severity.final,
                    vector: data.cvssVector !== undefined ? data.cvssVector : prev.severity.vector
                }
            }));
        });

        socket.on('status_updated', (data: any) => {
             setState((prev) => ({
                 ...prev,
                 status: data.status
             }));
        });

        return () => {
            socket.emit('leave_report', id);
            socket.disconnect();
        };
    }, [id]);

    // Scroll Logic for "Reply"
    useEffect(() => {
        if (location.hash === '#reply' && editorRef.current) {
             setTimeout(() => {
                editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, [location.hash, loading]);

    // --- Handlers ---
    
    const handleStatusSelect = (status: ReportStatus) => {
        const dupBlock =
            report?.duplicateReviewStatus === 'pending' &&
            (report?.duplicateCandidates?.length ?? 0) > 0;
        if (dupBlock && (status === 'Triaged' || status === 'Resolved')) {
            toast({
                title: 'Duplicate review required',
                description: 'Use the comparison modal to mark as duplicate or confirm not a duplicate first.',
                variant: 'destructive',
            });
            return;
        }
        setPendingStatus(status);
        if (status === 'Triaged') {
            setSummaryModalOpen(true);
        } else {
            setReasonModalOpen(true);
        }
    };

    const performStatusUpdate = async (status: ReportStatus, reason: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/triager/reports/${id}/status`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, note: reason })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to update status');
            }

            setState(p => ({ 
                ...p, 
                status: status
            }));

            if (status === 'Triaged') {
                setSummaryModalOpen(true);
            }

            setPendingStatus(null);
            setStatusReason('');
            setReasonModalOpen(false); // Close if open
            toast({ title: "Status Updated", description: `Updated to ${status}` });
            await fetchReport();

        } catch (error: any) {
             console.error("Status update error:", error);
             toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
        }
    };

    const confirmStatusChange = (reason: string) => {
        if (!pendingStatus) return;
        performStatusUpdate(pendingStatus, reason);
    };

    const confirmMarkDuplicate = async () => {
        if (!selectedDuplicate) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/reports/${id}/mark-duplicate`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    duplicateOf: selectedDuplicate.reportMongoId,
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to mark duplicate');
            setDuplicateModalOpen(false);
            setState(p => ({ ...p, status: 'Duplicate' }));
            toast({ title: "Marked as duplicate", description: "Researcher notified by email." });
            await fetchReport();
        } catch (error: any) {
            toast({ title: "Update failed", description: error.message, variant: 'destructive' });
        }
    };

    const handleClearDuplicateReview = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/reports/${id}/duplicate-review/clear`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((data as any)?.message || 'Failed to clear duplicate review');
            toast({ title: "Not a duplicate", description: "You can promote or resolve this report." });
            setDuplicateModalOpen(false);
            await fetchReport();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleSendMessage = async () => {
        if (!editorContent.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/triager/reports/${id}/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: editorContent })
            });

            if (res.ok) {
                 fetchReport(); // Refresh to see new comment
                 setEditorContent('');
            }
        } catch (error) {
             toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
        }
    };
    
    const handleSeverityUpdate = async (vector: string, score: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/triager/reports/${id}/severity`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    cvssVector: vector,
                    cvssScore: score,
                    severity: score >= 9 ? 'Critical' : score >= 7 ? 'High' : score >= 4 ? 'Medium' : 'Low'
                })
            });
            if (res.ok) {
                // Add local timeline event for immediate feedback
                const newSystemEvent: ReportTimelineEvent = {
                    id: Date.now().toString(),
                    type: 'severity_update', 
                    author: (user as any)?.username || user?.name || 'Unknown User', 
                    authorAvatar: (user as any)?.avatar || user?.avatar,
                    role: 'Triager', 
                    content: `Updated severity to ${score >= 9 ? 'Critical' : score >= 7 ? 'High' : score >= 4 ? 'Medium' : 'Low'} (${score}).`,
                    timestamp: new Date().toISOString()
                };

                setState(p => ({
                    ...p, 
                    severity: { ...p.severity, final: score, vector: vector },
                    timeline: [...p.timeline, newSystemEvent]
                }));
                toast({ title: "Updated", description: "Severity score updated." });
            }
        } catch (error) {
             console.error("Severity update error:", error);
             toast({ title: "Error", description: "Failed to update severity", variant: "destructive" });
        }
    };

    const submitFinalDecision = async () => {
         try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/triager/reports/${id}/decision`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    status: 'Triaged', // Promoting to Triaged
                    note: summaryForm.technical + "\n\nRemediation:\n" + summaryForm.remediation // Combining notes
                })
            });
            if (res.ok) {
                 setSummaryModalOpen(false); 
                 toast({ title: "Report Promoted", description: "Sent to Company Dashboard." });
                 navigate('/triager'); // Return to queue
            }
        } catch (error) {
             toast({ title: "Error", description: "Failed to submit decision", variant: "destructive" });
        }
    };

    const [generatingSummary, setGeneratingSummary] = useState(false);

    const handleGenerateSummary = async () => {
        setGeneratingSummary(true);
        toast({ title: "Generating Summary", description: "AI is analyzing the report..." });
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/triager/reports/${id}/generate-summary`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await res.json();
            
            if (res.ok && data.data.summary) {
                const { title, technical_summary, remediation } = data.data.summary;
                setSummaryForm(p => ({
                    ...p,
                    title: title || p.title,
                    technical: technical_summary || "",
                    remediation: remediation || ""
                }));
                toast({ title: "Summary Generated", description: "AI has drafted the executive summary." });
            } else {
                throw new Error("Failed to generate summary");
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to generate AI summary", variant: "destructive" });
        } finally {
            setGeneratingSummary(false);
        }
    };

    if (loading || !report) return <div className="p-10 text-center">Loading Report Details...</div>;

    const duplicateBlocking =
        report.duplicateReviewStatus === 'pending' && (report.duplicateCandidates?.length ?? 0) > 0;

    const canChangeReportStatus = STATUSES_ALLOW_STATUS_CHANGE.includes(state.status);
    /** CVSS, validation toggles, duplicate resolution actions — locked whenever status cannot be changed from the dropdown. */
    const triageFieldsLocked = !canChangeReportStatus;

    const submitTriagerNoticeToResearcher = async () => {
        const text = issueReportDetails.trim();
        if (!text) {
            toast({ title: 'Message required', description: 'Enter the notice you want to send.', variant: 'destructive' });
            return;
        }
        setIssueReportSending(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/triager/reports/${id}/triager-notice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ details: text }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((data as any)?.message || 'Failed to send notice');
            toast({ title: 'Notice sent', description: 'Posted to the thread and emailed to the researcher.' });
            setIssueReportModalOpen(false);
            setIssueReportDetails('');
            await fetchReport();
        } catch (e: any) {
            toast({ title: 'Error', description: e?.message || 'Request failed', variant: 'destructive' });
        } finally {
            setIssueReportSending(false);
        }
    };

    const openPeekTab = (reportMongoId: string) => {
        window.open(`/triager/peek/${reportMongoId}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col pt-4">
             {duplicateBlocking && (
                 <div className="mx-6 mb-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 shrink-0">
                     <span className="font-semibold">Duplicate review required.</span>{' '}
                     Similar reports were found when this submission was filed. Open the comparison, inspect candidates in a new tab, then mark as duplicate or confirm it is not a duplicate before promoting or resolving.
                 </div>
             )}
             {/* Top Bar for Navigation */}
             <div className="px-6 pb-4 flex items-center justify-between shrink-0">
                  <Button variant="ghost" className="pl-0 text-zinc-500 hover:text-black dark:hover:text-white" onClick={() => navigate('/triager')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> BACK TO QUEUE
                 </Button>
                 <div className="flex items-center gap-2">
                     <span className="text-sm font-mono text-zinc-400">REPORT ID:</span>
                     <span className="font-mono font-bold text-lg text-black dark:text-white">{report.reportId || report.id || id}</span>
                 </div>
             </div>

             {/* Mobile Tab Bar */}
             <div className="lg:hidden flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shrink-0">
                 <button onClick={() => setMobileTab('details')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${mobileTab === 'details' ? 'border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-zinc-500'}`}>Details</button>
                 <button onClick={() => setMobileTab('activity')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${mobileTab === 'activity' ? 'border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-zinc-500'}`}>Activity</button>
                 <button onClick={() => setMobileTab('tools')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${mobileTab === 'tools' ? 'border-b-2 border-black dark:border-white text-black dark:text-white' : 'text-zinc-500'}`}>Tools</button>
             </div>

             <div className="flex-1 overflow-hidden">
                <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
                    
                    {/* LEFT COLUMN: Content & Timeline (70%) */}
                    <ScrollArea className={`lg:col-span-8 h-full border-r border-zinc-200 dark:border-zinc-800 ${mobileTab === 'tools' ? 'hidden lg:block' : ''}`}>
                        <div className="p-8 max-w-4xl mx-auto space-y-12 pb-32">
                             {/* Report Content */}
                             <div className={`space-y-6 ${mobileTab === 'activity' ? 'hidden lg:block' : ''}`}>
                                 <h1 className="text-3xl font-bold text-black dark:text-white leading-tight">{report.title}</h1>
                                 
                                 <div className="flex gap-3 flex-wrap items-center">
                                     <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200">{report.type || 'Vulnerability'}</Badge>
                                     {report.asset && <Badge variant="outline" className="text-zinc-500 border-zinc-300 dark:border-zinc-700">{report.asset}</Badge>}
                                     <Badge className={
                                        state.status === 'Triaged' || state.status === 'Resolved' || state.status === 'Paid' ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' :
                                        state.status === 'Duplicate' || state.status === 'Spam' || state.status === 'NA' || state.status === 'Out-of-Scope' || state.status === 'Closed' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20' :
                                        state.status === 'Needs Info' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20' :
                                        'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20'
                                     }>
                                        {state.status.replace('_', ' ')}
                                     </Badge>
                                 </div>

                                 <div className="prose prose-zinc dark:prose-invert max-w-none">
                                     <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">Description</h2>
                                     <div 
                                        className="text-base text-zinc-800 dark:text-zinc-300 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: report.description }}
                                     />
                                     
                                     {report.impact && (
                                        <>
                                         <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">Impact</h2>
                                         <div 
                                            className="text-base text-zinc-800 dark:text-zinc-300 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: report.impact }}
                                         />
                                        </>
                                     )}

                                     {report.pocSteps && (
                                        <>
                                         <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">Proof of Concept</h2>
                                         <div 
                                            className="font-mono text-sm text-zinc-800 dark:text-zinc-300 leading-relaxed p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-x-auto"
                                            dangerouslySetInnerHTML={{ __html: report.pocSteps }}
                                         />
                                        </>
                                     )}

                                    {(() => {
                                         const cloudinaryUrls = report.assets?.filter((url: string) => url.includes('cloudinary.com')) || [];
                                         if (cloudinaryUrls.length === 0) return null;
                                         
                                         return (
                                            <>
                                             <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">Attachments (PoC)</h2>
                                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                                 {cloudinaryUrls.map((url: string, index: number) => {
                                                     const isVideo = url.includes('/video/') || /\.(mp4|webm|ogg)$/i.test(url);
                                                     const isPdf = url.includes('/raw/') || /\.pdf$/i.test(url);
                                                     
                                                     return (
                                                         <div key={index} className="group relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:border-black dark:hover:border-white transition-colors shadow-sm flex items-center justify-center">
                                                              {isVideo ? (
                                                                 <div 
                                                                     className="w-full h-full cursor-pointer relative block"
                                                                     onClick={() => setPreviewMedia({ url, type: 'video' })}
                                                                 >
                                                                     <video src={url} className="w-full h-full object-cover pointer-events-none" />
                                                                     <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                                                         <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg backdrop-blur-sm">
                                                                            <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-black border-b-[5px] border-b-transparent ml-1" />
                                                                         </div>
                                                                     </div>
                                                                 </div>
                                                             ) : isPdf ? (
                                                                <a
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="w-full h-full cursor-pointer relative flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors"
                                                                >
                                                                     <svg className="w-10 h-10 text-red-500 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9.5 11.5C9.5 12.3 8.8 13 8 13H7V15H5.5V9H8C8.8 9 9.5 9.7 9.5 10.5V11.5ZM14.5 13.5C14.5 14.3 13.8 15 13 15H10.5V9H13C13.8 9 14.5 9.7 14.5 10.5V13.5ZM18.5 10.5H17V11.5H18.5V13H17V15H15.5V9H18.5V10.5ZM7 10.5H8V11.5H7V10.5ZM12 10.5H13V13.5H12V10.5Z"/></svg>
                                                                     <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400">PDF Document</span>
                                                                 </a>
                                                             ) : (
                                                                 <img 
                                                                     src={url} 
                                                                     alt={`Attachment ${index + 1}`} 
                                                                     className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                                                     onClick={() => setPreviewMedia({ url, type: 'image' })}
                                                                 />
                                                             )}
                                                         </div>
                                                     );
                                                 })}
                                             </div>
                                            </>
                                         );
                                     })()}
                                 </div>
                             </div>

                             <div className={`${mobileTab === 'activity' ? 'hidden lg:block' : ''}`}>
                                <Separator className="bg-zinc-200 dark:bg-zinc-800" />
                             </div>

                             {/* Timeline & Activity */}
                             <div className={`${mobileTab === 'details' ? 'hidden lg:block' : ''}`}>
                                 <h3 className="text-lg font-bold text-black dark:text-white mb-6">Activity</h3>
                                 <div className="pl-2">
                                     {state.timeline.map((event, index) => {
                                        const prev = state.timeline[index - 1];
                                        const isConsecutive = index > 0 && getActorThreadKey(prev) === getActorThreadKey(event);
                                         return <ReportTimelineNode key={event.id} event={event} isConsecutive={isConsecutive} onPreviewMedia={setPreviewMedia} />
                                     })}
                                 </div>

                                 {/* Reply + Change Status (disabled with tooltip when report is outside active triage) */}
                                 <div className="mt-8 flex gap-4 pl-2" ref={editorRef} id="reply-editor">
                                     <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0 mt-2">ME</div>
                                     <div className="flex-1 space-y-3">
                                        <div className="rounded-lg bg-white dark:bg-zinc-950 shadow-sm border border-zinc-200 dark:border-zinc-800 focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-white transition-all overflow-hidden">
                                             <CyberpunkEditor 
                                                content={editorContent}
                                                onChange={setEditorContent}
                                                placeholder="Reply or leave an internal note..."
                                             />
                                             <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                                                 <div className="flex gap-2">
                                                     {/* Future extensions */}
                                                 </div>
                                                 <div className="flex gap-2">
                                                     {triageFieldsLocked ? (
                                                     <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="inline-flex rounded-md cursor-default outline-none focus-visible:ring-2 focus-visible:ring-zinc-400">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className="h-7 text-xs w-[130px] justify-between font-normal bg-white dark:bg-black border-zinc-300 dark:border-zinc-700 shadow-sm px-3 text-zinc-500 opacity-60"
                                                                    disabled
                                                                    aria-disabled
                                                                >
                                                                    Change Status <ChevronRight className="h-3 w-3 rotate-90 opacity-50" />
                                                                </Button>
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-[260px] text-center">
                                                            This report has been closed. Reopen the report first to change status.
                                                        </TooltipContent>
                                                     </Tooltip>
                                                     ) : (
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" className="h-7 text-xs w-[130px] justify-between font-normal bg-white dark:bg-black border-zinc-300 dark:border-zinc-700 shadow-sm px-3 text-zinc-500">
                                                                Change Status <ChevronRight className="h-3 w-3 rotate-90 opacity-50" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[150px]">
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusSelect('Triaged')}
                                                                disabled={state.status === 'Triaged' || duplicateBlocking}
                                                            >
                                                                Triaged (Promote)
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusSelect('Needs Info')}
                                                                disabled={state.status === 'Needs Info'}
                                                            >
                                                                Needs Info
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusSelect('Spam')}
                                                                disabled={state.status === 'Spam'}
                                                            >
                                                                Spam
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusSelect('Resolved')}
                                                                disabled={state.status === 'Resolved' || duplicateBlocking}
                                                            >
                                                                Resolved
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusSelect('Duplicate')}
                                                                disabled={state.status === 'Duplicate'}
                                                            >
                                                                Duplicate
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusSelect('Out-of-Scope')}
                                                                disabled={state.status === 'Out-of-Scope'}
                                                            >
                                                                Out-of-Scope
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusSelect('Closed')}
                                                                disabled={state.status === 'Closed'}
                                                            >
                                                                Closed
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                     </DropdownMenu>
                                                     )}
                                                     <Button size="sm" className="h-7 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs px-4" onClick={handleSendMessage}>
                                                         Comment
                                                     </Button>
                                                 </div>
                                             </div>
                                        </div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </ScrollArea>

                    {/* RIGHT COLUMN: Sidebar (30%) */}
                    <div className={`lg:col-span-4 h-full overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/20 p-6 space-y-6 ${mobileTab !== 'tools' ? 'hidden lg:block' : ''}`}>
                        
                        {/* Status Card */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-500 uppercase">Current Status</span>
                                <Badge variant="outline" className={`bg-white dark:bg-black border-zinc-300 dark:border-zinc-700 text-black dark:text-white px-3 py-1 ${state.status === 'Triaged' ? 'bg-green-100 text-green-800 border-green-200' : ''}`}>
                                    {state.status}
                                </Badge>
                            </div>
                            
                            {/* Lock */}
                            <div className={`p-3 rounded border flex items-center justify-center gap-2 font-mono text-xs font-bold ${
                                state.isLocked 
                                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white' 
                                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                            }`}>
                                {state.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                {state.isLocked ? "LOCKED BY YOU" : "UNLOCKED"}
                            </div>

                            {triageFieldsLocked && (
                                <>
                                    <Separator className="bg-zinc-200 dark:border-zinc-800 my-2" />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-10 gap-2 font-mono text-xs border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                        onClick={() => setIssueReportModalOpen(true)}
                                    >
                                        <ShieldAlert className="h-4 w-4 shrink-0" />
                                        REPORT TO RESEARCHER
                                    </Button>
                                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                                        Adds a triager notice on the thread and emails the researcher. Available when the report is outside active triage (not Submitted, Triaging, Under Review, or Needs Info).
                                    </p>
                                </>
                            )}

                        </div>

                        <Separator className="bg-zinc-200 dark:border-zinc-800" />

                        {/* Metadata */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Report Details</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-zinc-500 text-xs mb-1">Program</p>
                                    {report.programId ? (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-left">
                                                    {report.programId.title}
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl w-full">
                                                <DialogHeader className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                                                            {report.programId.companyId?.avatar ? (
                                                                <img src={report.programId.companyId.avatar} alt="Company" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="font-bold text-xl text-zinc-400">{(report.programId.companyName || report.programId.title || '?')[0]}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <DialogTitle className="text-xl">{report.programId.title}</DialogTitle>
                                                            {report.programId.companyName && <p className="text-sm text-zinc-500">{report.programId.companyName}</p>}
                                                        </div>
                                                    </div>
                                                </DialogHeader>

                                                <div className="overflow-y-auto max-h-[65vh] pr-1 space-y-5 pt-3">
                                                    {/* Badges */}
                                                    <div className="flex gap-2 flex-wrap">
                                                        {report.programId.type && (
                                                            <span className="text-xs font-bold uppercase px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800">
                                                                {report.programId.type}
                                                            </span>
                                                        )}
                                                        {report.programId.bountyRange && (
                                                            <span className="text-xs font-bold px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800">
                                                                {report.programId.bountyRange?.replace(/\$/g, 'PKR ')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Description */}
                                                    {report.programId.description && (
                                                        <div>
                                                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1.5">About This Program</h3>
                                                            <div
                                                                className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm prose-zinc dark:prose-invert max-w-none"
                                                                dangerouslySetInnerHTML={{ __html: report.programId.description }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Rewards Table */}
                                                    {report.programId.rewards && (
                                                        <div>
                                                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1.5">Bounty Rewards</h3>
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {(['critical','high','medium','low'] as const).map(sev => {
                                                                    const r = report.programId.rewards?.[sev];
                                                                    return (
                                                                        <div key={sev} className="rounded border border-zinc-200 dark:border-zinc-700 p-2.5 text-center bg-zinc-50 dark:bg-zinc-900">
                                                                            <p className="text-[10px] font-bold uppercase mb-1 text-zinc-500 dark:text-zinc-400">{sev}</p>
                                                                            {r?.min || r?.max ? (
                                                                                <p className="text-xs font-mono font-bold text-zinc-900 dark:text-white">PKR {(r.min||0).toLocaleString()} – PKR {(r.max||0).toLocaleString()}</p>
                                                                            ) : <p className="text-xs text-zinc-400">N/A</p>}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Rules of Engagement */}
                                                    {report.programId.rulesOfEngagement && (
                                                        <div>
                                                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1.5">Rules of Engagement</h3>
                                                            <div
                                                                className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm prose-zinc dark:prose-invert max-w-none bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3"
                                                                dangerouslySetInnerHTML={{ __html: report.programId.rulesOfEngagement }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Safe Harbor */}
                                                    {report.programId.safeHarbor && (
                                                        <div>
                                                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-1.5">Safe Harbor</h3>
                                                            <div
                                                                className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm prose-zinc dark:prose-invert max-w-none bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3"
                                                                dangerouslySetInnerHTML={{ __html: report.programId.safeHarbor }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    ) : (
                                        <p className="font-medium text-zinc-900 dark:text-white">Unknown</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-zinc-500 text-xs mb-1">Submitted</p>
                                    <p className="font-medium">{new Date(report.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 text-xs mb-1">Reporter</p>
                                    <div className="flex items-center gap-2">
                                         {report.researcherId?.avatar && report.researcherId.avatar !== 'default.jpg' ? (
                                             <img src={report.researcherId.avatar} alt="Reporter" className="h-5 w-5 rounded-full object-cover" />
                                         ) : (
                                             <div className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-600 dark:text-zinc-300 font-bold">
                                                 {(report.researcherId?.name || 'U').charAt(0).toUpperCase()}
                                             </div>
                                         )}
                                         {report.researcherId?.username ? (
                                             <a
                                                 href={`/h/${report.researcherId.username}`}
                                                 target="_blank"
                                                 rel="noopener noreferrer"
                                                 className="font-medium text-zinc-900 dark:text-white hover:underline"
                                             >
                                                 @{report.researcherId.username}
                                             </a>
                                         ) : (
                                             <span className="font-medium">{report.researcherId?.name || 'Unknown'}</span>
                                         )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-zinc-200 dark:border-zinc-800" />

                        {/* Severity / CVSS */}
                        <div className={cn('space-y-3', triageFieldsLocked && 'opacity-60')}>
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Severity</h4>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs text-indigo-600"
                                    onClick={() => !triageFieldsLocked && setCvssModalOpen(true)}
                                    disabled={triageFieldsLocked}
                                >
                                    <Calculator className="h-3 w-3 mr-1" /> Calculator
                                </Button>
                            </div>
                            
                            <div
                                className={cn(
                                    'p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg group transition-colors',
                                    triageFieldsLocked ? 'cursor-not-allowed' : 'hover:border-zinc-400 cursor-pointer'
                                )}
                                onClick={() => !triageFieldsLocked && setCvssModalOpen(true)}
                                role={triageFieldsLocked ? undefined : 'button'}
                            >
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-3xl font-bold text-black dark:text-white">{state.severity.final.toFixed(1)}</span>
                                    <span className="text-sm font-bold text-orange-500">HIGH</span>
                                </div>
                                <div className="text-[10px] font-mono text-zinc-500 break-all bg-zinc-50 dark:bg-zinc-900 p-2 rounded">
                                    {state.severity.vector}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-zinc-200 dark:border-zinc-800" />

                        {/* Duplicate Scanner */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Validation</h4>
                             {/* Valid/Reproduced Toggles */}
                             <div className="space-y-2">
                                <div 
                                    className={cn(
                                        'flex items-center justify-between p-2 rounded border',
                                        state.validation.reproduced ? 'bg-zinc-100 border-zinc-300' : 'bg-transparent border-transparent',
                                        triageFieldsLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-zinc-50'
                                    )}
                                    onClick={async () => {
                                        if (triageFieldsLocked) return;
                                        const newVal = !state.validation.reproduced;
                                        try {
                                            await fetch(`${API_URL}/triager/reports/${id}/validation`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ isReproduced: newVal })
                                            });
                                            setState(p => ({...p, validation: {...p.validation, reproduced: newVal}}));
                                        } catch(e) { toast({ title: "Error", description: "Failed to update validation", variant: "destructive" }); }
                                    }}
                                >
                                    <span className="text-sm font-medium">Reproduced</span>
                                    {state.validation.reproduced ? <CheckCircle className="h-4 w-4 text-black" /> : <div className="h-4 w-4 rounded-full border border-zinc-300" />}
                                </div>
                             </div>

                             {duplicateMatches.length > 0 && (
                                 <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-orange-200 dark:border-orange-900/50 rounded-lg animate-in slide-in-from-top-2">
                                     <div className="flex items-start gap-3">
                                         <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                                         <div className="space-y-2 w-full">
                                             <div className="text-xs">
                                                 <p className="font-bold text-zinc-900 dark:text-zinc-100">Potential duplicate</p>
                                                 <p className="text-zinc-500">
                                                    {duplicateMatches.length} similar report(s) in this program (best match {duplicateMatches[0].similarityPercent}%). Sorted by original submission time.
                                                 </p>
                                             </div>
                                             <Button 
                                                size="sm" 
                                                className="w-full h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white border-0"
                                                onClick={() => setDuplicateModalOpen(true)}
                                             >
                                                OPEN COMPARISON
                                             </Button>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {duplicateMatches.length > 0 && triageFieldsLocked && (
                                 <Button
                                     type="button"
                                     variant="outline"
                                     className="w-full h-9 mt-2 text-xs font-bold border-black dark:border-white text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                     onClick={() => performStatusUpdate('Triaging', 'Reopening report for further review.')}
                                 >
                                     <RefreshCw className="h-4 w-4 mr-2" />
                                     REOPEN FOR TRIAGE
                                 </Button>
                             )}

                             {triageFieldsLocked && duplicateMatches.length === 0 && (
                                 <Button
                                     type="button"
                                     variant="outline"
                                     className="w-full h-9 text-xs font-bold border-black dark:border-white text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                     onClick={() => performStatusUpdate('Triaging', 'Reopening report for further review.')}
                                 >
                                     <RefreshCw className="h-4 w-4 mr-2" />
                                     REOPEN FOR TRIAGE
                                 </Button>
                             )}
                        </div>
                        
                        {/* Promote to company — only during active triage */}
                         <div className="pt-8 space-y-3">
                             {canChangeReportStatus &&
                             !['Resolved', 'Spam', 'Duplicate', 'NA', 'Closed', 'Paid', 'Out-of-Scope'].includes(state.status) ? (
                                <Button 
                                    className="w-full bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold h-12 text-sm tracking-wide shadow-xl shadow-zinc-200 dark:shadow-none"
                                    onClick={() => setSummaryModalOpen(true)}
                                    disabled={duplicateBlocking}
                                    title={duplicateBlocking ? 'Complete duplicate review first' : undefined}
                                >
                                    SUBMIT DECISION
                                </Button>
                             ) : null}
                         </div>

                    </div>
                </div>
             </div>

             {/* Interactives: CVSS Modal, Reason Modal, Summary Modal */}
             <CvssInteractiveModal 
                isOpen={cvssModalOpen}
                onClose={() => setCvssModalOpen(false)}
                aiVector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" 
                researcherVector={state.severity.researcherVector || ""}
                researcherSeverity={state.severity.level}
                currentVector={state.severity.vector || "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N"}
                onSave={handleSeverityUpdate}
            />

            <ReasonSelectionModal
                isOpen={reasonModalOpen}
                onClose={() => setReasonModalOpen(false)}
                onConfirm={confirmStatusChange}
                status={pendingStatus}
            />

            <Dialog open={!!previewMedia} onOpenChange={(open) => !open && setPreviewMedia(null)}>
                <DialogContent className="max-w-5xl w-full p-1 bg-transparent border-none shadow-none text-white h-[90vh]">
                    <DialogHeader className="absolute top-4 right-4 z-50">
                        <DialogTitle className="sr-only">Attachment Preview</DialogTitle>
                    </DialogHeader>
                    {previewMedia && (
                        <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/90 rounded-lg overflow-hidden backdrop-blur-xl border border-white/10 ring-1 ring-white/5">
                            {previewMedia.type === 'video' ? (
                                <video src={previewMedia.url} controls autoPlay className="max-w-full max-h-full object-contain w-full h-full rounded-md shadow-2xl" />
                            ) : previewMedia.type === 'pdf' ? (
                                <iframe src={`${previewMedia.url}#view=FitH`} className="w-full h-full rounded-md shadow-2xl bg-white" title="PDF Preview" />
                            ) : (
                                <img src={previewMedia.url} alt="Attachment Preview" className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl" />
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

             <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
                <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10">
                        <div className="flex items-center justify-between">
                             <DialogTitle className="font-mono text-lg tracking-tight">EXECUTIVE SUMMARY</DialogTitle>
                             <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-200 bg-white" onClick={handleGenerateSummary} disabled={generatingSummary}>
                                 <Brain className={`h-3 w-3 mr-2 text-purple-600 ${generatingSummary ? 'animate-pulse' : ''}`} /> 
                                 {generatingSummary ? 'GENERATING...' : 'AUTO-GENERATE'}
                             </Button>
                        </div>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-zinc-500 uppercase">Title</label>
                             <Input value={summaryForm.title} onChange={e => setSummaryForm(p => ({...p, title: e.target.value}))} className="font-mono" />
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-zinc-500 uppercase">Technical Details</label>
                             <Textarea value={summaryForm.technical} onChange={e => setSummaryForm(p => ({...p, technical: e.target.value}))} className="font-mono min-h-[100px]" placeholder="Technical description of the vulnerability..." />
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-zinc-500 uppercase">Remediation</label>
                             <Textarea value={summaryForm.remediation} onChange={e => setSummaryForm(p => ({...p, remediation: e.target.value}))} className="font-mono min-h-[80px]" placeholder="Steps to fix..." />
                        </div>
                    </div>
                    <DialogFooter className="p-4 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50">
                        <Button variant="ghost" onClick={() => setSummaryModalOpen(false)}>CANCEL</Button>
                        <Button className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold" onClick={submitFinalDecision}>
                            SEND TO COMPANY
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={duplicateModalOpen} onOpenChange={setDuplicateModalOpen}>
                <DialogContent className="max-w-4xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Duplicate comparison</DialogTitle>
                        <DialogDescription>
                            Open any candidate in a new tab (read-only). Submission times help determine which report was filed first.
                            {triageFieldsLocked
                                ? ' Status cannot be changed from this screen; you can review candidates for context only — marking duplicate or not a duplicate is disabled.'
                                : ' Select the canonical report this submission duplicates, or confirm it is not a duplicate.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                            <div className="text-xs uppercase text-zinc-500 font-mono mb-2">This report</div>
                            <div className="text-sm font-semibold">{report?.title}</div>
                            <div className="text-xs text-zinc-500 mt-1">{report?.reportId || report?._id}</div>
                            <div className="text-xs text-zinc-400 mt-2">
                                Submitted: {report?.createdAt ? new Date(report.createdAt).toLocaleString() : '—'}
                            </div>
                        </div>
                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                            <div className="text-xs uppercase text-zinc-500 font-mono mb-2">Selected candidate</div>
                            {selectedDuplicate ? (
                                <>
                                    <div className="text-sm font-semibold">{selectedDuplicate.metadata?.title || 'Untitled'}</div>
                                    <div className="text-xs text-zinc-500 mt-1">
                                        {selectedDuplicate.metadata?.reportId || selectedDuplicate.reportMongoId}
                                    </div>
                                    <div className="mt-2 text-sm">
                                        Similarity: <span className="font-bold">{selectedDuplicate.similarityPercent}%</span>
                                    </div>
                                    {selectedDuplicate.metadata?.submittedAt && (
                                        <div className="text-xs text-zinc-400 mt-1">
                                            Submitted:{' '}
                                            {new Date(selectedDuplicate.metadata.submittedAt).toLocaleString()}
                                        </div>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 h-8 text-xs gap-1"
                                        onClick={() => openPeekTab(selectedDuplicate.reportMongoId)}
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Open read-only in new tab
                                    </Button>
                                </>
                            ) : (
                                <div className="text-sm text-zinc-500">Select a candidate below</div>
                            )}
                        </div>
                    </div>

                    {duplicateMatches.length > 0 && (
                        <div className="space-y-2 max-h-52 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg p-2">
                            {duplicateMatches.map((m) => (
                                <div
                                    key={m.reportMongoId}
                                    className={cn(
                                        "flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded border transition-colors",
                                        selectedDuplicate?.reportMongoId === m.reportMongoId
                                            ? "border-black dark:border-white bg-zinc-100 dark:bg-zinc-900"
                                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDuplicate(m)}
                                        className="flex-1 text-left min-w-0"
                                    >
                                        <div className="text-sm font-medium truncate">{m.metadata?.title || 'Untitled Report'}</div>
                                        <div className="text-xs text-zinc-500 mt-0.5 truncate">
                                            {m.metadata?.reportId || m.reportMongoId} · {m.similarityPercent}% ·{' '}
                                            {m.metadata?.submittedAt
                                                ? new Date(m.metadata.submittedAt).toLocaleDateString()
                                                : ''}
                                        </div>
                                    </button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="shrink-0 h-8 text-xs"
                                        onClick={() => openPeekTab(m.reportMongoId)}
                                    >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Peek
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="ghost" onClick={() => setDuplicateModalOpen(false)}>Close</Button>
                        <Button
                            variant="outline"
                            onClick={handleClearDuplicateReview}
                            disabled={triageFieldsLocked}
                            title={triageFieldsLocked ? 'Not available while status cannot be changed from this page' : undefined}
                        >
                            Not a duplicate — continue triage
                        </Button>
                        <Button
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={confirmMarkDuplicate}
                            disabled={!selectedDuplicate || triageFieldsLocked}
                            title={triageFieldsLocked ? 'Not available while status cannot be changed from this page' : undefined}
                        >
                            Mark as duplicate of selected
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={issueReportModalOpen} onOpenChange={(open) => { setIssueReportModalOpen(open); if (!open) setIssueReportDetails(''); }}>
                <DialogContent className="max-w-lg bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>Report to researcher</DialogTitle>
                        <DialogDescription>
                            This message is added to the report thread and emailed to the researcher. Use when the report is outside active triage (anything other than Submitted, Triaging, Under Review, or Needs Info).
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={issueReportDetails}
                        onChange={(e) => setIssueReportDetails(e.target.value)}
                        className="min-h-[140px] font-mono text-sm"
                        placeholder="Write your notice to the researcher…"
                    />
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="ghost" onClick={() => setIssueReportModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold"
                            onClick={submitTriagerNoticeToResearcher}
                            disabled={issueReportSending}
                        >
                            {issueReportSending ? 'Sending…' : 'Send to thread & email'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
