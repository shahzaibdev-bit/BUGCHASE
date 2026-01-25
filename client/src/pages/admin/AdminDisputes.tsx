import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle, Clock, CheckCircle, XCircle, MessageSquare, User, Building2, Eye, FileText, Send } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    resolution: 'In favor of company - confirmed test environment',
  },
];

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  open: { label: 'Open', icon: <AlertCircle className="h-4 w-4" />, color: 'text-yellow-500 bg-yellow-500/10' },
  in_review: { label: 'In Review', icon: <Clock className="h-4 w-4" />, color: 'text-primary bg-primary/10' },
  resolved: { label: 'Resolved', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500 bg-green-500/10' },
  closed: { label: 'Closed', icon: <XCircle className="h-4 w-4" />, color: 'text-muted-foreground bg-foreground/10' },
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

export default function AdminDisputes() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeDispute, setActiveDispute] = useState<any | null>(null);
  const [commentingDispute, setCommentingDispute] = useState<any | null>(null);
  const [commentText, setCommentText] = useState('');

  const filteredDisputes = mockDisputes.filter(dispute => {
    const matchesSearch = dispute.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dispute.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    toast.success("Comment added successfully");
    setCommentingDispute(null);
    setCommentText("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-mono">Disputes</h1>
        <p className="text-muted-foreground text-sm">Manage and resolve platform disputes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InvertedTiltCard>
          <InverseSpotlightCard className="p-4 text-center border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-[#090909] rounded-xl transition-colors">
            <p className="text-2xl font-bold font-mono text-yellow-500">
              {mockDisputes.filter(d => d.status === 'open').length}
            </p>
            <p className="text-sm text-muted-foreground">Open</p>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-4 text-center border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-[#090909] rounded-xl transition-colors">
            <p className="text-2xl font-bold font-mono text-primary">
              {mockDisputes.filter(d => d.status === 'in_review').length}
            </p>
            <p className="text-sm text-muted-foreground">In Review</p>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-4 text-center border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-[#090909] rounded-xl transition-colors">
            <p className="text-2xl font-bold font-mono text-green-500">
              {mockDisputes.filter(d => d.status === 'resolved').length}
            </p>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="p-4 text-center border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-[#090909] rounded-xl transition-colors">
            <p className="text-2xl font-bold font-mono text-foreground">{mockDisputes.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </InverseSpotlightCard>
        </InvertedTiltCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search disputes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Disputes List */}
      <div className="space-y-4">
        {filteredDisputes.map((dispute) => (
          <GlassCard key={dispute.id} className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main Info */}
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-primary text-sm">{dispute.id}</span>
                      <Badge variant="outline" className={priorityColors[dispute.priority]}>{dispute.priority}</Badge>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig[dispute.status].color}`}>
                        {statusConfig[dispute.status].icon}
                        {statusConfig[dispute.status].label}
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground">{dispute.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Report: <span className="font-mono text-primary">{dispute.reportId}</span>
                    </p>
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-foreground">Researcher</span>
                    </div>
                    <p className="font-mono text-sm text-foreground">@{dispute.researcher}</p>
                    <p className="text-xs text-muted-foreground mt-1">"{dispute.researcherClaim}"</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-foreground">Company</span>
                    </div>
                    <p className="font-mono text-sm text-foreground">{dispute.company}</p>
                    <p className="text-xs text-muted-foreground mt-1">"{dispute.companyClaim}"</p>
                  </div>
                </div>

                {dispute.resolution && (
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="text-sm text-green-500 font-medium">Resolution:</p>
                    <p className="text-sm text-muted-foreground">{dispute.resolution}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 lg:w-48">
                <Button 
                    className="w-full gap-2"
                    onClick={() => navigate(`/admin/disputes/${dispute.id}`)}
                >
                  <Eye className="h-4 w-4" />
                  Review Details
                </Button>
                <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setCommentingDispute(dispute)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Add Comment
                </Button>
                <div className="text-xs text-muted-foreground mt-2">
                  <p>Created: {dispute.createdAt}</p>
                  <p>Updated: {dispute.lastUpdate}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Review Details Sheet */}
      <Sheet open={!!activeDispute} onOpenChange={() => setActiveDispute(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader className="mb-6">
                <SheetTitle className="text-xl font-mono text-primary flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {activeDispute?.id} Details
                </SheetTitle>
                <SheetDescription>
                    Reviewing dispute between <span className="text-foreground font-medium">@{activeDispute?.researcher}</span> and <span className="text-foreground font-medium">{activeDispute?.company}</span>.
                </SheetDescription>
            </SheetHeader>

            {activeDispute && (
                <div className="space-y-6">
                    {/* Status Overview */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className={priorityColors[activeDispute.priority]}>{activeDispute.priority}</Badge>
                                <span className="capitalize text-sm font-medium">{activeDispute.status.replace('_', ' ')}</span>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-muted-foreground uppercase tracking-wider">Report ID</p>
                             <p className="text-sm font-mono text-primary">{activeDispute.reportId}</p>
                        </div>
                    </div>

                    {/* Claims Timeline */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Dispute Timeline
                        </h3>
                        <div className="relative pl-6 border-l-2 border-border space-y-8">
                            {/* Company Claim */}
                            <div className="relative">
                                <div className="absolute -left-[29px] top-0 p-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                                    <Building2 className="h-3 w-3 text-purple-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">{activeDispute.company} stated:</p>
                                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md italic">
                                        "{activeDispute.companyClaim}"
                                    </p>
                                    <span className="text-xs text-muted-foreground">2 days ago</span>
                                </div>
                            </div>

                             {/* Researcher Claim */}
                             <div className="relative">
                                <div className="absolute -left-[29px] top-0 p-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                                    <User className="h-3 w-3 text-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">@{activeDispute.researcher} replied:</p>
                                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md italic">
                                        "{activeDispute.researcherClaim}"
                                    </p>
                                    <span className="text-xs text-muted-foreground">1 day ago</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Evidence Section (Mock) */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Submitted Evidence
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                             <div className="p-3 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer text-center">
                                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-xs font-medium">server_logs.txt</p>
                             </div>
                             <div className="p-3 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer text-center">
                                <Eye className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-xs font-medium">poc_video.mp4</p>
                             </div>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-border">
                        <Button className="w-full">Open Full Arbitration Interface</Button>
                    </div>
                </div>
            )}
        </SheetContent>
      </Sheet>

      {/* Comment Dialog */}
      <Dialog open={!!commentingDispute} onOpenChange={() => setCommentingDispute(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add Internal Comment</DialogTitle>
                <DialogDescription>
                    Add a private note to dispute <span className="font-mono text-primary">{commentingDispute?.id}</span>. This will be visible to other admins only.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Textarea 
                    placeholder="Type your comment here..." 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[100px]"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setCommentingDispute(null)}>Cancel</Button>
                <Button onClick={handleSubmitComment} disabled={!commentText.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
