import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Headphones, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/config';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SUPPORT_SPECIALIZATION_OPTIONS = [
  { id: 'disputes', label: 'Disputes' },
  { id: 'payments', label: 'Payments & Payouts' },
  { id: 'account', label: 'Account & Access' },
  { id: 'technical', label: 'Technical Support' },
  { id: 'general', label: 'General Support' },
] as const;

function hasValueIgnoreCase(values: string[] | undefined, value: string) {
  return (values || []).some((item) => String(item).toLowerCase() === value.toLowerCase());
}

export default function AdminSupportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'taken' | 'available'>('idle');

  const user = data?.user;

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to load support member');
      if (payload?.data?.user?.role !== 'support') throw new Error('This user is not a support member');
      setData(payload.data);
      setForm(payload.data.user);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load support member');
      navigate('/admin/support');
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

  const toggleSpecialization = (value: string, checked: boolean) => {
    setForm((prev: any) => {
      const next = Array.isArray(prev.expertise) ? [...prev.expertise] : [];
      const index = next.findIndex((x: string) => String(x).toLowerCase() === value.toLowerCase());
      if (checked && index < 0) next.push(value);
      if (!checked && index >= 0) next.splice(index, 1);
      return { ...prev, expertise: next };
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
      if (!res.ok) throw new Error(payload.message || 'Failed to update support member');
      toast.success('Support member updated');
      setEditing(false);
      await fetchDetails();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update support member');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8">Loading support member details...</div>;
  if (!user) return <div className="p-8">Support member not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/support')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headphones className="h-6 w-6" />
            {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.email} {user.username ? `· @${user.username}` : ''} · Support
          </p>
        </div>
      </div>

      <GlassCard className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Support Profile</h2>
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

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Support areas</p>
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUPPORT_SPECIALIZATION_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 rounded-md border border-border/40 px-3 py-2">
                  <Checkbox
                    checked={hasValueIgnoreCase(form.expertise, opt.id)}
                    onCheckedChange={(v) => toggleSpecialization(opt.id, v === true)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(user.expertise || []).length ? (
                (user.expertise || []).map((item: string) => (
                  <Badge key={item} variant="outline" className="uppercase">
                    {item}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None specified</span>
              )}
            </div>
          )}
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
    </div>
  );
}
