import React, { useState, useEffect } from 'react';
import { Building2, Mail, Globe, Shield, Bell, Users, Key, Save, GlobeLock, Camera, Upload, MapPin, Linkedin, Twitter, Github } from 'lucide-react';
import { DomainVerificationTab } from './DomainVerificationTab';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { InviteMemberModal } from '@/components/company/InviteMemberModal';
import { API_URL } from '@/config';
import ImageCropper from '@/components/ImageCropper';

import { TeamMember } from '@/types';

export default function CompanySettings() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const [activeTab, setActiveTab] = useState('profile');
  
  // Team State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
      companyName: '',
      industry: '',
      city: '',
      country: '',
      website: '',
      bio: '',
  });

  // Password State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
  });

  // Notifications State
  const [notifications, setNotifications] = useState({
    newReports: true,
    statusUpdates: true,
    weeklyDigest: false,
    criticalAlerts: true,
  });

  // --- Handlers ---

  // Fetch Team
  const fetchTeamMembers = async () => {
      setIsLoadingTeam(true);
      try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/company/team`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
              setTeamMembers(data.data.members);
          }
      } catch (error) {
          console.error("Failed to fetch team", error);
      } finally {
          setIsLoadingTeam(false);
      }
  };

  useEffect(() => {
      if (activeTab === 'team') {
          fetchTeamMembers();
      }
  }, [activeTab]);

  // Handle Profile Data from User Context
  useEffect(() => {
    if (user) {
        setFormData({
            companyName: user.companyName || '',
            industry: user.industry || '',
            city: user.city || '',
            country: user.country || '',
            website: user.website || '',
            bio: user.bio || '',
        });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
      try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/users/updateMe`, {
              method: 'PATCH',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(formData)
          });
          const data = await res.json();
          if (res.ok) {
              toast({ title: 'Profile Updated', description: 'Your company details have been saved.' });
              setIsEditing(false);
          } else {
              toast({ title: 'Update Failed', description: data.message || 'Could not save profile.', variant: 'destructive' });
          }
      } catch (err) {
          toast({ title: 'Error', description: 'Failed to connect to server.', variant: 'destructive' });
      }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePassword = async () => {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
          toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
          return;
      }
      if (passwordData.newPassword.length < 8) {
           toast({ title: 'Error', description: 'Password must be at least 8 characters.', variant: 'destructive' });
           return;
      }

      try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/auth/update-password`, {
              method: 'PATCH',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  currentPassword: passwordData.currentPassword,
                  newPassword: passwordData.newPassword
              })
          });
          const data = await res.json();
          if (res.ok) {
              toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
              setShowPasswordChange(false);
              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          } else {
              toast({ title: 'Update Failed', description: data.message || 'Could not update password.', variant: 'destructive' });
          }
      } catch (err) {
          toast({ title: 'Error', description: 'Failed to connect to server.', variant: 'destructive' });
      }
  };

  // Image Upload Handlers
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
      e.target.value = ''; // Reset input
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
      const formData = new FormData();
      formData.append('avatar', croppedBlob, 'avatar.jpg');

      setIsUploading(true);
      try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/users/upload-avatar`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData,
          });
          const data = await res.json();

          if (res.ok) {
              toast({ title: "Success", description: "Company logo updated successfully" });
              await refreshUser(); 
          } else {
              toast({ title: "Error", description: data.message || "Failed to upload logo", variant: "destructive" });
          }
      } catch (error) {
          toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
      } finally {
          setIsUploading(false);
          setShowCropper(false); // Close cropper
      }
  };

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-mono">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your company profile and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="glass-panel p-1 w-full justify-start overflow-x-auto overflow-y-hidden no-scrollbar h-auto">
          <TabsTrigger value="profile" className="gap-2 shrink-0">
            <Building2 className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 shrink-0">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 shrink-0">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 shrink-0">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="domains" className="gap-2 shrink-0">
            <GlobeLock className="h-4 w-4" />
            Domain Verification
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <GlassCard className="p-6 space-y-8 bg-card/80 dark:bg-[#090909] border border-border shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                     <h3 className="text-lg font-semibold text-foreground">Company Profile</h3>
                     <p className="text-sm text-muted-foreground">Manage your company details and public information.</p>
                </div>
                <div className="flex gap-2">
                    {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2">
                            Edit Profile
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button onClick={() => setIsEditing(false)} variant="ghost" className="text-zinc-500">
                                Cancel
                            </Button>
                            <Button onClick={handleSave} className="gap-2">
                                <Save className="h-4 w-4" />
                                Save Changes
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Logo Section */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 p-4 rounded-xl border border-dashed border-border bg-muted/30">
                <div 
                    className={cn(
                        "w-24 h-24 rounded-xl bg-muted dark:bg-[#151515] border border-border flex items-center justify-center overflow-hidden relative transition-colors",
                         isEditing && "group cursor-pointer hover:border-primary/50"
                    )}
                    onClick={() => isEditing && fileInputRef.current?.click()}
                >
                    {user?.avatar && user.avatar !== 'default.jpg' ? (
                       <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover"/>
                    ) : (
                        <Building2 className="h-10 w-10 text-muted-foreground" />
                    )}

                    {isEditing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                    )}

                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

                <div className="space-y-2 flex-1 text-center md:text-left">
                     <div className="flex flex-col">
                        <Label className="text-base font-medium">Company Logo</Label>
                        {isEditing ? (
                            <>
                                <span className="text-xs text-muted-foreground mt-1">
                                    Click the logo to upload a new image. Recommended size: 500x500px.
                                </span>
                                
                                <div className="mt-2">
                                     <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="w-3 h-3 mr-2" />
                                        Upload Logo
                                     </Button>
                                </div>
                            </>
                        ) : (
                           <span className="text-xs text-muted-foreground mt-1">
                                This logo will appear on your public profile and verification documents.
                           </span>
                        )}
                    </div>
                </div>
            </div>

            {showCropper && imageSrc && (
                <ImageCropper
                    open={showCropper}
                    onClose={() => setShowCropper(false)}
                    imageSrc={imageSrc}
                    onCropComplete={handleCropComplete}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Company Name</Label>
                {isEditing ? (
                    <Input 
                        name="companyName" 
                        value={formData.companyName} 
                        onChange={handleChange} 
                        className="bg-background dark:bg-[#151515] border-input" 
                    />
                ) : (
                    <div className="text-sm py-2 px-1 flex items-center text-foreground/90 font-medium">
                        {formData.companyName || 'N/A'}
                    </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                {isEditing ? (
                    <Input 
                        name="industry" 
                        value={formData.industry} 
                        onChange={handleChange} 
                        className="bg-background dark:bg-[#151515] border-input" 
                    />
                ) : (
                    <div className="text-sm py-2 px-1 flex items-center text-foreground/90 font-medium">
                        {formData.industry || 'N/A'}
                    </div>
                )}
              </div>
              
              {/* Location Fields */}
              <div className="space-y-2">
                <Label>Headquarters (City)</Label>
                {isEditing ? (
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            name="city" 
                            value={formData.city} 
                            onChange={handleChange} 
                            className="pl-10 bg-background dark:bg-[#151515] border-input" 
                        />
                    </div>
                ) : (
                    <div className="text-sm py-2 px-1 flex items-center gap-2 text-foreground/90 font-medium">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {formData.city || 'N/A'}
                    </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                 {isEditing ? (
                    <Input 
                        name="country" 
                        value={formData.country} 
                        onChange={handleChange} 
                        className="bg-background dark:bg-[#151515] border-input" 
                    />
                ) : (
                    <div className="text-sm py-2 px-1 flex items-center text-foreground/90 font-medium">
                        {formData.country || 'N/A'}
                    </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Contact Email</Label>
                <div className="text-sm py-2 px-1 flex items-center gap-2 text-muted-foreground font-medium">
                     <Mail className="h-4 w-4" />
                     {user?.email || 'N/A'}
                </div>
                 <p className="text-[10px] text-muted-foreground">Email cannot be changed directly.</p>
              </div>
              
              <div className="space-y-2">
                <Label>Website</Label>
                {isEditing ? (
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        name="website" 
                        value={formData.website} 
                        onChange={handleChange} 
                        className="pl-10 bg-background dark:bg-[#151515] border-input" 
                      />
                    </div>
                ) : (
                     <div className="text-sm py-2 px-1 flex items-center gap-2 text-foreground/90 font-medium">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {formData.website ? (
                            <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {formData.website}
                            </a>
                        ) : 'N/A'}
                    </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Company Description</Label>
                {isEditing ? (
                    <Textarea 
                      name="bio"
                      rows={4}
                      value={formData.bio}
                      onChange={handleChange}
                      className="bg-background dark:bg-[#151515] border-input resize-none"
                    />
                ) : (
                    <div className="text-sm py-2 px-1 whitespace-pre-wrap text-foreground/90 font-medium">
                        {formData.bio || 'N/A'}
                    </div>
                )}
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <GlassCard className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>
            
            <div className="space-y-4">
              {[
                { key: 'newReports', label: 'New Report Submissions', description: 'Get notified when researchers submit new vulnerability reports' },
                { key: 'statusUpdates', label: 'Report Status Updates', description: 'Receive updates when report statuses change' },
                { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Get a weekly summary of your program activity' },
                { key: 'criticalAlerts', label: 'Critical Vulnerability Alerts', description: 'Immediate notifications for critical severity reports' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-foreground/5 border border-border/30">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <GlassCard className="p-6 space-y-6 bg-card/80 dark:bg-[#090909] border border-border shadow-sm">
              <div className="flex items-center justify-between">
                  <div>
                      <h3 className="text-lg font-semibold text-foreground">Change Password</h3>
                      <p className="text-sm text-muted-foreground">Ensure your account is using a long, random password to stay secure.</p>
                  </div>
                  {!showPasswordChange && (
                      <Button onClick={() => setShowPasswordChange(true)} variant="outline">
                          Change Password
                      </Button>
                  )}
              </div>
              
              {showPasswordChange && (
                  <div className="space-y-4 max-w-md animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <Input 
                        type="password" 
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="bg-background dark:bg-[#151515] border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input 
                        type="password" 
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="bg-background dark:bg-[#151515] border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm New Password</Label>
                      <Input 
                        type="password" 
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="bg-background dark:bg-[#151515] border-input"
                      />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleUpdatePassword}>Update Password</Button>
                        <Button variant="ghost" onClick={() => setShowPasswordChange(false)}>Cancel</Button>
                    </div>
                  </div>
              )}
            </GlassCard>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <GlassCard className="p-6 space-y-6 bg-card/80 dark:bg-[#090909] border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                  <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
                  <p className="text-sm text-muted-foreground">Manage your team's access and roles.</p>
              </div>
              <Button className="gap-2" onClick={() => setIsInviteModalOpen(true)}>
                <Users className="h-4 w-4" />
                Invite Member
              </Button>
            </div>
            
            <div className="space-y-3">
              {isLoadingTeam ? (
                  <div className="text-center py-4 text-muted-foreground">Loading team...</div>
              ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                      No team members found. Invite someone to get started.
                  </div>
              ) : (
                  teamMembers.map((member) => (
                    <div key={member._id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                             <Badge variant="outline" className="capitalize bg-background dark:bg-[#151515]">{member.companyRole || 'Viewer'}</Badge>
                             <div className="text-xs text-muted-foreground mt-1">
                                {member.isVerified ? 'Active' : 'Invited'}
                             </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Edit</Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </GlassCard>
          
          <InviteMemberModal 
            isOpen={isInviteModalOpen} 
            onClose={() => setIsInviteModalOpen(false)}
            onInviteSuccess={fetchTeamMembers}
            companyName={user?.companyName || 'Company'}
          />
        </TabsContent>

        {/* Domain Verification Tab */}
        <TabsContent value="domains">
            <DomainVerificationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
