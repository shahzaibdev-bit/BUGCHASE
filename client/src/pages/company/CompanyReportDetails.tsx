import React, { useState, useEffect, useRef } from 'react';
import { io as socketIO } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Unlock, 
  Clock, 
  Brain,
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
  ArrowLeft,
  Activity,
  Bug,
  DollarSign,
  Award,
  Sparkles
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';
import { CvssInteractiveModal } from '@/components/CvssInteractiveModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { API_URL } from '@/config';

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
    'NA': [
        "Intended functionality, not a vulnerability.",
        "Theoretical risk with no practical exploitability.",
        "Acceptable risk as per company policy.",
        "Browser mechanism / Client-side only behavior.",
        "Other"
    ]
};

const RESOLVE_REASONS = [
    "Thank you for the report! We have successfully applied a patch.",
    "Issue resolved. The fix will be rolled out in the next deployment.",
    "Confirmed and fixed. We appreciate your contribution to our security.",
    "Other"
];

const BOUNTY_MESSAGES = [
    "Thank you for your valuable report. We are pleased to award this bounty.",
    "Excellent findings! This bounty reflects the severe impact of your discovery.",
    "We appreciate your responsible disclosure. Here is your well-deserved reward.",
    "Other"
];

// --- Types ---
type ReportStatus = 'Submitted' | 'Under Review' | 'Needs Info' | 'Triaged' | 'Spam' | 'Duplicate' | 'Out-of-Scope' | 'Resolved' | 'NA';

interface TimelineEvent {
  id: string;
  type: 'comment' | 'status_change' | 'action' | 'severity_update' | 'bounty_awarded';
  author: string;
  authorAvatar?: string;
  role: 'Triager' | 'Researcher' | 'Company';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface ReportState {
  status: ReportStatus;
  severity: {
    score: number;
    vector: string;
    level: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  };
  timeline: TimelineEvent[];
  isLocked: boolean;
  bounty?: number;
}

// Map backend severity string → our level type
const mapSeverityLevel = (sev: string): ReportState['severity']['level'] => {
  if (!sev) return 'Info';
  const s = sev.toLowerCase();
  if (s === 'critical') return 'Critical';
  if (s === 'high') return 'High';
  if (s === 'medium') return 'Medium';
  if (s === 'low') return 'Low';
  return 'Info';
};

// Map a backend comment/timeline entry to our TimelineEvent shape
const mapComment = (c: any): TimelineEvent => {
  const sender = c.sender;
  const role: TimelineEvent['role'] =
    sender?.role === 'company' ? 'Company' :
    sender?.role === 'triager' ? 'Triager' :
    'Researcher';

  return {
    id: c._id?.toString() || Date.now().toString(),
    type: c.type === 'status_change' ? 'status_change'
        : c.type === 'bounty_awarded' ? 'bounty_awarded'
        : c.type === 'severity_update' ? 'severity_update'
        : 'comment',
    author: role === 'Researcher'
      ? (sender?.username || sender?.name || 'Researcher')
      : (sender?.name || sender?.username || 'User'),
    authorAvatar: sender?.avatar,
    role,
    content: c.content || '',
    timestamp: c.createdAt || new Date().toISOString(),
    metadata: c.metadata,
  };
};

export default function CompanyReportDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  // -- Raw report from API
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reportState, setReportState] = useState<ReportState>({
    status: 'Submitted',
    severity: { score: 0, vector: 'N/A', level: 'Info' },
    timeline: [],
    isLocked: false,
    bounty: 0,
  });

  const [mobileTab, setMobileTab] = useState<'details' | 'activity' | 'tools'>('details');
  const [cvssModalOpen, setCvssModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectStatus, setRejectStatus] = useState<ReportStatus>('NA');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [selectedBountyMessage, setSelectedBountyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Resolve Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveMessage, setResolveMessage] = useState('');
  const [selectedResolveReason, setSelectedResolveReason] = useState('');

  // Bounty Modal State
  const [bountyModalOpen, setBountyModalOpen] = useState(false);
  const [bountyAmount, setBountyAmount] = useState<number | ''>('');
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState('');
  const [rewardRange, setRewardRange] = useState<{min: number, max: number} | null>(null);

  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const reasons = STATUS_REASONS[rejectStatus] || ["Other"];

  const handleSuggestBounty = async () => {
      try {
          setAiSuggestionLoading(true);
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/company/reports/${id}/suggest-bounty`, {
              method: 'POST',
              headers: { 
                  'Authorization': `Bearer ${token}`
              }
          });

          if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.message || 'Failed to fetch AI suggestion');
          }

          const data = await res.json();
          setBountyAmount(data.data.suggestedAmount);
          setAiReasoning(data.data.reasoning);
          setRewardRange(data.data.rewardRange);
          setSelectedBountyMessage('AI');
          setReplyContent(`Thank you for submitting this report regarding **${report.title}**.\n\nBased on our severity assessment, we are pleased to award you a bounty of **$${data.data.suggestedAmount?.toLocaleString()}**.\n\nWe greatly appreciate your efforts in helping secure BugChase!`);
      } catch (error: any) {
          console.error("AI Suggestion error:", error);
          toast({ title: "Error", description: error.message || "Failed to get AI suggestion", variant: "destructive" });
      } finally {
          setAiSuggestionLoading(false);
      }
  };

  const handleGenerateMessage = async (type: 'resolve' | 'bounty') => {
      try {
          setIsGeneratingContent(true);
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/company/reports/${id}/generate-message`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  type,
                  bountyAmount: type === 'bounty' ? bountyAmount : undefined
              })
          });

          if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.message || 'Failed to generate message');
          }

          const data = await res.json();
          if (type === 'resolve') {
              setResolveMessage(data.data.message);
          } else {
              setReplyContent(data.data.message);
          }
      } catch (error: any) {
          console.error("Generate message error:", error);
          toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
      } finally {
          setIsGeneratingContent(false);
      }
  };

  // Replace old `handleStatusChange` with real API call
  const handleCompanyAction = async (status: ReportStatus, reason?: string) => {
      try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/company/reports/${id}/status`, {
              method: 'PATCH',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  status,
                  note: reason
              })
          });

          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || 'Failed to update status');
          }

          setRejectModalOpen(false);
          setResolveModalOpen(false);
          setSelectedReason('');
          setCustomReason('');
          setResolveMessage('');
          setSelectedResolveReason('');

          const actionLabel = status === 'Resolved' ? `✅ Report Resolved` : `Report marked as ${status}`;
          toast({ title: 'Action Complete', description: actionLabel });
          
          setReportState(prev => ({
              ...prev,
              status: status
          }));
          fetchReport();
      } catch (error: any) {
          console.error('Action error:', error);
          toast({ title: 'Error', description: error.message || 'Failed to update report', variant: 'destructive' });
      }
  };

  const handleAwardBounty = async (customMessagePayload?: string | any) => {
      try {
          if (!bountyAmount || Number(bountyAmount) <= 0) throw new Error("Please enter a valid bounty amount");
          const payloadMessage = typeof customMessagePayload === 'string' ? customMessagePayload : replyContent;
          
          setIsSubmitting(true);
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/company/reports/${id}/bounty`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  bounty: Number(bountyAmount),
                  message: payloadMessage
              })
          });

          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || 'Failed to award bounty');
          }

          setBountyModalOpen(false);
          setBountyAmount('');
          setReplyContent('');
          toast({ title: 'Bounty Awarded', description: `$${bountyAmount} has been sent to the researcher.` });
          fetchReport();
      } catch (error: any) {
          console.error('Bounty error:', error);
          toast({ title: 'Error', description: error.message || 'Failed to award bounty', variant: 'destructive' });
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- Fetch Report ---
  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/company/reports/${id}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to load report');
        return;
      }

      const r = data.data?.report || data.data || data.report;
      setReport(r);

      // Build timeline from comments array
      const timeline: TimelineEvent[] = (r.comments || []).map(mapComment);

      setReportState({
        status: r.status || 'Submitted',
        severity: {
          score: r.cvssScore ?? 0,
          vector: r.cvssVector || 'N/A',
          level: mapSeverityLevel(r.severity),
        },
        timeline,
        isLocked: r.isLocked || false,
        bounty: r.bounty || 0,
      });
    } catch (err: any) {
      console.error('Error fetching report:', err);
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  // Auto-scroll to bottom of timeline
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [reportState.timeline]);

  // Real-time socket — join report room, receive live updates from other actors
  useEffect(() => {
    if (!id) return;
    const socket = socketIO(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket'],
    });
    socket.emit('join_report', id);

    socket.on('new_activity', (event: any) => {
      setReportState(prev => {
        // Avoid duplicates (company already sees its own event via fetchReport below)
        const exists = prev.timeline.some(t => t.id === String(event.id));
        if (exists) return prev;
        return {
          ...prev,
          timeline: [
            ...prev.timeline,
            {
              id: String(event.id || Date.now()),
              type: event.type || 'comment',
              author: event.author || 'Unknown',
              authorAvatar: event.authorAvatar,
              role: event.role || 'Researcher',
              content: event.content || '',
              timestamp: event.timestamp || new Date().toISOString(),
              metadata: event.metadata,
            } as any,
          ],
        };
      });
    });

    socket.on('report_updated', (data: any) => {
      if (data.severity) {
        setReportState(prev => ({
          ...prev,
          severity: {
            ...prev.severity,
            level: data.severity as any,
            score: data.cvssScore ?? prev.severity.score,
            vector: data.cvssVector ?? prev.severity.vector,
          },
        }));
      }
    });

    return () => {
      socket.emit('leave_report', id);
      socket.disconnect();
    };
  }, [id]);

  // --- Post Comment ---
  const handlePostReply = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/company/reports/${id}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to post comment');
      }

      setReplyContent('');
      toast({ title: 'Comment posted' });
      fetchReport(); // Refresh to get the real comment with populated sender
    } catch (err: any) {
      toast({ title: 'Error posting comment', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Status Change (local state only; to persist you'd need a backend endpoint) ---
  const handleStatusChange = (newStatus: ReportStatus) => {
    setReportState(prev => ({
      ...prev,
      status: newStatus,
    }));
    toast({ title: "Status Updated", description: `Report status changed to ${newStatus}` });
  };

  const handleSeverityUpdate = async (vector: string, score: number) => {
      try {
          const token = localStorage.getItem('token');
          const severity = score >= 9 ? 'Critical' : score >= 7 ? 'High' : score >= 4 ? 'Medium' : 'Low';
          const res = await fetch(`${API_URL}/company/reports/${id}/severity`, {
              method: 'PATCH',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ cvssVector: vector, cvssScore: score, severity })
          });
          if (res.ok) {
              // Refresh from server — gets real author name + full content from DB
              await fetchReport();
              toast({ title: 'Severity Updated', description: `New severity: ${severity} (${score})` });
          } else {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || 'Failed to update severity');
          }
      } catch (error: any) {
           console.error('Severity update error:', error);
           toast({ title: 'Error', description: error.message || 'Failed to update severity', variant: 'destructive' });
      }
  };

  const getSeverityColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/50';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/50';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/50';
    }
  };
  const currentSeverityColor = getSeverityColor(reportState.severity.level);

  // --- Loading / Error States ---
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 animate-pulse">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <p className="text-lg font-semibold text-red-500">{error || 'Report not found'}</p>
        <Button variant="outline" onClick={() => navigate('/company/reports')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reports
        </Button>
      </div>
    );
  }

  const researcher = report.researcherId;
  const triager = report.triagerId;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in font-sans">
        {/* MOBILE TABS (Sticky Top) */}
        <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 p-2 mb-4">
            <div className="grid grid-cols-3 gap-2">
                <button 
                    onClick={() => setMobileTab('details')}
                    className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg text-xs font-bold uppercase transition-colors",
                        mobileTab === 'details' ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}
                >
                    <FileText className="w-4 h-4 mb-1" />
                    Details
                </button>
                <button 
                    onClick={() => setMobileTab('activity')}
                    className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg text-xs font-bold uppercase transition-colors",
                        mobileTab === 'activity' ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}
                >
                    <Activity className="w-4 h-4 mb-1" />
                    Activity
                </button>
                <button 
                    onClick={() => setMobileTab('tools')}
                    className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg text-xs font-bold uppercase transition-colors",
                        mobileTab === 'tools' ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}
                >
                    <ShieldAlert className="w-4 h-4 mb-1" />
                    Tools
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 pb-20 flex-1 overflow-y-auto lg:overflow-visible">
            {/* LEFT COLUMN: Report Details & Activity */}
            <div className={cn(
                "lg:col-span-8 flex flex-col gap-6",
                (mobileTab === 'tools') && "hidden lg:flex"
            )}>
                
                {/* DETAILS SECTION */}
                <div className={cn(
                    "flex flex-col gap-6",
                    (mobileTab === 'activity') && "hidden lg:flex"
                )}>
                    {/* Header Card */}
                    <GlassCard className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start xl:items-center justify-between gap-6">
                            <div className="space-y-1 flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                    <Button variant="ghost" size="sm" className="h-6 px-1 -ml-2" onClick={() => navigate('/company/reports')}>
                                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>
                                    <Separator orientation="vertical" className="h-4" />
                                    <span className="font-mono">{report.programId || 'Report'}</span>
                                </div>
                                <h1 className="text-[20px] md:text-2xl font-bold tracking-tight text-foreground break-words leading-tight">{report.title}</h1>
                            </div>
                            <div className="flex gap-2 shrink-0 flex-wrap justify-start lg:justify-end max-w-sm">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    onClick={() => setRejectModalOpen(true)}
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Reject Report
                                </Button>
                                <Button 
                                    size="sm"
                                    className="bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
                                    onClick={() => setResolveModalOpen(true)}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
                                </Button>
                                {String(reportState.status).trim().toLowerCase() === 'resolved' && (
                                    <div className="w-full flex justify-start lg:justify-end mt-1">
                                        <Button 
                                            size="sm"
                                            className="bg-purple-600 text-white hover:bg-purple-700 font-bold w-full sm:w-auto"
                                            onClick={() => setBountyModalOpen(true)}
                                        >
                                            <DollarSign className="w-4 h-4 mr-2" /> 
                                            {Number(reportState.bounty) > 0 ? 'Bounty Awarded' : 'Initiate Bounty'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </GlassCard>

                    {/* Triager Note — show if there's a note or a triager assigned */}
                    {(report.triagerNote || triager) && (
                        <GlassCard className="p-0 border-l-4 border-l-zinc-400 dark:border-l-zinc-600 overflow-hidden">
                            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                    <Brain className="w-4 h-4" /> TRIAGER ASSESSMENT
                                </h3>
                                {triager && (
                                    <Badge variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                                        Verified by {triager.name || triager.username || 'Triager'}
                                    </Badge>
                                )}
                            </div>
                            <div className="p-4 prose prose-sm prose-zinc dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {report.triagerNote || 'No notes provided.'}
                                </ReactMarkdown>
                            </div>
                        </GlassCard>
                    )}

                    {/* Description */}
                    <GlassCard className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-muted-foreground" /> Vulnerability Description
                        </h3>
                        <div className="prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300 break-words" 
                            dangerouslySetInnerHTML={{ __html: report.description || '<em>No description provided.</em>' }} 
                        />
                    </GlassCard>

                    {/* POC */}
                    <GlassCard className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-muted-foreground" /> Steps to Reproduce
                        </h3>
                        <div className="prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-black/20 p-4 rounded-md border border-zinc-200 dark:border-white/5 overflow-x-auto" 
                            dangerouslySetInnerHTML={{ __html: report.pocSteps || '<em>No steps provided.</em>' }} 
                        />
                    </GlassCard>

                    {/* Asset Info */}
                    <GlassCard className="p-6">
                        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-4">Affected Asset</h3>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <ShieldAlert className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <div>
                                <p className="font-mono text-lg font-medium break-all">
                                    {Array.isArray(report.assets) && report.assets.length > 0
                                        ? report.assets[0]
                                        : report.asset || 'Unknown Asset'}
                                </p>
                                <p className="text-xs text-muted-foreground">Reported Target</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* ACTIVITY & CHAT Section */}
                <div className={cn(
                    "flex flex-col",
                    (mobileTab === 'details') && "hidden lg:flex"
                )}>
                    <h3 className="text-lg font-bold text-foreground mb-6">Activity</h3>
                    <div className="pl-2 space-y-6">
                        {/* Timeline Events */}
                        <div className="space-y-6 relative">
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-zinc-200 dark:bg-zinc-800" />
                            {reportState.timeline.length === 0 && (
                                <p className="pl-10 text-sm text-muted-foreground">No activity yet.</p>
                            )}
                            {reportState.timeline.map((event, index) => {
                                const isConsecutive = index > 0 && reportState.timeline[index - 1].author === event.author && event.type !== 'status_change' && reportState.timeline[index - 1].type !== 'status_change';
                                
                                return (
                                <div key={event.id} className="relative pl-10 group">
                                    {!isConsecutive ? (
                                        <div className={cn(
                                            "absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-background flex items-center justify-center font-bold text-[10px] overflow-hidden text-white bg-blue-600 z-10"
                                        )}>
                                            {event.authorAvatar ? (
                                                <img src={event.authorAvatar} alt={event.author} className="w-full h-full object-cover" />
                                            ) : (
                                                event.author[0]?.toUpperCase() || '?'
                                            )}
                                        </div>
                                    ) : (
                                        <div className="absolute left-[10px] top-4 w-3 h-3 rounded-full border-2 border-zinc-300 dark:border-zinc-700 bg-background z-10" />
                                    )}
                                    
                                    <div className="space-y-1 w-full">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {event.role === 'Researcher' ? (
                                                <div className="flex items-center gap-2">
                                                    <HoverCard>
                                                        <HoverCardTrigger asChild>
                                                            <a href={`/h/${event.author}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                                                @{event.author}
                                                            </a>
                                                        </HoverCardTrigger>
                                                        <HoverCardContent className="w-80">
                                                            <div className="flex justify-between space-x-4">
                                                                <Avatar>
                                                                    <AvatarImage src={event.authorAvatar} />
                                                                    <AvatarFallback>{event.author[0]?.toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="space-y-1 flex-1">
                                                                    <h4 className="text-sm font-semibold">@{event.author}</h4>
                                                                    <p className="text-sm text-muted-foreground">Security Researcher</p>
                                                                </div>
                                                            </div>
                                                        </HoverCardContent>
                                                    </HoverCard>
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal">Security Researcher</Badge>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                        {event.role === 'Triager' ? `@${event.author}` : event.author}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-normal">
                                                        {event.role === 'Triager' ? 'Bugchase Triage' : 'Company'}
                                                    </Badge>
                                                </div>
                                            )}
                                            {event.type === 'status_change' && (
                                                <span className="text-zinc-800 dark:text-zinc-200 text-[14px] flex flex-wrap items-center gap-1 font-medium tracking-tight">
                                                     changed the status to {event.metadata?.newStatus?.toLowerCase() || event.content.replace('Changed status to ', '').replace('System changed status to ', '').split('.')[0].toLowerCase()}
                                                </span>
                                            )}
                                            {event.type === 'bounty_awarded' && (
                                                <span className="text-zinc-800 dark:text-zinc-200 text-[14px] flex flex-wrap items-center gap-1 font-medium tracking-tight">
                                                     rewarded {researcher?.username || researcher?.name || 'researcher'} with a ${event.metadata?.bountyAwarded?.toLocaleString()} bounty.
                                                </span>
                                            )}
                                            <span className="text-zinc-400 text-[10px] ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {new Date(event.timestamp).toLocaleString(undefined, {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                                                })}
                                            </span>
                                        </div>

                                        {event.type === 'status_change' ? (
                                            <div className="mt-1 flex flex-col items-start w-full gap-2">
                                                {event.metadata?.reason && (
                                                    <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-lg p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 w-full max-w-[85%] font-inter leading-relaxed relative text-left">
                                                        <div className="relative z-10 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                                                            <div dangerouslySetInnerHTML={{ __html: event.metadata.reason }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : event.type === 'bounty_awarded' ? (
                                            <div className="mt-1 flex flex-col items-start w-full gap-2">
                                                {event.content && (
                                                    <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-lg p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 w-full max-w-[85%] font-inter leading-relaxed relative text-left">
                                                        <div className="relative z-10 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                                                            <div dangerouslySetInnerHTML={{ __html: event.content }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : event.type === 'severity_update' ? (
                                            <div className="flex items-center gap-1 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                <span>updated severity —</span>
                                                <span className="font-bold" dangerouslySetInnerHTML={{ __html: event.content }} />
                                            </div>
                                        ) : (
                                            <div className="mt-1 bg-white dark:bg-zinc-900/50 rounded-xl p-3 px-4 text-sm text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 shadow-sm inline-block max-w-full font-inter leading-relaxed">
                                                <div dangerouslySetInnerHTML={{ __html: event.content }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>

                        {/* Editor Area */}
                        <div className="flex gap-4 pt-4">
                            <div className="h-8 w-8 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs shrink-0 mt-2">CO</div>
                            <div className="flex-1">
                                <div className="rounded-lg bg-white dark:bg-white/5 shadow-sm border border-zinc-200 dark:border-white/10 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-white/20 transition-all overflow-hidden">
                                    <CyberpunkEditor 
                                        content={replyContent}
                                        onChange={setReplyContent}
                                        placeholder="Reply or leave an internal note..."
                                    />
                                    <div className="px-3 py-2 bg-zinc-50 dark:bg-white/5 border-t border-zinc-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-2">
                                        <div className="flex gap-2">
                                            {/* Placeholders for bold/italic/etc if needed later */}
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <Button 
                                                size="sm" 
                                                className="h-7 bg-foreground text-background hover:bg-foreground/90 font-bold text-xs px-4" 
                                                onClick={handlePostReply}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? 'Posting...' : 'Comment'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Sidebar (Sticky) */}
            <div className={cn(
                "lg:col-span-4 h-full relative",
                (mobileTab !== 'tools') && "hidden lg:block"
            )}>
                <div className="sticky top-24 flex flex-col gap-6">
                    {/* Severity & Status */}
                    <GlassCard className="p-5 space-y-6">
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-mono text-muted-foreground uppercase">Severity</label>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs font-mono px-3"
                                    onClick={() => setCvssModalOpen(true)}
                                >
                                    Edit Severity
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <Badge className={cn("w-fit text-lg px-3 py-1 font-bold cursor-pointer", currentSeverityColor)} onClick={() => setCvssModalOpen(true)}>
                                    {reportState.severity.level.toUpperCase()} {reportState.severity.score > 0 ? reportState.severity.score : ''}
                                </Badge>
                                <span className="text-xs font-mono text-zinc-500 break-all">{reportState.severity.vector}</span>
                            </div>
                        </div>
                        <Separator className="bg-zinc-200 dark:bg-white/5" />
                        <div>
                            <label className="text-xs font-mono text-muted-foreground uppercase">Status</label>
                            <div className="mt-2 flex items-center gap-2">
                                <Badge variant="outline" className="h-8 px-3 text-sm border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5">
                                    {reportState.status}
                                </Badge>
                            </div>
                        </div>
                        <Separator className="bg-zinc-200 dark:bg-white/5" />
                        <div>
                            <label className="text-xs font-mono text-muted-foreground uppercase">Researcher</label>
                            <div className="flex items-center gap-3 mt-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs ring-2 ring-white/10 text-white overflow-hidden">
                                    {researcher?.avatar ? (
                                        <img src={researcher.avatar} alt={researcher.username} className="w-full h-full object-cover" />
                                    ) : (
                                        (researcher?.username || researcher?.name || 'R')[0].toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium hover:underline cursor-pointer">@{researcher?.username || researcher?.name || 'Unknown'}</p>
                                    {researcher?.rank && <p className="text-[10px] text-muted-foreground">Rank {researcher.rank}</p>}
                                </div>
                                <Button size="sm" variant="outline" className="h-7 text-xs">Profile</Button>
                            </div>
                        </div>
                        {triager && (
                            <>
                                <Separator className="bg-zinc-200 dark:bg-white/5" />
                                <div>
                                    <label className="text-xs font-mono text-muted-foreground uppercase">Triager</label>
                                    <div className="flex items-center gap-3 mt-3">
                                        <Avatar className="w-8 h-8 rounded-full border-2 border-zinc-200 dark:border-white/10 ring-2 ring-white/10 bg-gradient-to-br from-purple-500 to-pink-600 shadow-sm flex items-center justify-center font-bold text-xs">
                                            <AvatarImage src={triager?.avatar} />
                                            <AvatarFallback className="bg-transparent text-white">
                                                {(triager?.name || triager?.username || 'T')[0].toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{triager?.name || triager?.username}</p>
                                            {triager?.title && <p className="text-[10px] text-muted-foreground">{triager.title}</p>}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </GlassCard>
                </div>
            </div>

            {/* REJECT REPORT MODAL */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="font-mono text-lg">Reject Report</DialogTitle>
                        <DialogDescription>
                            Please select a reason for rejecting this report. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-1">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Rejection Category</label>
                            <Select value={rejectStatus} onValueChange={(val: ReportStatus) => {
                                setRejectStatus(val);
                                setSelectedReason('');
                                setCustomReason('');
                            }}>
                                <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                    <SelectValue placeholder="Select a status category..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                    <SelectItem value="Spam">Spam</SelectItem>
                                    <SelectItem value="Duplicate">Duplicate</SelectItem>
                                    <SelectItem value="Out-of-Scope">Out-of-Scope</SelectItem>
                                    <SelectItem value="NA">Not Applicable (NA)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Specific Reason</label>
                            <Select value={selectedReason} onValueChange={setSelectedReason} disabled={!rejectStatus}>
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
                                <div className="rounded-lg bg-white dark:bg-zinc-950 shadow-sm border border-zinc-200 dark:border-zinc-800 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-white/20 transition-all overflow-hidden">
                                     <CyberpunkEditor 
                                         content={customReason}
                                         onChange={setCustomReason}
                                         placeholder="Provide specific details for the rejection..."
                                     />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="shrink-0 mt-4">
                        <Button variant="ghost" onClick={() => setRejectModalOpen(false)} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">CANCEL</Button>
                        <Button 
                            onClick={() => handleCompanyAction(rejectStatus, selectedReason === 'Other' ? customReason : selectedReason)}
                            disabled={!selectedReason || (selectedReason === "Other" && !customReason.trim())}
                            className="bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold"
                        >
                            CONFIRM REJECTION
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* RESOLVE REPORT MODAL */}
            <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
                <DialogContent className="max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="font-mono text-lg flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            Mark Report as Resolved
                        </DialogTitle>
                        <DialogDescription>
                            Confirm that the reported vulnerability has been fully remediated. You will have the option to reward a bounty after resolving.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4 flex-1">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Closing Reason</label>
                            <Select value={selectedResolveReason} onValueChange={setSelectedResolveReason}>
                                <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                    <SelectValue placeholder="Select a closing message..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                    <SelectItem value="AI">✨ Generate with AI</SelectItem>
                                    {RESOLVE_REASONS.map((r) => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {(selectedResolveReason === "Other" || selectedResolveReason === "AI" || selectedResolveReason === "") && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Custom Message to Researcher</label>
                                    {selectedResolveReason === "AI" && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-6 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                            onClick={() => handleGenerateMessage('resolve')}
                                            disabled={isGeneratingContent}
                                        >
                                            {isGeneratingContent ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                                    Generating...
                                                </span>
                                            ) : (
                                                <><Sparkles className="w-3 h-3 mr-1" /> Generate Output</>
                                            )}
                                        </Button>
                                    )}
                                </div>
                                <div className="rounded-lg bg-white dark:bg-zinc-950 shadow-sm border border-zinc-200 dark:border-zinc-800 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-white/20 transition-all overflow-hidden">
                                     <CyberpunkEditor 
                                         content={resolveMessage}
                                         onChange={setResolveMessage}
                                         placeholder="We have released a patch! Thank you for the submission..."
                                     />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="shrink-0 mt-4">
                        <Button variant="ghost" onClick={() => setResolveModalOpen(false)} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">CANCEL</Button>
                        <Button 
                            onClick={async () => {
                                const msg = selectedResolveReason === 'Other' || selectedResolveReason === 'AI' || selectedResolveReason === '' ? resolveMessage : selectedResolveReason;
                                await handleCompanyAction('Resolved', msg || 'Issue has been successfully resolved by the team.');
                            }}
                            disabled={!selectedResolveReason || ((selectedResolveReason === "Other" || selectedResolveReason === "AI" || selectedResolveReason === "") && !resolveMessage.trim())}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold"
                        >
                            RESOLVE REPORT
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* BOUNTY MODAL */}
            <Dialog open={bountyModalOpen} onOpenChange={setBountyModalOpen}>
                <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 flex flex-col md:max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="font-mono text-lg flex items-center gap-2">
                            <DollarSign className="w-6 h-6 text-green-500" />
                            Initiate Bounty
                        </DialogTitle>
                        <DialogDescription>
                            Assign a monetary reward to {researcher?.username || 'the researcher'} for this resolved report.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4 flex-1">
                        {/* Bounty Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase flex items-center justify-between">
                                Bounty Amount (USD)
                                {rewardRange && (
                                    <span className="text-zinc-400 font-mono">
                                        Limit: ${rewardRange.min} - ${rewardRange.max}
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder="0"
                                    className="pl-10 text-lg font-mono bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                    value={bountyAmount}
                                    onChange={(e) => setBountyAmount(e.target.value ? Number(e.target.value) : '')}
                                    min={rewardRange?.min || 0}
                                    max={rewardRange?.max || undefined}
                                />
                            </div>
                        </div>

                        {/* AI Suggestion Area */}
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    <Brain className="w-4 h-4 text-purple-500" />
                                    AI Bounty Suggestion
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 border-purple-200 dark:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                                    onClick={handleSuggestBounty}
                                    disabled={aiSuggestionLoading}
                                >
                                    {aiSuggestionLoading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                                            Analyzing...
                                        </span>
                                    ) : (
                                        "Suggest Amount"
                                    )}
                                </Button>
                            </div>
                            
                            {aiReasoning && (
                                <div className="text-sm text-zinc-600 dark:text-zinc-400 p-3 bg-white dark:bg-black/20 rounded-md border border-zinc-100 dark:border-white/5 animate-in fade-in slide-in-from-top-1">
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Reasoning:</p>
                                    <p>{aiReasoning}</p>
                                </div>
                            )}
                        </div>

                        {/* Thank you note */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Message to Researcher</label>
                                <Select value={selectedBountyMessage} onValueChange={setSelectedBountyMessage}>
                                    <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                        <SelectValue placeholder="Select a message..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                        <SelectItem value="AI">✨ Generate with AI</SelectItem>
                                        {BOUNTY_MESSAGES.map((r) => (
                                            <SelectItem key={r} value={r}>{r}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {(selectedBountyMessage === "Other" || selectedBountyMessage === "AI" || selectedBountyMessage === "") && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-zinc-500 uppercase">Custom Message</label>
                                        {selectedBountyMessage === "AI" && (
                                        <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-6 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                                onClick={() => handleGenerateMessage('bounty')}
                                                disabled={isGeneratingContent}
                                            >
                                                {isGeneratingContent ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                                        Generating...
                                                    </span>
                                                ) : (
                                                    <><Sparkles className="w-3 h-3 mr-1" /> Generate Output</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                    <div className="rounded-lg bg-white dark:bg-zinc-950 shadow-sm border border-zinc-200 dark:border-zinc-800 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-white/20 transition-all overflow-hidden">
                                         <CyberpunkEditor 
                                             content={replyContent}
                                             onChange={setReplyContent}
                                             placeholder={`A thank you message to ${researcher?.name || researcher?.username || 'the researcher'}`}
                                         />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="shrink-0 mt-4">
                        <Button variant="ghost" onClick={() => setBountyModalOpen(false)} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">CANCEL</Button>
                        <Button 
                            onClick={async () => {
                                const payloadContent = selectedBountyMessage === 'Other' || selectedBountyMessage === 'AI' || selectedBountyMessage === '' ? replyContent : selectedBountyMessage;
                                // Need to modify handleAwardBounty to accept argument? 
                                // Actually handleAwardBounty reads replyContent.
                                // I will intercept it here to make sure it includes the right payload.
                                // Instead of rewriting handleAwardBounty, let's just make handleAwardBounty use this value. 
                                // Actually, handleAwardBounty already uses replyContent. Let's make sure it's updated. Wait, I will fix handleAwardBounty directly next. Let's just keep this as is and we'll apply a quick `setReplyContent` inside the `handleAwardBounty` or just let `handleAwardBounty` read a separate variable. Let's just manually call handleAwardBounty() but we must ensure replyContent is updated. 
                                // Ah! If they just select a pre-defined message, `replyContent` won't be updated automatically.
                                // Let's pass the payload directly or just call `handleAwardBounty(selectedBountyMessage === ... ? replyContent : selectedBountyMessage)`
                                await handleAwardBounty(selectedBountyMessage === 'Other' || selectedBountyMessage === 'AI' || selectedBountyMessage === '' ? replyContent : selectedBountyMessage);
                            }}
                            disabled={isSubmitting || !bountyAmount || Number(bountyAmount) <= 0 || ((selectedBountyMessage === "Other" || selectedBountyMessage === "AI" || selectedBountyMessage === "") && !replyContent.trim())}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            {isSubmitting ? 'AWARDING...' : 'AWARD BOUNTY'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CvssInteractiveModal 
                isOpen={cvssModalOpen}
                onClose={() => setCvssModalOpen(false)}
                aiVector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" 
                researcherVector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N"
                currentVector={reportState.severity.vector || "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N"}
                onSave={handleSeverityUpdate}
            />

        </div>
    </div>
  );
}
