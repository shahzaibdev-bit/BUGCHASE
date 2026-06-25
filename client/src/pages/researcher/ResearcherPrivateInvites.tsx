import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { ProgramCard } from '@/components/researcher/ProgramCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Clock, Hourglass } from 'lucide-react';

function toCardProgram(invite: any) {
  const program = invite.programId;
  const company = invite.companyId;
  return {
    _id: program?._id,
    title: program?.title || 'Private Program',
    companyName: company?.companyName || company?.name || program?.companyName,
    companyId: company ? { avatar: company.avatar } : undefined,
    type: program?.type,
    description: program?.description,
    bountyRange: program?.bountyRange,
    isPrivate: true,
  };
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <GlassCard key={i} className="h-64 animate-pulse">
          <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-4" />
          <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
          <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </GlassCard>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <GlassCard className="p-8 text-center text-muted-foreground">{message}</GlassCard>
  );
}

export default function ResearcherPrivateInvites() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/researcher/private-invites');
        const json = await res.json();
        if (res.ok) setInvites(json.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const acceptedInvites = invites.filter((i) => i.status === 'accepted' && i.programId);
  const pendingInvites = invites.filter((i) => i.status === 'invited' && i.programId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lock className="h-6 w-6" /> Private Programs
        </h1>
        <p className="text-muted-foreground text-sm">
          Access your private programs or review invitations waiting for your decision.
        </p>
      </div>

      <Tabs defaultValue="programs" className="space-y-6">
        <TabsList className="inline-flex h-auto w-full max-w-xl gap-2 rounded-lg bg-zinc-200 p-1 dark:bg-zinc-800/90">
          <TabsTrigger
            value="programs"
            className="flex-1 gap-2 rounded-md px-3 py-1.5 text-sm font-semibold font-mono transition-all text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-zinc-950"
          >
            Private Programs
            {acceptedInvites.length > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs font-mono">
                {acceptedInvites.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="flex-1 gap-2 rounded-md px-3 py-1.5 text-sm font-semibold font-mono transition-all text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-zinc-950"
          >
            Pending Invites
            {pendingInvites.length > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs font-mono">
                {pendingInvites.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programs">
          {loading ? (
            <LoadingGrid />
          ) : acceptedInvites.length === 0 ? (
            <EmptyState message="No private programs yet. Accept an invitation to access exclusive programs here." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {acceptedInvites.map((invite, index) => {
                const program = invite.programId;
                return (
                  <ProgramCard
                    key={invite._id}
                    program={toCardProgram(invite)}
                    index={index}
                    onClick={() => navigate(`/researcher/programs/${program._id}`)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {loading ? (
            <LoadingGrid />
          ) : pendingInvites.length === 0 ? (
            <EmptyState message="No pending invites. New invitations from companies will appear here." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingInvites.map((invite, index) => {
                const program = invite.programId;
                return (
                  <ProgramCard
                    key={invite._id}
                    program={toCardProgram(invite)}
                    index={index}
                    onClick={() => invite.token && navigate(`/researcher/private-invite/${invite.token}`)}
                    statusBadge={
                      <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400 gap-1">
                        <Hourglass className="h-3 w-3" /> Pending
                      </Badge>
                    }
                    footer={
                      <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-auto">
                        <div>
                          <p className="text-xs text-muted-foreground">Bounty</p>
                          <p className="font-bold text-primary font-mono text-sm">
                            {program.bountyRange?.replace(/\$/g, 'PKR ') || 'Varies'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3" />
                            {invite.expiresAt ? 'Expires' : 'Invited'}
                          </p>
                          <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
                            {invite.expiresAt
                              ? new Date(invite.expiresAt).toLocaleDateString()
                              : invite.invitedAt
                                ? new Date(invite.invitedAt).toLocaleDateString()
                                : '—'}
                          </p>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
