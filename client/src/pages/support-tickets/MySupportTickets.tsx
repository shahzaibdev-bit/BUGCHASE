import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, ChevronRight, Lock, MessageSquare } from 'lucide-react';
import { API_URL } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import { Dispute } from '@/types/dispute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CATEGORY_META, PRIORITY_META, STATUS_META, formatDisputeDate } from '@/lib/disputeMeta';
import ContactSupportButton from '@/components/support/ContactSupportButton';

export default function MySupportTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = `/${user?.role || 'researcher'}/support`;

  const [tickets, setTickets] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await apiFetch(`/disputes/mine`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) setTickets(data.data.disputes || []);
      } catch (err) {
        console.error('Failed to load support tickets', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-mono text-xs uppercase tracking-widest mb-2">
            <LifeBuoy className="w-4 h-4" /> Support
          </div>
          <h1 className="text-3xl font-black tracking-tight">My Support Tickets</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl">
            Track issues you have raised with our support team. You can reply when the chat is open
            after support contacts you.
          </p>
        </div>
        <ContactSupportButton />
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-zinc-500 font-mono text-sm">Loading tickets…</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center space-y-4">
            <p className="text-zinc-500 font-mono text-sm">You have not raised any support tickets yet.</p>
            <ContactSupportButton />
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-white/5">
            {tickets.map((t) => (
              <li key={t._id}>
                <button
                  type="button"
                  onClick={() => navigate(`${basePath}/${t._id}`)}
                  className="w-full text-left px-4 md:px-5 py-4 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-mono text-xs text-zinc-400">{t.disputeId}</span>
                      <Badge className={STATUS_META[t.status].className}>
                        {STATUS_META[t.status].label}
                      </Badge>
                      <Badge className={PRIORITY_META[t.priority].className}>
                        {PRIORITY_META[t.priority].label}
                      </Badge>
                      <Badge variant="outline" className="text-zinc-500">
                        {CATEGORY_META[t.category]?.label || t.category}
                      </Badge>
                      {t.canReply ? (
                        <Badge className="gap-1 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20">
                          <MessageSquare className="w-3 h-3" /> Reply open
                        </Badge>
                      ) : t.status !== 'resolved' && t.status !== 'rejected' ? (
                        <Badge className="gap-1 bg-zinc-100 dark:bg-white/5 text-zinc-500 border-zinc-200 dark:border-white/10">
                          <Lock className="w-3 h-3" /> Awaiting support
                        </Badge>
                      ) : null}
                    </div>
                    <p className="font-bold text-sm md:text-base truncate">{t.subject}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Updated {formatDisputeDate(t.updatedAt)}
                      {t.reportLabel ? ` · ${t.reportLabel}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
