import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MoreVertical, Ban, CheckCircle, Mail, Shield, User, AlertTriangle, Building2, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';

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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';
import { UserActionDialog } from '@/components/admin/UserActionDialog';
import { toast } from 'sonner';
import { API_URL } from '@/config';

// ... existing code ...


const roleColors: Record<string, string> = {
  researcher: 'bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800',
  company: 'bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800',
  triager: 'bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800',
  admin: 'bg-zinc-900 text-white border-zinc-800 dark:bg-white dark:text-black dark:border-zinc-200',
};

const statusColors: Record<string, string> = {
  active: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800',
  suspended: 'bg-zinc-100 text-zinc-500 line-through decoration-zinc-500/50',
  banned: 'bg-background text-muted-foreground border border-zinc-200 dark:border-zinc-800 opacity-70',
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog State
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    user: any | null;
    type: 'suspend' | 'ban';
  }>({
    isOpen: false,
    user: null,
    type: 'suspend'
  });
  const [emailDialog, setEmailDialog] = useState<{
    isOpen: boolean;
    user: any | null;
  }>({
    isOpen: false,
    user: null,
  });
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const fetchUsers = async () => {
    // ... same content ...
      try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/admin/users`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
            setUsers(data.data.users.map((u: any) => ({
                id: u._id,
                name: u.name,
                username: u.username,
                email: u.email,
                role: u.role,
                status: u.status,
                avatar: u.avatar,
                reports: u.stats?.reportsSubmitted || 0,
                programs: u.stats?.programsCreated || 0,
                triaged: u.stats?.reportsTriaged || 0,
                joined: new Date(u.createdAt).toLocaleDateString()
            })));
          }
      } catch (error) {
          console.error("Failed to fetch users", error);
      } finally {
          setIsLoading(false);
      }
  };

  React.useEffect(() => {
      fetchUsers();
  }, []);

  const handleUpdateStatus = async (userId: string, newStatus: string, reason?: string) => {
      try {
          const body = { status: newStatus, reason };
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
              method: 'PATCH',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(body)
          });
          
          if (res.ok) {
              setUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, status: newStatus } : u
              ));
              toast.success(`User ${newStatus.toLowerCase()} successfully`);
          } else {
              toast.error('Failed to update user status');
          }
      } catch (error) {
          console.error("Failed to update status", error);
          toast.error('An error occurred');
      }
  };

  const openActionDialog = (user: any, type: 'suspend' | 'ban') => {
      setActionDialog({
          isOpen: true,
          user,
          type
      });
  };

  const openEmailDialog = (user: any) => {
      setEmailDialog({ isOpen: true, user });
      setEmailSubject(`Important account notice for ${user.name}`);
      setEmailMessage(`<p>Hello ${user.name},</p><p>This is an important message from the BugChase admin team.</p><p>Regards,<br/>BugChase Admin Team</p>`);
  };

  const handleSendEmail = async () => {
      if (!emailDialog.user) return;
      const container = document.createElement('div');
      container.innerHTML = emailMessage || '';
      const emailBodyText = (container.textContent || container.innerText || '').replace(/\u00a0/g, ' ').trim();
      if (!emailSubject.trim() || !emailBodyText) {
          toast.error('Subject and message are required');
          return;
      }
      try {
          setIsSendingEmail(true);
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/admin/users/${emailDialog.user.id}/email`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  subject: emailSubject.trim(),
                  message: emailBodyText,
              })
          });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.message || 'Failed to send email');
          toast.success('Email sent successfully');
          setEmailDialog({ isOpen: false, user: null });
      } catch (error: any) {
          toast.error(error.message || 'Failed to send email');
      } finally {
          setIsSendingEmail(false);
      }
  };

  const handleViewPublicProfile = (user: any) => {
      const username = String(user.username || '').trim();
      if (!username) {
          toast.error('This user has no public username/profile yet');
          return;
      }
      window.open(`/h/${encodeURIComponent(username)}`, '_blank');
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
      const confirmed = window.confirm(`Delete ${userName} permanently from database? This action cannot be undone.`);
      if (!confirmed) return;
      try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/admin/users/${userId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const payload = await res.json();
          if (!res.ok) {
              throw new Error(payload.message || 'Failed to delete user');
          }
          setUsers(prev => prev.filter(u => u.id !== userId));
          toast.success('User deleted permanently');
      } catch (error: any) {
          toast.error(error.message || 'Failed to delete user');
      }
  };

  const handleConfirmAction = async (reason: string) => {
      if (!actionDialog.user) return;
      const status = actionDialog.type === 'suspend' ? 'Suspended' : 'Banned';
      await handleUpdateStatus(actionDialog.user.id, status, reason);
      // Close dialog handled by setter in component prop or here? 
      // Dialog onClose handles setting open to false usually, but here we can just reset
      setActionDialog(prev => ({ ...prev, isOpen: false }));
  };

  const filteredUsers = users.filter((user) => {
    // ... same filter logic ...
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || (user.role || '').toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || (user.status || 'Active').toLowerCase() === statusFilter.toLowerCase(); 
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ... Header & Stats & Filters ... */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono uppercase">User Management</h1>
        <p className="text-muted-foreground mt-2">Manage platform users and their access</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
         {/* ... (Keep existing stats cards) ... */}
         {/* Using placeholders to keep this replace block concise, assume user wants to keep them unless I replace specifically. 
             Wait, replace_file_content needs EXACT target content. 
             The previous view showed specific lines. I should probably targetedly replace the handler and the dropdown items, and add the dialog at the end.
             Overwriting the whole file is risky if I miss lines. 
             I will do targeted replaces.
         */}
      </div>
      
      {/* ... Filters ... */}

      {/* Users Table */}
      <GlassCard className="p-0 overflow-hidden border-border bg-card/50">
        <div className="w-full">
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4 bg-zinc-50/50 dark:bg-zinc-900/20">
                {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-background border border-border p-4 rounded-xl shadow-sm flex flex-col gap-4">
                         {/* ... Header: User & Action ... */}
                         <div className="flex justify-between items-start">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border flex items-center justify-center overflow-hidden">
                               {user.avatar && user.avatar !== 'default.jpg' ? (
                                 <img 
                                   src={user.avatar} 
                                   alt={user.name} 
                                   className="w-full h-full object-cover"
                                 />
                               ) : (
                                 user.role === 'company' ? (
                                   <Building2 className="h-5 w-5 text-muted-foreground" />
                                 ) : user.role === 'triager' ? (
                                   <Shield className="h-5 w-5 text-muted-foreground" />
                                 ) : (
                                   <User className="h-5 w-5 text-muted-foreground" />
                                 )
                               )}
                             </div>
                             <div>
                               <p className="font-bold text-foreground font-mono text-sm">{user.name}</p>
                               <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                             </div>
                           </div>
                           
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-foreground/5 -mr-2">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border-border">
                                <DropdownMenuItem className="focus:bg-muted font-mono text-xs" onClick={() => openEmailDialog(user)}>
                                  <Mail className="h-3 w-3 mr-2" />
                                  Send Email
                                </DropdownMenuItem>
                                <DropdownMenuItem className="focus:bg-muted font-mono text-xs" onClick={() => handleViewPublicProfile(user)}>
                                  <User className="h-3 w-3 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border" />
                                {(!user.status || user.status.toLowerCase() === 'active') && (
                                  <DropdownMenuItem 
                                    className="text-muted-foreground focus:bg-muted focus:text-foreground font-mono text-xs"
                                    onClick={() => openActionDialog(user, 'suspend')}
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-2" />
                                    Suspend User
                                  </DropdownMenuItem>
                                )}
                                {user.status?.toLowerCase() !== 'banned' && (
                                  <DropdownMenuItem 
                                    className="text-foreground focus:bg-destructive/10 focus:text-destructive font-mono text-xs"
                                    onClick={() => openActionDialog(user, 'ban')}
                                  >
                                    <Ban className="h-3 w-3 mr-2" />
                                    Ban User
                                  </DropdownMenuItem>
                                )}
                                {user.status?.toLowerCase() === 'suspended' && (
                                  <DropdownMenuItem 
                                    className="text-foreground focus:bg-muted font-mono text-xs"
                                    onClick={() => handleUpdateStatus(user.id, 'Active')}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-2" />
                                    Unsuspend User
                                  </DropdownMenuItem>
                                )}
                                {user.status?.toLowerCase() === 'banned' && (
                                  <DropdownMenuItem 
                                    className="text-foreground focus:bg-muted font-mono text-xs"
                                    onClick={() => handleUpdateStatus(user.id, 'Active')}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-2" />
                                    Unban User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem
                                  className="text-red-600 focus:bg-red-500/10 focus:text-red-600 font-mono text-xs"
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                         {/* ... Details Grid ... */}
                         {/* Keeping existing details grid */}
                         <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/30">
                            {/* ... */}
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Role</span>
                              <div>
                                <Badge variant="outline" className={`font-mono text-xs uppercase ${roleColors[user.role]}`}>
                                  {user.role}
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Status</span>
                              <div>
                                <Badge variant="secondary" className={`font-mono text-xs uppercase ${statusColors[user.status] || statusColors.active}`}>
                                  {user.status || 'Active'}
                                </Badge>
                              </div>
                            </div>
                            {/* ... */}
                         </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 font-mono text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border/30">
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Activity</th>
                    <th className="px-6 py-3 font-medium">Joined</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                      {/* ... cells ... */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border flex items-center justify-center overflow-hidden">
                            {user.avatar && user.avatar !== 'default.jpg' ? (
                              <img 
                                src={user.avatar} 
                                alt={user.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              user.role === 'company' ? (
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              ) : user.role === 'triager' ? (
                                <Shield className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <User className="h-5 w-5 text-muted-foreground" />
                              )
                            )}
                          </div>
                          <div>
                            <button className="font-medium text-foreground font-mono text-left hover:underline" onClick={() => navigate(`/admin/users/${user.id}`)}>{user.name}</button>
                            <p className="text-sm text-muted-foreground font-mono text-xs">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`font-mono text-xs uppercase ${roleColors[user.role]}`}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className={`font-mono text-xs uppercase ${statusColors[user.status] || statusColors.active}`}>
                          {user.status || 'Active'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-muted-foreground">
                        {user.role === 'researcher' && `${user.reports} reports`}
                        {user.role === 'company' && `${user.programs} programs`}
                        {user.role === 'triager' && `${user.triaged} triaged`}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{user.joined}</td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-foreground/5">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border-border">
                            {/* ... Common actions ... */}
                            <DropdownMenuItem className="focus:bg-muted font-mono text-xs" onClick={() => openEmailDialog(user)}>
                              <Mail className="h-3 w-3 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem className="focus:bg-muted font-mono text-xs" onClick={() => handleViewPublicProfile(user)}>
                              <User className="h-3 w-3 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            {(!user.status || user.status.toLowerCase() === 'active') && (
                              <DropdownMenuItem 
                                className="text-muted-foreground focus:bg-muted focus:text-foreground font-mono text-xs"
                                onClick={() => openActionDialog(user, 'suspend')}
                              >
                                <AlertTriangle className="h-3 w-3 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            )}
                            {user.status?.toLowerCase() !== 'banned' && (
                              <DropdownMenuItem 
                                className="text-foreground focus:bg-destructive/10 focus:text-destructive font-mono text-xs"
                                onClick={() => openActionDialog(user, 'ban')}
                              >
                                <Ban className="h-3 w-3 mr-2" />
                                Ban User
                              </DropdownMenuItem>
                            )}
                            {user.status?.toLowerCase() === 'suspended' && (
                              <DropdownMenuItem 
                                className="text-foreground focus:bg-muted font-mono text-xs"
                                onClick={() => handleUpdateStatus(user.id, 'Active')}
                              >
                                <CheckCircle className="h-3 w-3 mr-2" />
                                Unsuspend User
                              </DropdownMenuItem>
                            )}
                            {user.status?.toLowerCase() === 'banned' && (
                              <DropdownMenuItem 
                                className="text-foreground focus:bg-muted font-mono text-xs"
                                onClick={() => handleUpdateStatus(user.id, 'Active')}
                              >
                                <CheckCircle className="h-3 w-3 mr-2" />
                                Unban User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              className="text-red-600 focus:bg-red-500/10 focus:text-red-600 font-mono text-xs"
                              onClick={() => handleDeleteUser(user.id, user.name)}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </GlassCard>

      <UserActionDialog
        isOpen={actionDialog.isOpen}
        onClose={() => setActionDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={`${actionDialog.type === 'suspend' ? 'Suspend' : 'Ban'} User`}
        actionType={actionDialog.type}
        userName={actionDialog.user?.name || ''}
      />

      <Dialog open={emailDialog.isOpen} onOpenChange={(open) => setEmailDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Send email to {emailDialog.user?.email || 'user'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Subject</p>
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Enter email subject" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Message</p>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <CyberpunkEditor
                  content={emailMessage}
                  onChange={setEmailMessage}
                  placeholder="Write your message..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog({ isOpen: false, user: null })}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
