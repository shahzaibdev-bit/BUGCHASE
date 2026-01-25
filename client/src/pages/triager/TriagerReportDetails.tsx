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
  Search,
  CheckSquare,
  Square,
  ArrowLeft,
  Activity,
  Bug,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

// --- Types ---
type ReportStatus = 'Submitted' | 'Triaging' | 'Under Review' | 'Needs Info' | 'Triaged' | 'Spam' | 'Duplicate' | 'Out-of-Scope' | 'Resolved' | 'Closed';

interface TimelineEvent {
  id: string;
  type: 'comment' | 'status_change' | 'action';
  author: string;
  authorAvatar?: string; // Added field
  role: 'Triager' | 'Researcher' | 'System';
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

// --- CVSS Helpers ---
const parseCvssScore = (vec: string) => {
    if (!vec) return 0;
    let score = 4.0;
    if (vec.includes('AV:N')) score += 2.0;
    if (vec.includes('AC:L')) score += 1.0;
    if (vec.includes('C:H')) score += 1.5;
    if (vec.includes('I:H')) score += 1.5;
    return Math.min(10.0, score);
};

const CVSS_LABELS: Record<string, string> = {
    'AV:N': 'Network', 'AV:A': 'Adjacent', 'AV:L': 'Local', 'AV:P': 'Physical',
    'AC:L': 'Low', 'AC:H': 'High',
    'PR:N': 'None', 'PR:L': 'Low', 'PR:H': 'High',
    'UI:N': 'None', 'UI:R': 'Required',
    'S:U': 'Unchanged', 'S:C': 'Changed',
    'C:H': 'High', 'C:L': 'Low', 'C:N': 'None',
    'I:H': 'High', 'I:L': 'Low', 'I:N': 'None',
    'A:H': 'High', 'A:L': 'Low', 'A:N': 'None',
};

// --- Sub-Components ---

const TimelineNode = ({ event }: { event: TimelineEvent }) => {
    const isSystem = event.role === 'System';
    const isTriager = event.role === 'Triager';
    const isResearcher = event.role === 'Researcher';

    const getInitials = (name: string) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const Avatar = () => {
        if (isSystem) return <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm z-10"><Activity className="h-4 w-4 text-zinc-500" /></div>;
        if (isTriager) return <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs z-10">ME</div>;
        
        // Researcher Logic
        if (event.authorAvatar && event.authorAvatar !== 'default.jpg') {
            return (
                <img 
                    src={event.authorAvatar} 
                    alt={event.author} 
                    className="h-8 w-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 z-10"
                />
            );
        }

        return (
            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs z-10">
                {getInitials(event.author)}
            </div>
        );
    };

    return (
        <div className="relative flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-zinc-200 dark:bg-zinc-800 last:hidden"></div>
            <div className="relative shrink-0"><Avatar /></div>
            <div className="flex-1 pb-6 relative group">
                 <div className="flex items-center gap-2 text-xs mb-1.5">
                    <span className={`font-bold ${isTriager ? 'text-black dark:text-white' : isResearcher ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}>
                        {event.author}
                    </span>
                    {event.type === 'status_change' && (
                        <span className="text-zinc-500 flex items-center gap-1">
                             changed status to 
                             <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold uppercase text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700">{event.content}</Badge>
                        </span>
                    )}
                    <span className="text-zinc-400 text-[10px] ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        {new Date(event.timestamp).toLocaleString()}
                    </span>
                 </div>
                 {event.type === 'comment' && (
                     <div className="text-sm text-zinc-800 dark:text-zinc-300 bg-transparent leading-relaxed tracking-normal">
                         <div dangerouslySetInnerHTML={{ __html: event.content }} />
                     </div>
                 )}
                 {event.metadata?.reason && (
                     <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400 italic">
                         "{event.metadata.reason}"
                     </div>
                 )}
            </div>
        </div>
    );
};

const CvssInteractiveModal = ({ 
    isOpen, 
    onClose, 
    aiVector, 
    researcherVector,
    currentVector, 
    onSave 
}: { 
    isOpen: boolean;
    onClose: () => void;
    aiVector: string;
    researcherVector: string;
    currentVector: string;
    onSave: (vector: string, score: number) => void;
}) => {
    const [localVector, setLocalVector] = useState(currentVector || aiVector);
    
    // Scores
    const aiScore = parseCvssScore(aiVector);
    const researcherScore = parseCvssScore(researcherVector);
    const localScore = parseCvssScore(localVector);

    const updateMetric = (metric: string, value: string) => {
        let newVec = localVector;
        const regex = new RegExp(`${metric}:[A-Z]`);
        if (newVec.match(regex)) {
            newVec = newVec.replace(regex, `${metric}:${value}`);
        } else {
            newVec += `/${metric}:${value}`;
        }
        setLocalVector(newVec);
    };

    const MetricBtn = ({ code, val }: { code: string, val: string }) => {
        const fullVector = `${code}:${val}`;
        const label = CVSS_LABELS[fullVector] || val;
        const isActive = localVector.includes(fullVector);
        
        return (
            <button 
               onClick={() => updateMetric(code, val)}
               className={`px-3 py-2 text-xs font-mono font-medium border rounded transition-all active:scale-95 flex-1 text-center ${isActive ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-sm' : 'bg-transparent text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'}`}
            >
                {label}
            </button>
        );
    };

    const ScoreCard = ({ title, score, vector, icon: Icon, colorClass, borderClass, onClick }: any) => (
        <div 
            onClick={onClick}
            className={`p-4 rounded-xl border ${borderClass} bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden group transition-all cursor-pointer hover:shadow-md`}
        >
            <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    <span className={`font-bold text-xs uppercase tracking-wider ${colorClass}`}>{title}</span>
                </div>
                <span className={`font-mono font-bold text-2xl ${colorClass}`}>{score.toFixed(1)}</span>
            </div>
            <code className="block text-[10px] font-mono opacity-60 break-all leading-tight relative z-10">{vector}</code>
            {onClick && (
                <div className={`mt-2 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${colorClass}`}>
                    Click to Apply <ArrowLeft className="h-3 w-3 rotate-180" />
                </div>
            )}
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden gap-0 shadow-2xl">
                <DialogHeader className="p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10">
                    <DialogTitle className="font-mono text-lg tracking-tight flex items-center gap-2">
                        <Calculator className="h-4 w-4" /> CVSS 3.1 CALCULATOR
                    </DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-12 h-[550px]">
                    {/* Left: Comparison Panel (4 Cols) */}
                    <div className="md:col-span-4 bg-zinc-50/50 dark:bg-zinc-900/10 border-r border-zinc-100 dark:border-zinc-900 p-6 space-y-4 overflow-y-auto">
                         <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Sources</h4>
                         
                         <ScoreCard 
                            title="AI Estimate" 
                            score={aiScore} 
                            vector={aiVector} 
                            icon={Brain} 
                            colorClass="text-cyan-600 dark:text-cyan-400" 
                            borderClass="border-cyan-100 dark:border-cyan-900/30 hover:border-cyan-300"
                            onClick={() => setLocalVector(aiVector)}
                         />

                         <ScoreCard 
                            title="Researcher" 
                            score={researcherScore} 
                            vector={researcherVector} 
                            icon={Bug} 
                            colorClass="text-indigo-600 dark:text-indigo-400" 
                            borderClass="border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-300"
                            onClick={() => setLocalVector(researcherVector)}
                         />

                         <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                             <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Active Score</h4>
                             <div className="p-5 rounded-xl bg-black dark:bg-white border border-black dark:border-white shadow-lg relative overflow-hidden text-white dark:text-black">
                                 <div className="flex items-center justify-between mb-3 relative z-10">
                                     <div className="flex items-center gap-2">
                                         <User className="h-4 w-4" />
                                         <span className="font-bold text-xs uppercase tracking-wider">YOUR SCORE</span>
                                     </div>
                                     <span className="font-mono font-bold text-3xl">{localScore.toFixed(1)}</span>
                                 </div>
                                 <code className="block text-[10px] font-mono opacity-70 break-all leading-tight relative z-10">{localVector}</code>
                             </div>
                         </div>
                    </div>

                    {/* Right: Calculator Controls (8 Cols) */}
                    <ScrollArea className="md:col-span-8 bg-white dark:bg-zinc-950 p-8">
                        <div className="space-y-8 pb-20">
                            <div className="space-y-4">
                                <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Lock className="h-3 w-3"/> Base Metric Group</label>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Attack Vector (AV)</span>
                                        <div className="flex gap-2"><MetricBtn code="AV" val="N" /><MetricBtn code="AV" val="A" /><MetricBtn code="AV" val="L" /><MetricBtn code="AV" val="P" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Attack Complexity (AC)</span>
                                        <div className="flex gap-2"><MetricBtn code="AC" val="L" /><MetricBtn code="AC" val="H" /></div>
                                    </div>
                                     <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Privileges Required (PR)</span>
                                        <div className="flex gap-2"><MetricBtn code="PR" val="N" /><MetricBtn code="PR" val="L" /><MetricBtn code="PR" val="H" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">User Interaction (UI)</span>
                                        <div className="flex gap-2"><MetricBtn code="UI" val="N" /><MetricBtn code="UI" val="R" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Scope (S)</span>
                                        <div className="flex gap-2"><MetricBtn code="S" val="U" /><MetricBtn code="S" val="C" /></div>
                                    </div>
                                </div>
                            </div>
                            
                            <Separator className="bg-zinc-100 dark:bg-zinc-900" />
                            
                            <div className="space-y-4">
                                <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Activity className="h-3 w-3"/> Impact Metric Group</label>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Confidentiality (C)</span>
                                        <div className="flex gap-2"><MetricBtn code="C" val="H" /><MetricBtn code="C" val="L" /><MetricBtn code="C" val="N" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Integrity (I)</span>
                                        <div className="flex gap-2"><MetricBtn code="I" val="H" /><MetricBtn code="I" val="L" /><MetricBtn code="I" val="N" /></div>
                                    </div>
                                     <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Availability (A)</span>
                                        <div className="flex gap-2"><MetricBtn code="A" val="H" /><MetricBtn code="A" val="L" /><MetricBtn code="A" val="N" /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-end gap-3 z-20 relative">
                    <Button variant="ghost" onClick={onClose} className="hover:bg-zinc-100 dark:hover:bg-zinc-900">CANCEL</Button>
                    <Button className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold px-6" onClick={() => { onSave(localVector, localScore); onClose(); }}>
                        CONFIRM & UPDATE SEVERITY
                    </Button>
                </div>
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
            const res = await fetch(`/api/triager/reports/${id}`);
            const data = await res.json();
            if (res.ok) {
                const r = data.data.report;
                setReport(r);
                
                // Transform comments to timeline
                const comments = r.comments.map((c: any) => ({
                    id: c._id,
                    type: 'comment',
                    author: c.sender.name,
                    authorAvatar: c.sender.avatar,
                    role: c.sender.role === 'researcher' ? 'Researcher' : c.sender.role === 'triager' ? 'Triager' : 'System',
                    content: c.content,
                    timestamp: c.createdAt
                }));

                setState({
                    status: r.status,
                    severity: {
                        initial: 0, // Could be prior severity
                        final: r.cvssScore || 0,
                        vector: r.cvssVector || '',
                        researcherVector: r.cvssVector || '' // Assuming we start with this
                    },
                    timeline: comments, // For now only showing comments in timeline. Ideally would fetch audit logs too.
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

    // Scroll Logic for "Reply"
    useEffect(() => {
        if (location.hash === '#reply' && editorRef.current) {
             setTimeout(() => {
                editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, [location.hash, loading]);

    // --- Handlers ---
    
    const handleStatusSelect = (status: ReportStatus, skipReason = false) => {
        setPendingStatus(status);
        
        // Skip reason modal for specific statuses as requested
        const noReasonStatuses = ['Duplicate', 'Triaged', 'Resolved', 'Submitted'];
        
        if (skipReason || noReasonStatuses.includes(status)) {
            performStatusUpdate(status, '');
        } else {
             setReasonModalOpen(true);
        }
    };

    const performStatusUpdate = async (status: ReportStatus, reason: string) => {
        try {
            const res = await fetch(`/api/triager/reports/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, note: reason })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to update status');
            }

            // Add local timeline event for immediate feedback
            const newEvent: TimelineEvent = {
                id: Date.now().toString(),
                type: 'status_change',
                author: 'Me',
                role: 'Triager',
                content: status,
                timestamp: new Date().toISOString(),
                metadata: reason ? { reason } : undefined
            };
            
            setState(p => ({ 
                ...p, 
                status: status, 
                timeline: [...p.timeline, newEvent] 
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

    const confirmStatusChange = () => {
        if (!pendingStatus) return;
        performStatusUpdate(pendingStatus, statusReason);
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
            const res = await fetch(`/api/triager/reports/${id}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch(`/api/triager/reports/${id}/severity`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
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
                    type: 'comment', 
                    author: 'Me', 
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
            const res = await fetch(`/api/triager/reports/${id}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    const handleGenerateSummary = () => {
        setSummaryForm(p => ({
            ...p,
            technical: "The application is vulnerable to Stored XSS in the Profile Bio field...",
            remediation: "Input sanitization and output encoding..."
        }));
        toast({ title: "AI Generated", description: "Drafted executive summary." });
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
                                     
                                     {report.stepsToReproduce && (
                                        <>
                                         <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mt-8 mb-2">Steps To Reproduce</h3>
                                         <div 
                                            className="font-mono text-sm text-zinc-800 dark:text-zinc-300 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: report.stepsToReproduce }}
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
                                     {state.timeline.map((event) => (
                                         <TimelineNode key={event.id} event={event} />
                                     ))}
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
                                                            <DropdownMenuItem onClick={() => handleStatusSelect('Triaged')}>Triaged (Promote)</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusSelect('Needs Info')}>Needs Info</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusSelect('Spam')}>Spam</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusSelect('Resolved')}>Resolved</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusSelect('Duplicate')}>Duplicate</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleStatusSelect('Out-of-Scope')}>Out-of-Scope</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleStatusSelect('Closed')}>Closed</DropdownMenuItem>
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
                                         <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-bold">BH</div>
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
                                            await fetch(`/api/triager/reports/${id}/validation`, {
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
                                                onClick={() => handleStatusSelect('Duplicate', true)}
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

            <Dialog open={reasonModalOpen} onOpenChange={setReasonModalOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="font-mono">Status Change Reason</DialogTitle>
                        <DialogDescription>
                            Changing status to <span className="font-bold text-black dark:text-white">{pendingStatus?.toUpperCase()}</span>.
                            Please explain why for the researcher.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea 
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="e.g. Verified valid issue, needs more information..."
                        className="min-h-[100px] font-mono text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-black"
                    />
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setReasonModalOpen(false)}>CANCEL</Button>
                        <Button onClick={confirmStatusChange} className="bg-black dark:bg-white text-white dark:text-black font-bold">CONFIRM CHANGE</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
                <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10">
                        <div className="flex items-center justify-between">
                             <DialogTitle className="font-mono text-lg tracking-tight">EXECUTIVE SUMMARY</DialogTitle>
                             <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-200 bg-white" onClick={handleGenerateSummary}>
                                 <Brain className="h-3 w-3 mr-2 text-purple-600" /> AUTO-GENERATE
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
