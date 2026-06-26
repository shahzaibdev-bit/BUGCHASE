import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { Dispute } from '@/types';
import { DisputeList } from '@/components/disputes/DisputeList';
import { useAuth } from '@/contexts/AuthContext';

export function SupportDashboard() {
  const { user } = useAuth();
  const [availableTickets, setAvailableTickets] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { disputes: Dispute[] } }>('/disputes?queue=available');
      setAvailableTickets(res.data.disputes);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load queue.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1">
          Support Console
        </p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Open disputes waiting in the queue — not yet assigned to an agent.
        </p>
      </div>

      <DisputeList
        disputes={availableTickets}
        loading={loading}
        emptyTitle="No tickets in queue"
        emptyDescription="When companies or researchers open a new dispute, it will appear here until an agent picks it up."
      />
    </div>
  );
}
