import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Send, LifeBuoy, FileText, ExternalLink } from 'lucide-react';
import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import { Dispute } from '@/types/dispute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CATEGORY_META,
  PRIORITY_META,
  STATUS_META,
  formatDisputeDate,
} from '@/lib/disputeMeta';
import { toast } from '@/hooks/use-toast';

function RichTextContent({ content, className }: { content?: string; className?: string }) {
  if (!content?.trim()) return null;
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  if (hasHtml) {
    return (
      <div
        className={cn(
          'prose prose-sm prose-zinc dark:prose-invert max-w-none',
          'prose-blockquote:border-l-zinc-300 dark:prose-blockquote:border-l-zinc-600',
          className,
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <p className={cn('text-sm whitespace-pre-wrap leading-relaxed', className)}>{content}</p>;
}

export default function MySupportTicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = `/${user?.role || 'researcher'}/support`;

  const [ticket, setTicket] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/disputes/mine/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load ticket');
      setTicket(data.data.dispute);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not load this ticket.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sendReply = async () => {
    if (!id || !reply.trim() || !ticket?.canReply) return;
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/disputes/mine/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ content: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send reply');
      setTicket(data.data.dispute);
      setReply('');
      toast({ title: 'Reply sent', description: 'Support has been notified by email.' });
    } catch (err: any) {
      toast({
        title: 'Could not send reply',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-zinc-500 font-mono text-sm">Loading ticket…</div>;
  }

  if (!ticket) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-zinc-500 font-mono text-sm">Ticket not found.</p>
        <Button variant="outline" onClick={() => navigate(basePath)}>
          <ArrowLeft className="w-4 h-4" /> Back to tickets
        </Button>
      </div>
    );
  }

  const isClosed = ticket.status === 'resolved' || ticket.status === 'rejected';
  const isReportTicket = Boolean(ticket.reportRef);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <button
        type="button"
        onClick={() => navigate(basePath)}
        className="inline-flex items-center gap-2 text-sm font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to my tickets
      </button>

      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-zinc-400">{ticket.disputeId}</span>
          <Badge className={STATUS_META[ticket.status].className}>
            {STATUS_META[ticket.status].label}
          </Badge>
          <Badge className={PRIORITY_META[ticket.priority].className}>
            {PRIORITY_META[ticket.priority].label}
          </Badge>
          <Badge variant="outline">{CATEGORY_META[ticket.category]?.label || ticket.category}</Badge>
        </div>
        <h1 className="text-2xl font-black tracking-tight">{ticket.subject}</h1>
        <p className="text-sm text-zinc-500">
          Created {formatDisputeDate(ticket.createdAt)}
          {ticket.assignedToName ? ` · Handled by ${ticket.assignedToName}` : ''}
        </p>
        {isReportTicket && ticket.reportRef && (
          <a
            href={`/${user?.role}/reports/${ticket.reportRef}`}
            className="inline-flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 rounded-lg px-3 py-1.5 hover:bg-blue-100 dark:hover:bg-blue-500/20"
          >
            <FileText className="w-3.5 h-3.5" />
            {ticket.reportLabel || 'View linked report'}
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-5 md:p-6">
        <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-500 mb-3">
          Your original description
        </h2>
        <RichTextContent content={ticket.description} />
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-5 md:p-6">
        <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-500 mb-4">
          Conversation
        </h2>
        <div className="space-y-4">
          {ticket.messages.map((m, i) => {
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
                          : undefined
                    }
                  />
                  <p
                    className={cn(
                      'text-[10px] font-mono mt-1.5',
                      isSupport ? 'opacity-60' : 'text-zinc-400',
                    )}
                  >
                    {formatDisputeDate(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {isClosed ? (
          <div className="mt-5 border-t border-zinc-200 dark:border-white/10 pt-4 space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 text-xs font-mono text-emerald-800 dark:text-emerald-200">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              This ticket has been resolved. Chat is closed.
            </div>
            {ticket.resolution?.note && (
              <div className="rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 p-4">
                <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Resolution</p>
                <RichTextContent content={ticket.resolution.note} />
                {ticket.resolution.resolvedAt && (
                  <p className="text-[10px] font-mono text-zinc-400 mt-2">
                    {ticket.resolution.resolvedByName ? `By ${ticket.resolution.resolvedByName} · ` : ''}
                    {formatDisputeDate(ticket.resolution.resolvedAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 border-t border-zinc-200 dark:border-white/10 pt-4">
            {ticket.canReply ? (
              <>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Write your reply to support…"
                  className="w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-transparent p-3 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white resize-y"
                />
                <div className="flex justify-end mt-2">
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending…' : 'Send reply'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-xs font-mono text-amber-700 dark:text-amber-300">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                Waiting for support — you can reply after the support team sends you a message.
              </div>
            )}
          </div>
        )}
      </div>

      {!isClosed && (
      <div className="rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-4 py-3 flex items-start gap-2 text-xs text-zinc-500 font-mono">
        <LifeBuoy className="w-4 h-4 shrink-0 mt-0.5" />
        When support replies, you will receive an email and this chat will open for your response.
        After you reply, the chat closes until support contacts you again.
      </div>
      )}
    </div>
  );
}
