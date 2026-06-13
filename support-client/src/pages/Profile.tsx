import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  Shield,
  History,
  Camera,
  User,
  Pencil,
  Eye,
  EyeOff,
  CheckCircle2,
  Linkedin,
  Twitter,
  Github,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/config';
import { LoginHistoryItem } from '@/types';
import { formatDate } from '@/lib/disputeMeta';

type TabType = 'account' | 'security';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('support_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function Profile() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [editGeneral, setEditGeneral] = useState(false);
  const [editSocials, setEditSocials] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    username: '',
    country: '',
    bio: '',
    twitter: '',
    linkedin: '',
    github: '',
  });

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwSection, setShowPwSection] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Login history
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name || '',
      username: user.username || '',
      country: user.country || '',
      bio: user.bio || '',
      twitter: user.linkedAccounts?.twitter || '',
      linkedin: user.linkedAccounts?.linkedin || '',
      github: user.linkedAccounts?.github || '',
    });
  }, [user]);

  useEffect(() => {
    if (activeTab !== 'security' || !user) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const res = await fetch(`${API_URL}/auth/login-history`, {
          headers: authHeaders(),
          credentials: 'include',
        });
        const data = await res.json();
        if (cancelled) return;
        setLoginHistory(res.ok && data.data?.items ? data.data.items : []);
      } catch {
        if (!cancelled) setLoginHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, user]);

  const completion = useMemo(() => {
    let score = 0;
    if (profile.name) score += 20;
    if (profile.username) score += 20;
    if (profile.country) score += 10;
    if (profile.bio) score += 20;
    if (user?.avatar && user.avatar !== 'default.jpg') score += 10;
    if (profile.twitter || profile.linkedin || profile.github) score += 20;
    return Math.min(score, 100);
  }, [profile, user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'File size must be less than 5MB', variant: 'destructive' });
      return;
    }
    const formData = new FormData();
    formData.append('avatar', file, file.name);
    setIsUploading(true);
    try {
      const res = await fetch(`${API_URL}/users/upload-avatar`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Success', description: 'Avatar updated.' });
        await refreshUser();
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to upload avatar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const saveProfile = async (section: 'general' | 'socials') => {
    try {
      const payload: any = {
        name: profile.name,
        username: profile.username,
        country: profile.country,
        bio: profile.bio,
        linkedAccounts: {
          twitter: profile.twitter,
          linkedin: profile.linkedin,
          github: profile.github,
        },
      };
      const res = await fetch(`${API_URL}/auth/update-me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Success', description: 'Profile updated.' });
        if (section === 'general') setEditGeneral(false);
        else setEditSocials(false);
        await refreshUser();
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to update profile', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    }
  };

  const updatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'Please fill in all password fields.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
      return;
    }
    if (currentPassword === newPassword) {
      toast({ title: 'Error', description: 'New password must differ from the current one.', variant: 'destructive' });
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch(`${API_URL}/auth/update-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Success', description: 'Password updated.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPwSection(false);
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to update password', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setSavingPw(false);
    }
  };

  const socials: { key: 'linkedin' | 'twitter' | 'github'; icon: any; color: string; label: string }[] = [
    { key: 'linkedin', icon: Linkedin, color: 'text-[#0077b5]', label: 'LinkedIn' },
    { key: 'twitter', icon: Twitter, color: 'text-black dark:text-white', label: 'Twitter' },
    { key: 'github', icon: Github, color: 'text-zinc-900 dark:text-white', label: 'GitHub' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Header & tabs */}
      <div className="flex flex-col gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-1">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <div className="flex items-center gap-8 text-sm font-medium">
          {(['account', 'security'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'pb-4 px-1 transition-colors relative capitalize',
                activeTab === tab
                  ? 'text-black dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-8 min-h-[400px]">
          {activeTab === 'account' && (
            <div className="space-y-8">
              {/* General */}
              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    General info
                    <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 capitalize">
                      {user?.role || 'support'}
                    </span>
                  </h2>
                  {!editGeneral && (
                    <Button size="sm" variant="ghost" className="h-8 gap-2" onClick={() => setEditGeneral(true)}>
                      <Pencil className="w-4 h-4" /> Edit
                    </Button>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={cn(
                        'w-24 h-24 rounded-full border-2 border-zinc-200 dark:border-zinc-700 p-1 relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center',
                        editGeneral && 'group cursor-pointer'
                      )}
                      onClick={() => editGeneral && fileInputRef.current?.click()}
                    >
                      {user?.avatar && user.avatar !== 'default.jpg' ? (
                        <img src={user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-zinc-400 dark:text-zinc-500" />
                      )}
                      {editGeneral && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/png, image/jpeg"
                      onChange={handleFileChange}
                    />
                    {editGeneral && (
                      <button
                        className="text-xs text-black dark:text-white hover:underline font-medium"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload new
                      </button>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="flex-1 space-y-4 w-full">
                    {editGeneral ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm text-zinc-500">Full Name</label>
                            <Input
                              value={profile.name}
                              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-zinc-500">Username</label>
                            <Input
                              value={profile.username}
                              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm text-zinc-500">Country</label>
                            <Input
                              value={profile.country}
                              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                              placeholder="e.g. Pakistan"
                              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-zinc-500">Bio</label>
                          <Textarea
                            value={profile.bio}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 min-h-[100px]"
                          />
                        </div>
                        <div className="pt-2 flex gap-3">
                          <Button onClick={() => saveProfile('general')}>Save Changes</Button>
                          <Button variant="ghost" onClick={() => setEditGeneral(false)}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-1">
                              Full Name
                            </span>
                            <p className="text-lg font-medium">{profile.name || 'Not set'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-1">
                              Username
                            </span>
                            <p className="text-lg font-medium font-mono">@{profile.username || 'n/a'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-1">
                              Email
                            </span>
                            <p className="text-lg font-medium">{user?.email}</p>
                          </div>
                          <div>
                            <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-1">
                              Country
                            </span>
                            <p className="text-lg font-medium">{profile.country || 'Global'}</p>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-1">
                            Bio
                          </span>
                          <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {profile.bio || 'Tell us about yourself...'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Socials */}
              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">My Socials</h2>
                  {!editSocials && (
                    <Button size="sm" variant="ghost" className="h-8 gap-2" onClick={() => setEditSocials(true)}>
                      <Pencil className="w-4 h-4" /> Edit
                    </Button>
                  )}
                </div>
                {editSocials ? (
                  <div className="space-y-4">
                    {socials.map(({ key, icon: Icon, color }) => (
                      <div key={key} className="flex items-center gap-3">
                        <Icon className={cn('w-5 h-5', color)} />
                        <Input
                          value={(profile as any)[key]}
                          onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                          placeholder={`${key} URL`}
                          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                        />
                      </div>
                    ))}
                    <div className="pt-2 flex gap-3">
                      <Button size="sm" onClick={() => saveProfile('socials')}>
                        Save Socials
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditSocials(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {socials.map(({ key, icon: Icon, color, label }) => {
                      const val = (profile as any)[key];
                      if (!val) return null;
                      return (
                        <a
                          key={key}
                          href={val}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-4 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                        >
                          <Icon className={cn('w-5 h-5', color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-xs text-zinc-500 truncate">{val}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-zinc-400" />
                        </a>
                      );
                    })}
                    {!profile.linkedin && !profile.twitter && !profile.github && (
                      <p className="text-sm text-zinc-500 italic">No social links added.</p>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Security Settings
                </h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-950/50">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                      <p className="text-xs text-zinc-500">
                        {user?.twoFactorEnabled
                          ? 'Enabled. Manage 2FA from the main BugChase portal.'
                          : 'Set up 2FA from the main BugChase portal for stronger protection.'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-mono px-2 py-1 rounded-full border',
                        user?.twoFactorEnabled
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 border-zinc-200 dark:border-white/10'
                      )}
                    >
                      {user?.twoFactorEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  {!showPwSection ? (
                    <Button variant="outline" className="w-full" onClick={() => setShowPwSection(true)}>
                      Change Password
                    </Button>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { label: 'Current Password', val: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(!showCurrent), span: false },
                          { label: 'New Password', val: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(!showNew), span: false },
                          { label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(!showConfirm), span: true },
                        ].map((f) => (
                          <div key={f.label} className={cn('space-y-2', f.span && 'md:col-span-2')}>
                            <label className="text-sm text-zinc-500">{f.label}</label>
                            <div className="relative">
                              <Input
                                type={f.show ? 'text' : 'password'}
                                value={f.val}
                                onChange={(e) => f.set(e.target.value)}
                                placeholder="••••••••"
                                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 pr-10"
                              />
                              <button
                                type="button"
                                onClick={f.toggle}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                              >
                                {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <Button className="flex-1" onClick={updatePassword} disabled={savingPw}>
                          {savingPw ? 'Updating...' : 'Update Password'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowPwSection(false);
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                  <History className="w-5 h-5" /> Login History
                </h2>
                <p className="text-xs text-zinc-500 mb-4">Recent successful sign-ins on this account.</p>
                {historyLoading ? (
                  <p className="text-sm text-zinc-500 py-6 text-center">Loading…</p>
                ) : loginHistory.length === 0 ? (
                  <p className="text-sm text-zinc-500 py-6 text-center">No sign-ins recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {loginHistory.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800/50 last:border-0 rounded-lg"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{row.browserSummary}</p>
                          <p className="text-xs text-zinc-500 truncate">
                            {row.ip} · {formatDate(row.createdAt)}
                          </p>
                        </div>
                        {row.isCurrent && (
                          <span className="text-xs bg-zinc-100 dark:bg-white/10 px-2 py-0.5 rounded-full shrink-0">
                            Latest
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {/* RIGHT widget */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-300 via-zinc-500 to-zinc-300 dark:from-zinc-700 dark:via-zinc-500 dark:to-zinc-700" />
            <div className="relative inline-block mb-3">
              {user?.avatar && user.avatar !== 'default.jpg' ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="w-20 h-20 rounded-full border-4 border-white dark:border-zinc-800 object-cover shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shadow-lg">
                  <User className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 bg-black dark:bg-white text-white dark:text-black p-1 rounded-full border-2 border-white dark:border-zinc-900">
                <CheckCircle2 className="w-3 h-3" />
              </div>
            </div>
            <h3 className="text-lg font-bold">@{profile.username || 'support'}</h3>
            <p className="text-zinc-500 text-sm mb-4 capitalize">{user?.role || 'support'} Team</p>

            <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-500">Profile Completion</span>
                <span className="font-mono">{completion}%</span>
              </div>
              <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-black dark:bg-white transition-all duration-500" style={{ width: `${completion}%` }} />
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              Active since{' '}
              {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
