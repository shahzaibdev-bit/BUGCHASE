import { useNavigate } from 'react-router-dom';
import { ChevronRight, Inbox, MessageSquare } from 'lucide-react';
import { Dispute } from '@/types';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_META, STATUS_META, formatDate } from '@/lib/disputeMeta';
import { cn } from '@/lib/utils';

interface DisputeListProps {
  disputes: Dispute[];
  loading?: boolean;
  emptyTitle: string;
  emptyDescription: string;
}

export function DisputeList({ disputes, loading, emptyTitle, emptyDescription }: DisputeListProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 p-10 text-center text-zinc-500 font-mono text-sm">
        Loading tickets…
      </div>
    );
  }

  if (disputes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-zinc-900/30 p-12 text-center">
        <Inbox className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="font-semibold text-zinc-700 dark:text-zinc-200">{emptyTitle}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 overflow-hidden">
      <div className="hidden md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-zinc-200 dark:border-white/10 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
        <span>Ticket</span>
        <span>Subject</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Updated</span>
        <span className="sr-only">Open</span>
      </div>
      <ul className="divide-y divide-zinc-200 dark:divide-white/5">
        {disputes.map((d) => {
          const needsReply = d.awaitingReplyFrom === 'support';
          return (
            <li key={d._id}>
              <button
                type="button"
                onClick={() => navigate(`/disputes/${d._id}`)}
                className={cn(
                  'w-full text-left px-4 md:px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto_auto_auto_auto] md:items-center gap-3 md:gap-4',
                  'hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors',
                  needsReply && 'bg-amber-50/50 dark:bg-amber-500/5',
                )}
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{d.disputeId}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate md:hidden">{d.raisedByName}</p>
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{d.subject}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate hidden md:block">
                    {d.raisedByName} · {d.raisedByRole}
                    {d.reportLabel ? ` · ${d.reportLabel}` : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 md:hidden flex-wrap">
                    <Badge className={STATUS_META[d.status].className}>{STATUS_META[d.status].label}</Badge>
                    <Badge className={PRIORITY_META[d.priority].className}>{PRIORITY_META[d.priority].label}</Badge>
                    {needsReply && (
                      <Badge className="gap-1 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20">
                        <MessageSquare className="w-3 h-3" /> Awaiting you
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="hidden md:block">
                  <Badge className={STATUS_META[d.status].className}>{STATUS_META[d.status].label}</Badge>
                </div>

                <div className="hidden md:block">
                  <Badge className={PRIORITY_META[d.priority].className}>{PRIORITY_META[d.priority].label}</Badge>
                </div>

                <div className="hidden md:block text-xs font-mono text-zinc-500 whitespace-nowrap">
                  {formatDate(d.updatedAt || d.createdAt)}
                </div>

                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 hidden md:block justify-self-end" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
