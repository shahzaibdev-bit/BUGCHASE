import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  User, 
  Linkedin, 
  Twitter, 
  Trophy, 
  CreditCard,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  ChevronRight,
  Globe,
  Mail,
  Bell,
  Key,
  Activity,
  Zap,
  Smartphone,
  History,
  Target,
  Bug,
  BadgeCheck,
  Github,
  Pencil,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { KYCModal } from '@/components/researcher/KYCModal';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import ImageCropper from '@/components/ImageCropper';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { PROFILE_COUNTRIES, getProfileCountryByName } from '@/lib/profileCountries';
import { CountryFlagImg } from '@/components/CountryFlagImg';

// Mock Data Types
interface ProfileState {
  name: string;
  nickname: string;
  country: string;
  bio: string;
  showPayouts: boolean;
  isPrivate: boolean;
  twitter: string;
  linkedin: string;
  github: string;
}

type TabType = 'account' | 'security' | 'notifications' | 'stats';

import { useAuth } from '@/contexts/AuthContext';

// ... (keep existing imports)
import { API_URL } from '@/config';

export default function ResearcherProfile() {
  // ... inside ResearcherProfile component
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // State
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');
  // Image Cropper State
  const [isKYCOpen, setIsKYCOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [coverImageSrc, setCoverImageSrc] = useState<string | null>(null);
  const [showCoverCropper, setShowCoverCropper] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  // Edit Mode State
  const [editMode, setEditMode] = useState({
    general: false,
    socials: false
  });
  
  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  
  // Initial state logic handled in useEffect for updating from user
  const [profile, setProfile] = useState<ProfileState>({
    name: '',
    nickname: '',
    country: '',
    bio: '',
    showPayouts: false,
    isPrivate: false,
    twitter: '',
    linkedin: '',
    github: '',
  });

  const [activeSocials, setActiveSocials] = useState<string[]>([]);

  type LoginHistoryRow = { id: string; ip: string; browserSummary: string; createdAt: string; isCurrent?: boolean };
  const [loginHistory, setLoginHistory] = useState<LoginHistoryRow[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);

  type InAppNotificationRow = {
    id: string;
    title: string;
    message: string;
    html?: string;
    channel?: 'in_app' | 'email';
    type: string;
    read: boolean;
    createdAt: string;
    link: string | null;
  };
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotificationRow[]>([]);
  const [inAppNotificationsLoading, setInAppNotificationsLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<InAppNotificationRow | null>(null);
  const [twoFaSetupOpen, setTwoFaSetupOpen] = useState(false);
  const [twoFaSetupBusy, setTwoFaSetupBusy] = useState(false);
  const [twoFaQr, setTwoFaQr] = useState<string | null>(null);
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [twoFaEnableCode, setTwoFaEnableCode] = useState('');
  const [twoFaDisableOpen, setTwoFaDisableOpen] = useState(false);
  const [disable2faPassword, setDisable2faPassword] = useState('');
  const [disable2faTotp, setDisable2faTotp] = useState('');
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  // Calculate Profile Completion
  const completionPercentage = React.useMemo(() => {
    let score = 0;
    const totalWeight = 100;
    
    // 1. Basic Info (40%)
    if (profile.name) score += 10;
    if (profile.nickname) score += 10;
    if (profile.country) score += 10;
    if (profile.bio) score += 10;
    
    // 2. Avatar (20%)
    if (user?.avatar && user.avatar !== 'default.jpg') score += 20;

    // 3. Socials (30%)
    if (profile.twitter) score += 10;
    if (profile.linkedin) score += 10;
    if (profile.github) score += 10;

    // 4. Verification (10%)
    if (user?.isVerified) score += 10;

    return Math.min(score, 100);
  }, [profile, user]);

  const missingProfileItems = React.useMemo(() => {
    const checks = [
      { done: Boolean(profile.name?.trim()), label: 'Add full name' },
      { done: Boolean(profile.nickname?.trim()), label: 'Set nickname' },
      { done: Boolean(profile.country?.trim()), label: 'Select country' },
      { done: Boolean(profile.bio?.trim()), label: 'Write bio' },
      { done: Boolean(user?.avatar && user.avatar !== 'default.jpg'), label: 'Upload profile avatar' },
      { done: Boolean((user as any)?.coverPhoto), label: 'Upload cover photo' },
      { done: Boolean(profile.twitter?.trim()), label: 'Add Twitter link' },
      { done: Boolean(profile.linkedin?.trim()), label: 'Add LinkedIn link' },
      { done: Boolean(profile.github?.trim()), label: 'Add GitHub link' },
      { done: Boolean(user?.isVerified), label: 'Complete identity verification' },
    ];
    return checks.filter((c) => !c.done).map((c) => c.label);
  }, [profile, user]);

  React.useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        name: user.name || '',
        nickname: (user as any).username || (user as any).nickname || '',
        country: (user as any).country || '', 
        bio: (user as any).bio || '',
        showPayouts: (user as any).showPayouts ?? false,
        isPrivate: (user as any).isPrivate ?? false,
        twitter: (user as any).linkedAccounts?.twitter || '',
        linkedin: (user as any).linkedAccounts?.linkedin || '',
        github: (user as any).linkedAccounts?.github || '',
      }));
      
      const socialKeys = ['twitter', 'linkedin', 'github'];
      const active = socialKeys.filter(k => (user as any).linkedAccounts?.[k]);
      setActiveSocials(active);
    }
  }, [user]);

  React.useEffect(() => {
    if (activeTab !== 'security' || !user) return;
    let cancelled = false;
    (async () => {
      setLoginHistoryLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/auth/login-history`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.data?.items) setLoginHistory(data.data.items);
        else setLoginHistory([]);
      } catch {
        if (!cancelled) setLoginHistory([]);
      } finally {
        if (!cancelled) setLoginHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, user]);

  React.useEffect(() => {
    if (activeTab !== 'notifications' || !user) return;
    let cancelled = false;
    (async () => {
      setInAppNotificationsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const flushKey = `notifications_legacy_flushed_v2_${(user as any)?._id || user?.id || 'me'}`;
        if (!localStorage.getItem(flushKey)) {
          await fetch(`${API_URL}/users/notifications/legacy`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: 'include',
          });
          localStorage.setItem(flushKey, '1');
        }
        const res = await fetch(`${API_URL}/users/notifications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.data?.items) setInAppNotifications(data.data.items);
        else setInAppNotifications([]);
      } catch {
        if (!cancelled) setInAppNotifications([]);
      } finally {
        if (!cancelled) setInAppNotificationsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, user]);

  const notificationTypeLabel = (t: string) => {
    switch (t) {
      case 'announcement':
        return 'Platform';
      case 'bounty':
        return 'Bounty';
      case 'payment':
        return 'Payment';
      case 'system':
      default:
        return 'System';
    }
  };

  const handleNotificationActivate = async (row: InAppNotificationRow) => {
    if (!row.read) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/users/notifications/${row.id}/read`, {
          method: 'PATCH',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        if (res.ok) {
          setInAppNotifications((prev) => prev.map((n) => (n.id === row.id ? { ...n, read: true } : n)));
        }
      } catch {
        /* non-fatal */
      }
    }
    setSelectedNotification(row);
  };

  const stripHtmlTags = (input: string) =>
    String(input || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const notificationPreview = (row: InAppNotificationRow) => {
    const clean = stripHtmlTags(row.message || '');
    return clean || 'Open notification to view details.';
  };

  React.useEffect(() => {
    if (activeTab !== 'security') {
      setPasswordChangeOpen(false);
      setCurrentPassword('');
      setNewPassword('');
    }
  }, [activeTab]);

  const startTwoFaSetup = async () => {
    setTwoFaSetupBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/2fa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not start 2FA setup');
      setTwoFaQr(data.data.qrDataUrl);
      setTwoFaSecret(data.data.secret);
      setTwoFaEnableCode('');
      setTwoFaSetupOpen(true);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || '2FA setup failed', variant: 'destructive' });
    } finally {
      setTwoFaSetupBusy(false);
    }
  };

  const confirmTwoFaEnable = async () => {
    setTwoFaBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/2fa/enable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ totp: twoFaEnableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid code');
      toast({ title: '2FA enabled', description: 'Your account is protected with an authenticator app.' });
      setTwoFaSetupOpen(false);
      setTwoFaQr(null);
      setTwoFaSecret('');
      setTwoFaEnableCode('');
      await refreshUser();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Enable failed', variant: 'destructive' });
    } finally {
      setTwoFaBusy(false);
    }
  };

  const confirmTwoFaDisable = async () => {
    setTwoFaBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/2fa/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: disable2faPassword, totp: disable2faTotp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not disable 2FA');
      toast({ title: '2FA disabled', description: 'Two-factor authentication is off for this account.' });
      setTwoFaDisableOpen(false);
      setDisable2faPassword('');
      setDisable2faTotp('');
      await refreshUser();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Disable failed', variant: 'destructive' });
    } finally {
      setTwoFaBusy(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) { // 5MB limit (increased for high quality source)
          toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
          return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
          setImageSrc(reader.result?.toString() || null);
          setShowCropper(true);
      });
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
      const formData = new FormData();
      formData.append('avatar', croppedBlob, 'avatar.jpg');

      setIsUploading(true);
      try {
          const token = localStorage.getItem('token');
          const headers: HeadersInit = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(`${API_URL}/users/upload-avatar`, {
              method: 'POST',
              headers,
              credentials: 'include',
              body: formData,
          });
          const data = await res.json();

          if (res.ok) {
              toast({ title: "Success", description: "Avatar updated successfully" });
              await refreshUser(); // Refresh global user state
          } else {
              toast({ title: "Error", description: data.message || "Failed to upload avatar", variant: "destructive" });
          }
      } catch (error) {
          toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
      } finally {
          setIsUploading(false);
      }
  };

  const uploadCoverBlob = async (blob: Blob) => {
      const formData = new FormData();
      formData.append('coverPhoto', blob, 'cover.jpg');

      setIsUploadingCover(true);
      try {
          const token = localStorage.getItem('token');
          const headers: HeadersInit = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(`${API_URL}/users/upload-cover`, {
              method: 'POST',
              headers,
              credentials: 'include',
              body: formData,
          });
          const data = await res.json();
          if (res.ok) {
              toast({ title: "Success", description: "Cover photo updated successfully" });
              await refreshUser();
          } else {
              toast({ title: "Error", description: data.message || "Failed to upload cover photo", variant: "destructive" });
          }
      } catch {
          toast({ title: "Error", description: "Something went wrong while uploading cover photo.", variant: "destructive" });
      } finally {
          setIsUploadingCover(false);
      }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
          toast({ title: "Error", description: "Please upload a valid image file.", variant: "destructive" });
          return;
      }
      if (file.size > 5 * 1024 * 1024) {
          toast({ title: "Error", description: "Cover photo must be less than 5MB.", variant: "destructive" });
          return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
          setCoverImageSrc(reader.result?.toString() || null);
          setShowCoverCropper(true);
      });
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const handleCoverCropComplete = async (croppedBlob: Blob) => {
      await uploadCoverBlob(croppedBlob);
  };

  // Handlers
  const handleSave = async (section: 'General' | 'Socials') => {
    // Validate Bio
    if (section === 'General' && (!profile.bio || profile.bio.trim() === '')) {
        toast({ title: "Error", description: "Bio cannot be empty.", variant: "destructive" });
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/auth/update-me`, {
            method: 'PATCH',
            headers,
            credentials: 'include',
            body: JSON.stringify({
                name: profile.name,
                username: profile.nickname,
                country: profile.country,
                bio: profile.bio,
                showPayouts: profile.showPayouts,
                isPrivate: profile.isPrivate,
                linkedAccounts: {
                    twitter: profile.twitter,
                    linkedin: profile.linkedin,
                    github: profile.github
                }
            })
        });
        
        const data = await res.json();
        if (res.ok) {
            toast({ title: 'Success', description: `${section} updated successfully` });
            await refreshUser(); // Refresh user context to get updated scores
            // Turn off edit mode
            setEditMode(prev => ({ 
                ...prev, 
                [section === 'General' ? 'general' : 'socials']: false 
            }));
        } else {
            toast({ title: 'Error', description: data.message || 'Failed to update user', variant: 'destructive' });
        }
    } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    }
  };

  const handleCancel = (section: 'General' | 'Socials') => {
      if (section === 'General') {
          // Revert to user data
          setProfile(prev => ({
              ...prev,
              name: user?.name || '',
              nickname: (user as any)?.username || '',
              country: (user as any)?.country || '',
              bio: (user as any)?.bio || ''
          }));
          setEditMode({...editMode, general: false});
      } else {
          // Revert socials
          setProfile(prev => ({
              ...prev,
              twitter: (user as any)?.linkedAccounts?.twitter || '',
              linkedin: (user as any)?.linkedAccounts?.linkedin || '',
              github: (user as any)?.linkedAccounts?.github || ''
          }));
          setEditMode({...editMode, socials: false});
      }
  };

  const handleAutoSave = async (field: keyof ProfileState, value: any) => {
      // Optimistic update
      setProfile(prev => ({ ...prev, [field]: value }));

      try {
          const token = localStorage.getItem('token');
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(`${API_URL}/auth/update-me`, {
              method: 'PATCH',
              headers,
              credentials: 'include',
              body: JSON.stringify({ [field]: value })
          });

          if (!res.ok) {
              const data = await res.json();
              toast({ title: 'Error', description: data.message || 'Failed to save setting', variant: 'destructive' });
              // Revert on failure (optional but good practice)
              setProfile(prev => ({ ...prev, [field]: !value })); 
          } else {
              await refreshUser(); // Refresh user context
          }
      } catch (error) {
          toast({ title: 'Error', description: 'Failed to save setting', variant: 'destructive' });
          setProfile(prev => ({ ...prev, [field]: !value }));
      }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
        toast({ title: 'Error', description: 'Please enter both current and new passwords.', variant: 'destructive' });
        return;
    }

    setIsUpdatingPassword(true);
    try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/auth/update-password`, {
            method: 'PATCH',
            headers,
            credentials: 'include',
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        const data = await res.json();

        if (res.ok) {
            toast({ title: 'Success', description: 'Password updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setPasswordChangeOpen(false);
        } else {
            toast({ title: 'Error', description: data.message || 'Failed to update password', variant: 'destructive' });
        }
    } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
        setIsUpdatingPassword(false);
    }
  };

  const navTabs: { id: TabType; label: string }[] = [
      { id: 'account', label: 'Account' },
      { id: 'security', label: 'Security' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'stats', label: 'Stats' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      
      {/* 1. Header & Tabs */}
      <div className="flex flex-col gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-1">
         <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Profile Settings</h1>
         
         <div className="flex items-center gap-8 text-sm font-medium overflow-x-auto no-scrollbar">
            {navTabs.map((tab) => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                        "pb-4 px-1 transition-colors relative whitespace-nowrap",
                        activeTab === tab.id 
                            ? "text-black dark:text-white" 
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    )}
                >
                    {tab.label}
                    {activeTab === tab.id && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full" />
                    )}
                </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === LEFT COLUMN (2/3) - Tab Content === */}
        <div className="lg:col-span-2 space-y-8 min-h-[500px]">
            
            {/* --- ACCOUNT TAB --- */}
            {activeTab === 'account' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                    {/* General Info */}
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                General info
                            </h2>
                            {!editMode.general && (
                                <Button size="sm" variant="ghost" className="h-8 gap-2" onClick={() => setEditMode({...editMode, general: true})}>
                                    <Pencil className="w-4 h-4" /> Edit
                                </Button>
                            )}
                        </div>

                        {editMode.general && (
                        <div className="mb-6">
                            <div
                                className={cn(
                                    "relative w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 aspect-[16/7] min-h-[190px]",
                                    editMode.general ? "group cursor-pointer" : ""
                                )}
                                onClick={() => editMode.general && coverInputRef.current?.click()}
                            >
                                {Boolean((user as any)?.coverPhoto) ? (
                                    <img
                                        src={(user as any)?.coverPhoto}
                                        alt="Cover"
                                        className={cn("h-full w-full object-cover object-center transition-opacity", editMode.general && "group-hover:opacity-80")}
                                    />
                                ) : (
                                    <div className="h-full w-full bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800" />
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/10" />
                                <div className="absolute left-4 bottom-4 text-white text-sm font-medium flex items-center gap-2">
                                    <Camera className="w-4 h-4" />
                                    {editMode.general ? 'Change cover photo' : 'Cover photo'}
                                </div>

                                {editMode.general && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-white text-xs font-semibold backdrop-blur">
                                            <Upload className="w-3.5 h-3.5" />
                                            Upload Cover
                                        </div>
                                    </div>
                                )}

                                {isUploadingCover && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={coverInputRef}
                                className="hidden"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                onChange={handleCoverUpload}
                            />
                            {editMode.general && (
                                <p className="mt-2 text-[10px] text-zinc-500">Recommended ratio: 16:7. JPG, PNG or WEBP. Max 5MB.</p>
                            )}
                        </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Avatar */}
                            {/* Avatar */}
                            <div className="flex flex-col items-center gap-3 w-full md:w-auto">
                                <div 
                                    className={cn(
                                        "w-24 h-24 rounded-full border-2 border-zinc-200 dark:border-zinc-700 p-1 relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center",
                                        editMode.general ? "group cursor-pointer" : ""
                                    )}
                                    onClick={() => editMode.general && fileInputRef.current?.click()}
                                >
                                    {user?.avatar && user.avatar !== 'default.jpg' ? (
                                        <img 
                                            src={user.avatar} 
                                            alt="Profile" 
                                            className={cn("w-full h-full rounded-full object-cover transition-opacity", editMode.general && "group-hover:opacity-75")}
                                        />
                                    ) : (
                                        <User className={cn("w-12 h-12 text-zinc-400 dark:text-zinc-500 transition-opacity", editMode.general && "group-hover:opacity-75")} />
                                    )}
                                    
                                    {editMode.general && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                    )}
                                    
                                    {isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-100">
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
                                {editMode.general && (
                                    <div className="text-center">
                                        <button className="text-xs text-black dark:text-white hover:underline font-medium" onClick={() => fileInputRef.current?.click()}>
                                            {isUploading ? 'Uploading...' : 'Upload new'}
                                        </button>
                                        <p className="text-[10px] text-zinc-500 mt-1">JPG or PNG. Max 5MB</p>
                                    </div>
                                )}
                            </div>

                            {/* Inputs or Read-only View */}
                            <div className="flex-1 space-y-4 w-full">
                                {editMode.general ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm text-zinc-500 dark:text-zinc-400">Full Name</label>
                                                <Input 
                                                    value={profile.name} 
                                                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                                                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-black dark:focus:border-white focus:ring-0"
                                                    placeholder="Your Real Name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-zinc-500 dark:text-zinc-400">Nickname <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-zinc-500 font-medium">@</span>
                                                    <Input 
                                                        value={profile.nickname} 
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\s+/g, '').toLowerCase(); 
                                                            setProfile({...profile, nickname: val});
                                                        }}
                                                        className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-black dark:focus:border-white focus:ring-0 pl-7"
                                                        placeholder="username"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-zinc-500">Unique identifier, no spaces allowed.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-zinc-500 dark:text-zinc-400">Country</label>
                                                <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
                                                  <PopoverTrigger asChild>
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      role="combobox"
                                                      aria-expanded={countryPickerOpen}
                                                      className="w-full justify-between font-normal h-10 px-3 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950"
                                                    >
                                                      {profile.country ? (
                                                        <span className="flex items-center gap-2 truncate">
                                                          {(() => {
                                                            const sel = getProfileCountryByName(profile.country);
                                                            return sel ? (
                                                              <CountryFlagImg isoCode={sel.isoCode} name={sel.name} width={22} />
                                                            ) : (
                                                              <Globe className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
                                                            );
                                                          })()}
                                                          <span className="truncate">{profile.country}</span>
                                                        </span>
                                                      ) : (
                                                        <span className="text-zinc-500">Search or select country</span>
                                                      )}
                                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                  </PopoverTrigger>
                                                  <PopoverContent
                                                    className="p-0 w-[min(calc(100vw-2rem),24rem)] max-h-[min(24rem,70vh)]"
                                                    align="start"
                                                  >
                                                    <Command>
                                                      <CommandInput placeholder="Search country..." className="h-11" />
                                                      <CommandList className="max-h-[min(20rem,60vh)]">
                                                        <CommandEmpty>No country found.</CommandEmpty>
                                                        <CommandGroup>
                                                          {PROFILE_COUNTRIES.map((c) => (
                                                            <CommandItem
                                                              key={c.isoCode}
                                                              value={`${c.name} ${c.isoCode}`}
                                                              onSelect={() => {
                                                                setProfile({ ...profile, country: c.name });
                                                                setCountryPickerOpen(false);
                                                              }}
                                                              className="gap-2"
                                                            >
                                                              <Check
                                                                className={cn(
                                                                  'h-4 w-4 shrink-0',
                                                                  profile.country === c.name ? 'opacity-100' : 'opacity-0',
                                                                )}
                                                              />
                                                              <CountryFlagImg isoCode={c.isoCode} name={c.name} width={22} />
                                                              <span className="truncate">{c.name}</span>
                                                            </CommandItem>
                                                          ))}
                                                        </CommandGroup>
                                                      </CommandList>
                                                    </Command>
                                                  </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm text-zinc-500 dark:text-zinc-400">Bio</label>
                                            <Textarea 
                                                value={profile.bio} 
                                                onChange={(e) => setProfile({...profile, bio: e.target.value})}
                                                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-black dark:focus:border-white focus:ring-0 min-h-[100px]"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-1">Full Name</span>
                                                <p className="text-lg font-medium text-zinc-900 dark:text-white">{profile.name || 'Not set'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-1">Nickname</span>
                                                <p className="text-lg font-medium text-zinc-900 dark:text-white font-mono">@{profile.nickname || 'username'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-1">Country</span>
                                                <div className="flex items-center gap-2 text-lg font-medium text-zinc-900 dark:text-white">
                                                    {(() => {
                                                      const sel = getProfileCountryByName(profile.country);
                                                      return sel ? (
                                                        <CountryFlagImg isoCode={sel.isoCode} name={sel.name} width={28} />
                                                      ) : (
                                                        <Globe className="h-7 w-7 shrink-0 text-zinc-400" aria-hidden />
                                                      );
                                                    })()}
                                                    {profile.country || 'Not set'}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-1">Bio</span>
                                            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                                {profile.bio || 'Tell us about yourself...'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* KYC Section included here */}
                                {!user?.isVerified && (
                                    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between mt-4">
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">Identity Verification</p>
                                            <p className="text-xs text-zinc-500">Identity verification adds reputation points.</p>
                                        </div>
                                        
                                        {kycStatus === 'pending' ? (
                                             <span className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-full text-xs font-bold border border-yellow-200 dark:border-yellow-500/20">
                                                <AlertCircle className="w-3.5 h-3.5" /> Verification Pending
                                            </span>
                                        ) : (
                                            <Button size="sm" onClick={() => window.location.href = '/researcher/verify'} className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black border border-zinc-800 dark:border-zinc-200">
                                                Verify Identity
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {editMode.general && (
                                    <div className="pt-4 flex items-center gap-3">
                                        <Button className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-medium" onClick={() => handleSave('General')}>
                                            Save Changes
                                        </Button>
                                        <Button variant="ghost" className="text-zinc-500" onClick={() => handleCancel('General')}>
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Socials */}
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">My Socials</h2>
                            <div className="flex items-center gap-3">
                                {editMode.socials && ['twitter', 'linkedin', 'github'].some(key => profile[key as keyof ProfileState] !== (user as any)?.linkedAccounts?.[key]) && (
                                    <span className="text-xs text-amber-500 font-medium animate-pulse">Unsaved changes</span>
                                )}
                                {!editMode.socials && (
                                    <Button size="sm" variant="ghost" className="h-8 gap-2" onClick={() => setEditMode({...editMode, socials: true})}>
                                        <Pencil className="w-4 h-4" /> Edit
                                    </Button>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {/* VIEW MODE: List active socials as clickable cards */}
                            {!editMode.socials && (
                                <div className="space-y-3">
                                    {['linkedin', 'twitter', 'github'].map(key => {
                                         const val = (profile as any)[key];
                                         if (!val) return null;
                                         
                                         // Icons/Colors map
                                         const map: any = {
                                            linkedin: { icon: Linkedin, color: 'text-[#0077b5]', label: 'LinkedIn' },
                                            twitter: { icon: Twitter, color: 'text-black dark:text-white', label: 'Twitter' },
                                            github: { icon: Github, color: 'text-zinc-900 dark:text-white', label: 'GitHub' },
                                         };
                                         const item = map[key];
                                         const Icon = item.icon;

                                         return (
                                            <a key={key} href={val.startsWith('http') ? val : `https://${val}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors group">
                                                <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-sm">
                                                    <Icon className={cn("w-5 h-5", item.color)} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-zinc-900 dark:text-white group-hover:underline">{item.label}</p>
                                                    <p className="text-xs text-zinc-500 truncate max-w-[250px]">{val}</p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
                                            </a>
                                         );
                                    })}
                                    
                                    {['linkedin', 'twitter', 'github'].every(k => !(profile as any)[k]) && (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-zinc-500 mb-2">No social links added yet.</p>
                                            <Button variant="outline" size="sm" onClick={() => setEditMode({...editMode, socials: true})}>
                                                Add Social Links
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* EDIT MODE: Inputs & Add More */}
                            {editMode.socials && (
                                <>
                                    {/* Render active social inputs */}
                                    {[
                                        { key: 'linkedin', icon: Linkedin, color: 'text-[#0077b5]', bg: 'bg-[#0077b5]/10', placeholder: 'LinkedIn URL' },
                                        { key: 'twitter', icon: Twitter, color: 'text-black dark:text-white', bg: 'bg-zinc-100 dark:bg-zinc-800', placeholder: 'Twitter URL' },
                                        { key: 'github', icon: Github, color: 'text-zinc-900 dark:text-white', bg: 'bg-zinc-100 dark:bg-zinc-800', placeholder: 'GitHub URL' }
                                    ].map((social) => {
                                        return activeSocials.includes(social.key) && (
                                            <div key={social.key} className="group flex items-center gap-4 animate-in slide-in-from-left-2 duration-300">
                                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors", social.bg)}>
                                                    <social.icon className={cn("w-5 h-5", social.color)} />
                                                </div>
                                                <div className="flex-1 relative">
                                                    <Input 
                                                        value={(profile as any)[social.key] || ''}
                                                        onChange={(e) => setProfile({...profile, [social.key]: e.target.value})} 
                                                        className={cn(
                                                            "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-black dark:focus:border-white focus:ring-0 transition-all",
                                                            (profile as any)[social.key] ? "pl-3" : "pl-3"
                                                        )} 
                                                        placeholder={social.placeholder}
                                                    />
                                                    {(profile as any)[social.key] && (profile as any)[social.key].length > 5 && (
                                                        <div className="absolute right-3 top-2.5 text-emerald-500 animate-in zoom-in">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-500" onClick={() => {
                                                    // Allow removing
                                                    setActiveSocials(prev => prev.filter(k => k !== social.key));
                                                    setProfile(prev => ({...prev, [social.key]: '' }));
                                                }}>
                                                    <span className="sr-only">Remove</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                                </Button>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Add More Dropdown */}
                                    {['linkedin', 'twitter', 'github'].some(k => !activeSocials.includes(k)) && (
                                        <div className="pt-2">
                                             <Select onValueChange={(val) => setActiveSocials([...activeSocials, val])}>
                                                <SelectTrigger className="w-[180px] h-9 text-xs border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500">
                                                    <div className="flex items-center gap-1">
                                                        <span>+ Add more social links</span>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {!activeSocials.includes('linkedin') && <SelectItem value="linkedin">LinkedIn</SelectItem>}
                                                    {!activeSocials.includes('twitter') && <SelectItem value="twitter">Twitter</SelectItem>}
                                                    {!activeSocials.includes('github') && <SelectItem value="github">GitHub</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleSave('Socials')} 
                                            className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-medium min-w-[100px]"
                                        >
                                            Save Socials
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-zinc-500" onClick={() => setEditMode({...editMode, socials: false})}>
                                            Cancel
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* --- SECURITY TAB --- */}
            {activeTab === 'security' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-black dark:text-white" /> Security Settings
                        </h2>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-950/50">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
                                    <p className="text-xs text-zinc-500">
                                      Use Google Authenticator, Authy, or another TOTP app. When enabled, sign-in requires your password and a 6-digit code.
                                    </p>
                                </div>
                                <Switch
                                  checked={!!user?.twoFactorEnabled}
                                  disabled={twoFaSetupBusy || twoFaBusy}
                                  onCheckedChange={(on) => {
                                    if (on) void startTwoFaSetup();
                                    else setTwoFaDisableOpen(true);
                                  }}
                                  className="data-[state=checked]:bg-black dark:data-[state=checked]:bg-white"
                                />
                            </div>

                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 space-y-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-0.5">
                                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Password</h3>
                                        <p className="text-xs text-zinc-500">
                                            Change the password you use to sign in. Fields stay hidden until you choose to update.
                                        </p>
                                    </div>
                                    {!passwordChangeOpen && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0 border-zinc-300 dark:border-zinc-700"
                                            onClick={() => setPasswordChangeOpen(true)}
                                        >
                                            Change password
                                        </Button>
                                    )}
                                </div>
                                {passwordChangeOpen && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                                            <div className="space-y-2">
                                                <label className="text-sm text-zinc-500 dark:text-zinc-400">Current password</label>
                                                <Input
                                                    type="password"
                                                    className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-black dark:focus:border-white focus:ring-0"
                                                    placeholder="••••••••"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    autoComplete="current-password"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-zinc-500 dark:text-zinc-400">New password</label>
                                                <Input
                                                    type="password"
                                                    className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-black dark:focus:border-white focus:ring-0"
                                                    placeholder="••••••••"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    autoComplete="new-password"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                type="button"
                                                className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black"
                                                onClick={handleUpdatePassword}
                                                disabled={isUpdatingPassword}
                                            >
                                                {isUpdatingPassword ? 'Updating…' : 'Update password'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-zinc-500"
                                                disabled={isUpdatingPassword}
                                                onClick={() => {
                                                    setPasswordChangeOpen(false);
                                                    setCurrentPassword('');
                                                    setNewPassword('');
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Login History */}
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                            <History className="w-5 h-5" /> Login History
                        </h2>
                        <p className="text-xs text-zinc-500 mb-4">
                          Successful sign-ins on this account. You get an email when we detect a new IP or browser.
                        </p>
                        {loginHistoryLoading ? (
                          <p className="text-sm text-zinc-500 py-6 text-center">Loading…</p>
                        ) : loginHistory.length === 0 ? (
                          <p className="text-sm text-zinc-500 py-6 text-center">No sign-ins recorded yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {loginHistory.map((row) => (
                              <div
                                key={row.id}
                                className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors rounded-lg"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Smartphone className="w-4 h-4 text-zinc-500 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{row.browserSummary}</p>
                                    <p className="text-xs text-zinc-500 truncate">
                                      {row.ip} ·{' '}
                                      {new Date(row.createdAt).toLocaleString(undefined, {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                      })}
                                    </p>
                                  </div>
                                </div>
                                {row.isCurrent ? (
                                  <span className="text-xs text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/10 px-2 py-0.5 rounded-full shrink-0">
                                    Latest
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                    </section>
                </div>
            )}

            <Dialog
              open={twoFaSetupOpen}
              onOpenChange={(open) => {
                setTwoFaSetupOpen(open);
                if (!open) {
                  setTwoFaQr(null);
                  setTwoFaSecret('');
                  setTwoFaEnableCode('');
                }
              }}
            >
              <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle>Set up two-factor authentication</DialogTitle>
                  <DialogDescription>
                    Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
                  </DialogDescription>
                </DialogHeader>
                {twoFaQr ? (
                  <div className="space-y-4 py-2">
                    <div className="flex justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white p-3">
                      <img src={twoFaQr} alt="Authenticator QR" className="h-44 w-44 object-contain" />
                    </div>
                    <p className="text-xs text-zinc-500 break-all font-mono">Secret: {twoFaSecret}</p>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-600 dark:text-zinc-400">6-digit code</label>
                      <Input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        value={twoFaEnableCode}
                        onChange={(e) => setTwoFaEnableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-mono tracking-widest"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 py-4">Preparing setup…</p>
                )}
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setTwoFaSetupOpen(false)} disabled={twoFaBusy}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-black text-white dark:bg-white dark:text-black"
                    onClick={() => void confirmTwoFaEnable()}
                    disabled={twoFaBusy || twoFaEnableCode.length !== 6}
                  >
                    {twoFaBusy ? 'Saving…' : 'Enable 2FA'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={twoFaDisableOpen} onOpenChange={setTwoFaDisableOpen}>
              <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle>Disable two-factor authentication</DialogTitle>
                  <DialogDescription>Enter your account password and a current code from your authenticator app.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <label className="text-sm text-zinc-600 dark:text-zinc-400">Password</label>
                    <Input
                      type="password"
                      value={disable2faPassword}
                      onChange={(e) => setDisable2faPassword(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-zinc-600 dark:text-zinc-400">Authenticator code</label>
                    <Input
                      inputMode="numeric"
                      value={disable2faTotp}
                      onChange={(e) => setDisable2faTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-mono"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setTwoFaDisableOpen(false)} disabled={twoFaBusy}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void confirmTwoFaDisable()}
                    disabled={twoFaBusy || !disable2faPassword || disable2faTotp.length !== 6}
                  >
                    {twoFaBusy ? 'Working…' : 'Disable 2FA'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* --- NOTIFICATIONS TAB --- */}
            {activeTab === 'notifications' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                            <Bell className="w-5 h-5" /> Your notifications
                        </h2>
                        <p className="text-xs text-zinc-500 mb-6">
                          Messages you receive in BugChase (report updates, admin messages, announcements, and more).
                        </p>
                        {inAppNotificationsLoading ? (
                          <p className="text-sm text-zinc-500 py-8 text-center">Loading…</p>
                        ) : inAppNotifications.length === 0 ? (
                          <p className="text-sm text-zinc-500 py-8 text-center">No notifications yet.</p>
                        ) : (
                          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                            {inAppNotifications.map((row) => (
                              <li key={row.id}>
                                <button
                                  type="button"
                                  onClick={() => void handleNotificationActivate(row)}
                                  className={cn(
                                    'w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40',
                                    !row.read && 'bg-zinc-50/80 dark:bg-zinc-900/80 border-l-2 border-l-black dark:border-l-white',
                                  )}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    <span
                                      className={cn(
                                        'inline-flex h-2 w-2 rounded-full',
                                        row.read ? 'bg-zinc-300 dark:bg-zinc-600' : 'bg-black dark:bg-white',
                                      )}
                                      aria-hidden
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                        {notificationTypeLabel(row.type)}
                                      </span>
                                      <span className="text-[11px] text-zinc-400">
                                        {new Date(row.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{row.title}</p>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">{notificationPreview(row)}</p>
                                    {row.link ? (
                                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 pt-0.5">
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                        Open related page
                                      </p>
                                    ) : null}
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                    </section>
                </div>
            )}

            {/* --- STATS TAB --- */}
            {activeTab === 'stats' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                     {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mb-3">
                                <Target className="w-5 h-5 text-black dark:text-white" />
                            </div>
                            <span className="text-2xl font-bold text-zinc-900 dark:text-white">98.5%</span>
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Accuracy</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mb-3">
                                <Bug className="w-5 h-5 text-black dark:text-white" />
                            </div>
                            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{(user as any)?.reportsCount || 0}</span>
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Reports</span>
                        </div>
                         <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mb-3">
                                <Trophy className="w-5 h-5 text-black dark:text-white" />
                            </div>
                            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{(user as any)?.reputationScore || 0}</span>
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Reputation</span>
                        </div>
                    </div>

                    {/* Achievements */}
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                         <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-black dark:text-white" /> Achievements
                         </h2>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                             {[
                                 { 
                                     title: 'BugChase Pioneer',
                                     sub: 'Founding Hunter',
                                     date: 'Jan 12, 2024',
                                     desc: 'Participated in the BugChase Alpha Launch event.',
                                     icon: Shield,
                                     bg: 'bg-zinc-100 dark:bg-zinc-800'
                                 },
                                 { 
                                     title: 'Chase Elite 2024',
                                     sub: 'Top 10%',
                                     date: 'Feb 20, 2024',
                                     desc: 'Ranked in the top 10% of researchers for Q1.',
                                     icon: Trophy, 
                                     bg: 'bg-zinc-100 dark:bg-zinc-800'
                                 },
                                 { 
                                     title: 'System Breaker',
                                     sub: 'Critical Impact',
                                     date: 'Mar 15, 2024',
                                     desc: 'Submitted 5 verified Critical severity reports.',
                                     icon: Zap, 
                                     bg: 'bg-zinc-100 dark:bg-zinc-800'
                                 },
                                 { 
                                     title: 'Hunter Primal',
                                     sub: 'Streak Master',
                                     date: 'Apr 01, 2024',
                                     desc: 'Maintained a 7-day submission streak.',
                                     icon: Activity, 
                                     bg: 'bg-zinc-100 dark:bg-zinc-800'
                                 },
                             ].map((badge, i) => (
                                 <div key={i} className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950/50 hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors group">
                                     {/* Badge Image Area (Mocked with Icon) */}
                                     <div className={`h-40 flex items-center justify-center ${badge.bg} group-hover:opacity-80 transition-opacity`}>
                                         <badge.icon className="w-16 h-16 text-black dark:text-white drop-shadow-lg" />
                                     </div>
                                     
                                     {/* Content */}
                                     <div className="p-4 text-center">
                                         <h3 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">{badge.title}</h3>
                                         <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1">{badge.sub}</p>
                                         <p className="text-[10px] text-zinc-500 mb-3">{badge.date}</p>
                                         <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full mb-3" />
                                         <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                             {badge.desc}
                                         </p>
                                     </div>
                                 </div>
                             ))}
                             
                             {/* Locked Placeholder */}
                             <div className="flex flex-col border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/30 opacity-60">
                                 <div className="h-40 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/50">
                                     <Lock className="w-12 h-12 text-zinc-400 dark:text-zinc-600" />
                                 </div>
                                 <div className="p-4 text-center">
                                     <h3 className="font-bold text-zinc-400 dark:text-zinc-500 text-sm mb-1">Locked Badge</h3>
                                     <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mb-3">???</p>
                                     <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full mb-3" />
                                     <p className="text-xs text-zinc-500 dark:text-zinc-600">
                                         Continue hunting to unlock more achievements.
                                     </p>
                                 </div>
                             </div>
                         </div>
                    </section>
                </div>
            )}
        </div>

        {/* === RIGHT COLUMN (1/3) - Widgets (Persist across tabs) === */}
        <div className="space-y-8">
            
            {/* Status Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center relative overflow-hidden">
                <div className="relative h-24 w-full overflow-hidden">
                    {Boolean((user as any)?.coverPhoto) ? (
                        <img
                            src={(user as any)?.coverPhoto}
                            alt="Profile cover"
                            className="h-full w-full object-cover object-center"
                        />
                    ) : (
                        <div className="h-full w-full bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800" />
                    )}
                    <div className="absolute inset-0 bg-black/10 dark:bg-black/30" />
                    <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent" />
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-300 via-zinc-500 to-zinc-300 dark:from-zinc-700 dark:via-zinc-500 dark:to-zinc-700" />
                </div>
                
                <div className="px-6 pb-6 -mt-10">
                <div className="relative inline-block mb-3">
                    {user?.avatar && user.avatar !== 'default.jpg' ? (
                        <img
                            src={user.avatar}
                            alt="Profile"
                            className="w-20 h-20 rounded-full border-4 border-white dark:border-zinc-800 object-cover shadow-lg"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full border-4 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shadow-lg">
                            <User className="w-9 h-9 text-zinc-400 dark:text-zinc-500" />
                        </div>
                    )}
                    {user?.isVerified && (
                        <div className="absolute -bottom-1 -right-1 text-blue-500 z-10 drop-shadow-md" title="Verified">
                            <BadgeCheck className="w-7 h-7 fill-blue-500 text-white" />
                        </div>
                    )}
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">@{profile.nickname}</h3>
                <p className="text-zinc-500 text-sm mb-4">Rank 4 Researcher</p>

                <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800 mb-4">
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-500 dark:text-zinc-400">Profile Completion</span>
                        <span className="text-black dark:text-white font-mono">{completionPercentage}%</span>
                     </div>
                     <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                         <div 
                            className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${completionPercentage}%` }} 
                        />
                     </div>
                </div>

                <div className="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 text-left">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                        To reach 100%
                    </p>
                    {missingProfileItems.length > 0 ? (
                        <ul className="space-y-1.5">
                            {missingProfileItems.slice(0, 5).map((item) => (
                                <li key={item} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                                    {item}
                                </li>
                            ))}
                            {missingProfileItems.length > 5 ? (
                                <li className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-3.5">
                                    +{missingProfileItems.length - 5} more
                                </li>
                            ) : null}
                        </ul>
                    ) : (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">All profile sections completed.</p>
                    )}
                </div>
                 
                 <div className="text-xs text-zinc-500">
                    Joined Jan 2024
                 </div>
                </div>
            </div>

            {/* Public Profile Settings */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                <h3 className="font-bold text-zinc-900 dark:text-white mb-4">Public Profile</h3>
                
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs text-zinc-500 dark:text-zinc-400">Public URL</label>
                        <div className="flex items-center gap-2">
                            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 truncate flex-1 font-mono">
                                {window.location.origin}/h/{profile.nickname}
                            </div>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-zinc-500 hover:text-black dark:hover:text-white"
                                onClick={() => window.open(`/h/${profile.nickname}`, '_blank')}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                         <div className="space-y-0.5">
                            <span className="text-sm text-zinc-700 dark:text-zinc-300 block">Payout stats</span>
                            <span className="text-[10px] text-zinc-500 block">Show total payouts on your public profile</span>
                         </div>
                          <Switch 
                            checked={profile.showPayouts}
                            onCheckedChange={(c) => handleAutoSave('showPayouts', c)}
                            className="data-[state=checked]:bg-black dark:data-[state=checked]:bg-white"
                         />
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-2">
                         <div className="space-y-0.5">
                            <span className="text-sm text-zinc-700 dark:text-zinc-300 block">Private Profile</span>
                            <span className="text-[10px] text-zinc-500 block">Hide profile from public</span>
                         </div>
                          <Switch 
                            checked={profile.isPrivate}
                            onCheckedChange={(c) => handleAutoSave('isPrivate', c)}
                            className="data-[state=checked]:bg-black dark:data-[state=checked]:bg-white"
                         />
                    </div>
                </div>
            </div>

        </div>

      </div>

      {/* KYC Modal */}
      <KYCModal 
        isOpen={isKYCOpen} 
        setIsOpen={setIsKYCOpen} 
        onVerified={() => setKycStatus('pending')}
      />

      {/* Image Cropper Modal */}
      {imageSrc && (
          <ImageCropper 
            imageSrc={imageSrc}
            open={showCropper}
            onClose={() => setShowCropper(false)}
            onCropComplete={handleCropComplete}
            aspect={1}
            title="Edit Avatar"
          />
      )}

      {/* Cover Cropper Modal */}
      {coverImageSrc && (
          <ImageCropper
            imageSrc={coverImageSrc}
            open={showCoverCropper}
            onClose={() => setShowCoverCropper(false)}
            onCropComplete={handleCoverCropComplete}
            aspect={16 / 7}
            title="Edit Cover Photo"
          />
      )}

      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="w-[95vw] max-w-6xl border-zinc-200 dark:border-zinc-800">
          {selectedNotification ? (
            <div className="space-y-3">
              <DialogHeader>
                <DialogTitle>{selectedNotification.title}</DialogTitle>
                <DialogDescription>
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              {selectedNotification.html ? (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-black">
                  <iframe
                    title="Notification Email Preview"
                    srcDoc={selectedNotification.html}
                    className="w-full h-[72vh] bg-black"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-950">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {notificationPreview(selectedNotification)}
                  </p>
                </div>
              )}

              {selectedNotification.link ? (
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      navigate(selectedNotification.link as string);
                      setSelectedNotification(null);
                    }}
                    className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black"
                  >
                    Open related page
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
