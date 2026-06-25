import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ResearcherPrivateInviteLanding() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/public/private-program-invite/${token}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
      else toast({ title: 'Error', description: json.message || 'Invite not found', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const respond = async (action: 'accept' | 'decline') => {
    if (!token) return;
    if (!isAuthenticated) {
      navigate(`/login-required?redirect=/researcher/private-invite/${token}`);
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch(`/researcher/private-invites/${token}/${action}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: json.message || 'Action failed', variant: 'destructive' });
        return;
      }
      toast({ title: action === 'accept' ? 'Invite accepted' : 'Invite declined' });
      await load();
      if (action === 'accept' && data?.program?._id) {
        navigate(`/researcher/programs/${data.program._id}`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading invite…
      </div>
    );
  }

  if (!data?.invite || !data?.program) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <h1 className="text-xl font-bold">Invite not found</h1>
        <Link to="/researcher/private-invites"><Button>Back to invites</Button></Link>
      </div>
    );
  }

  const { invite, program, company, expired, canRespond, isInvitee } = data;
  const companyName = company?.companyName || program.companyName || 'A company';
  const programTypeLabel = program.type === 'VDP' ? 'vulnerability disclosure program' : 'bug bounty program';
  const description = program.description?.replace(/<[^>]*>/g, '').trim()
    ? program.description
    : '<p class="text-muted-foreground text-center">No description provided.</p>';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {isAuthenticated && (
        <Link
          to="/researcher/private-invites"
          className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
      )}

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm space-y-6 text-center">
        {company?.avatar && company.avatar !== 'default.jpg' ? (
          <img
            src={company.avatar}
            alt={companyName}
            className="h-16 w-16 rounded-xl border border-border object-cover mx-auto"
          />
        ) : (
          <div className="h-16 w-16 rounded-xl border border-border bg-muted flex items-center justify-center text-2xl font-bold mx-auto">
            {companyName.charAt(0)}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Private program invitation</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{companyName}</span>
            {' '}has invited you to join their private {programTypeLabel}
          </p>
          <h1 className="text-xl font-bold">{program.title}</h1>
          {(expired || invite.status !== 'invited') && (
            <div className="flex justify-center gap-2 flex-wrap">
              {expired && <Badge variant="destructive">Expired</Badge>}
              {invite.status !== 'invited' && (
                <Badge variant="outline" className="capitalize">{invite.status}</Badge>
              )}
            </div>
          )}
        </div>

        <div
          className="prose dark:prose-invert prose-sm max-w-none text-center leading-relaxed [&_p]:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: description }}
        />

        {!isAuthenticated && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Log in as the invited researcher to accept or decline this invitation.
          </p>
        )}
        {isAuthenticated && !isInvitee && (
          <p className="text-sm text-destructive">This invite was sent to a different account.</p>
        )}

        {canRespond && (
          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="outline"
              className="gap-2 min-w-[120px]"
              onClick={() => respond('decline')}
              disabled={busy}
            >
              <XCircle className="h-4 w-4" /> Decline
            </Button>
            <Button className="gap-2 min-w-[120px]" onClick={() => respond('accept')} disabled={busy}>
              <CheckCircle2 className="h-4 w-4" /> Accept
            </Button>
          </div>
        )}

        {invite.status === 'accepted' && program._id && (
          <div className="flex justify-center">
            <Button asChild>
              <Link to={`/researcher/programs/${program._id}`}>Open program</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
