import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Loader2, Lock, Clock, Search, RefreshCw } from 'lucide-react';

type TriagerCandidate = {
  _id: string;
  name: string;
  username?: string;
  email: string;
  expertise: string[];
  activeReports: number;
  maxConcurrentReports: number;
  availableSlots: number;
  matchSummary: string;
};

type TriagerIneligible = {
  _id: string;
  name: string;
  reason: 'current_assignee' | 'no_expertise' | 'at_capacity' | 'unavailable' | 'inactive';
  detail: string;
  expertise: string[];
};

type CandidatesPayload = {
  assetKey: string;
  candidates: TriagerCandidate[];
  ineligible?: TriagerIneligible[];
  pendingInvite: {
    _id: string;
    invitedTriagerName: string;
    status: string;
    expiresAt: string;
  } | null;
  canAssign: boolean;
  currentTriagerId: string | null;
  currentTriagerName?: string | null;
};

const INELIGIBLE_LABEL: Record<TriagerIneligible['reason'], string> = {
  current_assignee: 'Current assignee',
  no_expertise: 'No matching expertise',
  at_capacity: 'At capacity',
  unavailable: 'Unavailable',
  inactive: 'Inactive',
};

function normalizeCandidatesPayload(payload: CandidatesPayload): CandidatesPayload {
  const excludeIds = new Set(
    [payload.currentTriagerId, ...(payload.ineligible || []).filter((i) => i.reason === 'current_assignee').map((i) => i._id)]
      .filter(Boolean) as string[],
  );

  return {
    ...payload,
    candidates: payload.candidates.filter((c) => !excludeIds.has(c._id)),
    ineligible: (payload.ineligible || []).filter((i) => i.reason !== 'current_assignee'),
  };
}

export function AssignTriagerPanel({
  disputeId,
  canAct,
  isClosed,
}: {
  disputeId: string;
  canAct: boolean;
  isClosed: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [data, setData] = useState<CandidatesPayload | null>(null);

  const loadCandidates = useCallback(async (options?: { markSearched?: boolean }) => {
    setLoading(true);
    if (options?.markSearched) setSearched(true);
    try {
      const res = await apiFetch<{ data: CandidatesPayload }>(`/disputes/${disputeId}/triager-candidates`);
      setData(normalizeCandidatesPayload(res.data));
      setSearched(true);
    } catch (err: any) {
      if (options?.markSearched) {
        toast({ title: 'Error', description: err.message || 'Failed to find triager matches.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const findTriagers = () => loadCandidates({ markSearched: true });

  const sendInvite = async (triagerId: string) => {
    setSending(triagerId);
    try {
      await apiFetch(`/disputes/${disputeId}/triager-invites`, {
        method: 'POST',
        body: JSON.stringify({ triagerId }),
      });
      toast({ title: 'Invite sent', description: 'The triager has 48 hours to accept or decline via email.' });
      await loadCandidates();
    } catch (err: any) {
      toast({ title: 'Invite failed', description: err.message || 'Could not send invite.', variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  if (isClosed) return null;

  const pendingInvite = data?.pendingInvite;
  const expertiseMatches = (data?.ineligible || []).filter((i) => i.reason !== 'no_expertise');

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-5">
      <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
        <UserPlus className="w-4 h-4" /> Assign new triager
      </h2>
      <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
        BugChase matches triagers by report asset expertise and open capacity. The current triager stays as a
        collaborator with read access after reassignment.
      </p>

      {pendingInvite && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-xs font-mono text-amber-800 dark:text-amber-200 mb-4">
          <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Pending invite to <strong>{pendingInvite.invitedTriagerName}</strong> — expires{' '}
            {new Date(pendingInvite.expiresAt).toLocaleString()}. Reassign is blocked until they respond.
          </span>
        </div>
      )}

      {!canAct && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 text-xs font-mono text-blue-700 dark:text-blue-300 mb-4">
          <Lock className="w-3.5 h-3.5" /> Claim this dispute to assign a triager.
        </div>
      )}

      {data?.currentTriagerName && (
        <p className="text-[10px] font-mono text-zinc-500 mb-3">
          Current triager: <span className="text-zinc-700 dark:text-zinc-300">{data.currentTriagerName}</span>
          <span className="text-zinc-400"> — excluded from matches</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          size="sm"
          onClick={findTriagers}
          disabled={loading || !canAct}
          className="text-xs gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : searched ? (
            <RefreshCw className="w-3.5 h-3.5" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          {searched ? 'Refresh matches' : 'Find matching triagers'}
        </Button>
        {data?.assetKey && searched && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            Asset focus: {data.assetKey}
          </span>
        )}
      </div>

      {loading && !data ? (
        <div className="text-center py-6 text-zinc-500 font-mono text-xs">Loading triager matches…</div>
      ) : loading ? (
        <div className="text-center py-6 text-zinc-500 font-mono text-xs">Searching triagers…</div>
      ) : !data ? null : data.candidates.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500 font-mono">
            No eligible triagers available to invite for {data.assetKey.toUpperCase()} right now.
          </p>
          {expertiseMatches.length > 0 && (
            <div className="rounded-lg border border-zinc-200 dark:border-white/10 px-3 py-2.5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
                Triagers reviewed
              </p>
              <ul className="space-y-1.5 text-xs font-mono text-zinc-500">
                {expertiseMatches.map((i) => (
                  <li key={i._id} className="flex justify-between gap-2">
                    <span className="truncate">{i.name}</span>
                    <span className="shrink-0 text-zinc-400">
                      {INELIGIBLE_LABEL[i.reason]} — {i.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {data.candidates.map((c) => (
            <li
              key={c._id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-white/10 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-[10px] font-mono text-zinc-400 truncate">{c.matchSummary}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.expertise.slice(0, 4).map((e) => (
                    <Badge key={e} className="text-[9px] px-1 py-0 border-zinc-200 dark:border-white/20 bg-transparent">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!canAct || !data.canAssign || sending === c._id}
                onClick={() => sendInvite(c._id)}
                className="shrink-0 text-xs"
              >
                {sending === c._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send invite'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
