import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Linkedin, 
  Twitter, 
  Trophy, 
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Camera,
  Globe,
  Bell,
  History,
  Target,
  Bug,
  FileCheck,
  Clock,
  Pencil,
  Github,
  User,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageCropper from '@/components/ImageCropper';

// Full Country List with Flags
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
  // Add more as needed or import from a shared util if available
];

  // Data Types
  interface ProfileState {
    name: string;
    nickname: string;
    country: string;
    bio: string;
    showStats: boolean;
    isPrivate: boolean;
    twitter: string;
    linkedin: string;
    github: string;
    notifications: {
        platform: boolean;
        assignments: boolean;
        payouts: boolean;
        marketing: boolean;
    };
    twoFactor: boolean;
  }
  
  type TabType = 'account' | 'security' | 'notifications' | 'stats';

  export default function TriagerProfile() {
    const { user, refreshUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
  
    // Image Cropper State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
  
    // State
    const [activeTab, setActiveTab] = useState<TabType>('account');
    const [editMode, setEditMode] = useState({
        general: false,
        socials: false
    });
  
    // Real Stats & Achievements State
    const [stats, setStats] = useState({
        reportsReviewed: 0,
        avgResponse: 'N/A',
        consensusScore: 0
    });
    const [achievements, setAchievements] = useState<any[]>([]);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
    const [profile, setProfile] = useState<ProfileState>({
      name: '',
      nickname: '',
      country: '',
      bio: '',
      showStats: true,
      isPrivate: false,
      twitter: '',
      linkedin: '',
      github: '',
      notifications: {
          platform: true,
          assignments: true,
          payouts: true,
          marketing: false
      },
      twoFactor: false
    });
  
    const [activeSocials, setActiveSocials] = useState<string[]>([]);
  
    // Load User Data & Fetch Stats
    useEffect(() => {
      if (user) {
          setProfile(prev => ({
              ...prev,
              name: user.name || '',
              nickname: (user as any).username || '',
              country: (user as any).country || '',
              bio: (user as any).bio || '',
              twitter: (user as any).linkedAccounts?.twitter || '',
              linkedin: (user as any).linkedAccounts?.linkedin || '',
              github: (user as any).linkedAccounts?.github || '',
          }));
  
          const socialKeys = ['twitter', 'linkedin', 'github'];
          const active = socialKeys.filter(k => (user as any).linkedAccounts?.[k]);
          setActiveSocials(active.length > 0 ? active : ['linkedin']);
          
          // Fetch Triager Stats
          fetch('/api/triager/profile')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    setStats(data.data.stats);
                    setAchievements(data.data.achievements);
                }
            })
            .catch(err => console.error("Failed to fetch triager stats", err));
      }
    }, [user]);

  // Profile Completion Calculation
  const completionPercentage = useMemo(() => {
      let score = 0;
      if (profile.name) score += 20;
      if (profile.nickname) score += 20;
      if (profile.country) score += 10;
      if (profile.bio) score += 20;
      if (user?.avatar && user.avatar !== 'default.jpg') score += 10;
      if (profile.twitter || profile.linkedin || profile.github) score += 20;
      return Math.min(score, 100);
  }, [profile, user]);

  // Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) { 
          toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
          return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
          setImageSrc(reader.result?.toString() || null);
          setShowCropper(true);
      });
      reader.readAsDataURL(file);
      e.target.value = ''; 
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
              await refreshUser();
              setShowCropper(false);
          } else {
              toast({ title: "Error", description: data.message || "Failed to upload avatar", variant: "destructive" });
          }
      } catch (error) {
          toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
      } finally {
          setIsUploading(false);
      }
  };

  const handleSave = async (section: 'General' | 'Socials') => {
    try {
        let finalNickname = profile.nickname.trim();
        // Enforce _bugchase suffix for Triagers
        if (finalNickname && !finalNickname.toLowerCase().endsWith('_bugchase')) {
            finalNickname = `${finalNickname}_bugchase`;
            // Update local state to reflect the change immediately
            setProfile(p => ({ ...p, nickname: finalNickname }));
            toast({ title: "Nickname Updated", description: "Appended '_bugchase' to your nickname as required." });
        }

        const payload: any = {
            name: profile.name,
            username: finalNickname,
            country: profile.country,
            bio: profile.bio,
            linkedAccounts: {
                twitter: profile.twitter,
                linkedin: profile.linkedin,
                github: profile.github
            }
        };

        const res = await fetch('/api/auth/update-me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (res.ok) {
            toast({ title: 'Success', description: `${section} updated successfully` });
            setEditMode(prev => ({ 
                ...prev, 
                [section === 'General' ? 'general' : 'socials']: false 
            }));
            refreshUser();
        } else {
            toast({ title: 'Error', description: data.message || 'Failed to update profile', variant: 'destructive' });
        }
    } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
        toast({ title: 'Error', description: 'Please fill in all password fields.', variant: 'destructive' });
        return;
    }

    if (newPassword !== confirmPassword) {
        toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
        return;
    }

    if (currentPassword === newPassword) {
        toast({ title: 'Error', description: 'New password must be different from the current password.', variant: 'destructive' });
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
            setConfirmPassword('');
            setShowPasswordSection(false);
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
                                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">Triager Level 3</span>
                            </h2>
                            {!editMode.general && (
                                <Button size="sm" variant="ghost" className="h-8 gap-2" onClick={() => setEditMode({...editMode, general: true})}>
                                    <Pencil className="w-4 h-4" /> Edit
                                </Button>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Avatar Section */}
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
                                        <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <User className="w-12 h-12 text-zinc-400 dark:text-zinc-500" />
                                        </div>
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
                                            Upload new
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
                                                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-zinc-500 dark:text-zinc-400">Username <span className="text-red-500">*</span></label>
                                                <div 
                                                    className="flex items-center h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 focus-within:ring-2 focus-within:ring-black dark:focus-within:ring-white focus-within:ring-offset-2 dark:focus-within:ring-offset-zinc-950 transition-all cursor-text overflow-hidden"
                                                    onClick={() => document.getElementById('username-input')?.focus()}
                                                >
                                                    <span className="text-zinc-500 font-medium mr-0.5 select-none">@</span>
                                                    
                                                    {/* Auto-resizing input wrapper */}
                                                    <div className="relative grid align-middle">
                                                        {/* Hidden text for width calculation */}
                                                        <span className="invisible col-start-1 row-start-1 whitespace-pre text-sm font-normal px-0">
                                                            {profile.nickname.replace('_bugchase', '') || 'username'}
                                                        </span>
                                                        
                                                        <input 
                                                            id="username-input"
                                                            value={profile.nickname.replace('_bugchase', '')} 
                                                            onChange={(e) => {
                                                                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                                                if (val.length <= 12) {
                                                                    setProfile({...profile, nickname: `${val}_bugchase`});
                                                                }
                                                            }}
                                                            className="col-start-1 row-start-1 w-full bg-transparent border-none p-0 text-sm placeholder:text-zinc-500 focus:outline-none text-zinc-900 dark:text-white font-normal bg-zinc-50 dark:bg-zinc-950"
                                                            placeholder="username"
                                                            spellCheck={false}
                                                            autoComplete="off"
                                                        />
                                                    </div>

                                                    <span className="text-zinc-400 text-sm font-mono select-none">
                                                        _bugchase
                                                    </span>
                                                    
                                                    {/* Spacer to fill remaining area */}
                                                    <div className="flex-1 h-full" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm text-zinc-500 dark:text-zinc-400">Country</label>
                                                <Select 
                                                    value={profile.country} 
                                                    onValueChange={(val) => setProfile({...profile, country: val})}
                                                >
                                                  <SelectTrigger className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
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
                                                className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 min-h-[100px]"
                                            />
                                        </div>

                                        <div className="pt-2 flex gap-3">
                                            <Button className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-medium" onClick={() => handleSave('General')}>
                                                Save Changes
                                            </Button>
                                            <Button variant="ghost" onClick={() => setEditMode({...editMode, general: false})}>Cancel</Button>
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
                                                <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-1">Username</span>
                                                <p className="text-lg font-medium text-zinc-900 dark:text-white font-mono">@{profile.nickname}</p>
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
                            </div>
                        </div>
                    </section>

                    {/* Socials */}
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">My Socials</h2>
                            {!editMode.socials && (
                                <Button size="sm" variant="ghost" className="h-8 gap-2" onClick={() => setEditMode({...editMode, socials: true})}>
                                    <Pencil className="w-4 h-4" /> Edit
                                </Button>
                            )}
                        </div>

                        <div className="space-y-4">
                        {editMode.socials ? (
                            <>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Linkedin className="w-5 h-5 text-[#0077b5]" />
                                        <Input 
                                            value={profile.linkedin} 
                                            onChange={(e) => setProfile({...profile, linkedin: e.target.value})}
                                            placeholder="LinkedIn URL"
                                            className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Twitter className="w-5 h-5 text-black dark:text-white" />
                                        <Input 
                                            value={profile.twitter} 
                                            onChange={(e) => setProfile({...profile, twitter: e.target.value})}
                                            placeholder="Twitter URL"
                                            className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Github className="w-5 h-5 text-zinc-900 dark:text-white" />
                                        <Input 
                                            value={profile.github} 
                                            onChange={(e) => setProfile({...profile, github: e.target.value})}
                                            placeholder="GitHub URL"
                                            className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                                        />
                                    </div>
                                </div>
                                <div className="pt-2 flex gap-3">
                                    <Button size="sm" onClick={() => handleSave('Socials')} className="bg-black text-white dark:bg-white dark:text-black">Save Socials</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditMode({...editMode, socials: false})}>Cancel</Button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                {['linkedin', 'twitter', 'github'].map(key => {
                                     const val = (profile as any)[key];
                                     if (!val) return null;
                                     const map: any = {
                                        linkedin: { icon: Linkedin, color: 'text-[#0077b5]', label: 'LinkedIn' },
                                        twitter: { icon: Twitter, color: 'text-black dark:text-white', label: 'Twitter' },
                                        github: { icon: Github, color: 'text-zinc-900 dark:text-white', label: 'GitHub' },
                                     };
                                     const item = map[key];
                                     const Icon = item.icon;
                                     return (
                                        <a key={key} href={val} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                                            <Icon className={cn("w-5 h-5", item.color)} />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{item.label}</p>
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

                            {!showPasswordSection ? (
                                <Button 
                                    variant="outline" 
                                    className="w-full border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                                    onClick={() => setShowPasswordSection(true)}
                                >
                                    Change Password
                                </Button>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm text-zinc-500 dark:text-zinc-400">Current Password</label>
                                            <div className="relative">
                                                <Input 
                                                    type={showCurrentPassword ? "text" : "password"}
                                                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 pr-10" 
                                                    placeholder="••••••••" 
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                                >
                                                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm text-zinc-500 dark:text-zinc-400">New Password</label>
                                            <div className="relative">
                                                <Input 
                                                    type={showNewPassword ? "text" : "password"}
                                                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 pr-10"
                                                    placeholder="••••••••" 
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                                >
                                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm text-zinc-500 dark:text-zinc-400">Confirm New Password</label>
                                            <div className="relative">
                                                <Input 
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 pr-10"
                                                    placeholder="••••••••" 
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button 
                                            className="flex-1 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black"
                                            onClick={handleUpdatePassword}
                                            disabled={isUpdatingPassword}
                                        >
                                            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => {
                                                setShowPasswordSection(false);
                                                setCurrentPassword('');
                                                setNewPassword('');
                                                setConfirmPassword('');
                                                setShowCurrentPassword(false);
                                                setShowNewPassword(false);
                                                setShowConfirmPassword(false);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* --- STATS TAB (Real Data) --- */}
            {activeTab === 'stats' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                     {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mb-3">
                                <FileCheck className="w-5 h-5 text-black dark:text-white" />
                            </div>
                            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.reportsReviewed}</span>
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Reports Reviewed</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mb-3">
                                <Clock className="w-5 h-5 text-black dark:text-white" />
                            </div>
                            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.avgResponse}</span>
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Avg Response</span>
                        </div>
                         <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center mb-3">
                                <Target className="w-5 h-5 text-black dark:text-white" />
                            </div>
                            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.consensusScore}%</span>
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Consensus Score</span>
                        </div>
                    </div>

                    {/* Achievements */}
                    <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                         <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-black dark:text-white" /> Triager Achievements
                         </h2>
                         
                         {achievements.length > 0 ? (
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                 {achievements.map((badge, i) => {
                                     // Simple icon mapping fallback
                                     const Icon = badge.icon === 'Shield' ? Shield :
                                                  badge.icon === 'Bug' ? Bug :
                                                  badge.icon === 'Clock' ? Clock : Trophy;
                                                  
                                     return (
                                         <div key={i} className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950/50 hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors group">
                                             <div className={`h-40 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 group-hover:opacity-80 transition-opacity`}>
                                                 <Icon className="w-16 h-16 text-black dark:text-white drop-shadow-lg" />
                                             </div>
                                             <div className="p-4 text-center">
                                                 <h3 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">{badge.title}</h3>
                                                 <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1">{badge.sub}</p>
                                                 <p className="text-[10px] text-zinc-500 mb-3">{new Date(badge.date).toLocaleDateString()}</p>
                                                 <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full mb-3" />
                                                 <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                                     {badge.desc}
                                                 </p>
                                             </div>
                                         </div>
                                     );
                                 })}
                             </div>
                         ) : (
                             <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-950/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                <Trophy className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 dark:text-zinc-400">No achievements earned yet.</p>
                             </div>
                         )}
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

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">@{profile.nickname}</h3>
                <p className="text-zinc-500 text-sm mb-4">Triager Level 3</p>

                <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800 mb-4">
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-500 dark:text-zinc-400">Profile Completion</span>
                        <span className="text-black dark:text-white font-mono">{completionPercentage}%</span>
                     </div>
                     <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                         <div className="h-full bg-black dark:bg-white transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
                     </div>
                </div>
                 
                 <div className="text-xs text-zinc-500">
                    Active since {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                 </div>
            </div>



        </div>

      </div>
      
      {/* Image Cropper Modal */}
      {showCropper && imageSrc && (
          <ImageCropper 
              imageSrc={imageSrc}
              open={showCropper}
              onClose={() => setShowCropper(false)}
              onCropComplete={handleCropComplete}
          />
      )}

    </div>
  );
}
