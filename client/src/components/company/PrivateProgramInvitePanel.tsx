import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { Save, RefreshCw, Users, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const ASSET_TAG_OPTIONS = ['Web', 'API', 'Mobile', 'iOS', 'Android', 'Infrastructure', 'Cloud'];

const FIELD_HELP: Record<string, string> = {
  autoInvite: 'Turns on the daily scaling job. When your 30-day report count is below target, BugChase automatically sends invite batches to top-ranked researchers who pass all trust gates.',
  targetReports: 'How many valid reports you want this private program to receive in a rolling 30-day window. Set this to match your triage team capacity (e.g. 15/month).',
  multiplier: 'Invite-to-report ratio. Not every invite becomes a report. A 4:1 multiplier means a deficit of 3 reports triggers up to 12 invites over time (sent in daily batches).',
  batchSize: 'Maximum invites sent per day when auto-scaling runs. Prevents flooding researchers — typically 10 per day.',
  minSnr: 'Signal-to-noise ratio gate: valid reports ÷ total reports. Spam, Duplicate, NA, and Out-of-Scope count against SNR. In-progress reports (Submitted, Triaging) count as valid. Default 80%.',
  minReputation: 'Minimum BugChase reputation points from accepted findings. Use 0 to include newer researchers with good report history.',
  minImpact: 'Minimum average impact score (CVSS when available, otherwise severity weight). Use 0 to disable this gate.',
  maxInvites: 'Researchers already holding this many active private invites (invited or accepted) are deprioritized for auto-invite. Keeps workload manageable.',
  lookback: 'Researchers must have submitted a report or logged in within this many days to qualify for automatic invites. Manual invites can still be sent from the list below.',
  assetTags: 'Match researchers who have valid findings on these asset types (Web, API, Mobile, etc.). Higher asset-match scores rank higher in the list.',
};

function FieldLabel({ label, helpKey }: { label: string; helpKey: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Help: ${label}`}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            ?
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed p-3">
          {FIELD_HELP[helpKey]}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

type PrivateSettings = {
  autoInviteEnabled: boolean;
  targetMonthlyReports: number;
  inviteToReportMultiplier: number;
  dailyInviteBatchSize: number;
  minSnrPercent: number;
  minReputationScore: number;
  minImpactScore: number;
  maxActivePrivateInvitesPerResearcher: number;
  assetTags: string[];
  lookbackDays: number;
};

const defaultSettings: PrivateSettings = {
  autoInviteEnabled: false,
  targetMonthlyReports: 15,
  inviteToReportMultiplier: 4,
  dailyInviteBatchSize: 10,
  minSnrPercent: 80,
  minReputationScore: 0,
  minImpactScore: 0,
  maxActivePrivateInvitesPerResearcher: 5,
  assetTags: ['Web', 'API'],
  lookbackDays: 30,
};

interface Props {
  programId: string;
  initialSettings?: Partial<PrivateSettings>;
  inviteMetrics?: {
    actualReportsLast30Days?: number;
    targetMonthlyReports?: number;
    deficit?: number;
    invitesNeeded?: number;
  };
}

export function PrivateProgramInvitePanel({ programId, initialSettings, inviteMetrics }: Props) {
  const [settings, setSettings] = useState<PrivateSettings>({
    ...defaultSettings,
    ...initialSettings,
    assetTags: initialSettings?.assetTags?.length ? initialSettings.assetTags : defaultSettings.assetTags,
  });
  const [metrics, setMetrics] = useState(inviteMetrics || {});
  const [eligibleResearchers, setEligibleResearchers] = useState<any[]>([]);
  const [isLoadingEligible, setIsLoadingEligible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        ...defaultSettings,
        ...initialSettings,
        assetTags: initialSettings.assetTags?.length ? initialSettings.assetTags : defaultSettings.assetTags,
      });
    }
  }, [initialSettings]);

  const fetchEligible = async () => {
    setIsLoadingEligible(true);
    try {
      const res = await apiFetch(`/company/programs/${programId}/eligible-researchers`);
      const json = await res.json();
      if (res.ok) setEligibleResearchers(json.data || []);
      else toast({ title: 'Error', description: json.message || 'Failed to load researchers', variant: 'destructive' });
    } finally {
      setIsLoadingEligible(false);
    }
  };

  useEffect(() => {
    fetchEligible();
  }, [programId]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch(`/company/programs/${programId}/private-settings`, {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: json.message || 'Failed to save settings', variant: 'destructive' });
        return;
      }
      setSettings(json.data.privateInviteSettings);
      setMetrics(json.data.metrics);
      toast({ title: 'Saved', description: 'Private invite settings updated.' });
      fetchEligible();
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const inviteResearcher = async (researcherId: string) => {
    setInvitingId(researcherId);
    try {
      const res = await apiFetch(`/company/programs/${programId}/invite-researcher`, {
        method: 'POST',
        body: JSON.stringify({ researcherId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: json.message || 'Invite failed', variant: 'destructive' });
        return;
      }
      toast({ title: 'Invite sent', description: 'Researcher will receive a personalized email.' });
      setEligibleResearchers((prev) =>
        prev.map((r) => (r.researcherId === researcherId ? { ...r, inviteStatus: 'invited' } : r)),
      );
    } finally {
      setInvitingId(null);
    }
  };

  const toggleAssetTag = (tag: string) => {
    setSettings((prev) => ({
      ...prev,
      assetTags: prev.assetTags.includes(tag)
        ? prev.assetTags.filter((t) => t !== tag)
        : [...prev.assetTags, tag],
    }));
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border p-5 bg-muted/10">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase mb-2">
              <Target className="h-4 w-4" /> 30-day volume
            </div>
            <p className="text-3xl font-bold font-mono">{metrics.actualReportsLast30Days ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Target: {settings.targetMonthlyReports}</p>
          </div>
          <div className="rounded-2xl border border-border p-5 bg-muted/10">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase mb-2">
              <Zap className="h-4 w-4" /> Report deficit
            </div>
            <p className="text-3xl font-bold font-mono text-amber-500">{metrics.deficit ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Triggers auto-invite scaling</p>
          </div>
          <div className="rounded-2xl border border-border p-5 bg-muted/10">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase mb-2">
              <Users className="h-4 w-4" /> Invites needed (est.)
            </div>
            <p className="text-3xl font-bold font-mono">{metrics.invitesNeeded ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">×{settings.inviteToReportMultiplier} invite-to-report ratio</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-6 space-y-6 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Automatic Private Invites</h3>
              <p className="text-sm text-muted-foreground">Daily cron scales invites when 30-day report volume is below target.</p>
            </div>
            <div className="flex items-center gap-2">
              <FieldLabel label="Enabled" helpKey="autoInvite" />
              <Switch
                id="auto-invite"
                checked={settings.autoInviteEnabled}
                onCheckedChange={(c) => setSettings((s) => ({ ...s, autoInviteEnabled: c }))}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <FieldLabel label="Target reports / 30 days" helpKey="targetReports" />
              <Input type="number" value={settings.targetMonthlyReports} onChange={(e) => setSettings((s) => ({ ...s, targetMonthlyReports: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Invite multiplier" helpKey="multiplier" />
              <Input type="number" value={settings.inviteToReportMultiplier} onChange={(e) => setSettings((s) => ({ ...s, inviteToReportMultiplier: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Daily invite batch size" helpKey="batchSize" />
              <Input type="number" value={settings.dailyInviteBatchSize} onChange={(e) => setSettings((s) => ({ ...s, dailyInviteBatchSize: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Min SNR %" helpKey="minSnr" />
              <Input type="number" value={settings.minSnrPercent} onChange={(e) => setSettings((s) => ({ ...s, minSnrPercent: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Min reputation" helpKey="minReputation" />
              <Input type="number" value={settings.minReputationScore} onChange={(e) => setSettings((s) => ({ ...s, minReputationScore: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Min impact (avg CVSS)" helpKey="minImpact" />
              <Input type="number" step="0.1" value={settings.minImpactScore} onChange={(e) => setSettings((s) => ({ ...s, minImpactScore: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Max active private invites / researcher" helpKey="maxInvites" />
              <Input type="number" value={settings.maxActivePrivateInvitesPerResearcher} onChange={(e) => setSettings((s) => ({ ...s, maxActivePrivateInvitesPerResearcher: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Activity lookback (days)" helpKey="lookback" />
              <Input type="number" value={settings.lookbackDays} onChange={(e) => setSettings((s) => ({ ...s, lookbackDays: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel label="Asset tags for skill matching" helpKey="assetTags" />
            <div className="flex flex-wrap gap-2">
              {ASSET_TAG_OPTIONS.map((tag) => (
                <Badge
                  key={tag}
                  variant={settings.assetTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleAssetTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={saveSettings} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save invite settings'}
          </Button>
        </div>

        <div className="rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Eligible Researchers</h3>
              <p className="text-sm text-muted-foreground">
                All researchers who submitted on your other programs, ranked by priority score. Auto-invite uses stricter gates; you can still send manual invites.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchEligible} disabled={isLoadingEligible}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoadingEligible && 'animate-spin')} /> Refresh
            </Button>
          </div>

          {isLoadingEligible ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : eligibleResearchers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No researchers have submitted reports on your company programs yet. Once researchers file reports on your BBP/VDP programs, they will appear here ranked by trust and skill fit.
            </p>
          ) : (
            <div className="space-y-3">
              {eligibleResearchers.map((r, index) => (
                <div key={r.researcherId} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-border p-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                      <p className="font-medium">{r.name} <span className="text-muted-foreground text-sm">@{r.username}</span></p>
                      {r.eligibleForAutoInvite ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Auto-eligible</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/30">Manual invite only</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      Priority {Math.round(r.compositeScore)} · SNR {r.snrPercent}% · Impact {r.impactScore} · Rep {r.reputationScore} · Asset match {r.assetMatchScore}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.validReports}/{r.totalReports} valid reports · {r.activePrivateInvites} active invites</p>
                    {!r.eligibleForAutoInvite && r.gateReasons?.length > 0 && (
                      <p className="text-xs text-amber-600/90">Auto-invite blocked: {r.gateReasons.join(' · ')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.inviteStatus && <Badge variant="secondary" className="capitalize">{r.inviteStatus}</Badge>}
                    <Button
                      size="sm"
                      onClick={() => inviteResearcher(r.researcherId)}
                      disabled={invitingId === r.researcherId || r.inviteStatus === 'invited' || r.inviteStatus === 'accepted'}
                    >
                      {r.inviteStatus === 'accepted' ? 'Accepted' : r.inviteStatus === 'invited' ? 'Invited' : 'Send invite'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
