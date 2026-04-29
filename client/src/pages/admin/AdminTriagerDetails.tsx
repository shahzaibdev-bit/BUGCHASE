import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Eye, Pencil, Shield, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/config';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

function hasValueIgnoreCase(values: string[] | undefined, value: string) {
  return (values || []).some((item) => String(item).toLowerCase() === value.toLowerCase());
}

const TRIAGER_PAST_STATUSES = new Set(['resolved', 'paid', 'closed', 'spam', 'duplicate', 'out-of-scope', 'na']);

export default function AdminTriagerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'taken' | 'available'>('idle');

  const user = data?.user;
  const triagedReports = data?.reports?.triaged || [];

  const activeReports = useMemo(
    () => triagedReports.filter((report: any) => !TRIAGER_PAST_STATUSES.has((report.status || '').toLowerCase())),
    [triagedReports]
  );
  const pastReports = useMemo(
    () => triagedReports.filter((report: any) => TRIAGER_PAST_STATUSES.has((report.status || '').toLowerCase())),
    [triagedReports]
  );

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to load triager');
      if (payload?.data?.user?.role !== 'triager') throw new Error('This user is not a triager');
      setData(payload.data);
      setForm(payload.data.user);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load triager');
      navigate('/admin/triagers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  useEffect(() => {
    const username = String(form.username || '').trim();
    if (!editing || !username || username.toLowerCase() === String(user?.username || '').toLowerCase()) {
      setUsernameStatus('idle');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setUsernameStatus('checking');
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_URL}/admin/users/check-username?username=${encodeURIComponent(username)}&excludeId=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const payload = await res.json();
        if (res.ok && payload.data?.available) setUsernameStatus('available');
        else setUsernameStatus('taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.username, editing, id, user?.username]);

  const toggleMultiSelect = (
    field: 'expertise' | 'severityPreferences',
    value: string,
    checked: boolean
  ) => {
    setForm((prev: any) => {
      const next = Array.isArray(prev[field]) ? [...prev[field]] : [];
      const index = next.findIndex((x: string) => String(x).toLowerCase() === value.toLowerCase());
      if (checked && index < 0) next.push(value);
      if (!checked && index >= 0) next.splice(index, 1);
      return { ...prev, [field]: next };
    });
  };

  const saveProfile = async () => {
    if (usernameStatus === 'taken') return toast.error('This username already exists');
    if (usernameStatus === 'checking') return toast.error('Still checking username availability');

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const body = {
        name: form.name,
        username: form.username,
        email: form.email,
        status: form.status,
        country: form.country,
        city: form.city,
        bio: form.bio,
        expertise: Array.isArray(form.expertise) ? form.expertise : [],
        severityPreferences: Array.isArray(form.severityPreferences) ? form.severityPreferences : [],
        maxConcurrentReports: Math.max(1, parseInt(String(form.maxConcurrentReports ?? 10), 10) || 10),
        isAvailable: !!form.isAvailable,
        linkedAccounts: {
          github: String(form.linkedAccounts?.github ?? '').trim(),
          linkedin: String(form.linkedAccounts?.linkedin ?? '').trim(),
          twitter: String(form.linkedAccounts?.twitter ?? '').trim(),
        },
      };
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to update triager');
      toast.success('Triager updated');
      setEditing(false);
      await fetchDetails();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update triager');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8">Loading triager details...</div>;
  if (!user) return <div className="p-8">Triager not found.</div>;

  const renderReportTable = (rows: any[], title: string, emptyText: string) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold font-mono uppercase">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-border/30">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 font-mono text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border/20">
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Severity</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((report: any) => (
                <tr
                  key={String(report.id)}
                  className="hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/reports/${report.id}`, { state: { adminReturnTo: `/admin/triagers/${id}` } })}
                >
                  <td className="px-4 py-3 font-mono text-primary">{String(report.id).slice(0, 8)}…</td>
                  <td className="px-4 py-3 max-w-[260px] truncate font-medium">{report.title}</td>
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
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/reports/${report.id}`, { state: { adminReturnTo: `/admin/triagers/${id}` } });
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
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/triagers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.email} {user.username ? `· @${user.username}` : ''} · Triager
          </p>
        </div>
      </div>

      <GlassCard className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Triager Profile</h2>
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setForm(user);
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveProfile} disabled={isSaving || usernameStatus === 'checking' || usernameStatus === 'taken'}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Name</p>
            {editing ? (
              <Input value={form.name || ''} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} />
            ) : (
              <p className="font-medium">{user.name || '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Username</p>
            {editing ? (
              <>
                <Input value={form.username || ''} onChange={(e) => setForm((p: any) => ({ ...p, username: e.target.value }))} />
                {usernameStatus === 'checking' && <p className="text-xs text-muted-foreground">Checking username...</p>}
                {usernameStatus === 'taken' && <p className="text-xs text-red-500">Username already exists.</p>}
              </>
            ) : (
              <p className="font-medium">{user.username ? `@${user.username}` : '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Email</p>
            {editing ? (
              <Input value={form.email || ''} onChange={(e) => setForm((p: any) => ({ ...p, email: e.target.value }))} />
            ) : (
              <p className="font-medium">{user.email || '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            {editing ? (
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
            {editing ? (
              <Input value={form.country || ''} onChange={(e) => setForm((p: any) => ({ ...p, country: e.target.value }))} />
            ) : (
              <p className="font-medium">{user.country || '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">City</p>
            {editing ? (
              <Input value={form.city || ''} onChange={(e) => setForm((p: any) => ({ ...p, city: e.target.value }))} />
            ) : (
              <p className="font-medium">{user.city || '-'}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Bio</p>
          {editing ? (
            <Textarea value={form.bio || ''} onChange={(e) => setForm((p: any) => ({ ...p, bio: e.target.value }))} />
          ) : (
            <p className="font-medium whitespace-pre-wrap">{user.bio || '-'}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Expertise</p>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TRIAGER_EXPERTISE_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 rounded-md border border-border/40 px-3 py-2">
                    <Checkbox
                      checked={hasValueIgnoreCase(form.expertise, opt)}
                      onCheckedChange={(v) => toggleMultiSelect('expertise', opt, v === true)}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(user.expertise || []).length ? (
                  (user.expertise || []).map((item: string) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None specified</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Severity preferences</p>
            {editing ? (
              <div className="grid grid-cols-2 gap-2">
                {TRIAGER_SEVERITY_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 rounded-md border border-border/40 px-3 py-2">
                    <Checkbox
                      checked={hasValueIgnoreCase(form.severityPreferences, opt)}
                      onCheckedChange={(v) => toggleMultiSelect('severityPreferences', opt, v === true)}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(user.severityPreferences || []).length ? (
                  (user.severityPreferences || []).map((item: string) => (
                    <Badge key={item} variant="outline" className="capitalize">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None specified</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Max concurrent reports</p>
            {editing ? (
              <Input
                type="number"
                min={1}
                value={form.maxConcurrentReports ?? user.maxConcurrentReports ?? 10}
                onChange={(e) => setForm((p: any) => ({ ...p, maxConcurrentReports: e.target.value }))}
              />
            ) : (
              <p className="font-medium">{user.maxConcurrentReports ?? 10}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Availability</p>
            {editing ? (
              <label className="flex items-center gap-2 text-sm pt-2">
                <Switch checked={!!form.isAvailable} onCheckedChange={(v) => setForm((p: any) => ({ ...p, isAvailable: v }))} />
                {form.isAvailable ? 'Accepting assignments' : 'Not accepting assignments'}
              </label>
            ) : (
              <p className="font-medium">{user.isAvailable !== false ? 'Accepting assignments' : 'Not accepting assignments'}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            [
              { key: 'github', label: 'GitHub' },
              { key: 'linkedin', label: 'LinkedIn' },
              { key: 'twitter', label: 'Twitter / X' },
            ] as const
          ).map((account) => (
            <div key={account.key} className="space-y-1">
              <p className="text-xs text-muted-foreground">{account.label}</p>
              {editing ? (
                <Input
                  placeholder={`${account.label} URL`}
                  value={form.linkedAccounts?.[account.key] || ''}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      linkedAccounts: { ...(p.linkedAccounts || {}), [account.key]: e.target.value },
                    }))
                  }
                />
              ) : (
                <p className="font-medium break-all">{user.linkedAccounts?.[account.key] || '-'}</p>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Triage Workload</h2>
          <p className="text-sm text-muted-foreground mt-1">Review active queue and past history from this triager.</p>
        </div>
        {renderReportTable(activeReports, 'Active queue', 'No active reports in queue.')}
        {renderReportTable(pastReports, 'Past history', 'No completed history yet.')}
      </GlassCard>
    </div>
  );
}
