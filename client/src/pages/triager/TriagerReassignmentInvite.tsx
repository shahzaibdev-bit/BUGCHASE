import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_URL } from '@/config';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Lock, Clock, ArrowLeft, Scale } from 'lucide-react';
import { ReportTimelineNode } from '@/components/reports/ReportTimelineNode';
import type { ReportTimelineEvent } from '@/components/reports/ReportTimelineNode';
import { cn } from '@/lib/utils';

type InvitePayload = {
  invite: any;
  dispute: any;
  report: any;
  expired: boolean;
  canRespond: boolean;
  isInvitee: boolean;
};

function getActorThreadKey(event: ReportTimelineEvent) {
  if (event.authorAvatar && event.authorAvatar !== 'default.jpg') return `avatar:${event.authorAvatar}`;
  return `author:${(event.author || '').trim().toLowerCase()}`;
}

function buildTimeline(report: any): ReportTimelineEvent[] {
  const comments: ReportTimelineEvent[] = (report.comments || []).map((c: any) => ({
    id: c._id,
    type: c.type || 'comment',
    author: c.sender?.username || c.sender?.name || 'User',
    authorAvatar: c.sender?.avatar,
    role:
      c.metadata?.systemAction || c.metadata?.kind?.includes('dispute')
        ? 'System'
        : c.sender?.role === 'triager'
          ? 'Triager'
          : c.sender?.role === 'company'
            ? 'Company'
            : c.sender?.role === 'admin'
              ? 'Admin'
              : 'Researcher',
    content: c.content,
    attachments: c.attachments || [],
    timestamp: c.createdAt,
    metadata: c.metadata }));

  const submissionEvent: ReportTimelineEvent = {
    id: 'submission',
    type: 'comment',
    author: report.researcherId?.username || report.researcherId?.name || 'Researcher',
    authorAvatar: report.researcherId?.avatar,
    role: 'Researcher',
    content: `Submission: **${report.title}**`,
    timestamp: report.createdAt };

  return [submissionEvent, ...comments];
}

function statusBadgeClass(status: string) {
  if (['Triaged', 'Resolved', 'Paid'].includes(status)) {
    return 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20';
  }
  if (['Duplicate', 'Spam', 'NA', 'Out-of-Scope', 'Closed'].includes(status)) {
    return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20';
  }
  if (status === 'Needs Info') {
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20';
  }
  if (status === 'In Dispute') {
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20';
  }
  return 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20';
}

export default function TriagerReassignmentInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<InvitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mobileTab, setMobileTab] = useState<'details' | 'activity' | 'invite'>('details');
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' | 'pdf' } | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const authToken = localStorage.getItem('token');
      const res = await apiFetch(`/public/triager-reassignment/${token}`, {
        headers: authToken && authToken !== 'null' ? { Authorization: `Bearer ${authToken}` } : {} });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load invite');
      setData(json.data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const timeline = useMemo(() => (data?.report ? buildTimeline(data.report) : []), [data?.report]);

  const respond = async (action: 'accept' | 'decline') => {
    if (!token) return;
    setBusy(true);
    try {
      const authToken = localStorage.getItem('token');
      const res = await apiFetch(`/triager/reassignment-invites/${token}/${action}`, {
        method: 'POST',
        headers: authToken && authToken !== 'null' ? { Authorization: `Bearer ${authToken}` } : {} });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Action failed');
      toast({
        title: action === 'accept' ? 'Invite accepted' : 'Invite declined',
        description:
          action === 'accept'
            ? 'You are now the primary triager on this report.'
            : 'Support can invite another triager.' });
      if (action === 'accept') {
        navigate(json.data?.reportId ? `/triager/reports/${json.data.reportId}` : '/triager?tab=active');
      } else {
        navigate('/triager?tab=disputed');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center font-mono text-sm text-zinc-500">Loading invite…</div>;
  }

  if (!data) {
    return <div className="p-10 text-center font-mono text-sm text-zinc-500">Invite not found.</div>;
  }

  const { invite, dispute, report, expired, canRespond } = data;
  const cloudinaryUrls = (report.assets || []).filter((url: string) => url?.includes?.('cloudinary.com'));
  const program = typeof report.programId === 'object' ? report.programId : null;
  const programLabel = program?.title || (typeof report.programId === 'string' ? report.programId : 'Unknown');

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">
      {/* Read-only banner */}
      <div className="shrink-0 border-b border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 flex items-center gap-2">
        <Lock className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-amber-900 dark:text-amber-100">
          <span className="font-semibold">Read-only reassignment preview.</span> Accept the invite to triage this report.
        </p>
      </div>

      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <Button
          variant="ghost"
          className="pl-0 text-zinc-500 hover:text-black dark:hover:text-white"
          onClick={() => navigate(data.isInvitee ? '/triager?tab=disputed' : '/triager')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {data.isInvitee ? 'BACK TO DISPUTED REPORTS' : 'BACK TO QUEUE'}
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-zinc-400">REPORT ID:</span>
          <span className="font-mono font-bold text-lg text-black dark:text-white">
            {report.reportId || report._id}
          </span>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="lg:hidden flex border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        {(['details', 'activity', 'invite'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={cn(
              'flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors',
              mobileTab === tab
                ? 'border-b-2 border-black dark:border-white text-black dark:text-white'
                : 'text-zinc-500',
            )}
          >
            {tab === 'invite' ? 'Invite' : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* LEFT: report content + activity */}
          <ScrollArea
            className={cn(
              'lg:col-span-8 h-full border-r border-zinc-200 dark:border-zinc-800',
              mobileTab === 'invite' && 'hidden lg:block',
            )}
          >
            <div className="p-8 max-w-4xl mx-auto space-y-12 pb-32">
              {/* Report body */}
              <div className={cn('space-y-6', mobileTab === 'activity' && 'hidden lg:block')}>
                <h1 className="text-3xl font-bold text-black dark:text-white leading-tight">{report.title}</h1>

                <div className="flex gap-3 flex-wrap items-center">
                  <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {report.vulnerabilityCategory || 'Vulnerability'}
                  </Badge>
                  {report.assetType && (
                    <Badge variant="outline" className="text-zinc-500 border-zinc-300 dark:border-zinc-700">
                      {report.assetType}
                    </Badge>
                  )}
                  <Badge className={statusBadgeClass(report.status)}>{report.status}</Badge>
                </div>

                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">Description</h2>
                  <div
                    className="text-base text-zinc-800 dark:text-zinc-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: report.description }}
                  />

                  {report.impact && (
                    <>
                      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                        Impact
                      </h2>
                      <div
                        className="text-base text-zinc-800 dark:text-zinc-300 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: report.impact }}
                      />
                    </>
                  )}

                  {report.pocSteps && (
                    <>
                      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                        Proof of Concept
                      </h2>
                      <div
                        className="font-mono text-sm text-zinc-800 dark:text-zinc-300 leading-relaxed p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: report.pocSteps }}
                      />
                    </>
                  )}

                  {report.vulnerableEndpoint && (
                    <>
                      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                        Vulnerable endpoint
                      </h2>
                      <p className="font-mono text-sm break-all">{report.vulnerableEndpoint}</p>
                    </>
                  )}

                  {cloudinaryUrls.length > 0 && (
                    <>
                      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                        Attachments (PoC)
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        {cloudinaryUrls.map((url: string, index: number) => {
                          const isVideo = url.includes('/video/') || /\.(mp4|webm|ogg)$/i.test(url);
                          const isPdf = url.includes('/raw/') || /\.pdf$/i.test(url);
                          return (
                            <div
                              key={index}
                              className="group relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 flex items-center justify-center"
                            >
                              {isVideo ? (
                                <button
                                  type="button"
                                  className="w-full h-full relative block"
                                  onClick={() => setPreviewMedia({ url, type: 'video' })}
                                >
                                  <video src={url} className="w-full h-full object-cover pointer-events-none" />
                                </button>
                              ) : isPdf ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full h-full flex flex-col items-center justify-center text-xs font-mono text-zinc-500"
                                >
                                  PDF
                                </a>
                              ) : (
                                <button type="button" className="w-full h-full" onClick={() => setPreviewMedia({ url, type: 'image' })}>
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className={cn(mobileTab === 'activity' && 'hidden lg:block')}>
                <Separator className="bg-zinc-200 dark:bg-zinc-800" />
              </div>

              {/* Activity */}
              <div className={cn(mobileTab === 'details' && 'hidden lg:block')}>
                <h3 className="text-lg font-bold text-black dark:text-white mb-6">Activity</h3>
                <div className="pl-2">
                  {timeline.map((event, index) => {
                    const prev = timeline[index - 1];
                    const isConsecutive = index > 0 && getActorThreadKey(prev) === getActorThreadKey(event);
                    return (
                      <ReportTimelineNode
                        key={String(event.id)}
                        event={event}
                        isConsecutive={isConsecutive}
                        onPreviewMedia={setPreviewMedia}
                        researcherProfileLinks={false}
                      />
                    );
                  })}
                </div>

                <div className="mt-8 flex gap-4 pl-2">
                  <div className="flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3 w-full">
                    <Lock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Thread is read-only on this invite page. Accept the assignment to reply and triage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* RIGHT: invite + dispute + metadata */}
          <div
            className={cn(
              'lg:col-span-4 h-full overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/20 p-6 space-y-6',
              mobileTab !== 'invite' && 'hidden lg:block',
            )}
          >
            {/* Invite actions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase">Invite status</span>
                {expired || invite.status === 'expired' ? (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                    <Clock className="w-3 h-3 mr-1" /> Expired
                  </Badge>
                ) : invite.status === 'pending' ? (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Pending
                  </Badge>
                ) : (
                  <Badge variant="outline" className="capitalize">{invite.status}</Badge>
                )}
              </div>

              {invite.status === 'pending' && !expired && (
                <p className="text-xs font-mono text-zinc-500">
                  Expires {new Date(invite.expiresAt).toLocaleString()}
                </p>
              )}

              {(expired || invite.status === 'expired') && (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  This invite has expired. Contact BugChase Support if you still need this report.
                </p>
              )}

              {canRespond && (
                <div className="flex flex-col gap-2">
                  <Button onClick={() => respond('accept')} disabled={busy} className="w-full gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Accept assignment
                  </Button>
                  <Button variant="outline" onClick={() => respond('decline')} disabled={busy} className="w-full gap-2">
                    <XCircle className="w-4 h-4" /> Decline
                  </Button>
                </div>
              )}

              {!data.isInvitee && invite.status === 'pending' && !expired && (
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <Link to="/login" className="underline font-medium">
                    Sign in
                  </Link>{' '}
                  as the invited triager to respond.
                </p>
              )}

              {invite.matchSummary && (
                <p className="text-[10px] font-mono text-zinc-500">{invite.matchSummary}</p>
              )}
            </div>

            <Separator className="bg-zinc-200 dark:border-zinc-800" />

            {/* Dispute */}
            <div className="space-y-3 rounded-lg border border-amber-200/70 dark:border-amber-500/25 bg-amber-50/50 dark:bg-amber-500/5 p-4">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Support dispute</h4>
              </div>
              <p className="font-mono text-xs text-zinc-500">{dispute.disputeId}</p>
              <p className="font-bold text-sm">{dispute.subject}</p>
              {dispute.status && (
                <Badge variant="outline" className="text-[10px] capitalize">
                  {dispute.status}
                </Badge>
              )}
              {invite.previousTriagerName && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Current triager <strong>{invite.previousTriagerName}</strong> remains a collaborator after reassignment.
                </p>
              )}
              {dispute.description && (
                <div
                  className="text-sm prose prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 pt-2 border-t border-amber-200/50 dark:border-amber-500/20"
                  dangerouslySetInnerHTML={{ __html: dispute.description }}
                />
              )}
            </div>

            <Separator className="bg-zinc-200 dark:border-zinc-800" />

            {/* Report metadata */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Report details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs mb-1">Program</p>
                  {program ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button type="button" className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-left">
                          {program.title}
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl w-full">
                        <DialogHeader>
                          <DialogTitle>{program.title}</DialogTitle>
                        </DialogHeader>
                        {program.description && (
                          <div
                            className="text-sm prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: program.description }}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <p className="font-medium">{programLabel}</p>
                  )}
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-1">Submitted</p>
                  <p className="font-medium">{new Date(report.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-zinc-500 text-xs mb-1">Reporter</p>
                  <div className="flex items-center gap-2">
                    {report.researcherId?.avatar && report.researcherId.avatar !== 'default.jpg' ? (
                      <img src={report.researcherId.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold">
                        {(report.researcherId?.name || 'U').charAt(0)}
                      </div>
                    )}
                    <span className="font-medium">
                      {report.researcherId?.username
                        ? `@${report.researcherId.username}`
                        : report.researcherId?.name || 'Unknown'}
                    </span>
                  </div>
                </div>
                {report.triagerId && (
                  <div className="col-span-2">
                    <p className="text-zinc-500 text-xs mb-1">Current triager</p>
                    <p className="font-medium">
                      {report.triagerId.username || report.triagerId.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-zinc-200 dark:border-zinc-800" />

            {/* Severity read-only */}
            <div className="space-y-3 opacity-90">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase">Severity</h4>
              <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-bold text-black dark:text-white">
                    {report.cvssScore != null ? Number(report.cvssScore).toFixed(1) : '—'}
                  </span>
                  <span className="text-sm font-bold text-orange-500 uppercase">{report.severity}</span>
                </div>
                {report.cvssVector && (
                  <div className="text-[10px] font-mono text-zinc-500 break-all bg-zinc-50 dark:bg-zinc-900 p-2 rounded">
                    {report.cvssVector}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media preview */}
      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="max-w-4xl p-2">
          {previewMedia?.type === 'image' && (
            <img src={previewMedia.url} alt="" className="w-full h-auto max-h-[80vh] object-contain" />
          )}
          {previewMedia?.type === 'video' && (
            <video src={previewMedia.url} controls className="w-full max-h-[80vh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
