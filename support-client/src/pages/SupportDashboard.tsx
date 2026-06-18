import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import {
  Search,
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCw,
  UserCheck,
  Lock,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Dispute, DisputeStats, DisputeStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PRIORITY_META, STATUS_META, formatDate } from '@/lib/disputeMeta';

const STATUS_FILTERS: { key: DisputeStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_review', label: 'In Review' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'rejected', label: 'Rejected' },
];

export function SupportDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        apiFetch<{ data: { disputes: Dispute[] } }>('/disputes'),
        apiFetch<{ data: DisputeStats }>('/disputes/stats'),
      ]);
      setDisputes(listRes.data.disputes);
      setStats(statsRes.data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load disputes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return disputes.filter((d) => {
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        d.subject.toLowerCase().includes(q) ||
        d.disputeId.toLowerCase().includes(q) ||
        d.raisedByName.toLowerCase().includes(q) ||
        (d.reportLabel || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [disputes, statusFilter, search]);

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0, icon: Inbox, accent: 'text-zinc-900 dark:text-white' },
    { label: 'Open', value: stats?.open ?? 0, icon: Inbox, accent: 'text-blue-500' },
    { label: 'In Review', value: stats?.inReview ?? 0, icon: Clock, accent: 'text-amber-500' },
    { label: 'Resolved', value: stats?.resolved ?? 0, icon: CheckCircle2, accent: 'text-emerald-500' },
    { label: 'Rejected', value: stats?.rejected ?? 0, icon: XCircle, accent: 'text-zinc-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1">
            Support Console
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Disputes raised by companies and researchers across the platform.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                {card.label}
              </span>
              <card.icon className={cn('w-4 h-4', card.accent)} />
            </div>
            <div className="text-3xl font-black mt-2">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider border transition-colors',
                statusFilter === f.key
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white'
                  : 'bg-transparent text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search disputes..."
            className="pl-9 bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-lg font-mono text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-zinc-500 font-mono text-sm">Loading disputes…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 font-mono text-sm">
            No disputes match the current filters.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-white/5">
            {filtered.map((d) => (
              <li key={d._id}>
                <button
                  onClick={() => navigate(`/disputes/${d._id}`)}
                  className="w-full text-left px-4 md:px-5 py-4 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-zinc-400">{d.disputeId}</span>
                      <Badge className={STATUS_META[d.status].className}>
                        {STATUS_META[d.status].label}
                      </Badge>
                      <Badge className={PRIORITY_META[d.priority].className}>
                        {PRIORITY_META[d.priority].label}
                      </Badge>
                      <Badge className="bg-zinc-100 dark:bg-white/5 text-zinc-500 border-zinc-200 dark:border-white/10">
                        {d.category}
                      </Badge>
                      {d.assignedTo &&
                        (d.assignedTo === user?._id ? (
                          <Badge className="gap-1 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20">
                            <UserCheck className="w-3 h-3" /> Claimed by you
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20">
                            <Lock className="w-3 h-3" /> {d.assignedToName}
                          </Badge>
                        ))}
                    </div>
                    <p className="font-bold text-sm md:text-base mt-1.5 truncate">{d.subject}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                      Raised by{' '}
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        {d.raisedByName}
                      </span>{' '}
                      ({d.raisedByRole}) · {formatDate(d.createdAt)}
                      {d.reportLabel ? ` · ${d.reportLabel}` : ''}
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
