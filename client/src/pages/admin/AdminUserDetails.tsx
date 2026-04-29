import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Search,
  Shield,
  Building2,
  MoreVertical,
  Sparkles,
  Plus,
  Trash2,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { API_URL } from '@/config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const programStatusColors: Record<string, string> = {
  Active: 'bg-green-500/10 text-green-500 border-green-500/20',
  Pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Suspended: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  Banned: 'bg-red-500/10 text-red-600 border-red-500/25',
  Rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  Draft: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const TRIAGER_EXPERTISE_OPTIONS = [
  'Web',
  'API',
  'Mobile',
  'Cloud',
  'Desktop',
  'IoT',
  'Blockchain',
  'Social engineering',
  'Source code review',
] as const;

const TRIAGER_SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'] as const;

function arrayHasIgnoreCase(arr: string[] | undefined, value: string) {
  return (arr || []).some((x) => String(x).toLowerCase() === value.toLowerCase());
}

const ADMIN_FIELD_LABEL = 'text-[10px] uppercase tracking-widest text-muted-foreground font-semibold';

function TriagerScopeChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border/45 bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground/95 shadow-sm',
        className
      )}
    >
      {children}
    </span>
  );
}

type ReportRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  submittedAt: string;
  bounty: number;
  programId: string;
  program: null | {
    _id: string;
    title: string;
    type?: string;
    status?: string;
    companyName?: string;
    bountyRange?: string;
    createdAt?: string;
    description?: string;
    isPrivate?: boolean;
  };
  researcher: string;
};

const TRIAGER_PAST_STATUSES = new Set([
  'resolved',
  'paid',
  'closed',
  'spam',
  'duplicate',
  'out-of-scope',
  'na',
]);

function splitTriagerReportsByStatus(rows: ReportRow[]) {
  const past = rows.filter((r) => TRIAGER_PAST_STATUSES.has(r.status));
  const active = rows.filter((r) => !TRIAGER_PAST_STATUSES.has(r.status));
  return { active, past };
}

type VerifiedAssetDraft = {
  id: string;
  domain: string;
  method: 'DNS_TXT' | 'SECURITY_TXT';
  dateVerified: string;
  status: 'verified' | 'disabled';
};

function normalizeVerifiedAssets(raw: any[] | undefined): VerifiedAssetDraft[] {
  if (!raw?.length) return [];
  return raw.map((a, index) => ({
    id: a.id || `asset-${index}-${Date.now()}`,
    domain: String(a.domain || ''),
    method: a.method === 'SECURITY_TXT' ? 'SECURITY_TXT' : 'DNS_TXT',
    dateVerified: String(a.dateVerified || new Date().toISOString()),
    status: a.status === 'disabled' ? 'disabled' : 'verified',
  }));
}

function newEmptyAsset(): VerifiedAssetDraft {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    domain: '',
    method: 'DNS_TXT',
    dateVerified: new Date().toISOString(),
    status: 'verified',
  };
}

export default function AdminUserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [editingProfile, setEditingProfile] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'taken' | 'available'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingAssets, setEditingAssets] = useState(false);
  const [assetsDraft, setAssetsDraft] = useState<VerifiedAssetDraft[]>([]);
  const [savingAssets, setSavingAssets] = useState(false);

  const user = data?.user;
  const userDetailPath = `/admin/users/${id}`;
  const submittedReports: ReportRow[] = data?.reports?.submitted || [];
  const triagedReports: ReportRow[] = data?.reports?.triaged || [];
  const triagerActiveFromApi: ReportRow[] | undefined = data?.reports?.triagerActive;
  const triagerPastFromApi: ReportRow[] | undefined = data?.reports?.triagerPast;
  const programs = data?.programs || [];
  const walletTx = data?.wallet?.transactions || [];

  const openCompanyProgram = (programId: string) =>
    navigate(`/admin/programs/${programId}`, { state: { adminReturnTo: userDetailPath } });

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to load user');
      setData(payload.data);
      setForm(payload.data.user);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const activityReports = useMemo(
    () => (user?.role === 'triager' ? triagedReports : submittedReports),
    [user?.role, triagedReports, submittedReports]
  );

  const triagerActiveReports = useMemo(() => {
    if (Array.isArray(triagerActiveFromApi)) return triagerActiveFromApi;
    return splitTriagerReportsByStatus(triagedReports).active;
  }, [triagerActiveFromApi, triagedReports]);

  const triagerPastReports = useMemo(() => {
    if (Array.isArray(triagerPastFromApi)) return triagerPastFromApi;
    return splitTriagerReportsByStatus(triagedReports).past;
  }, [triagerPastFromApi, triagedReports]);

  const filterReportRows = useCallback(
    (rows: ReportRow[]) =>
      rows
        .filter((report) => {
          const matchesSearch =
            (report.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(report.id || '').toLowerCase().includes(searchTerm.toLowerCase());
          const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
          const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
          return matchesSearch && matchesSeverity && matchesStatus;
        })
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [searchTerm, severityFilter, statusFilter]
  );

  const filteredReports = useMemo(
    () => filterReportRows(activityReports),
    [filterReportRows, activityReports]
  );

  const sortedTriagerActive = useMemo(
    () =>
      [...triagerActiveReports].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      ),
    [triagerActiveReports]
  );

  const sortedTriagerPast = useMemo(
    () =>
      [...triagerPastReports].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      ),
    [triagerPastReports]
  );

  useEffect(() => {
    const username = String(form.username || '').trim();
    if (!editingProfile || !username || username.toLowerCase() === String(user?.username || '').toLowerCase()) {
      setUsernameStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setUsernameStatus('checking');
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/users/check-username?username=${encodeURIComponent(username)}&excludeId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json();
        if (res.ok && payload.data?.available) setUsernameStatus('available');
        else setUsernameStatus('taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.username, editingProfile, id, user?.username]);

  const setTriagerMulti = useCallback(
    (field: 'expertise' | 'severityPreferences', option: string, checked: boolean) => {
      setForm((p: any) => {
        const raw = Array.isArray(p[field]) ? [...p[field]] : [];
        const optLower = option.toLowerCase();
        const idx = raw.findIndex((x: string) => String(x).toLowerCase() === optLower);
        if (checked && idx < 0) raw.push(option);
        if (!checked && idx >= 0) raw.splice(idx, 1);
        return { ...p, [field]: raw };
      });
    },
    []
  );

  const saveProfile = async () => {
    if (usernameStatus === 'taken') {
      toast.error('This username is already in use. Choose a different username.');
      return;
    }
    if (usernameStatus === 'checking') {
      toast.error('Still checking username availability. Wait a moment and try again.');
      return;
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const isCompany = user?.role === 'company';
      const isTriager = user?.role === 'triager';
      const showResearcherFinancials = user?.role === 'researcher';
      const body: Record<string, unknown> = {
        name: form.name,
        username: form.username,
        email: form.email,
        country: form.country,
        city: form.city,
        bio: form.bio,
        companyName: form.companyName,
        industry: form.industry,
        website: form.website,
        status: form.status,
      };
      if (showResearcherFinancials) {
        body.isEmailVerified = !!form.isEmailVerified;
        body.isVerified = !!form.isVerified;
        body.walletBalance = Number(form.walletBalance || 0);
      }
      if (isCompany) {
        body.isEmailVerified = !!form.isEmailVerified;
      }
      if (isTriager) {
        body.expertise = Array.isArray(form.expertise) ? form.expertise : [];
        body.severityPreferences = Array.isArray(form.severityPreferences) ? form.severityPreferences : [];
        body.maxConcurrentReports = Math.max(1, parseInt(String(form.maxConcurrentReports ?? 10), 10) || 10);
        body.isAvailable = !!form.isAvailable;
        body.linkedAccounts = {
          github: String(form.linkedAccounts?.github ?? '').trim(),
          linkedin: String(form.linkedAccounts?.linkedin ?? '').trim(),
          twitter: String(form.linkedAccounts?.twitter ?? '').trim(),
        };
      }
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) {
        const msg = payload.message || 'Failed to save';
        if (/username|taken|already/i.test(msg)) {
          toast.error('That username already exists in the system. Choose another.');
        } else {
          toast.error(msg);
        }
        return;
      }
      toast.success('User profile updated');
      await fetchDetails();
      setEditingProfile(false);
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const saveVerifiedAssets = async () => {
    setSavingAssets(true);
    try {
      const token = localStorage.getItem('token');
      const prevById = new Map<string, any>(
        (user?.verifiedAssets || []).map((x: any) => [String(x.id || ''), x])
      );
      const verifiedAssets = assetsDraft
        .filter((a) => a.domain.trim())
        .map((a) => {
          const prev = prevById.get(a.id);
          return {
            id: a.id,
            domain: a.domain.trim(),
            method: a.method,
            dateVerified: a.dateVerified,
            status: a.status,
            verificationToken: prev?.verificationToken != null ? String(prev.verificationToken) : '',
            inScope: Array.isArray(prev?.inScope) ? prev.inScope.map(String) : [],
            outScope: Array.isArray(prev?.outScope) ? prev.outScope.map(String) : [],
          };
        });
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verifiedAssets }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to save assets');
      toast.success('Verified assets updated');
      await fetchDetails();
      setEditingAssets(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save verified assets');
    } finally {
      setSavingAssets(false);
    }
  };

  const startEditAssets = () => {
    setAssetsDraft(normalizeVerifiedAssets(user?.verifiedAssets));
    setEditingAssets(true);
  };

  const toggleWalletHold = async (checked: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/users/${id}/wallet-hold`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payoutHold: checked }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to change wallet hold');
      setData((prev: any) => ({ ...prev, user: payload.data.user, wallet: { ...prev.wallet, payoutHold: checked } }));
      setForm((prev: any) => ({ ...prev, payoutHold: checked }));
      toast.success(checked ? 'Wallet withdrawals are now on hold' : 'Wallet withdrawals resumed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle wallet hold');
    }
  };

  if (isLoading) return <div className="p-8">Loading user details...</div>;
  if (!user) return <div className="p-8">User not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {user.email} · {user.role}
            {user.username ? ` · @${user.username}` : ''}
          </p>
        </div>
      </div>

      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{user.role === 'triager' ? 'Triager profile' : 'User profile'}</h2>
          {!editingProfile ? (
            <Button variant="outline" onClick={() => setEditingProfile(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingProfile(false);
                  setForm(user);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveProfile}
                disabled={isSaving || usernameStatus === 'taken' || usernameStatus === 'checking'}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Name</p>
            {editingProfile ? (
              <Input value={form.name || ''} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} />
            ) : (
              <p className="font-medium">{user.name || '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Username</p>
            {editingProfile ? (
              <>
                <Input value={form.username || ''} onChange={(e) => setForm((p: any) => ({ ...p, username: e.target.value }))} />
                {usernameStatus === 'checking' && <p className="text-xs text-muted-foreground">Checking username...</p>}
                {usernameStatus === 'taken' && (
                  <p className="text-xs text-red-500">
                    This username already exists in the system. Choose a different one.
                  </p>
                )}
                {usernameStatus === 'available' && <p className="text-xs text-emerald-500">Username is available</p>}
              </>
            ) : (
              <p className="font-medium">{user.username ? `@${user.username}` : '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Email</p>
            {editingProfile ? (
              <Input value={form.email || ''} onChange={(e) => setForm((p: any) => ({ ...p, email: e.target.value }))} />
            ) : (
              <p className="font-medium">{user.email || '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            {editingProfile ? (
              <Select value={form.status || 'Active'} onValueChange={(v) => setForm((p: any) => ({ ...p, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="font-medium">{user.status || '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Country</p>
            {editingProfile ? (
              <Input value={form.country || ''} onChange={(e) => setForm((p: any) => ({ ...p, country: e.target.value }))} />
            ) : (
              <p className="font-medium">{user.country || '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">City</p>
            {editingProfile ? (
              <Input value={form.city || ''} onChange={(e) => setForm((p: any) => ({ ...p, city: e.target.value }))} />
            ) : (
              <p className="font-medium">{user.city || '-'}</p>
            )}
          </div>
          {user.role === 'triager' && (
            <div className="md:col-span-2 pt-6">
              <div className="rounded-xl border border-border/35 bg-muted/15 px-4 py-5 sm:px-6 sm:py-6 space-y-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">Triage configuration</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                      Preferences used for routing and capacity. Edit to update expertise, severity focus, limits, and
                      public profile links.
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className={ADMIN_FIELD_LABEL}>Member since</p>
                    <p className="text-sm font-medium tabular-nums mt-1.5 text-foreground">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
                  <div className="space-y-2.5">
                    <p className={ADMIN_FIELD_LABEL}>Expertise areas</p>
                    {(() => {
                      const expertiseSrc = editingProfile ? form.expertise : user.expertise;
                      const orphanExpertise = (expertiseSrc || []).filter(
                        (ex: string) =>
                          !TRIAGER_EXPERTISE_OPTIONS.some(
                            (o) => o.toLowerCase() === String(ex).toLowerCase()
                          )
                      );
                      if (!editingProfile) {
                        return (
                          <div className="min-h-[2rem] flex flex-wrap gap-2 content-start">
                            {(expertiseSrc || []).length ? (
                              (expertiseSrc || []).map((ex: string) => (
                                <TriagerScopeChip key={ex}>{ex}</TriagerScopeChip>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None specified</span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {TRIAGER_EXPERTISE_OPTIONS.map((opt) => (
                              <label
                                key={opt}
                                htmlFor={`triager-expertise-${opt}`}
                                className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 cursor-pointer hover:bg-muted/35 transition-colors"
                              >
                                <Checkbox
                                  id={`triager-expertise-${opt}`}
                                  checked={arrayHasIgnoreCase(expertiseSrc, opt)}
                                  onCheckedChange={(v) => setTriagerMulti('expertise', opt, v === true)}
                                />
                                <span className="text-sm font-medium leading-none">{opt}</span>
                              </label>
                            ))}
                          </div>
                          {orphanExpertise.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/80">Also on file: </span>
                              {orphanExpertise.join(', ')}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-2.5">
                    <p className={ADMIN_FIELD_LABEL}>Severity preferences</p>
                    {(() => {
                      const sevSrc = editingProfile ? form.severityPreferences : user.severityPreferences;
                      const orphanSev = (sevSrc || []).filter(
                        (s: string) =>
                          !TRIAGER_SEVERITY_OPTIONS.some(
                            (o) => o.toLowerCase() === String(s).toLowerCase()
                          )
                      );
                      if (!editingProfile) {
                        return (
                          <div className="min-h-[2rem] flex flex-wrap gap-2 content-start">
                            {(sevSrc || []).length ? (
                              (sevSrc || []).map((s: string) => (
                                <TriagerScopeChip key={s} className="capitalize">
                                  {s}
                                </TriagerScopeChip>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None specified</span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {TRIAGER_SEVERITY_OPTIONS.map((opt) => (
                              <label
                                key={opt}
                                htmlFor={`triager-severity-${opt}`}
                                className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 cursor-pointer hover:bg-muted/35 transition-colors"
                              >
                                <Checkbox
                                  id={`triager-severity-${opt}`}
                                  checked={arrayHasIgnoreCase(sevSrc, opt)}
                                  onCheckedChange={(v) => setTriagerMulti('severityPreferences', opt, v === true)}
                                />
                                <span className="text-sm font-medium leading-none">{opt}</span>
                              </label>
                            ))}
                          </div>
                          {orphanSev.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/80">Also on file: </span>
                              {orphanSev.join(', ')}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-border/30">
                  <div className="space-y-2.5">
                    <p className={ADMIN_FIELD_LABEL}>Max concurrent reports</p>
                    {editingProfile ? (
                      <Input
                        type="number"
                        min={1}
                        className="max-w-[12rem]"
                        value={form.maxConcurrentReports ?? user.maxConcurrentReports ?? 10}
                        onChange={(e) => setForm((p: any) => ({ ...p, maxConcurrentReports: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-semibold tabular-nums">{user.maxConcurrentReports ?? 10}</p>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <p className={ADMIN_FIELD_LABEL}>Assignment availability</p>
                    {editingProfile ? (
                      <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 w-fit">
                        <Switch
                          checked={!!form.isAvailable}
                          onCheckedChange={(v) => setForm((p: any) => ({ ...p, isAvailable: v }))}
                        />
                        <span className="text-sm font-medium">{form.isAvailable ? 'Accepting assignments' : 'Not accepting'}</span>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium w-fit',
                          user.isAvailable !== false
                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'border-border/50 bg-muted/40 text-muted-foreground'
                        )}
                      >
                        {user.isAvailable !== false ? (
                          <CheckCircle className="h-4 w-4 shrink-0 opacity-90" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 opacity-80" />
                        )}
                        {user.isAvailable !== false ? 'Accepting assignments' : 'Not accepting assignments'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-border/30">
                  <p className={ADMIN_FIELD_LABEL}>Linked accounts</p>
                  {editingProfile ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        placeholder="GitHub URL"
                        value={form.linkedAccounts?.github || ''}
                        onChange={(e) =>
                          setForm((p: any) => ({
                            ...p,
                            linkedAccounts: { ...(p.linkedAccounts || {}), github: e.target.value },
                          }))
                        }
                        className="font-mono text-xs h-10"
                      />
                      <Input
                        placeholder="LinkedIn URL"
                        value={form.linkedAccounts?.linkedin || ''}
                        onChange={(e) =>
                          setForm((p: any) => ({
                            ...p,
                            linkedAccounts: { ...(p.linkedAccounts || {}), linkedin: e.target.value },
                          }))
                        }
                        className="font-mono text-xs h-10"
                      />
                      <Input
                        placeholder="Twitter / X URL"
                        value={form.linkedAccounts?.twitter || ''}
                        onChange={(e) =>
                          setForm((p: any) => ({
                            ...p,
                            linkedAccounts: { ...(p.linkedAccounts || {}), twitter: e.target.value },
                          }))
                        }
                        className="font-mono text-xs h-10"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {(
                        [
                          { key: 'github', label: 'GitHub', url: user.linkedAccounts?.github },
                          { key: 'linkedin', label: 'LinkedIn', url: user.linkedAccounts?.linkedin },
                          { key: 'twitter', label: 'Twitter / X', url: user.linkedAccounts?.twitter },
                        ] as const
                      ).map(({ key, label, url }) => (
                        <div key={key} className="rounded-lg border border-border/35 bg-background/40 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                          {url ? (
                            <a
                              href={url}
                              className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline break-all"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <span className="line-clamp-2">{url.replace(/^https?:\/\//i, '')}</span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            </a>
                          ) : (
                            <p className="mt-1.5 text-sm text-muted-foreground">—</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {user.role === 'company' && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Company name</p>
                {editingProfile ? (
                  <Input value={form.companyName || ''} onChange={(e) => setForm((p: any) => ({ ...p, companyName: e.target.value }))} />
                ) : (
                  <p className="font-medium">{user.companyName || '-'}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Industry</p>
                {editingProfile ? (
                  <Input value={form.industry || ''} onChange={(e) => setForm((p: any) => ({ ...p, industry: e.target.value }))} />
                ) : (
                  <p className="font-medium">{user.industry || '-'}</p>
                )}
              </div>
            </>
          )}
          {user.role === 'researcher' && (
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs text-muted-foreground">Wallet balance (PKR)</p>
              {editingProfile ? (
                <Input
                  type="number"
                  value={form.walletBalance ?? user.walletBalance ?? 0}
                  onChange={(e) => setForm((p: any) => ({ ...p, walletBalance: e.target.value }))}
                />
              ) : (
                <p className="font-medium">PKR {Number(user.walletBalance || 0).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Bio</p>
          {editingProfile ? (
            <Textarea value={form.bio || ''} onChange={(e) => setForm((p: any) => ({ ...p, bio: e.target.value }))} />
          ) : (
            <p className="font-medium whitespace-pre-wrap">{user.bio || '-'}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-6 pt-2">
          {user.role === 'researcher' && (
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!form.isVerified}
                onCheckedChange={(v) => (editingProfile ? setForm((p: any) => ({ ...p, isVerified: v })) : null)}
              />
              KYC verified
            </label>
          )}
          {(user.role === 'researcher' || user.role === 'company') && (
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!form.isEmailVerified}
                onCheckedChange={(v) => (editingProfile ? setForm((p: any) => ({ ...p, isEmailVerified: v })) : null)}
              />
              Email verified
            </label>
          )}
          {user.role === 'researcher' && (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.payoutHold} onCheckedChange={toggleWalletHold} />
              Hold withdrawals
            </label>
          )}
        </div>
      </GlassCard>

      {user.role === 'company' && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Verified company assets
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Verified domains for this company (DNS TXT or security.txt method).
              </p>
            </div>
            {!editingAssets ? (
              <Button variant="outline" onClick={startEditAssets}>
                <Pencil className="h-4 w-4 mr-2" /> Edit assets
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingAssets(false);
                    setAssetsDraft([]);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={saveVerifiedAssets} disabled={savingAssets}>
                  {savingAssets ? 'Saving…' : 'Save assets'}
                </Button>
              </div>
            )}
          </div>

          {!editingAssets ? (
            <div className="space-y-3">
              {normalizeVerifiedAssets(user.verifiedAssets).length === 0 ? (
                <p className="text-sm text-muted-foreground">No verified assets on file. Click Edit assets to add one.</p>
              ) : (
                normalizeVerifiedAssets(user.verifiedAssets).map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-border/40 bg-muted/20 p-4 text-sm space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold">{a.domain || '(no domain)'}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {a.method}
                      </Badge>
                      <Badge variant={a.status === 'verified' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                        {a.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {assetsDraft.map((row, index) => (
                <div key={row.id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-mono uppercase text-muted-foreground">Asset {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 h-8 w-8"
                      onClick={() => setAssetsDraft((d) => d.filter((_, i) => i !== index))}
                      aria-label="Remove asset"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Domain</p>
                      <Input
                        value={row.domain}
                        onChange={(e) =>
                          setAssetsDraft((d) => d.map((r, i) => (i === index ? { ...r, domain: e.target.value } : r)))
                        }
                        placeholder="example.com"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Verification method</p>
                      <Select
                        value={row.method}
                        onValueChange={(v: 'DNS_TXT' | 'SECURITY_TXT') =>
                          setAssetsDraft((d) => d.map((r, i) => (i === index ? { ...r, method: v } : r)))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DNS_TXT">DNS TXT</SelectItem>
                          <SelectItem value="SECURITY_TXT">Security.txt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Select
                        value={row.status}
                        onValueChange={(v: 'verified' | 'disabled') =>
                          setAssetsDraft((d) => d.map((r, i) => (i === index ? { ...r, status: v } : r)))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setAssetsDraft((d) => [...d, newEmptyAsset()])}>
                <Plus className="h-4 w-4 mr-2" />
                Add verified asset
              </Button>
            </div>
          )}
        </GlassCard>
      )}

      {user.role === 'company' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold font-mono uppercase tracking-tight">Company programs</h2>
            <p className="text-sm text-muted-foreground mt-1">Same layout as program management — open a row for full details.</p>
          </div>

          <GlassCard variant="subtle" padding="none" className="overflow-hidden">
            <div className="w-full">
              <div className="md:hidden space-y-4 p-4">
                {programs.map((program: any) => (
                  <div
                    key={program._id}
                    className="bg-background/80 border border-border/25 dark:border-border/30 p-4 rounded-xl flex flex-col gap-4 cursor-pointer hover:border-border/40 transition-colors"
                    onClick={() => openCompanyProgram(program._id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border/25 dark:border-border/30 flex items-center justify-center overflow-hidden">
                          {user?.avatar && user.avatar !== 'default.jpg' ? (
                            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Shield className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-foreground font-mono text-sm">{program.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Building2 className="h-3 w-3" />
                            <span>{program.companyName || user.companyName || user.name || 'Company'}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-foreground/5 -mr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-border/30">
                          <DropdownMenuItem
                            className="focus:bg-muted font-mono text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCompanyProgram(program._id);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            VIEW_DETAILS
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Status</span>
                        <div>
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] uppercase ${programStatusColors[program.status] || 'border-border/30'}`}
                          >
                            {program.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Type</span>
                        <p className="font-mono text-xs">{(program.type || '—').toString().toUpperCase()}</p>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Bounty range</span>
                        <p className="font-mono text-xs text-muted-foreground">
                          {program.bountyRange?.replace(/\$/g, 'PKR ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {!programs.length && (
                  <p className="text-sm text-muted-foreground text-center py-6">No programs found.</p>
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 font-mono text-xs uppercase text-muted-foreground">
                    <tr className="border-b border-border/20">
                      <th className="px-6 py-3 font-medium">Program</th>
                      <th className="px-6 py-3 font-medium">Company</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Bounty range</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Submitted</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {programs.map((program: any) => (
                      <tr
                        key={program._id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => openCompanyProgram(program._id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border/25 dark:border-border/30 flex items-center justify-center overflow-hidden">
                              {user?.avatar && user.avatar !== 'default.jpg' ? (
                                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Shield className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-medium text-foreground font-mono">{program.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span className="font-mono text-xs">
                              {program.companyName || user.companyName || user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {(program.type || '—').toString().toUpperCase()}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                          {program.bountyRange?.replace(/\$/g, 'PKR ') || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] uppercase ${programStatusColors[program.status] || 'border-border/30'}`}
                          >
                            {program.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                          {program.createdAt ? new Date(program.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-foreground/5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border-border/30">
                              <DropdownMenuItem
                                className="focus:bg-muted font-mono text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCompanyProgram(program._id);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-2" />
                                VIEW_DETAILS
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!programs.length && (
                  <p className="text-sm text-muted-foreground text-center py-10 px-4">No programs found.</p>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {(user.role === 'researcher' || user.role === 'triager') && (
        <GlassCard className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {user.role === 'triager' ? 'Triage workload' : 'Submitted reports'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {user.role === 'triager'
                ? 'Active queue (in progress) and past history (closed or terminal states). Open a row for full admin report details.'
                : 'Search and filter submitted reports. Open a row for full admin report details.'}
            </p>
          </div>

          {user.role !== 'triager' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search reports…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="triaging">Triaging</SelectItem>
                  <SelectItem value="under review">Under review</SelectItem>
                  <SelectItem value="triaged">Triaged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {user.role === 'triager' ? (
            <>
              {(
                [
                  {
                    key: 'active',
                    title: 'Active triage queue',
                    subtitle: 'Reports this triager is currently working on (submitted through triaged / in review).',
                    rows: sortedTriagerActive,
                    sourceLen: triagerActiveReports.length,
                  },
                  {
                    key: 'past',
                    title: 'Past triage history',
                    subtitle: 'Resolved, paid, closed, spam, duplicate, out-of-scope, or otherwise finished.',
                    rows: sortedTriagerPast,
                    sourceLen: triagerPastReports.length,
                  },
                ] as const
              ).map((section) => (
                <div key={section.key} className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold font-mono">{section.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</p>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border/30">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 font-mono text-xs uppercase text-muted-foreground">
                        <tr className="border-b border-border/20">
                          <th className="px-4 py-3 text-left font-medium">ID</th>
                          <th className="text-left px-4 py-3 font-medium">
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-amber-500" /> Title
                            </span>
                          </th>
                          <th className="px-4 py-3 text-left font-medium">Program</th>
                          <th className="px-4 py-3 text-left font-medium">Severity</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                          <th className="px-4 py-3 text-left font-medium">Researcher</th>
                          <th className="px-4 py-3 text-left font-medium">Bounty</th>
                          <th className="px-4 py-3 text-left font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {section.rows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-muted-foreground">
                              No reports in this list yet.
                            </td>
                          </tr>
                        ) : (
                          section.rows.map((report) => (
                            <tr
                              key={String(report.id)}
                              className="hover:bg-muted/40 cursor-pointer transition-colors"
                              onClick={() =>
                                navigate(`/admin/reports/${report.id}`, { state: { adminReturnTo: userDetailPath } })
                              }
                            >
                              <td className="px-4 py-3 font-mono text-primary">{String(report.id).slice(0, 8)}…</td>
                              <td className="px-4 py-3 max-w-[200px] truncate font-medium">{report.title}</td>
                              <td className="px-4 py-3 max-w-[160px] truncate text-muted-foreground text-xs font-mono">
                                {report.program?.title || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="capitalize">
                                  {report.severity}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {(report.status || '').includes('resolved') ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                  ) : (report.status || '').includes('closed') ? (
                                    <XCircle className="h-4 w-4 text-zinc-500 shrink-0" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                                  )}
                                  <span className="capitalize">{String(report.status).replace(/_/g, ' ')}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">@{report.researcher}</td>
                              <td className="px-4 py-3 font-mono">
                                {report.bounty > 0 ? `PKR ${report.bounty.toLocaleString()}` : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/reports/${report.id}`, { state: { adminReturnTo: userDetailPath } });
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/30">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 font-mono text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border/20">
                    <th className="px-4 py-3 text-left font-medium">ID</th>
                    <th className="text-left px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" /> Title
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Program</th>
                    <th className="px-4 py-3 text-left font-medium">Severity</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Bounty</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        {activityReports.length === 0
                          ? 'No reports yet for this user.'
                          : 'No reports match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => (
                      <tr
                        key={String(report.id)}
                        className="hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/admin/reports/${report.id}`, { state: { adminReturnTo: userDetailPath } })}
                      >
                        <td className="px-4 py-3 font-mono text-primary">{String(report.id).slice(0, 8)}…</td>
                        <td className="px-4 py-3 max-w-[200px] truncate font-medium">{report.title}</td>
                        <td className="px-4 py-3 max-w-[160px] truncate text-muted-foreground text-xs font-mono">
                          {report.program?.title || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {report.severity}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {(report.status || '').includes('resolved') ? (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (report.status || '').includes('closed') ? (
                              <XCircle className="h-4 w-4 text-zinc-500 shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                            <span className="capitalize">{String(report.status).replace(/_/g, ' ')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono">{report.bounty > 0 ? `PKR ${report.bounty.toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/reports/${report.id}`, { state: { adminReturnTo: userDetailPath } });
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {user.role !== 'researcher' && user.role !== 'triager' && user.role !== 'company' && (
        <GlassCard className="p-6">
          <p className="text-sm text-muted-foreground">
            Report listings are available for researcher and triager accounts. Use other admin tools for this role.
          </p>
        </GlassCard>
      )}

      {user.role === 'researcher' && (
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold mb-4">Wallet activity</h2>
          <p className="text-sm mb-3">
            Balance: <strong>PKR {(data?.wallet?.balance ?? user.walletBalance ?? 0).toLocaleString()}</strong>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50/50 dark:bg-white/5 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Transaction ID</th>
                  <th className="px-4 py-3 text-left">Date & time</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {walletTx.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-foreground/5">
                    <td className="px-4 py-3 font-mono text-xs">{String(tx.id).slice(0, 8)}…</td>
                    <td className="px-4 py-3">{tx.date}</td>
                    <td className="px-4 py-3">{tx.desc}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        String(tx.amount).startsWith('+') ? 'text-emerald-500' : 'text-foreground'
                      }`}
                    >
                      {String(tx.amount).startsWith('+') ? `+ PKR ${String(tx.amount).slice(1)}` : `PKR ${String(tx.amount).replace('-', '')}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] border ${
                          tx.status === 'CLEARED'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!walletTx.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      No wallet transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
