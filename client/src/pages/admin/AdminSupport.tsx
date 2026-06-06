import React, { useState } from 'react';
import {
  Headphones,
  Search,
  Plus,
  MoreVertical,
  Mail,
  Scale,
  CreditCard,
  UserCog,
  LifeBuoy,
  Wrench,
  UserCheck
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SupportOnboardingModal } from '@/components/admin/SupportOnboardingModal';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { API_URL } from '@/config';
import { useNavigate } from 'react-router-dom';

const SPECIALIZATION_ICONS: Record<string, React.ReactNode> = {
    disputes: <Scale className="h-3 w-3" />,
    payments: <CreditCard className="h-3 w-3" />,
    account: <UserCog className="h-3 w-3" />,
    technical: <Wrench className="h-3 w-3" />,
    general: <LifeBuoy className="h-3 w-3" />
};

const SPECIALIZATION_LABELS: Record<string, string> = {
    disputes: 'DISPUTES',
    payments: 'PAYMENTS',
    account: 'ACCOUNT',
    technical: 'TECHNICAL',
    general: 'GENERAL'
};

export default function AdminSupport() {
  const navigate = useNavigate();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSupport = async () => {
    setIsLoading(true);
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/support`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            setMembers(data.data.support || []);
        }
    } catch (error) {
        console.error("Failed to fetch support team", error);
    } finally {
        setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSupport();
  }, []);

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.expertise || []).some((e: string) => e.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-mono font-bold text-foreground tracking-tight flex items-center gap-3">
             <Headphones className="h-8 w-8 text-foreground" />
             SUPPORT_TEAM_MANAGEMENT
          </h1>
          <p className="text-muted-foreground mt-2">Onboard and monitor the support team handling disputes and customer care.</p>
        </div>
        <Button
            onClick={() => setIsOnboardingOpen(true)}
            className="bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-mono gap-2 shadow-sm"
        >
            <Plus className="h-4 w-4" />
            ONBOARD_NEW_SUPPORT
        </Button>
      </div>

      {/* Action Bar */}
      <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Find by name or support area..."
                className="pl-9 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:border-zinc-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex gap-2 w-full md:w-auto">
             <div className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                ACTIVE_TEAM: <span className="text-foreground font-bold ml-1">{members.length}</span>
             </div>
         </div>
      </GlassCard>

      {/* Roster */}
      <div className="grid gap-4">
         {isLoading ? (
             <div className="text-center py-10 font-mono text-zinc-500">Initializing Uplink...</div>
         ) : filteredMembers.length === 0 ? (
             <div className="text-center py-10 font-mono text-zinc-500">No support personnel found.</div>
         ) : (
             filteredMembers.map((member) => (
            <InverseSpotlightCard
              key={member._id}
              className="p-0 overflow-hidden bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer"
              onClick={() => navigate(`/admin/support/${member._id}`)}
            >
                 <div className="p-4 flex flex-col md:flex-row items-start md:items-center gap-6">
                     {/* Identity */}
                    <div className="flex items-center gap-4 min-w-[250px]">
                        <Avatar className="h-12 w-12 border-2 border-zinc-200 dark:border-zinc-800">
                             <AvatarImage src={member.avatar && member.avatar !== 'default.jpg' ? member.avatar : undefined} />
                            <AvatarFallback className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-mono">
                                {member.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-foreground">{member.name}</h3>
                                {member.status === 'Active' && <div className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-1">
                                <span className="text-zinc-500 max-w-[100px] truncate">{member._id}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {member.email}
                                </span>
                            </div>
                        </div>
                     </div>

                     {/* Specializations */}
                     <div className="flex-1 flex flex-wrap gap-2">
                         {(member.expertise || []).map((exp: string) => (
                             <Badge
                                key={exp}
                                variant="outline"
                                className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 gap-1.5 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors uppercase"
                             >
                                {SPECIALIZATION_ICONS[exp] || <LifeBuoy className="h-3 w-3" />}
                                {SPECIALIZATION_LABELS[exp] || exp}
                             </Badge>
                         ))}
                     </div>

                     {/* Actions */}
                     <div className="flex items-center gap-6 md:pl-6 md:border-l border-zinc-200 dark:border-zinc-800/50 w-full md:w-auto justify-between md:justify-start">
                         <Button
                           variant="ghost"
                           size="icon"
                           className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
                           onClick={(e) => {
                             e.stopPropagation();
                             navigate(`/admin/support/${member._id}`);
                           }}
                         >
                             <MoreVertical className="h-4 w-4 text-zinc-500" />
                         </Button>
                     </div>
                 </div>

                 {/* Footer Status Bar */}
                 <div className="bg-zinc-50 dark:bg-zinc-900/50 px-4 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
                     <span>Last Active: {member.lastActive ? new Date(member.lastActive).toLocaleDateString() : 'Never'}</span>
                     <span className="flex items-center gap-1">
                         <UserCheck className="h-3 w-3" />
                         Verified Personnel
                     </span>
                 </div>
             </InverseSpotlightCard>
         )))}
      </div>

      <SupportOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={fetchSupport}
      />
    </div>
  );
}
