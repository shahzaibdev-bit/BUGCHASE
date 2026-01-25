import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Building2, 
  FileText, 
  Eye, 
  MessageSquare, 
  ShieldAlert,
  Gavel,
  History,
  Download,
  Send
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'sonner';

// Using the same mock data structure for consistency
const mockDisputes = [
  {
    id: 'DSP-001',
    reportId: 'RPT-045',
    title: 'Severity Disagreement - SQL Injection',
    researcher: 'elite_hacker',
    company: 'TechCorp Inc.',
    status: 'open',
    priority: 'high',
    createdAt: '2024-03-15',
    lastUpdate: '2 hours ago',
    researcherClaim: 'Critical severity - full database access',
    companyClaim: 'Medium severity - limited scope',
    description: "The researcher claims to have found a SQL Injection vulnerability that allows for full database dump, fulfilling the criteria for Critical severity. The company argues that the database is a read-only replica with non-PII data, thus limiting the impact to Medium.",
    timeline: [
        { id: 1, type: 'claim', author: 'TechCorp Inc.', role: 'company', content: 'We acknowledge the SQLi but this database is a sanboxed replica. No customer data is at risk.', date: '2 days ago' },
        { id: 2, type: 'claim', author: 'elite_hacker', role: 'researcher', content: 'I was able to extract admin hashes from the replica which work on production. See attached proof.', date: '1 day ago' },
        { id: 3, type: 'system', content: 'Dispute escalated to Admin Review', date: '5 hours ago' }
    ]
  },
  {
    id: 'DSP-002',
    reportId: 'RPT-052',
    title: 'Bounty Amount Dispute',
    researcher: 'bug_hunter_pro',
    company: 'SecureTech Ltd.',
    status: 'in_review',
    priority: 'medium',
    createdAt: '2024-03-14',
    lastUpdate: '1 day ago',
    researcherClaim: 'Expected $5000 based on reward table',
    companyClaim: 'Duplicate of previous report',
    description: "Dispute regarding payout amount.",
    timeline: []
  },
  {
      id: 'DSP-003',
      reportId: 'RPT-061',
      title: 'Report Rejection Appeal',
      researcher: 'security_researcher',
      company: 'DevCorp',
      status: 'resolved',
      priority: 'low',
      createdAt: '2024-03-10',
      lastUpdate: '3 days ago',
      researcherClaim: 'Valid vulnerability in production',
      companyClaim: 'Out of scope - test environment only',
      description: "Appeal against report rejection.",
      timeline: []
  }
];

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  open: { label: 'Open', icon: <AlertCircle className="h-4 w-4" />, color: 'text-yellow-500 bg-yellow-500/10' },
  in_review: { label: 'In Review', icon: <Clock className="h-4 w-4" />, color: 'text-primary bg-primary/10' },
  resolved: { label: 'Resolved', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500 bg-green-500/10' },
  closed: { label: 'Closed', icon: <XCircle className="h-4 w-4" />, color: 'text-muted-foreground bg-foreground/10' },
};

export default function AdminDisputeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispute = mockDisputes.find(d => d.id === id);

  const handleSuspendReport = () => {
    toast.error(`Report ${dispute?.reportId} suspended pending review`, {
        description: "Researcher and Company have been notified."
    });
  };

  const handleOpenArbitration = () => {
      toast.success("Arbitration Channel Opened", {
          description: "Both parties can now submit additional evidence."
      });
  };

  const handleResolve = (winner: 'researcher' | 'company') => {
      const winnerName = winner === 'researcher' ? dispute?.researcher : dispute?.company;
      toast.success(`Dispute resolved in favor of ${winner === 'researcher' ? 'Researcher' : 'Company'}`, {
          description: `Decision recorded. Automation will process the outcome for ${winnerName}.`
      });
  };

  const handleRequestInfo = () => {
      toast.info("Information Request Sent", {
          description: "Both parties have been asked to provide more context."
      });
  };

  if (!dispute) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <h2 className="text-2xl font-bold font-mono">Dispute Not Found</h2>
            <p className="text-muted-foreground">The dispute ID {id} does not exist.</p>
            <Button onClick={() => navigate('/admin/disputes')}>Return to List</Button>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button 
            variant="ghost" 
            className="w-fit pl-0 hover:bg-transparent hover:text-primary transition-colors"
            onClick={() => navigate('/admin/disputes')}
        >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Disputes
        </Button>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-primary text-lg font-bold">{dispute.id}</span>
                    <Badge variant="outline" className={priorityColors[dispute.priority]}>{dispute.priority.toUpperCase()}</Badge>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig[dispute.status].color}`}>
                        {statusConfig[dispute.status].icon}
                        {statusConfig[dispute.status].label}
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">{dispute.title}</h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                    Related Report: <span className="font-mono text-primary cursor-pointer hover:underline">{dispute.reportId}</span>
                </p>
            </div>
            
            <div className="flex gap-3">
                 <Button variant="outline" className="gap-2" onClick={handleSuspendReport}>
                    <ShieldAlert className="h-4 w-4" />
                    Suspend Report
                 </Button>
                 <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleOpenArbitration}>
                    <Gavel className="h-4 w-4" />
                    Open Arbitration
                 </Button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Overview Card */}
            <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#090909] rounded-xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    Dispute Overview
                </h3>
                <p className="text-foreground/80 leading-relaxed mb-6">
                    {dispute.description}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <div className="flex items-center gap-2 mb-3">
                            <User className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-bold text-blue-500 uppercase tracking-wider">Researcher Claim</span>
                        </div>
                        <p className="text-sm italic text-foreground/90">"{dispute.researcherClaim}"</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                            <div className="flex items-center gap-2 mb-3">
                            <Building2 className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-bold text-purple-500 uppercase tracking-wider">Company Claim</span>
                        </div>
                        <p className="text-sm italic text-foreground/90">"{dispute.companyClaim}"</p>
                    </div>
                </div>
            </InverseSpotlightCard>

            {/* Timeline / Activity Feed */}
            <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <History className="h-5 w-5 text-foreground" />
                    Activity Timeline
                </h3>
                
                <div className="space-y-6">
                     {dispute.timeline.map((item, idx) => {
                         const isResearcher = item.role === 'researcher';
                         const isSystem = item.type === 'system';
                         
                         if (isSystem) {
                             return (
                                 <div key={idx} className="flex justify-center my-4">
                                     <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
                                         <AlertCircle className="h-3 w-3" />
                                         <span className="font-medium">{item.content}</span>
                                         <span className="opacity-50 mx-1">•</span>
                                         <span className="opacity-70">{item.date}</span>
                                     </div>
                                 </div>
                             );
                         }

                         return (
                             <div key={idx} className={`flex gap-4 ${isResearcher ? '' : 'flex-row-reverse'}`}>
                                 <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                    <AvatarFallback className={isResearcher ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}>
                                        {isResearcher ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                                    </AvatarFallback>
                                 </Avatar>
                                 
                                 <div className={`flex flex-col max-w-[80%] ${isResearcher ? 'items-start' : 'items-end'}`}>
                                     <div className="flex items-center gap-2 mb-1">
                                         <span className="text-sm font-semibold text-foreground">{item.author}</span>
                                         <span className="text-xs text-muted-foreground">{item.date}</span>
                                     </div>
                                     <div className={`p-4 rounded-2xl shadow-sm border text-sm leading-relaxed
                                         ${isResearcher 
                                             ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-tl-none' 
                                             : 'bg-primary/5 border-primary/20 text-foreground rounded-tr-none'
                                         }`}
                                     >
                                        {item.content}
                                     </div>
                                 </div>
                             </div>
                         );
                     })}
                </div>

                {/* Reply Box */}
                <div className="mt-8 pt-6 border-t border-border">
                     <div className="relative">
                        <Textarea placeholder="Add an internal note or reply to dispute..." className="min-h-[100px] resize-y bg-transparent" />
                        <div className="absolute bottom-3 right-3 flex gap-2">
                            <Button size="sm" variant="ghost">Internal Note</Button>
                            <Button size="sm" className="gap-2">
                                <Send className="h-3 w-3" />
                                Post Reply
                            </Button>
                        </div>
                     </div>
                </div>
            </GlassCard>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
            {/* Involved Parties */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Involved Parties</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-medium text-foreground">@{dispute.researcher}</p>
                            <p className="text-xs text-muted-foreground">Researcher • Level 4</p>
                        </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-medium text-foreground">{dispute.company}</p>
                            <p className="text-xs text-muted-foreground">Enterprise • Verified</p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Evidence Files */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Evidence</h3>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-primary" />
                            <div className="text-sm">
                                <p className="font-medium text-foreground group-hover:underline">server_logs.txt</p>
                                <p className="text-xs text-muted-foreground">12KB • Text</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <Eye className="h-4 w-4 text-primary" />
                            <div className="text-sm">
                                <p className="font-medium text-foreground group-hover:underline">poc_video.mp4</p>
                                <p className="text-xs text-muted-foreground">5.2MB • Video</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                 </div>
            </GlassCard>
            
            {/* Quick Actions */}
             <GlassCard className="p-6">
                 <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Admin Actions</h3>
                 <div className="space-y-2">
                     <Button 
                        variant="outline" 
                        className="w-full justify-start text-green-500 hover:text-green-600 hover:bg-green-500/10 border-green-500/20"
                        onClick={() => handleResolve('researcher')}
                     >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve for Researcher
                     </Button>
                     <Button 
                        variant="outline" 
                        className="w-full justify-start text-purple-500 hover:text-purple-600 hover:bg-purple-500/10 border-purple-500/20"
                        onClick={() => handleResolve('company')}
                    >
                        <Building2 className="h-4 w-4 mr-2" />
                        Resolve for Company
                     </Button>
                     <Button 
                        variant="outline" 
                        className="w-full justify-start text-muted-foreground"
                        onClick={handleRequestInfo}
                    >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Request More Info
                     </Button>
                 </div>
             </GlassCard>
        </div>
      </div>
    </div>
  );
}
