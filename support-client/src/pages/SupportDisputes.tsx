import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Briefcase, History, Inbox } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { AgentDisputeStats, Dispute } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DisputeList } from '@/components/disputes/DisputeList';
import { SlidingSegmentControl } from '@/components/ui/SlidingSegmentControl';

type QueueTab = 'working' | 'worked' | 'available';

export function SupportDisputes() {
  const [queue, setQueue] = useState<QueueTab>('working');
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<AgentDisputeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async (activeQueue: QueueTab = queue) => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        apiFetch<{ data: { disputes: Dispute[] } }>(`/disputes?queue=${activeQueue}`),
        apiFetch<{ data: AgentDisputeStats }>('/disputes/stats/me'),
      ]);
      setDisputes(listRes.data.disputes);
      setStats(statsRes.data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load tickets.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(queue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return disputes;
    return disputes.filter(
      (d) =>
        d.subject.toLowerCase().includes(q) ||
        d.disputeId.toLowerCase().includes(q) ||
        d.raisedByName.toLowerCase().includes(q) ||
        (d.reportLabel || '').toLowerCase().includes(q),
    );
  }, [disputes, search]);

  const tabs: { key: QueueTab; label: string; count: number; icon: typeof Briefcase }[] = [
    { key: 'working', label: 'Working On', count: stats?.working ?? 0, icon: Briefcase },
    { key: 'worked', label: 'Worked On', count: stats?.worked ?? 0, icon: History },
    { key: 'available', label: 'Available', count: stats?.available ?? 0, icon: Inbox },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1">
            My Tickets
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Disputes</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Tickets you are actively handling and ones you have already worked on.
          </p>
        </div>
        <Button variant="outline" onClick={() => loadData()} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Working on</p>
          <p className="text-3xl font-black mt-1">{stats?.working ?? 0}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Worked on</p>
          <p className="text-3xl font-black mt-1">{stats?.worked ?? 0}</p>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-amber-700 dark:text-amber-300">Awaiting your reply</p>
          <p className="text-3xl font-black mt-1 text-amber-800 dark:text-amber-200">{stats?.awaitingReply ?? 0}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <SlidingSegmentControl<QueueTab>
          value={queue}
          onChange={setQueue}
          options={tabs.map((tab) => ({
            value: tab.key,
            label: tab.label,
            count: tab.count,
            icon: tab.icon,
          }))}
        />

        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="pl-9 bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-lg font-mono text-sm"
          />
        </div>
      </div>

      <DisputeList
        disputes={filtered}
        loading={loading}
        emptyTitle={
          queue === 'working'
            ? 'No active tickets'
            : queue === 'worked'
              ? 'No completed tickets yet'
              : 'No open tickets'
        }
        emptyDescription={
          queue === 'working'
            ? 'Claim a dispute from the Available tab to start working on it.'
            : queue === 'worked'
              ? 'Tickets you resolve or reply to will appear here once they are no longer in your active queue.'
              : 'New disputes from companies and researchers will show up here when they need an agent.'
        }
      />
    </div>
  );
}
