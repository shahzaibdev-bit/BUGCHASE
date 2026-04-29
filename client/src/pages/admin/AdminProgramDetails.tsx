import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Lock,
  Target,
  Award,
  Clock,
  Pencil,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GlassCard } from '@/components/ui/glass-card';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';

import ModerateProgramDialog, { type ModerateProgramPayload } from '@/components/admin/ModerateProgramDialog';
import { API_URL } from '@/config';

type EditSection =
  | null
  | 'description'
  | 'rulesOfEngagement'
  | 'safeHarbor'
  | 'submissionGuidelines'
  | 'rewards'
  | 'scope'
  | 'outOfScope'
  | 'bountyRange';

type ProgramReportRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  submittedAt: string;
  bounty: number;
  researcher: string;
};

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

function isVdpProgram(p: any) {
  return String(p?.type || '').toUpperCase() === 'VDP';
}

function defaultRewardsDraft(program: any) {
  const out: Record<string, { min: string; max: string }> = {};
  for (const s of SEVERITIES) {
    const r = program?.rewards?.[s];
    out[s] = {
      min: r?.min != null ? String(r.min) : '0',
      max: r?.max != null ? String(r.max) : '0',
    };
  }
  return out;
}

export default function AdminProgramDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const adminReturnTo = (location.state as { adminReturnTo?: string } | null)?.adminReturnTo;
  const goBack = () => navigate(adminReturnTo || '/admin/programs');
  const programReturnPath = `/admin/programs/${id}`;

  const [program, setProgram] = useState<any>(null);
  const [hallOfFame, setHallOfFame] = useState<any[]>([]);
  const [programReports, setProgramReports] = useState<ProgramReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moderateMode, setModerateMode] = useState<null | 'suspend' | 'ban'>(null);

  const [editSection, setEditSection] = useState<EditSection>(null);
  const [htmlDraft, setHtmlDraft] = useState('');
  const [scopeJsonDraft, setScopeJsonDraft] = useState('');
  const [rewardsDraft, setRewardsDraft] = useState<Record<string, { min: string; max: string }>>({});
  const [bountyRangeDraft, setBountyRangeDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchProgram = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const adminRes = await fetch(`${API_URL}/admin/programs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const adminData = await adminRes.json();
      if (adminData.status === 'success') {
        setProgram(adminData.data.program);
        setHallOfFame(adminData.data.hallOfFame || []);
        setProgramReports(adminData.data.programReports || []);
      }
    } catch (error) {
      console.error('Failed to fetch program details', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgram();
  }, [id]);

  const patchProgram = useCallback(
    async (body: Record<string, unknown>) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/programs/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Update failed');
      }
      if (json.data?.program) {
        setProgram(json.data.program);
      } else {
        await fetchProgram();
      }
    },
    [id]
  );

  const openEdit = (section: EditSection) => {
    if (!program || !section) return;
    if (isVdpProgram(program) && (section === 'rewards' || section === 'bountyRange')) return;
    setEditSection(section);
    if (section === 'description') setHtmlDraft(program.description || '');
    if (section === 'rulesOfEngagement') setHtmlDraft(program.rulesOfEngagement || '');
    if (section === 'safeHarbor') setHtmlDraft(program.safeHarbor || '');
    if (section === 'submissionGuidelines') setHtmlDraft(program.submissionGuidelines || '');
    if (section === 'scope') setScopeJsonDraft(JSON.stringify(program.scope || [], null, 2));
    if (section === 'outOfScope') setScopeJsonDraft(JSON.stringify(program.outOfScope || [], null, 2));
    if (section === 'rewards') setRewardsDraft(defaultRewardsDraft(program));
    if (section === 'bountyRange') setBountyRangeDraft(program.bountyRange || '');
  };

  const closeEdit = () => {
    setEditSection(null);
    setHtmlDraft('');
    setScopeJsonDraft('');
    setSavingEdit(false);
  };

  const saveEdit = async () => {
    if (!editSection) return;
    if (program && isVdpProgram(program) && (editSection === 'rewards' || editSection === 'bountyRange')) {
      closeEdit();
      return;
    }
    setSavingEdit(true);
    try {
      if (
        editSection === 'description' ||
        editSection === 'rulesOfEngagement' ||
        editSection === 'safeHarbor' ||
        editSection === 'submissionGuidelines'
      ) {
        await patchProgram({ [editSection]: htmlDraft });
        toast.success('Saved');
      } else if (editSection === 'scope' || editSection === 'outOfScope') {
        let parsed: unknown;
        try {
          parsed = JSON.parse(scopeJsonDraft);
        } catch {
          toast.error('Invalid JSON');
          setSavingEdit(false);
          return;
        }
        if (!Array.isArray(parsed)) {
          toast.error('Must be a JSON array');
          setSavingEdit(false);
          return;
        }
        await patchProgram({ [editSection]: parsed });
        toast.success('Saved');
      } else if (editSection === 'rewards') {
        const rewards: Record<string, { min: number; max: number }> = {};
        for (const s of SEVERITIES) {
          const row = rewardsDraft[s] || { min: '0', max: '0' };
          rewards[s] = {
            min: Number(row.min) || 0,
            max: Number(row.max) || 0,
          };
        }
        await patchProgram({ rewards });
        toast.success('Saved');
      } else if (editSection === 'bountyRange') {
        await patchProgram({ bountyRange: bountyRangeDraft });
        toast.success('Saved');
      }
      closeEdit();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
      setSavingEdit(false);
    }
  };

  const requestProgramStatusChange = async (
    newStatus: string,
    extra?: { reason?: string; commentHtml?: string; banDurationKey?: string }
  ) => {
    const body: Record<string, string> = { status: newStatus };
    if (extra?.reason) body.reason = extra.reason;
    if (extra?.commentHtml) body.commentHtml = extra.commentHtml;
    if (extra?.banDurationKey) body.banDurationKey = extra.banDurationKey;

    const token = localStorage.getItem('token');
    let res: Response;
    try {
      res = await fetch(`${API_URL}/admin/programs/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      toast.error('Network error');
      throw new Error('PROGRAM_STATUS_API_ERROR');
    }
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.data?.program) {
      setProgram(json.data.program);
      toast.success(`Program marked as ${newStatus}`);
      return;
    }
    const msg = json.message || 'Failed to update status';
    toast.error(msg);
    throw new Error('PROGRAM_STATUS_API_ERROR');
  };

  const handleAction = async (
    newStatus: string,
    extra?: { reason?: string; commentHtml?: string; banDurationKey?: string }
  ) => {
    try {
      await requestProgramStatusChange(newStatus, extra);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'PROGRAM_STATUS_API_ERROR') {
        return;
      }
      toast.error('Network error');
    }
  };

  const handleModerationSubmit = async (p: ModerateProgramPayload) => {
    const reason = p.presetReason === 'Other' ? p.otherSpecify : p.presetReason;
    if (!reason?.trim()) {
      toast.error('Reason is required');
      throw new Error('PROGRAM_STATUS_API_ERROR');
    }
    if (moderateMode === 'ban') {
      await requestProgramStatusChange('Banned', {
        reason: reason.trim(),
        commentHtml: p.commentHtml,
        banDurationKey: p.banDurationKey,
      });
    } else {
      await requestProgramStatusChange('Suspended', {
        reason: reason.trim(),
        commentHtml: p.commentHtml,
      });
    }
  };

  const editDialogTitle =
    editSection === 'description'
      ? 'Program overview'
      : editSection === 'rulesOfEngagement'
        ? 'Rules of engagement'
        : editSection === 'safeHarbor'
          ? 'Safe harbor'
          : editSection === 'submissionGuidelines'
            ? 'Submission guidelines'
            : editSection === 'scope'
              ? 'In-scope assets (JSON)'
              : editSection === 'outOfScope'
                ? 'Out of scope (JSON)'
                : editSection === 'rewards'
                  ? 'Reward structure'
                  : editSection === 'bountyRange'
                    ? 'Bounty range'
                    : 'Edit';

  if (isLoading) return <div className="p-10 text-center font-mono text-zinc-500">Loading Protocol Data...</div>;
  if (!program) return <div className="p-10 text-center font-mono text-zinc-500">Program Not Found</div>;

  const isVdp = isVdpProgram(program);

  return (
    <div className="space-y-6 animate-fade-in pb-10 relative">
      {moderateMode && (
        <ModerateProgramDialog
          isOpen={!!moderateMode}
          onClose={() => setModerateMode(null)}
          mode={moderateMode}
          onSubmit={handleModerationSubmit}
          programName={program.title}
        />
      )}

      <Dialog open={!!editSection} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase">{editDialogTitle}</DialogTitle>
            <DialogDescription>
              {editSection === 'scope' || editSection === 'outOfScope'
                ? 'Edit the JSON array. Each in-scope item may include type, asset, tier; out-of-scope items often use asset and reason.'
                : editSection === 'rewards'
                  ? 'Set min/max bounty amounts per severity (USD in program data; UI may display PKR elsewhere).'
                  : editSection === 'bountyRange'
                    ? 'Short label shown in listings (e.g. $500 - $5000).'
                    : 'Rich text is saved as HTML.'}
            </DialogDescription>
          </DialogHeader>

          {editSection &&
            (editSection === 'description' ||
              editSection === 'rulesOfEngagement' ||
              editSection === 'safeHarbor' ||
              editSection === 'submissionGuidelines') && (
              <div className="min-h-[240px] border border-border rounded-md">
                <CyberpunkEditor content={htmlDraft} onChange={setHtmlDraft} placeholder="Enter content…" />
              </div>
            )}

          {(editSection === 'scope' || editSection === 'outOfScope') && (
            <Textarea
              value={scopeJsonDraft}
              onChange={(e) => setScopeJsonDraft(e.target.value)}
              className="font-mono text-sm min-h-[280px]"
            />
          )}

          {editSection === 'rewards' && (
            <div className="space-y-3">
              {SEVERITIES.map((s) => (
                <div key={s} className="grid grid-cols-3 gap-2 items-center">
                  <Badge variant="outline" className="capitalize justify-center w-full">
                    {s}
                  </Badge>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={rewardsDraft[s]?.min ?? '0'}
                    onChange={(e) =>
                      setRewardsDraft((prev) => ({
                        ...prev,
                        [s]: { ...prev[s], min: e.target.value, max: prev[s]?.max ?? '0' },
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={rewardsDraft[s]?.max ?? '0'}
                    onChange={(e) =>
                      setRewardsDraft((prev) => ({
                        ...prev,
                        [s]: { ...prev[s], max: e.target.value, min: prev[s]?.min ?? '0' },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {editSection === 'bountyRange' && (
            <Input
              value={bountyRangeDraft}
              onChange={(e) => setBountyRangeDraft(e.target.value)}
              placeholder="$500 - $5000"
            />
          )}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header / Nav */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-tight flex items-center gap-3">
            {program.title}
            {program.isPrivate && <Lock className="h-4 w-4 text-zinc-500" />}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 font-mono">
            <Building2 className="h-3 w-3" />
            {program.companyId?.name || program.companyName}
            <span>•</span>
            <span className="uppercase">{program.type}</span>
            {isVdp && (
              <Badge variant="secondary" className="text-[10px] font-mono ml-1">
                VDP
              </Badge>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {program.status === 'Pending' && (
            <>
              <Button onClick={() => handleAction('Active')} className="bg-foreground text-background hover:bg-foreground/90 font-mono gap-2">
                <CheckCircle className="h-4 w-4" /> APPROVE_PROGRAM
              </Button>
              <Button onClick={() => handleAction('Rejected')} variant="outline" className="font-mono gap-2 border-border text-foreground hover:bg-accent">
                <XCircle className="h-4 w-4" /> REJECT
              </Button>
            </>
          )}
          {program.status === 'Active' && (
            <>
              <Button
                onClick={() => setModerateMode('suspend')}
                variant="outline"
                className="text-foreground border-border hover:bg-accent font-mono gap-2"
              >
                <AlertTriangle className="h-4 w-4" /> Suspend
              </Button>
              <Button
                onClick={() => setModerateMode('ban')}
                variant="outline"
                className="text-red-600 border-red-500/40 hover:bg-red-500/10 font-mono gap-2"
              >
                <Ban className="h-4 w-4" /> Ban
              </Button>
            </>
          )}
          {program.status === 'Suspended' && (
            <>
              <Button onClick={() => handleAction('Active')} className="bg-foreground text-background hover:bg-foreground/90 font-mono gap-2">
                <CheckCircle className="h-4 w-4" /> Reactivate
              </Button>
              <Button
                onClick={() => setModerateMode('ban')}
                variant="outline"
                className="text-red-600 border-red-500/40 hover:bg-red-500/10 font-mono gap-2"
              >
                <Ban className="h-4 w-4" /> Ban
              </Button>
            </>
          )}
          {program.status === 'Rejected' && (
            <Button onClick={() => handleAction('Active')} className="bg-foreground text-background hover:bg-foreground/90 font-mono gap-2">
              <CheckCircle className="h-4 w-4" /> Activate
            </Button>
          )}
          {program.status === 'Banned' && (
            <Button onClick={() => handleAction('Active')} className="bg-foreground text-background hover:bg-foreground/90 font-mono gap-2">
              <CheckCircle className="h-4 w-4" /> Reactivate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-lg font-bold font-mono uppercase flex items-center gap-2">
                <Shield className="h-5 w-5 text-foreground" /> Program Overview
              </h3>
              <Button variant="outline" size="sm" className="font-mono gap-1" onClick={() => openEdit('description')}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
            <div
              className="prose dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-400"
              dangerouslySetInnerHTML={{ __html: program.description || '<p class="italic text-zinc-500">No description yet.</p>' }}
            />
          </GlassCard>

          {/* Policies — always shown (BBP & VDP) */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold font-mono uppercase mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-foreground" /> Policies & Guidelines
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold font-mono uppercase text-zinc-800 dark:text-zinc-300">Rules of Engagement</h4>
                  <Button variant="ghost" size="sm" className="font-mono gap-1 h-8" onClick={() => openEdit('rulesOfEngagement')}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
                {program.rulesOfEngagement ? (
                  <div className="prose dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-400" dangerouslySetInnerHTML={{ __html: program.rulesOfEngagement }} />
                ) : (
                  <p className="text-sm text-zinc-500 italic">No content yet.</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold font-mono uppercase text-zinc-800 dark:text-zinc-300">Safe Harbor</h4>
                  <Button variant="ghost" size="sm" className="font-mono gap-1 h-8" onClick={() => openEdit('safeHarbor')}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
                {program.safeHarbor ? (
                  <div className="prose dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-400" dangerouslySetInnerHTML={{ __html: program.safeHarbor }} />
                ) : (
                  <p className="text-sm text-zinc-500 italic">No content yet.</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold font-mono uppercase text-zinc-800 dark:text-zinc-300">Submission Guidelines</h4>
                  <Button variant="ghost" size="sm" className="font-mono gap-1 h-8" onClick={() => openEdit('submissionGuidelines')}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
                {program.submissionGuidelines ? (
                  <div className="prose dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-400" dangerouslySetInnerHTML={{ __html: program.submissionGuidelines }} />
                ) : (
                  <p className="text-sm text-zinc-500 italic">No content yet.</p>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Scope */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-lg font-bold font-mono uppercase flex items-center gap-2">
                <Target className="h-5 w-5 text-foreground" /> Scope Assets
              </h3>
              <Button variant="outline" size="sm" className="font-mono gap-1" onClick={() => openEdit('scope')}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
            <div className="space-y-3">
              {(program.scope || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded text-[10px] font-mono font-bold uppercase w-16 text-center">
                      {item.type || 'ASSET'}
                    </div>
                    <span className="font-mono text-sm">{item.asset}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {item.tier || 'Tier 1'}
                  </Badge>
                </div>
              ))}
              {(!program.scope || program.scope.length === 0) && <div className="text-sm text-zinc-500 italic">No scope assets defined.</div>}
            </div>
          </GlassCard>

          {/* Out of Scope */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-lg font-bold font-mono uppercase flex items-center gap-2">
                <XCircle className="h-5 w-5 text-foreground" /> Out of Scope
              </h3>
              <Button variant="outline" size="sm" className="font-mono gap-1" onClick={() => openEdit('outOfScope')}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
            <div className="space-y-3">
              {(program.outOfScope || []).map((item: any, i: number) => (
                <div key={i} className="flex flex-col p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                  <span className="font-mono text-sm font-bold text-red-400">{item.asset}</span>
                  <span className="text-xs text-red-400/70 mt-1">{item.reason}</span>
                </div>
              ))}
              {(!program.outOfScope || program.outOfScope.length === 0) && (
                <div className="text-sm text-zinc-500 italic">No out-of-scope items defined.</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="text-center">
              <div
                className={`inline-flex items-center justify-center p-3 rounded-full mb-4 border ${
                  program.status === 'Active'
                    ? 'bg-accent text-foreground border-border'
                    : program.status === 'Pending'
                      ? 'bg-accent text-foreground border-border'
                      : program.status === 'Rejected'
                        ? 'bg-accent text-foreground border-border'
                        : program.status === 'Banned'
                          ? 'bg-red-500/15 text-red-500 border-red-500/30'
                          : 'bg-zinc-500/10 text-zinc-500 border-transparent'
                }`}
              >
                {program.status === 'Active' ? (
                  <CheckCircle className="h-8 w-8" />
                ) : program.status === 'Pending' ? (
                  <Clock className="h-8 w-8" />
                ) : program.status === 'Rejected' ? (
                  <XCircle className="h-8 w-8" />
                ) : program.status === 'Banned' ? (
                  <Ban className="h-8 w-8" />
                ) : (
                  <AlertTriangle className="h-8 w-8" />
                )}
              </div>
              <h3 className="text-xl font-bold font-mono uppercase">{program.status}</h3>
              <p className="text-xs text-muted-foreground mt-1">Current Program State</p>
              {program.status === 'Banned' && program.bannedUntil && (
                <p className="mt-3 text-xs font-mono text-amber-600 dark:text-amber-500">
                  Auto-lifts on {new Date(program.bannedUntil).toLocaleString()}
                </p>
              )}
              {program.status === 'Banned' && !program.bannedUntil && (
                <p className="mt-3 text-xs font-mono text-muted-foreground">Permanent ban — reactivate manually.</p>
              )}
              {program.suspensionReason && (
                <div className="mt-4 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 font-mono text-xs whitespace-pre-wrap">
                  <span className="font-bold block mb-1">REASON:</span>
                  {program.suspensionReason}
                </div>
              )}
            </div>
            <Separator className="my-4" />
            <div className="space-y-3">
              <div className="flex justify-between text-sm items-center gap-2">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Submitted</span>
                <span className="font-mono text-foreground">{new Date(program.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Type</span>
                <span className="font-mono uppercase text-foreground">{program.type}</span>
              </div>
              {!isVdp && (
                <div className="flex justify-between text-sm items-start gap-2">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium shrink-0">Bounty Range</span>
                  <div className="flex items-center gap-2 justify-end flex-wrap">
                    <span className="font-mono text-foreground text-right">
                      {program.bountyRange?.replace(/\$/g, 'PKR ') || 'N/A'}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEdit('bountyRange')} aria-label="Edit bounty range">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {!isVdp && (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-bold font-mono uppercase flex items-center gap-2">
                  <Award className="h-4 w-4 text-foreground" /> Reward Structure
                </h3>
                <Button variant="outline" size="sm" className="font-mono gap-1 h-8" onClick={() => openEdit('rewards')}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>
              <div className="space-y-2">
                {SEVERITIES.map((severity) => {
                  const reward = program.rewards?.[severity];
                  return (
                    <div key={severity} className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900/30">
                      <Badge variant="outline" className="capitalize w-20 justify-center border-border text-foreground">
                        {severity}
                      </Badge>
                      <span className="font-mono text-xs">
                        {reward ? `$${reward.min} - $${reward.max}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          <GlassCard className="p-6">
            <h3 className="text-sm font-bold font-mono uppercase mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-foreground" /> Publisher Info
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={program.companyId?.avatar} className="object-cover" />
                <AvatarFallback className="font-mono bg-zinc-800 text-zinc-300">
                  {program.companyId?.name?.substring(0, 2).toUpperCase() || 'CO'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-foreground">{program.companyId?.name || program.companyName}</p>
                <p className="text-xs text-muted-foreground">{program.companyId?.email || 'No email provided'}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Industry</span>
                <span className="font-mono text-foreground">{program.companyId?.industry || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Location</span>
                <span className="font-mono text-foreground">{program.companyId?.city || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Domain Verified</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {program.companyId?.verifiedAssets && program.companyId.verifiedAssets.length > 0 ? (
                    <CheckCircle className="inline h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="inline h-4 w-4 text-muted-foreground" />
                  )}
                </span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-bold font-mono uppercase mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-foreground" /> Hall of Fame
            </h3>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 font-mono">
              {hallOfFame.length} researcher{hallOfFame.length !== 1 ? 's' : ''} have worked on this program so far.
            </div>
            <div className="space-y-3">
              {hallOfFame.length > 0 ? (
                hallOfFame.slice(0, 5).map((researcher: any, idx: number) => (
                  <div key={researcher._id} className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900/30">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4 text-right">#{idx + 1}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={researcher.avatar} className="object-cover" />
                        <AvatarFallback className="text-[10px]">{researcher.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{researcher.username}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-border text-foreground">
                      {researcher.reputationScore || 0} REP
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-500 italic p-4 text-center border border-dashed border-border rounded">
                  No researchers have submitted reports yet.
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Reports for this program */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold font-mono uppercase tracking-tight flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Reports under this program
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Open a row to view full admin report details.</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border/30">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 font-mono text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border/20">
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Severity</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Researcher</th>
                <th className="px-4 py-3 text-left font-medium">Bounty</th>
                <th className="px-4 py-3 text-left font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {programReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No reports submitted to this program yet.
                  </td>
                </tr>
              ) : (
                programReports.map((r) => (
                  <tr
                    key={String(r.id)}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() =>
                      navigate(`/admin/reports/${r.id}`, { state: { adminReturnTo: programReturnPath } })
                    }
                  >
                    <td className="px-4 py-3 font-mono text-primary">{String(r.id).slice(0, 8)}…</td>
                    <td className="px-4 py-3 max-w-[220px] truncate font-medium">{r.title}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {r.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 capitalize">{String(r.status).replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">@{r.researcher}</td>
                    <td className="px-4 py-3 font-mono">{r.bounty > 0 ? `PKR ${r.bounty.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
