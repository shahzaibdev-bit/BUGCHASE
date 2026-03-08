import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Filter, MoreVertical, Shield, Building2, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
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



import SuspendProgramDialog from '@/components/admin/SuspendProgramDialog';
import { API_URL } from '@/config';

const statusColors: Record<string, string> = {
  Active: 'bg-green-500/10 text-green-500 border-green-500/20',
  Pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Suspended: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  Rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function AdminPrograms() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrograms = async () => {
    setIsLoading(true);
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/programs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            setPrograms(data.data.programs || []);
        }
    } catch (error) {
        console.error("Failed to fetch programs", error);
    } finally {
        setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPrograms();
  }, []);

  const handleAction = async (id: string, newStatus: string, reason?: string) => {
      try {
          const body: any = { status: newStatus };
          if (reason) body.reason = reason;

          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/admin/programs/${id}/status`, {
              method: 'PATCH',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(body)
          });
          if (res.ok) {
              const data = await res.json();
              // Update local state directly
              setPrograms(prev => prev.map(p => p._id === id ? { ...p, status: newStatus } : p));
              toast.success(`Program marked as ${newStatus}`);
          }
      } catch (error) {
          console.error("Failed to update status");
      }
  };

  const openSuspendDialog = (program: any) => {
      setSelectedProgram(program);
      setIsSuspendOpen(true);
  };

  const handleSuspendSubmit = async (reason: string) => {
      if (selectedProgram) {
          await handleAction(selectedProgram._id, 'Suspended', reason);
      }
  };

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          program.companyId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          program.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || program.status === statusFilter;
    const matchesType = typeFilter === 'all' || program.type?.toLowerCase() === typeFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (isLoading) {
      return <div className="p-10 text-center font-mono text-zinc-500">Loading Programs...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in relative">
      <SuspendProgramDialog 
        isOpen={isSuspendOpen} 
        onClose={() => setIsSuspendOpen(false)} 
        onSubmit={handleSuspendSubmit}
        programName={selectedProgram?.title || 'Program'}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono uppercase">Program Management</h1>
        <p className="text-muted-foreground mt-2">Oversee and manage security programs from companies</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <InvertedTiltCard>
          <InverseSpotlightCard className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center backdrop-blur-sm hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors">
            <span className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">{programs.length}</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Total Programs</span>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center backdrop-blur-sm hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors">
            <span className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">
              {programs.filter(p => p.status === 'Active').length}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Active</span>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center backdrop-blur-sm hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors">
             <span className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">
              {programs.filter(p => p.status === 'Pending').length}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Pending Review</span>
          </InverseSpotlightCard>
        </InvertedTiltCard>

        <InvertedTiltCard>
          <InverseSpotlightCard className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center backdrop-blur-sm hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors">
             <span className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">
              {programs.filter(p => p.isPrivate).length}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Private</span>
          </InverseSpotlightCard>
        </InvertedTiltCard>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search programs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 font-mono"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-background/50 font-mono">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL_STATUS</SelectItem>
            <SelectItem value="Active">ACTIVE</SelectItem>
            <SelectItem value="Pending">PENDING</SelectItem>
            <SelectItem value="Suspended">PAUSED</SelectItem>
             <SelectItem value="Rejected">REJECTED</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-background/50 font-mono">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL_TYPES</SelectItem>
            <SelectItem value="public">PUBLIC</SelectItem>
            <SelectItem value="private">PRIVATE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Programs Table */}
      <GlassCard className="p-0 overflow-hidden border-border bg-card/50">
        <div className="w-full">
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4 bg-zinc-50/50 dark:bg-zinc-900/20">
                {filteredPrograms.map((program) => (
                    <div 
                        key={program._id} 
                        className="bg-background border border-border p-4 rounded-xl shadow-sm flex flex-col gap-4 cursor-pointer hover:border-zinc-500 transition-colors"
                        onClick={() => navigate(`/admin/programs/${program._id}`)}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border flex items-center justify-center overflow-hidden">
                                     {program.companyId?.avatar && program.companyId?.avatar !== 'default.jpg' ? (
                                         <img src={program.companyId.avatar} className="w-full h-full object-cover" />
                                     ) : (
                                         <Shield className="h-5 w-5 text-muted-foreground" />
                                     )}
                                </div>
                                <div>
                                    <p className="font-bold text-foreground font-mono text-sm">{program.title}</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                        <Building2 className="h-3 w-3" />
                                        <span>{program.companyId?.name || program.companyName || 'Unknown Company'}</span>
                                    </div>
                                </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-foreground/5 -mr-2" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border-border">
                                <DropdownMenuItem 
                                    className="focus:bg-muted font-mono text-xs"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/programs/${program._id}`); }}
                                >
                                  <Eye className="h-3 w-3 mr-2" />
                                  VIEW_DETAILS
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border" />
                                {program.status === 'Pending' && (
                                    <>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(program._id, 'Active'); }} className="text-green-500 focus:bg-green-500/10 focus:text-green-500 font-mono text-xs">
                                        <CheckCircle className="h-3 w-3 mr-2" />
                                        APPROVE
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(program._id, 'Rejected'); }} className="text-red-500 focus:bg-red-500/10 focus:text-red-500 font-mono text-xs">
                                        <XCircle className="h-3 w-3 mr-2" />
                                        REJECT
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {program.status === 'Active' && (
                                   <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openSuspendDialog(program); }} className="text-yellow-500 focus:bg-yellow-500/10 focus:text-yellow-500 font-mono text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-2" />
                                      PAUSE_PROGRAM
                                   </DropdownMenuItem>
                                )}
                                {(program.status === 'Suspended' || program.status === 'Rejected') && (
                                     <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(program._id, 'Active'); }} className="text-green-500 focus:bg-green-500/10 focus:text-green-500 font-mono text-xs">
                                     <CheckCircle className="h-3 w-3 mr-2" />
                                     ACTIVATE
                                     </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/30">
                             <div className="space-y-1">
                                 <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Status</span>
                                 <div>
                                    <Badge variant="outline" className={`font-mono text-[10px] uppercase ${statusColors[program.status]}`}>
                                      {program.status}
                                    </Badge>
                                 </div>
                             </div>
                             <div className="space-y-1">
                                 <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Type</span>
                                 <p className="font-mono text-xs">{program.type.toUpperCase()}</p>
                             </div>
                             <div className="col-span-2 space-y-1">
                                 <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Bounty Range</span>
                                 <p className="font-mono text-xs text-muted-foreground">{program.bountyRange?.replace(/\$/g, 'PKR ') || 'N/A'}</p>
                             </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 font-mono text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border/30">
                    <th className="px-6 py-3 font-medium">Program</th>
                    <th className="px-6 py-3 font-medium">Company</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Bounty Range</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Submitted</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredPrograms.map((program) => (
                    <tr 
                        key={program._id} 
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/programs/${program._id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border flex items-center justify-center overflow-hidden">
                             {program.companyId?.avatar && program.companyId?.avatar !== 'default.jpg' ? (
                                 <img src={program.companyId.avatar} className="w-full h-full object-cover" />
                             ) : (
                                 <Shield className="h-5 w-5 text-muted-foreground" />
                             )}
                          </div>
                          <span className="font-medium text-foreground font-mono">{program.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span className="font-mono text-xs">{program.companyId?.name || program.companyName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {program.type.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {program.bountyRange?.replace(/\$/g, 'PKR ') || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`font-mono text-[10px] uppercase ${statusColors[program.status]}`}>
                          {program.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {new Date(program.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-foreground/5" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border-border">
                            <DropdownMenuItem 
                                className="focus:bg-muted font-mono text-xs"
                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/programs/${program._id}`); }}
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              VIEW_DETAILS
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            {program.status === 'Pending' && (
                                <>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(program._id, 'Active'); }} className="text-green-500 focus:bg-green-500/10 focus:text-green-500 font-mono text-xs">
                                    <CheckCircle className="h-3 w-3 mr-2" />
                                    APPROVE
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(program._id, 'Rejected'); }} className="text-red-500 focus:bg-red-500/10 focus:text-red-500 font-mono text-xs">
                                    <XCircle className="h-3 w-3 mr-2" />
                                    REJECT
                                    </DropdownMenuItem>
                                </>
                            )}
                            {program.status === 'Active' && (
                               <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openSuspendDialog(program); }} className="text-yellow-500 focus:bg-yellow-500/10 focus:text-yellow-500 font-mono text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-2" />
                                  PAUSE_PROGRAM
                               </DropdownMenuItem>
                            )}
                            {(program.status === 'Suspended' || program.status === 'Rejected') && (
                                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(program._id, 'Active'); }} className="text-green-500 focus:bg-green-500/10 focus:text-green-500 font-mono text-xs">
                                 <CheckCircle className="h-3 w-3 mr-2" />
                                 ACTIVATE
                                 </DropdownMenuItem>
                            )}
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
    </div>
  );
}
