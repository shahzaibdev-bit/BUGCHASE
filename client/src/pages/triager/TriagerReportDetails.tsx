import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
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
  Search,
  CheckSquare,
  Square,
  ArrowLeft,
  Activity,
  Bug,
  RefreshCw
} from 'lucide-react';
import { API_URL } from '@/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

// --- Types ---
import { useAuth } from '@/contexts/AuthContext';
type ReportStatus = 'Submitted' | 'Triaging' | 'Under Review' | 'Needs Info' | 'Triaged' | 'Spam' | 'Duplicate' | 'Out-of-Scope' | 'Resolved' | 'Closed' | 'Paid' | 'NA';

interface TimelineEvent {
  id: string;
  type: 'comment' | 'status_change' | 'action' | 'assignment' | 'severity_update' | 'bounty_awarded';
  author: string;
  authorAvatar?: string; // Added field
  role: 'Triager' | 'Researcher' | 'Company' | 'System';
  content: string; // For comments: HTML/Text. For status: "changed status to X"
  timestamp: string;
  metadata?: any; // e.g. new_status
}

interface ReportState {
  status: ReportStatus;
  severity: {
    initial: number;
    final: number;
    vector: string;
    researcherVector: string; // Added field
  };
  timeline: TimelineEvent[];
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

const TimelineNode = ({ event, isConsecutive }: { event: TimelineEvent, isConsecutive?: boolean }) => {
    const isSystem = event.role === 'System';
    const isTriager = event.role === 'Triager';
    const isResearcher = event.role === 'Researcher';
    const isCompany = event.role === 'Company';

    const getInitials = (name: string) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const Avatar = () => {
        if (isConsecutive) {
            return <div className="absolute left-[10px] top-4 w-3 h-3 rounded-full border-2 border-zinc-300 dark:border-zinc-700 bg-background z-10" />;
        }

        if (isSystem) return <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm z-10"><Activity className="h-4 w-4 text-zinc-500" /></div>;
        
        // Show avatar for Triager (User), Company, and Researcher
        if (event.authorAvatar && event.authorAvatar !== 'default.jpg') {
            return (
                <img 
                    src={event.authorAvatar} 
                    alt={event.author} 
                    className="h-8 w-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 z-10 bg-white"
                />
            );
        }

        return (
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs z-10 text-white bg-blue-600`}>
                {getInitials(event.author)}
            </div>
        );
    };

    return (
        <div className="relative flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="absolute left-[15px] top-0 bottom-[-24px] w-0.5 bg-zinc-200 dark:bg-zinc-800 last:hidden"></div>
            <div className="relative shrink-0 w-8"><Avatar /></div>
            <div className="flex-1 pb-6 relative group">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                        {event.role === 'Researcher' ? (
                            <div className="flex items-center gap-2">
                                <HoverCard>
                                    <HoverCardTrigger asChild>
                                        <a href={`/h/${event.author}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                            @{event.author}
                                        </a>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80 font-inter">
                                        <div className="flex justify-between space-x-4">
                                            <UIAvatar>
                                                <AvatarImage src={event.authorAvatar} />
                                                <AvatarFallback>{event.author[0]?.toUpperCase()}</AvatarFallback>
                                            </UIAvatar>
                                            <div className="space-y-1 flex-1">
                                                <h4 className="text-sm font-semibold">@{event.author}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Security Researcher
                                                </p>
                                            </div>
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal">Security Researcher</Badge>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                    {isSystem ? event.author : `@${event.author}`}
                                </span>
                                {!isSystem && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal">
                                        {event.role === 'Triager' ? 'Bugchase Triage' : event.role}
                                    </Badge>
                                )}
                            </div>
                        )}
                        {event.type === 'status_change' && (
                            <span className="text-zinc-800 dark:text-zinc-200 text-[14px] flex flex-wrap items-center gap-1 font-medium tracking-tight">
                                 changed the status to {event.metadata?.newStatus?.toLowerCase() || event.content.replace('Changed status to ', '').replace('System changed status to ', '').split('.')[0].toLowerCase()}
                            </span>
                        )}
                        {event.type === 'bounty_awarded' && (
                            <span className="text-zinc-800 dark:text-zinc-200 text-[14px] flex flex-wrap items-center gap-1 font-medium tracking-tight">
                                 rewarded the researcher with a ${event.metadata?.bountyAwarded?.toLocaleString() || event.content.match(/\$(\d+)/)?.[1] || 0} bounty.
                            </span>
                        )}
                        <span className="text-zinc-400 text-[10px] ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {new Date(event.timestamp).toLocaleString(undefined, {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                            })}
                        </span>
                    </div>
                 </div>

                                        {event.type === 'status_change' ? (
                                            <div className="mt-1 flex flex-col items-start w-full gap-2">
                                                {event.metadata?.reason && (
                                                    <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-lg p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 w-full max-w-[85%] font-inter leading-relaxed relative text-left">
                                                        <div className="relative z-10 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                                                            <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>{event.metadata.reason}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : event.type === 'bounty_awarded' ? (
                                            <div className="mt-1 flex flex-col items-start w-full gap-2">
                                                {event.content && (
                                                    <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-lg p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 w-full max-w-[85%] font-inter leading-relaxed relative text-left">
                                                        <div className="relative z-10 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                                                            <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>{event.content}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                 ) : event.type === 'severity_update' ? (
                     <div className="flex items-center gap-1 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                         <span>updated severity —</span>
                         <span className="font-bold" dangerouslySetInnerHTML={{ __html: event.content }} />
                     </div>
                 ) : (event.type === 'comment' || event.type === 'assignment') ? (() => {
                     // TipTap (CyberpunkEditor) stores HTML; triager notes/assignment messages are plain markdown.
                     // Detect by checking if content starts with an HTML tag.
                     const isHtml = /^\s*<[a-z]/i.test(event.content);
                     return (
                         <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-xl p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 shadow-sm inline-block max-w-full font-inter leading-relaxed">
                             {isHtml ? (
                                 <div dangerouslySetInnerHTML={{ __html: event.content }} />
                             ) : (
                                 <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                                     <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.content}</ReactMarkdown>
                                 </div>
                             )}
                         </div>
                     );
                 })() : null}
            </div>
        </div>
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
            researcherVector: '' 
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

    const [pendingStatus, setPendingStatus] = useState<ReportStatus | null>(null);
    const [statusReason, setStatusReason] = useState('');
    const [duplicateScanning, setDuplicateScanning] = useState(false);
    const [duplicateFound, setDuplicateFound] = useState<{ id: string, confidence: number } | null>(null);
    const [summaryForm, setSummaryForm] = useState({ title: '', technical: '', remediation: '' });

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
                const comments: TimelineEvent[] = r.comments && Array.isArray(r.comments) ? r.comments.map((c: any) => ({
                    id: c._id,
                    type: c.type || 'comment',
                    author: c.sender?.role !== 'company' ? (c.sender?.username || c.sender?.name || 'Unknown User') : (c.sender?.name || 'Unknown Company'),
                    authorAvatar: c.sender?.avatar,
                    role: c.sender?.role === 'researcher' ? 'Researcher' : c.sender?.role === 'triager' ? 'Triager' : c.sender?.role === 'company' ? 'Company' : 'System',
                    content: c.content,
                    timestamp: c.createdAt,
                    metadata: c.metadata || {}
                })) : [];

                // Add Initial Submission Event
                const submissionEvent: TimelineEvent = {
                    id: 'submission',
                    type: 'comment',
                    author: r.researcherId?.username || r.researcherId?.name || 'Researcher',
                    authorAvatar: r.researcherId?.avatar,
                    role: 'Researcher',
                    content: `Hi, I found a vulnerability in <b>${r.assets?.[0] || 'the program'}</b>. Please verify.`,
                    timestamp: r.createdAt
                };
                
                const finalTimeline = [submissionEvent, ...comments];

                setState({
                    status: r.status,
                    severity: {
                        initial: 0, // Could be prior severity
                        final: r.cvssScore || 0,
                        vector: r.cvssVector || '',
                        researcherVector: r.cvssVector || '' // Assuming we start with this
                    },
                    timeline: finalTimeline, // For now only showing comments in timeline. Ideally would fetch audit logs too.
                    isLocked: !!r.triagerId,
                    validation: { 
                        reproduced: r.isReproduced || false, 
                        validAsset: r.isValidAsset !== undefined ? r.isValidAsset : true 
                    } 
                });

                if (r.title) setSummaryForm(p => ({ ...p, title: r.title }));
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

        socket.on('new_activity', (activity: TimelineEvent) => {
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

        } catch (error: any) {
             console.error("Status update error:", error);
             toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
        }
    };

    const confirmStatusChange = (reason: string) => {
        if (!pendingStatus) return;
        performStatusUpdate(pendingStatus, reason);
    };

    const handleDuplicateScan = () => {
        setDuplicateScanning(true);
        setDuplicateFound(null);
        // Mock Scan
        setTimeout(() => {
             setDuplicateScanning(false);
             setDuplicateFound({ id: 'MINAPR-12', confidence: 98 }); 
        }, 1500);
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
                const newSystemEvent: TimelineEvent = {
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

    return (
        <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col pt-4">
             {/* Top Bar for Navigation */}
             <div className="px-6 pb-4 flex items-center justify-between shrink-0">
                  <Button variant="ghost" className="pl-0 text-zinc-500 hover:text-black dark:hover:text-white" onClick={() => navigate('/triager')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> BACK TO QUEUE
                 </Button>
                 <div className="flex items-center gap-2">
                     <span className="text-sm font-mono text-zinc-400">REPORT ID:</span>
                     <span className="font-mono font-bold text-lg text-black dark:text-white">{report.id || id}</span>
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
                                     <Badge variant="outline" className="text-zinc-500 border-zinc-300 dark:border-zinc-700">{report.asset || 'N/A'}</Badge>
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
                                     <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-2">Description</h3>
                                     <div 
                                        className="text-base text-zinc-800 dark:text-zinc-300 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: report.description }}
                                     />
                                     
                                     {report.impact && (
                                        <>
                                         <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mt-8 mb-2">Impact</h3>
                                         <div 
                                            className="text-base text-zinc-800 dark:text-zinc-300 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: report.impact }}
                                         />
                                        </>
                                     )}

                                     {report.pocSteps && (
                                        <>
                                         <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mt-8 mb-2">Proof of Concept</h3>
                                         <div 
                                            className="font-mono text-sm text-zinc-800 dark:text-zinc-300 leading-relaxed p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-x-auto"
                                            dangerouslySetInnerHTML={{ __html: report.pocSteps }}
                                         />
                                        </>
                                     )}
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
                                         const isConsecutive = index > 0 && state.timeline[index - 1].author === event.author && event.type !== 'status_change' && state.timeline[index - 1].type !== 'status_change';
                                         return <TimelineNode key={event.id} event={event} isConsecutive={isConsecutive} />
                                     })}
                                 </div>

                                 {/* Sleek Compact Editor */}
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
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" className="h-7 text-xs w-[130px] justify-between font-normal bg-white dark:bg-black border-zinc-300 dark:border-zinc-700 shadow-sm px-3 text-zinc-500">
                                                                Change Status <ChevronRight className="h-3 w-3 rotate-90 opacity-50" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[150px]">
                                                            <DropdownMenuItem 
                                                                onClick={() => handleStatusSelect('Triaged')}
                                                                disabled={state.status === 'Triaged'}
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
                                                                disabled={state.status === 'Resolved'}
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

                             {/* Timer */}
                            <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between">
                                <span className="text-xs font-mono text-zinc-500">SLA TIMER</span>
                                <span className="font-mono font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <Clock className="h-3 w-3" /> 00:45:12
                                </span>
                            </div>
                        </div>

                        <Separator className="bg-zinc-200 dark:border-zinc-800" />

                        {/* Metadata */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Report Details</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-zinc-500 text-xs mb-1">Program</p>
                                    <p className="font-medium">{report.program?.title || 'Unknown'}</p>
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
                                             <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-bold">
                                                 {(report.researcherId?.name || 'U').charAt(0)}
                                             </div>
                                         )}
                                         <span className="font-medium">{report.researcherId?.name || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-zinc-200 dark:border-zinc-800" />

                        {/* Severity / CVSS */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Severity</h4>
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-indigo-600" onClick={() => setCvssModalOpen(true)}>
                                    <Calculator className="h-3 w-3 mr-1" /> Calculator
                                </Button>
                            </div>
                            
                            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg group hover:border-zinc-400 transition-colors cursor-pointer" onClick={() => setCvssModalOpen(true)}>
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
                                    className={`flex items-center justify-between p-2 rounded cursor-pointer border ${state.validation.reproduced ? 'bg-zinc-100 border-zinc-300' : 'bg-transparent border-transparent hover:bg-zinc-50'}`}
                                    onClick={async () => {
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

                             <Button variant="outline" className="w-full text-xs font-mono justify-between bg-white dark:bg-black" onClick={handleDuplicateScan} disabled={duplicateScanning}>
                                <span>{duplicateScanning ? 'SCANNING...' : 'DUPLICATE CHECK'}</span>
                                <Search className={`h-3 w-3 ${duplicateScanning ? 'animate-spin' : ''}`} />
                             </Button>

                             {/* INLINE Duplicate Result */}
                             {duplicateFound && (
                                 <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-in slide-in-from-top-2">
                                     <div className="flex items-start gap-3">
                                         <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                                         <div className="space-y-2">
                                             <div className="text-xs">
                                                 <p className="font-bold text-zinc-900 dark:text-zinc-100">Possible Duplicate Found</p>
                                                 <p className="text-zinc-500">Report #{duplicateFound.id} ({duplicateFound.confidence}%)</p>
                                             </div>
                                             <Button 
                                                size="sm" 
                                                className="w-full h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white border-0"
                                                onClick={() => handleStatusSelect('Duplicate')}
                                             >
                                                MARK AS DUPLICATE
                                             </Button>
                                         </div>
                                     </div>
                                 </div>
                             )}
                        </div>
                        
                        {/* Main Call to Action */}
                         <div className="pt-8 space-y-3">
                             {['Resolved', 'Spam', 'Duplicate', 'NA', 'Closed'].includes(state.status) ? (
                                 <Button 
                                    variant="outline"
                                    className="w-full h-12 border-black dark:border-white text-black dark:text-white font-bold tracking-wide hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                    onClick={() => performStatusUpdate('Triaging', 'Reopening report for further review.')}
                                 >
                                     <RefreshCw className="h-4 w-4 mr-2" /> REOPEN REPORT
                                 </Button>
                             ) : (
                                <Button 
                                    className="w-full bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold h-12 text-sm tracking-wide shadow-xl shadow-zinc-200 dark:shadow-none"
                                    onClick={() => setSummaryModalOpen(true)}
                                >
                                    SUBMIT DECISION
                                </Button>
                             )}
                         </div>

                    </div>
                </div>
             </div>

             {/* Interactives: CVSS Modal, Reason Modal, Summary Modal */}
             <CvssInteractiveModal 
                isOpen={cvssModalOpen}
                onClose={() => setCvssModalOpen(false)}
                aiVector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" 
                researcherVector={state.severity.researcherVector || "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N"}
                currentVector={state.severity.vector || "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N"}
                onSave={handleSeverityUpdate}
            />

            <ReasonSelectionModal
                isOpen={reasonModalOpen}
                onClose={() => setReasonModalOpen(false)}
                onConfirm={confirmStatusChange}
                status={pendingStatus}
            />

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

        </div>
    );
}
