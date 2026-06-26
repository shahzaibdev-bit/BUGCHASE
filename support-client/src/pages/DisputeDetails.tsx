import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Send,
  UserCheck,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  FileText,
  Lock,
  LogOut,
  ExternalLink,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Dispute, DisputePriority } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PRIORITY_META, STATUS_META, CATEGORY_META, formatDate } from '@/lib/disputeMeta';
import { useAuth } from '@/contexts/AuthContext';
import { RichTextContent } from '@/components/RichTextContent';
import { AssignTriagerPanel } from '@/components/disputes/AssignTriagerPanel';

const PRIORITIES: DisputePriority[] = ['low', 'medium', 'high', 'critical'];

export function DisputeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { dispute: Dispute } }>(`/disputes/${id}`);
      setDispute(res.data.dispute);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load dispute.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patch = async (body: Record<string, unknown>, successMsg: string) => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ data: { dispute: Dispute } }>(`/disputes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setDispute(res.data.dispute);
      toast({ title: 'Success', description: successMsg });
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message || 'Update failed.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!id || !reply.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch<{ data: { dispute: Dispute } }>(`/disputes/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: reply.trim() }),
      });
      setDispute(res.data.dispute);
      setReply('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send reply.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-zinc-500 font-mono text-sm">Loading dispute…</div>;
  }
  if (!dispute) {
    return (
      <div className="p-10 text-center text-zinc-500 font-mono text-sm">
        Dispute not found.
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/disputes')}>
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isClosed = dispute.status === 'resolved' || dispute.status === 'rejected';
  const isAdmin = user?.role === 'admin';
  const isClaimed = !!dispute.assignedTo;
  const isMine = isClaimed && dispute.assignedTo === user?._id;
  const canAct = isMine || isAdmin;
  const lockedByOther = isClaimed && !isMine && !isAdmin;
  const needsClaim = !isClaimed && !isAdmin && !isClosed;
  const isReportDispute = Boolean(dispute.reportRef);
  const categoryMeta = CATEGORY_META[dispute.category] || CATEGORY_META.other;
  const userCanReply = (dispute.awaitingReplyFrom || 'support') === 'raiser' && !isClosed;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/disputes')}
        className="inline-flex items-center gap-2 text-sm font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to disputes
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-5 md:p-6">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="font-mono text-xs text-zinc-400">{dispute.disputeId}</span>
              <Badge className={STATUS_META[dispute.status].className}>
                {STATUS_META[dispute.status].label}
              </Badge>
              <Badge className={PRIORITY_META[dispute.priority].className}>
                {PRIORITY_META[dispute.priority].label}
              </Badge>
              <Badge className={categoryMeta.className}>
                {categoryMeta.label}
              </Badge>
              <Badge
                className={cn(
                  isReportDispute
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                    : 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
                )}
              >
                {isReportDispute ? 'Report issue' : 'Platform issue'}
              </Badge>
            </div>
            <h1 className="text-2xl font-black tracking-tight">{dispute.subject}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Raised by{' '}
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                {dispute.raisedByName}
              </span>{' '}
              ({dispute.raisedByRole})
              {dispute.raisedByEmail ? ` · ${dispute.raisedByEmail}` : ''} · {formatDate(dispute.createdAt)}
            </p>

            {isReportDispute && dispute.reportRef ? (
              <a
                href={`/reports/${dispute.reportRef}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 rounded-lg px-3 py-1.5 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[min(100%,42rem)]">
                  {dispute.reportLabel || 'View linked report'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </a>
            ) : (
              <div className="mt-3 inline-flex items-center gap-2 text-xs font-mono text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 rounded-lg px-3 py-1.5">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                Account, billing, domain verification, or other platform issue — no report linked
              </div>
            )}
          </div>

          {/* Issue description (initial submission) */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-5 md:p-6">
            <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" /> Issue description
            </h2>
            <RichTextContent content={dispute.description} className="text-zinc-700 dark:text-zinc-300" />
          </div>

          {/* Thread */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-5 md:p-6">
            <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
              Conversation
            </h2>
            {userCanReply && !isClosed && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                The ticket creator can reply now — they were notified by email.
              </div>
            )}
            <div className="space-y-4">
              {dispute.messages.map((m, i) => {
                const isSupport = m.senderRole === 'support' || m.senderRole === 'admin';
                const isClaimNotice = m.content.includes('has claimed ticket');
                return (
                  <div
                    key={m._id || i}
                    className={cn(
                      'flex',
                      isClaimNotice ? 'justify-center' : isSupport ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-xl border p-3.5',
                        isClaimNotice
                          ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-100'
                          : isSupport
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white'
                            : 'bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10',
                      )}
                    >
                      {!isClaimNotice && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold">{m.senderName}</span>
                          <span
                            className={cn(
                              'text-[10px] font-mono uppercase tracking-wider',
                              isSupport ? 'opacity-70' : 'text-zinc-400',
                            )}
                          >
                            {m.senderRole}
                          </span>
                        </div>
                      )}
                      {isClaimNotice && (
                        <p className="text-[10px] font-mono uppercase tracking-widest text-blue-600/80 dark:text-blue-300/80 mb-2">
                          Ticket assigned
                        </p>
                      )}
                      <RichTextContent
                        content={m.content}
                        className={
                          isClaimNotice
                            ? 'text-blue-900 dark:text-blue-100 text-sm'
                            : isSupport
                              ? 'text-white dark:text-black'
                              : 'text-zinc-700 dark:text-zinc-300'
                        }
                      />
                      <p
                        className={cn(
                          'text-[10px] font-mono mt-1.5',
                          isSupport ? 'opacity-60' : 'text-zinc-400'
                        )}
                      >
                        {formatDate(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply box */}
            {!isClosed && (
              <div className="mt-5 border-t border-zinc-200 dark:border-white/10 pt-4">
                {needsClaim ? (
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 text-xs font-mono text-blue-700 dark:text-blue-300">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    Claim this dispute before you can reply to the user.
                  </div>
                ) : lockedByOther ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-xs font-mono text-amber-700 dark:text-amber-300">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    Claimed by {dispute.assignedToName} — only they can reply.
                  </div>
                ) : (
                  <>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={3}
                      placeholder="Write a response to the user..."
                      className="w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-transparent p-3 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white resize-y"
                    />
                    <div className="flex justify-end mt-2">
                      <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                        <Send className="w-4 h-4" />
                        {sending ? 'Sending…' : 'Send reply'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Side actions */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-5">
            <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
              Actions
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-mono text-zinc-500 mb-1">Assigned to</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  {isClaimed ? (
                    <>
                      {dispute.assignedToName}
                      {isMine && (
                        <Badge className="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20">
                          You
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-zinc-400">Unassigned</span>
                  )}
                </p>
              </div>

              {needsClaim && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 text-xs font-mono text-blue-700 dark:text-blue-300">
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  Claim this ticket to reply, update priority, or resolve it.
                </div>
              )}

              {/* Claim / lock state */}
              {lockedByOther ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-xs font-mono text-amber-700 dark:text-amber-300">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  Locked — claimed by {dispute.assignedToName}.
                </div>
              ) : !isClaimed && !isClosed ? (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => patch({ claim: true }, 'Dispute claimed. The user has been notified.')}
                >
                  <UserCheck className="w-4 h-4" /> Claim dispute
                </Button>
              ) : isMine && !isClosed ? (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => patch({ release: true }, 'Dispute released.')}
                >
                  <LogOut className="w-4 h-4" /> Release dispute
                </Button>
              ) : null}

              <div>
                <p className="text-xs font-mono text-zinc-500 mb-1.5">Priority</p>
                <div className="grid grid-cols-2 gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      disabled={busy || isClosed || !canAct}
                      onClick={() => patch({ priority: p }, 'Priority updated.')}
                      className={cn(
                        'px-2 py-1.5 rounded-lg text-xs font-bold font-mono uppercase border transition-colors disabled:opacity-50',
                        dispute.priority === p
                          ? PRIORITY_META[p].className
                          : 'bg-transparent text-zinc-500 border-zinc-200 dark:border-white/10 hover:text-zinc-900 dark:hover:text-white'
                      )}
                    >
                      {PRIORITY_META[p].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {isReportDispute && id && (
            <AssignTriagerPanel disputeId={id} canAct={canAct} isClosed={isClosed} />
          )}

          {/* Resolution */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-5">
            <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
              Resolution
            </h2>

            {isClosed ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {dispute.status === 'resolved' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-zinc-400" />
                  )}
                  <span className="text-sm font-bold capitalize">{dispute.status}</span>
                </div>
                {dispute.resolution?.note && (
                  <RichTextContent
                    content={dispute.resolution.note}
                    className="text-zinc-600 dark:text-zinc-300"
                  />
                )}
                <p className="text-xs font-mono text-zinc-400">
                  {dispute.resolution?.resolvedByName
                    ? `by ${dispute.resolution.resolvedByName}`
                    : ''}{' '}
                  {dispute.resolution?.resolvedAt ? `· ${formatDate(dispute.resolution.resolvedAt)}` : ''}
                </p>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  disabled={busy || !canAct}
                  onClick={() => patch({ status: 'in_review' }, 'Dispute reopened.')}
                >
                  <ShieldAlert className="w-4 h-4" /> Reopen
                </Button>
              </div>
            ) : !canAct && !isClosed ? (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 text-xs font-mono text-blue-700 dark:text-blue-300">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                {lockedByOther
                  ? `Claimed by ${dispute.assignedToName}. Only they can resolve it.`
                  : 'Claim this dispute before resolving it.'}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={3}
                  placeholder="Resolution note (optional)…"
                  className="w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-transparent p-3 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white resize-y"
                />
                <Button
                  className="w-full"
                  disabled={busy || !canAct}
                  onClick={() =>
                    patch(
                      { status: 'resolved', resolutionOutcome: 'upheld', resolutionNote },
                      'Dispute resolved.'
                    )
                  }
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark resolved
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={busy || !canAct}
                  onClick={() =>
                    patch(
                      { status: 'rejected', resolutionOutcome: 'rejected', resolutionNote },
                      'Dispute rejected.'
                    )
                  }
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
