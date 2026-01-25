import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Globe, Lock, Users, DollarSign, Calendar, MoreVertical, Edit, Trash2, Eye, ShieldAlert } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreateProgramModal } from '@/components/company/CreateProgramModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { API_URL } from '@/config';

export default function CompanyPrograms() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  // State
  const [programs, setPrograms] = useState<any[]>([]);
  const [verifiedAssets, setVerifiedAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
     try {
         setIsLoading(true);
         const [assetsRes, programsRes] = await Promise.all([
             fetch(`${API_URL}/company/assets`),
             fetch(`${API_URL}/company/programs`)
         ]);

         const assetsData = await assetsRes.json();
         const programsData = await programsRes.json();

         if (assetsRes.ok) setVerifiedAssets(assetsData.data);
         if (programsRes.ok) setPrograms(programsData.data);
     } catch (e) {
         console.error(e);
         toast({ title: 'Error', description: 'Failed to load programs.', variant: 'destructive' });
     } finally {
         setIsLoading(false);
     }
  };

  useEffect(() => {
     fetchData();
  }, []);

  const filteredPrograms = programs.filter(program =>
    program.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">Programs</h1>
          <p className="text-muted-foreground text-sm">Manage your bug bounty programs</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Program
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search programs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Programs Grid */}
      {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading programs...</div>
      ) : filteredPrograms.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/10">
              <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground">No Programs Found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-4">Create your first bug bounty or vulnerability disclosure program to start receiving reports.</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>Create Program</Button>
          </div>
      ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrograms.map((program) => (
              <GlassCard 
                key={program._id} 
                className="p-6 space-y-4 cursor-pointer hover:border-foreground/50 transition-all group relative overflow-hidden"
                onClick={() => navigate(`/company/programs/${program._id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {program.type === 'BBP' ? (
                         <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">BBP</Badge>
                      ) : (
                         <Badge variant="outline" className="bg-muted text-muted-foreground border-border">VDP</Badge>
                      )}
                      {program.isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <h3 className="font-semibold text-foreground">{program.title}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-panel">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/company/programs/${program._id}`); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/company/programs/${program._id}`); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Badge variant={['Active'].includes(program.status) ? 'default' : 'secondary'}>
                  {program.status}
                </Badge>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span className="text-xs">Researchers</span>
                    </div>
                    <p className="font-mono font-semibold">0</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      <span className="text-xs">Total Paid</span>
                    </div>
                    <p className="font-mono font-semibold">$0</p>
                  </div>
                </div>

                {program.type === 'BBP' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Bounty Range</span>
                      <span className="font-mono text-primary">{program.bountyRange}</span>
                    </div>
                )}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Created {new Date(program.createdAt).toLocaleDateString()}
                </div>
              </GlassCard>
            ))}
          </div>
      )}

      <CreateProgramModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        companyName={user?.companyName || 'Company'}
        verifiedAssets={verifiedAssets}
        onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchData();
        }}
      />
    </div>
  );
}
