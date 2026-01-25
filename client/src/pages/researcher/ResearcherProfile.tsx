import React, { useState } from 'react';
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
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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

// Simple Country List with Flags
const countries = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
];

// Mock Data Types
interface ProfileState {
  name: string;
  nickname: string;
  country: string;
  bio: string;
  hireable: boolean;
  showPayouts: boolean;
  isPrivate: boolean;
  twitter: string;
  linkedin: string;
  github: string;
  notifications: {
      platform: boolean;
      reports: boolean;
      payouts: boolean;
      marketing: boolean;
  };
  twoFactor: boolean;
}

type TabType = 'account' | 'security' | 'notifications' | 'stats';

import { useAuth } from '@/contexts/AuthContext';

// ... (keep existing imports)

export default function ResearcherProfile() {
  // ... inside ResearcherProfile component
  const { user, refreshUser } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // State
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');
  // Image Cropper State
  const [isKYCOpen, setIsKYCOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  
  // Edit Mode State
  const [editMode, setEditMode] = useState({
    general: false,
    socials: false
  });
  
  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // Initial state logic handled in useEffect for updating from user
  const [profile, setProfile] = useState<ProfileState>({
    name: '',
    nickname: '',
    country: '',
    bio: '',
    hireable: true,
    showPayouts: false,
    isPrivate: false,
    twitter: '',
    linkedin: '',
    github: '',
    notifications: {
        platform: true,
        reports: true,
        payouts: true,
        marketing: false
    },
    twoFactor: false
  });

  const [activeSocials, setActiveSocials] = useState<string[]>([]);

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

  React.useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        name: user.name || '',
        nickname: (user as any).username || (user as any).nickname || '',
        country: (user as any).country || '', 
        bio: (user as any).bio || '',
        twitter: (user as any).linkedAccounts?.twitter || '',
        linkedin: (user as any).linkedAccounts?.linkedin || '',
        github: (user as any).linkedAccounts?.github || '',
      }));
      
      const socialKeys = ['twitter', 'linkedin', 'github'];
      const active = socialKeys.filter(k => (user as any).linkedAccounts?.[k]);
      setActiveSocials(active.length > 0 ? active : ['linkedin', 'twitter']);
    }
  }, [user]);

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
          const res = await fetch('/api/users/upload-avatar', {
              method: 'POST',
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

  // Handlers
  const handleSave = async (section: 'General' | 'Socials') => {
    try {
        const res = await fetch('/api/auth/update-me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: profile.name,
                username: profile.nickname,
                country: profile.country,
                bio: profile.bio,
                hireable: profile.hireable,
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

  const handleAutoSave = async (field: keyof ProfileState, value: any) => {
      // Optimistic update
      setProfile(prev => ({ ...prev, [field]: value }));

      try {
          const res = await fetch('/api/auth/update-me', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [field]: value })
          });

          if (!res.ok) {
              const data = await res.json();
              toast({ title: 'Error', description: data.message || 'Failed to save setting', variant: 'destructive' });
              // Revert on failure (optional but good practice)
              setProfile(prev => ({ ...prev, [field]: !value })); 
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
        const res = await fetch('/api/auth/update-password', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        const data = await res.json();

        if (res.ok) {
            toast({ title: 'Success', description: 'Password updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
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
                                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">80 Points Earned</span>
                            </h2>
                            {!editMode.general && (
                                <Button size="sm" variant="ghost" className="h-8 gap-2" onClick={() => setEditMode({...editMode, general: true})}>
                                    <Pencil className="w-4 h-4" /> Edit
                                </Button>
                            )}
                        </div>

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
                                                <Select 
                                                    value={profile.country} 
                                                    onValueChange={(val) => setProfile({...profile, country: val})}
                                                >
                                                  <SelectTrigger className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-0">
                                                    <SelectValue placeholder="Select country" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {countries.map((c) => (
                                                      <SelectItem key={c.code} value={c.name}>
                                                        <span className="mr-2 text-lg">{c.flag}</span> {c.name}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
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
                                                    <span className="text-2xl">{countries.find(c => c.name === profile.country)?.flag || '🌍'}</span>
                                                    {profile.country || 'Global'}
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
                                            <p className="text-xs text-zinc-500">Badge verification increases trust.</p>
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
                                        <Button variant="ghost" className="text-zinc-500" onClick={() => setEditMode({...editMode, general: false})}>
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

                    {/* My Wallets */}
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">My Wallets</h2>
                        <div className="grid gap-4">
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 flex items-center gap-2 text-zinc-400 border-r border-zinc-200 dark:border-zinc-800 pr-3">
                                    <span className="font-bold text-xs">USDC</span>
                                </div>
                                <Input className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-black dark:focus:border-white focus:ring-0 pl-20" placeholder="0x..." />
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 flex items-center gap-2 text-zinc-400 border-r border-zinc-200 dark:border-zinc-800 pr-3">
                                    <span className="font-bold text-xs">BTC</span>
                                </div>
                                <Input className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-black dark:focus:border-white focus:ring-0 pl-20" placeholder="bc1..." />
                            </div>
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
                                    <p className="text-xs text-zinc-500">Secure your account with an authentication app</p>
                                </div>
                                <Switch 
                                    checked={profile.twoFactor}
                                    onCheckedChange={(c) => setProfile({...profile, twoFactor: c})}
                                    className="data-[state=checked]:bg-black dark:data-[state=checked]:bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-500 dark:text-zinc-400">Current Password</label>
                                    <Input 
                                        type="password" 
                                        className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-black dark:focus:border-white focus:ring-0" 
                                        placeholder="••••••••" 
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-zinc-500 dark:text-zinc-400">New Password</label>
                                    <Input 
                                        type="password" 
                                        className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-black dark:focus:border-white focus:ring-0" 
                                        placeholder="••••••••" 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button 
                                className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black"
                                onClick={handleUpdatePassword}
                                disabled={isUpdatingPassword}
                            >
                                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                            </Button>
                        </div>
                    </section>

                    {/* Login History */}
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                            <History className="w-5 h-5" /> Login History
                        </h2>
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="w-4 h-4 text-zinc-500" />
                                        <div>
                                            <p className="text-sm text-zinc-700 dark:text-zinc-300">Chrome on Windows</p>
                                            <p className="text-xs text-zinc-500">New York, USA • 2 hours ago</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/10 px-2 py-0.5 rounded-full">Active</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}

            {/* --- NOTIFICATIONS TAB --- */}
            {activeTab === 'notifications' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                            <Bell className="w-5 h-5" /> Notification Preferences
                        </h2>
                        <div className="space-y-6">
                            {Object.entries(profile.notifications).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white capitalize">{key.replace(/([A-Z])/g, ' $1').trim()} Notifications</h3>
                                        <p className="text-xs text-zinc-500">Receive updates about {key} via email</p>
                                    </div>
                                    <Switch 
                                        checked={value}
                                        onCheckedChange={(c) => setProfile({...profile, notifications: {...profile.notifications, [key]: c}})}
                                        className="data-[state=checked]:bg-black dark:data-[state=checked]:bg-white"
                                    />
                                </div>
                            ))}
                        </div>
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
                            <span className="text-2xl font-bold text-zinc-900 dark:text-white">42</span>
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Reports</span>
                        </div>
                         <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mb-3">
                                <Trophy className="w-5 h-5 text-black dark:text-white" />
                            </div>
                            <span className="text-2xl font-bold text-zinc-900 dark:text-white">1,250</span>
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
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-300 via-zinc-500 to-zinc-300 dark:from-zinc-700 dark:via-zinc-500 dark:to-zinc-700" />
                
                <div className="relative inline-block mb-3">
                    <img 
                        src={user?.avatar && user.avatar !== 'default.jpg' ? user.avatar : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3"} 
                        alt="Profile" 
                        className="w-20 h-20 rounded-full border-4 border-white dark:border-zinc-800 object-cover shadow-lg"
                    />
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
                 
                 <div className="text-xs text-zinc-500">
                    Joined Jan 2024
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
                            <span className="text-sm text-zinc-700 dark:text-zinc-300 block">Available for hire</span>
                            <span className="text-[10px] text-zinc-500 block">Show "Hire Me" badge</span>
                         </div>
                         <Switch 
                            checked={profile.hireable}
                            onCheckedChange={(c) => handleAutoSave('hireable', c)}
                            className="data-[state=checked]:bg-black dark:data-[state=checked]:bg-white"
                         />
                    </div>

                    <div className="flex items-center justify-between">
                         <div className="space-y-0.5">
                            <span className="text-sm text-zinc-700 dark:text-zinc-300 block">Payout stats</span>
                            <span className="text-[10px] text-zinc-500 block">Show total earnings</span>
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
          />
      )}
    </div>
  );
};
