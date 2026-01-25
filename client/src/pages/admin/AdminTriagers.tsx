import React, { useState } from 'react';
import { 
  Shield, 
  Search, 
  Plus, 
  MoreVertical, 
  Mail, 
  FileCode, 
  Smartphone, 
  Globe, 
  Server, 
  Cpu,
  Terminal,
  UserCheck
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TriagerOnboardingModal } from '@/components/admin/TriagerOnboardingModal';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';

// Expertise Icon Map
const EXPERTISE_ICONS: Record<string, React.ReactNode> = {
    web: <Globe className="h-3 w-3" />,
    mobile: <Smartphone className="h-3 w-3" />,
    source_code: <FileCode className="h-3 w-3" />,
    network: <Server className="h-3 w-3" />,
    smart_contracts: <Cpu className="h-3 w-3" />,
    api: <Terminal className="h-3 w-3" />
};

const EXPERTISE_LABELS: Record<string, string> = {
    web: 'WEB',
    mobile: 'MOBILE',
    source_code: 'SOURCE',
    network: 'INFRA',
    smart_contracts: 'SMART CONTRACT',
    api: 'API'
};

// Mock Data
const MOCK_TRIAGERS = [
  {
    id: 'TRG-001',
    name: 'Sarah Connor',
    email: 'sarah.c@bugchase.io',
    expertise: ['web', 'network'],
    status: 'active',
    reportsProcessed: 145,
    lastActive: '2 mins ago',
    avatar: ''
  },
  {
    id: 'TRG-002',
    name: 'Neo Anderson',
    email: 'neo@bugchase.io',
    expertise: ['source_code', 'smart_contracts', 'api'],
    status: 'active',
    reportsProcessed: 89,
    lastActive: '1 hour ago',
    avatar: ''
  },
  {
    id: 'TRG-003',
    name: 'Trinity Moss',
    email: 'trinity@bugchase.io',
    expertise: ['mobile', 'api'],
    status: 'offline',
    reportsProcessed: 230,
    lastActive: '2 days ago',
    avatar: ''
  }
];

export default function AdminTriagers() {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [triagers, setTriagers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTriagers = async () => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/admin/triagers');
        const data = await res.json();
        if (res.ok) {
            setTriagers(data.data.triagers || []);
        }
    } catch (error) {
        console.error("Failed to fetch triagers", error);
    } finally {
        setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTriagers();
  }, []);

  const filteredTriagers = triagers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.expertise || []).some((e: string) => e.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-mono font-bold text-foreground tracking-tight flex items-center gap-3">
             <Shield className="h-8 w-8 text-foreground" />
             TRIAGER_FORCE_MANAGEMENT
          </h1>
          <p className="text-muted-foreground mt-2">Manage the first line of defense. Onboard and monitor triagers.</p>
        </div>
        <Button 
            onClick={() => setIsOnboardingOpen(true)}
            className="bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-mono gap-2 shadow-sm"
        >
            <Plus className="h-4 w-4" />
            ONBOARD_NEW_TRIAGER
        </Button>
      </div>

      {/* Action Bar */}
      <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Find by name or expertise..." 
                className="pl-9 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:border-zinc-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex gap-2 w-full md:w-auto">
             <div className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                ACTIVE_FORCE: <span className="text-foreground font-bold ml-1">{triagers.length}</span>
             </div>
         </div>
      </GlassCard>

      {/* Roster Table */}
      <div className="grid gap-4">
         {isLoading ? (
             <div className="text-center py-10 font-mono text-zinc-500">Initializing Uplink...</div>
         ) : filteredTriagers.length === 0 ? (
             <div className="text-center py-10 font-mono text-zinc-500">No personnel found.</div>
         ) : (
             filteredTriagers.map((triager) => (
             <InverseSpotlightCard key={triager._id} className="p-0 overflow-hidden bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                 <div className="p-4 flex flex-col md:flex-row items-start md:items-center gap-6">
                     {/* Identity */}
                    <div className="flex items-center gap-4 min-w-[250px]">
                        <Avatar className="h-12 w-12 border-2 border-zinc-200 dark:border-zinc-800">
                             <AvatarImage src={triager.avatar && triager.avatar !== 'default.jpg' ? triager.avatar : undefined} />
                            <AvatarFallback className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-mono">
                                {triager.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-foreground">{triager.name}</h3>
                                {triager.status === 'Active' && <div className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-1">
                                <span className="text-zinc-500 max-w-[100px] truncate">{triager._id}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {triager.email}
                                </span>
                            </div>
                        </div>
                     </div>

                     {/* Expertise */}
                     <div className="flex-1 flex flex-wrap gap-2">
                         {(triager.expertise || []).map((exp: string) => (
                             <Badge 
                                key={exp} 
                                variant="outline" 
                                className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 gap-1.5 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors uppercase"
                             >
                                {EXPERTISE_ICONS[exp] || <Terminal className="h-3 w-3" />}
                                {EXPERTISE_LABELS[exp] || exp}
                             </Badge>
                         ))}
                     </div>

                     {/* Stats & Actions */}
                     <div className="flex items-center gap-6 md:pl-6 md:border-l border-zinc-200 dark:border-zinc-800/50 w-full md:w-auto justify-between md:justify-start">
                         <div className="text-right">
                             <div className="text-xs text-muted-foreground font-mono uppercase">Reports Closed</div>
                             <div className="font-bold text-xl text-foreground font-mono">{triager.reportsProcessed || 0}</div>
                         </div>
                         <Button variant="ghost" size="icon" className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
                             <MoreVertical className="h-4 w-4 text-zinc-500" />
                         </Button>
                     </div>
                 </div>
                 
                 {/* Footer Status Bar */}
                 <div className="bg-zinc-50 dark:bg-zinc-900/50 px-4 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
                     <span>Last Active: {triager.lastActive ? new Date(triager.lastActive).toLocaleDateString() : 'Never'}</span>
                     <span className="flex items-center gap-1">
                         <UserCheck className="h-3 w-3" />
                         Verified Personnel
                     </span>
                 </div>
             </InverseSpotlightCard>
         )))}
      </div>

      <TriagerOnboardingModal 
        isOpen={isOnboardingOpen} 
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={fetchTriagers}
      />
    </div>
  );
}
