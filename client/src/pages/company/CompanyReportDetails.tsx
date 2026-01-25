import React, { useState, useEffect, useRef } from 'react';
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
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';
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
import { cn } from '@/lib/utils';

// --- Types ---
type ReportStatus = 'Submitted' | 'Under Review' | 'Needs Info' | 'Triaged' | 'Spam' | 'Duplicate' | 'Out-of-Scope' | 'Resolved';

interface TimelineEvent {
  id: string;
  type: 'comment' | 'status_change' | 'action';
  author: string;
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

// --- Mock Data ---
const MOCK_REPORT_DETAILS = {
  id: 'RPT-001',
  title: 'SQL Injection in Login Form',
  description: '<p>A <strong>SQL Injection</strong> vulnerability exists in the login form of the application. The <code>username</code> parameter is not properly sanitized, allowing an attacker to inject arbitrary SQL commands.</p>',
  stepsToReproduce: '<ol><li>Navigate to <code>/login</code></li><li>Enter <code>admin\' OR \'1\'=\'1</code> in the username field.</li><li>Enter any password.</li><li>Click Login.</li><li>Observe that you are logged in as admin.</li></ol>',
  program: 'Web Application Security',
  asset: 'auth.techsoft.pk',
  researcher: {
      username: 'h4ck3r_one',
      rank: 42,
      avatar: '/avatars/hacker.png'
  },
  triager: {
      name: 'Sarah Jenkins',
      title: 'Senior Security Analyst',
      notes: 'Confirmed SQLi via blind boolean injection. Impact is critical as it allows full authentication bypass and potential DB dump.'
  },
  submittedAt: '2024-03-15T10:30:00Z',
};

const INITIAL_TIMELINE: TimelineEvent[] = [
  {
      id: '1',
      type: 'comment',
      author: 'h4ck3r_one',
      role: 'Researcher',
      content: 'Found this while testing the new auth flow.',
      timestamp: '2024-03-15T10:35:00Z'
  },
  {
      id: '2',
      type: 'status_change',
      author: 'Sarah Jenkins',
      role: 'Triager',
      content: 'changed status to Under Review',
      timestamp: '2024-03-15T11:00:00Z'
  },
  {
      id: '3',
      type: 'comment',
      author: 'Sarah Jenkins',
      role: 'Triager',
      content: 'Nice find! I was able to reproduce this. Escalating to the company.',
      timestamp: '2024-03-15T11:45:00Z'
  },
  {
      id: '4',
      type: 'status_change',
      author: 'Sarah Jenkins',
      role: 'Triager',
      content: 'changed status to Triaged',
      timestamp: '2024-03-15T11:46:00Z'
  }
];

export default function CompanyReportDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [reportState, setReportState] = useState<ReportState>({
    status: 'Triaged',
    severity: {
        score: 9.8,
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        level: 'Critical'
    },
    timeline: INITIAL_TIMELINE,
    isLocked: false,
    bounty: 0
  });
  
  const [mobileTab, setMobileTab] = useState<'details' | 'activity' | 'tools'>('details');
  const [replyContent, setReplyContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of timeline
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [reportState.timeline]);

  const handlePostReply = () => {
      if (!replyContent.trim()) return;

      const newEvent: TimelineEvent = {
          id: Date.now().toString(),
          type: 'comment',
          author: 'Company Admin', // Mock current user
          role: 'Company',
          content: replyContent,
          timestamp: new Date().toISOString()
      };

      setReportState(prev => ({
          ...prev,
          timeline: [...prev.timeline, newEvent]
      }));
      setReplyContent('');
  };

  const handleStatusChange = (newStatus: ReportStatus) => {
      const newEvent: TimelineEvent = {
          id: Date.now().toString(),
          type: 'status_change',
          author: 'Company Admin',
          role: 'Company',
          content: `changed status to ${newStatus}`,
          timestamp: new Date().toISOString()
      };

      setReportState(prev => ({
          ...prev,
          status: newStatus,
          timeline: [...prev.timeline, newEvent]
      }));
      toast({ title: "Status Updated", description: `Report status changed to ${newStatus}` });
  };

  const currentSeverityColor = {
      Critical: 'bg-red-500/10 text-red-500 border-red-500/50',
      High: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
      Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
      Low: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
      Info: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/50',
  }[reportState.severity.level];

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
            {/* Visible on Mobile if 'details' OR 'activity' selected. Always visible on Desktop. */}
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
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                    <Button variant="ghost" size="sm" className="h-6 px-1 -ml-2" onClick={() => navigate('/company/reports')}>
                                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>
                                    <Separator orientation="vertical" className="h-4" />
                                    <span className="font-mono">{MOCK_REPORT_DETAILS.program}</span>
                                    <span className="text-zinc-600">/</span>
                                    <span className="font-mono">{MOCK_REPORT_DETAILS.id}</span>
                                </div>
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground break-words">{MOCK_REPORT_DETAILS.title}</h1>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {reportState.isLocked ? (
                                    <Button variant="outline" size="sm" className="border-red-500/50 text-red-500 bg-red-50/50 dark:bg-red-500/5">
                                        <Lock className="w-4 h-4 mr-2" /> Locked
                                    </Button>
                                ) : (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline"><MoreVertical className="w-4 h-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem><Lock className="w-4 h-4 mr-2" /> Lock Report</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive"><XCircle className="w-4 h-4 mr-2" /> Reject Report</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    <CheckCircle className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Mark Resolved</span>
                                </Button>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Triager Note */}
                    <GlassCard className="p-0 border-l-4 border-l-purple-500 overflow-hidden bg-purple-50 dark:bg-purple-500/5">
                        <div className="p-4 border-b border-purple-100 dark:border-purple-500/20 bg-purple-100/50 dark:bg-purple-500/10 flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                <Brain className="w-4 h-4" /> TRIAGER ASSESSMENT
                            </h3>
                            <Badge variant="outline" className="border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 font-mono text-xs">
                                Verified by {MOCK_REPORT_DETAILS.triager.name}
                            </Badge>
                        </div>
                        <div className="p-4 text-sm text-zinc-700 dark:text-zinc-300">
                            {MOCK_REPORT_DETAILS.triager.notes}
                        </div>
                    </GlassCard>

                    {/* Description */}
                    <GlassCard className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-muted-foreground" /> Vulnerability Description
                        </h3>
                        <div className="prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300 break-words" 
                            dangerouslySetInnerHTML={{ __html: MOCK_REPORT_DETAILS.description }} 
                        />
                    </GlassCard>

                    {/* POC */}
                    <GlassCard className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-muted-foreground" /> Steps to Reproduce
                        </h3>
                        <div className="prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-black/20 p-4 rounded-md border border-zinc-200 dark:border-white/5 overflow-x-auto" 
                            dangerouslySetInnerHTML={{ __html: MOCK_REPORT_DETAILS.stepsToReproduce }} 
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
                                <p className="font-mono text-lg font-medium break-all">{MOCK_REPORT_DETAILS.asset}</p>
                                <p className="text-xs text-muted-foreground">Verified Ownership</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* ACTIVITY & CHAT Section */}
                {/* Visible on Mobile if 'activity' selected. Always visible on Desktop. */}
                <div className={cn(
                    "flex flex-col",
                    (mobileTab === 'details') && "hidden lg:flex"
                )}>
                    <h3 className="text-lg font-bold text-foreground mb-6">Activity</h3>
                    <div className="pl-2 space-y-6">
                        {/* Timeline Events */}
                        <div className="space-y-6 relative">
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-zinc-200 dark:bg-zinc-800" />
                            {reportState.timeline.map((event) => (
                                <div key={event.id} className="relative pl-10">
                                    <div className={cn(
                                        "absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-background flex items-center justify-center font-bold text-[10px]",
                                        event.role === 'Researcher' ? "bg-indigo-500 text-white" : 
                                        event.role === 'Triager' ? "bg-purple-500 text-white" : "bg-emerald-500 text-black"
                                    )}>
                                        {event.author[0].toUpperCase()}
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-foreground">{event.author}</span>
                                            <span className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>

                                        {event.type === 'status_change' ? (
                                            <p className="text-sm text-muted-foreground italic">{event.content}</p>
                                        ) : (
                                            <div className="bg-white dark:bg-white/5 rounded-lg p-4 text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/5 shadow-sm">
                                                {event.content}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
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
                                            <Select onValueChange={(v) => handleStatusChange(v as ReportStatus)} value={reportState.status}>
                                                <SelectTrigger className="h-7 text-xs w-full sm:w-[140px] bg-background border-zinc-200 dark:border-white/10">
                                                    <SelectValue placeholder="Change Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Triaged">Triaged</SelectItem>
                                                    <SelectItem value="Needs Info">Needs Info</SelectItem>
                                                    <SelectItem value="Spam">Spam</SelectItem>
                                                    <SelectItem value="Resolved">Resolved</SelectItem>
                                                    <SelectItem value="Duplicate">Duplicate</SelectItem>
                                                    <SelectItem value="Out-of-Scope">Out-of-Scope</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button size="sm" className="h-7 bg-foreground text-background hover:bg-foreground/90 font-bold text-xs px-4" onClick={handlePostReply}>
                                                Comment
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
            {/* Visible on Mobile ONLY if 'tools' selected. Always visible on Desktop. */}
            <div className={cn(
                "lg:col-span-4 h-full relative",
                (mobileTab !== 'tools') && "hidden lg:block"
            )}>
                <div className="sticky top-24 flex flex-col gap-6">
                    {/* Severity & Status */}
                    <GlassCard className="p-5 space-y-6">
                        <div>
                            <label className="text-xs font-mono text-muted-foreground uppercase">Severity</label>
                            <div className="flex flex-col gap-2 mt-2">
                                <Badge className={cn("w-fit text-lg px-3 py-1 font-bold", currentSeverityColor)}>
                                    {reportState.severity.level.toUpperCase()} {reportState.severity.score}
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
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs ring-2 ring-white/10">
                                    {MOCK_REPORT_DETAILS.researcher.username[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium hover:underline cursor-pointer">@{MOCK_REPORT_DETAILS.researcher.username}</p>
                                    <p className="text-[10px] text-muted-foreground">Rank {MOCK_REPORT_DETAILS.researcher.rank}</p>
                                </div>
                                <Button size="sm" variant="outline" className="h-7 text-xs">Profile</Button>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    </div>
  );
}
