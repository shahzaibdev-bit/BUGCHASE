import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Shield, 
  Building2, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Globe,
  Lock,
  Target,
  Award,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GlassCard } from '@/components/ui/glass-card';
import { toast } from 'sonner';

import SuspendProgramDialog from '@/components/admin/SuspendProgramDialog';
import { API_URL } from '@/config';

export default function AdminProgramDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState<any>(null);
  const [hallOfFame, setHallOfFame] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);

  const fetchProgram = async () => {
    setIsLoading(true);
    try {
       const token = localStorage.getItem('token');
       const adminRes = await fetch(`${API_URL}/admin/programs/${id}`, {
           headers: { 'Authorization': `Bearer ${token}` }
       });
       const adminData = await adminRes.json();
       if (adminData.status === 'success') {
           setProgram(adminData.data.program);
           setHallOfFame(adminData.data.hallOfFame || []);
       }

    } catch (error) {
      console.error("Failed to fetch program details", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgram();
  }, [id]);

  const handleAction = async (newStatus: string, reason?: string) => {
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
              // Update local state directly
              setProgram((prev: any) => ({ 
                  ...prev, 
                  status: newStatus,
                  suspensionReason: newStatus === 'Suspended' ? reason : undefined 
              }));
              toast.success(`Program marked as ${newStatus}`);
          } else {
              toast.error("Failed to update status");
          }
      } catch (error) {
          toast.error("Network error");
      }
  };

  const handleSuspendSubmit = async (reason: string) => {
      await handleAction('Suspended', reason);
  };

  if (isLoading) return <div className="p-10 text-center font-mono text-zinc-500">Loading Protocol Data...</div>;
  if (!program) return <div className="p-10 text-center font-mono text-zinc-500">Program Not Found</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10 relative">
      <SuspendProgramDialog 
        isOpen={isSuspendOpen} 
        onClose={() => setIsSuspendOpen(false)} 
        onSubmit={handleSuspendSubmit}
        programName={program.title}
      />

      {/* Header / Nav */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/programs')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-tight flex items-center gap-3">
             {program.title}
             {program.isPrivate && <Lock className="h-4 w-4 text-zinc-500" />}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 font-mono">
            <Building2 className="h-3 w-3" />
            {program.companyId?.name || program.companyName}
            <span>•</span>
            <span className="uppercase">{program.type}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
            {program.status === 'Pending' && (
                <>
                    <Button onClick={() => handleAction('Active')} className="bg-foreground text-background hover:bg-foreground/90 font-mono gap-2">
                        <CheckCircle className="h-4 w-4" /> APPROVE_PROGRAM
                    </Button>
                    <Button onClick={() => handleAction('Rejected')} variant="outline" className="font-mono gap-2 border-border text-foreground hover:bg-accent">
                        <XCircle className="h-4 w-4" /> REJECT
                    </Button>
                </>
            )}
            {program.status === 'Active' && (
                 <Button onClick={() => setIsSuspendOpen(true)} variant="outline" className="text-foreground border-border hover:bg-accent font-mono gap-2">
                    <AlertTriangle className="h-4 w-4" /> SUSPEND_PROTOCOL
                 </Button>
            )}
             {(program.status === 'Suspended' || program.status === 'Rejected') && (
                 <Button onClick={() => handleAction('Active')} className="bg-foreground text-background hover:bg-foreground/90 font-mono gap-2">
                    <CheckCircle className="h-4 w-4" /> {program.status === 'Rejected' ? 'ACTIVATE' : 'REACTIVATE'}
                 </Button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
              {/* Overview */}
              <GlassCard className="p-6">
                  <h3 className="text-lg font-bold font-mono uppercase mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-foreground" /> Program Overview
                  </h3>
                  <div 
                      className="prose dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-400" 
                      dangerouslySetInnerHTML={{ __html: program.description || "No description provided." }} 
                  />
              </GlassCard>

              {/* Policies */}
              {(program.rulesOfEngagement || program.safeHarbor || program.submissionGuidelines) && (
                  <GlassCard className="p-6">
                      <h3 className="text-lg font-bold font-mono uppercase mb-4 flex items-center gap-2">
                          <Shield className="h-5 w-5 text-foreground" /> Policies & Guidelines
                      </h3>
                      <div className="space-y-6">
                          {program.rulesOfEngagement && (
                              <div>
                                  <h4 className="text-sm font-bold font-mono uppercase text-zinc-800 dark:text-zinc-300 mb-2">Rules of Engagement</h4>
                                  <div className="prose dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-400" dangerouslySetInnerHTML={{ __html: program.rulesOfEngagement }} />
                              </div>
                          )}
                          {program.safeHarbor && (
                              <div>
                                  <h4 className="text-sm font-bold font-mono uppercase text-zinc-800 dark:text-zinc-300 mb-2">Safe Harbor</h4>
                                  <div className="prose dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-400" dangerouslySetInnerHTML={{ __html: program.safeHarbor }} />
                              </div>
                          )}
                          {program.submissionGuidelines && (
                              <div>
                                  <h4 className="text-sm font-bold font-mono uppercase text-zinc-800 dark:text-zinc-300 mb-2">Submission Guidelines</h4>
                                  <div className="prose dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-400" dangerouslySetInnerHTML={{ __html: program.submissionGuidelines }} />
                              </div>
                          )}
                      </div>
                  </GlassCard>
              )}

              {/* Scope */}
              <GlassCard className="p-6">
                  <h3 className="text-lg font-bold font-mono uppercase mb-4 flex items-center gap-2">
                      <Target className="h-5 w-5 text-foreground" /> Scope Assets
                  </h3>
                  <div className="space-y-3">
                      {(program.scope || []).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                              <div className="flex items-center gap-3">
                                  <div className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded text-[10px] font-mono font-bold uppercase w-16 text-center">
                                      {item.type || 'ASSET'}
                                  </div>
                                  <span className="font-mono text-sm">{item.asset}</span>
                              </div>
                              <Badge variant="outline" className="font-mono text-[10px]">{item.tier || 'Tier 1'}</Badge>
                          </div>
                      ))}
                      {(!program.scope || program.scope.length === 0) && (
                          <div className="text-sm text-zinc-500 italic">No scope assets defined.</div>
                      )}
                  </div>
              </GlassCard>
              
               {/* Out of Scope */}
              <GlassCard className="p-6">
                  <h3 className="text-lg font-bold font-mono uppercase mb-4 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-foreground" /> Out of Scope
                  </h3>
                  <div className="space-y-3">
                      {(program.outOfScope || []).map((item: any, i: number) => (
                          <div key={i} className="flex flex-col p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                              <span className="font-mono text-sm font-bold text-red-400">{item.asset}</span>
                              <span className="text-xs text-red-400/70 mt-1">{item.reason}</span>
                          </div>
                      ))}
                       {(!program.outOfScope || program.outOfScope.length === 0) && (
                          <div className="text-sm text-zinc-500 italic">No out-of-scope items defined.</div>
                      )}
                  </div>
              </GlassCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
              {/* Status Card */}
              <GlassCard className="p-6">
                  <div className="text-center">
                      <div className={`inline-flex items-center justify-center p-3 rounded-full mb-4 border ${
                          program.status === 'Active' ? 'bg-accent text-foreground border-border' :
                          program.status === 'Pending' ? 'bg-accent text-foreground border-border' :
                          program.status === 'Rejected' ? 'bg-accent text-foreground border-border' :
                          'bg-zinc-500/10 text-zinc-500 border-transparent'
                      }`}>
                          {program.status === 'Active' ? <CheckCircle className="h-8 w-8" /> :
                           program.status === 'Pending' ? <Clock className="h-8 w-8" /> :
                           program.status === 'Rejected' ? <XCircle className="h-8 w-8" /> :
                           <AlertTriangle className="h-8 w-8" />}
                      </div>
                      <h3 className="text-xl font-bold font-mono uppercase">{program.status}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Current Program State</p>
                      {program.suspensionReason && (
                          <div className="mt-4 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 font-mono text-xs">
                              <span className="font-bold block mb-1">REASON:</span>
                              {program.suspensionReason}
                          </div>
                      )}
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Submitted</span>
                          <span className="font-mono text-foreground">{new Date(program.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Type</span>
                          <span className="font-mono uppercase text-foreground">{program.type}</span>
                      </div>
                       <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Bounty Range</span>
                          <span className="font-mono text-foreground">{program.bountyRange || 'N/A'}</span>
                      </div>
                  </div>
              </GlassCard>

              {/* Rewards Card */}
              <GlassCard className="p-6">
                  <h3 className="text-sm font-bold font-mono uppercase mb-4 flex items-center gap-2">
                      <Award className="h-4 w-4 text-foreground" /> Reward Structure
                  </h3>
                   <div className="space-y-2">
                      {['critical', 'high', 'medium', 'low'].map((severity) => {
                          const reward = program.rewards?.[severity];
                          if (!reward) return null;
                          return (
                              <div key={severity} className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900/30">
                                   <Badge variant="outline" className="capitalize w-20 justify-center border-border text-foreground">
                                       {severity}
                                   </Badge>
                                   <span className="font-mono text-xs">
                                       ${reward.min} - ${reward.max}
                                   </span>
                              </div>
                          );
                      })}
                   </div>
              </GlassCard>

              {/* Company Info Card */}
              <GlassCard className="p-6">
                  <h3 className="text-sm font-bold font-mono uppercase mb-4 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-foreground" /> Publisher Info
                  </h3>
                  <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-12 w-12 border border-border">
                          <AvatarImage src={program.companyId?.avatar} className="object-cover" />
                          <AvatarFallback className="font-mono bg-zinc-800 text-zinc-300">
                             {program.companyId?.name?.substring(0,2).toUpperCase() || 'CO'}
                          </AvatarFallback>
                      </Avatar>
                      <div>
                          <p className="font-bold text-foreground">{program.companyId?.name || program.companyName}</p>
                          <p className="text-xs text-muted-foreground">{program.companyId?.email || 'No email provided'}</p>
                      </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Industry</span>
                          <span className="font-mono text-foreground">{program.companyId?.industry || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Location</span>
                          <span className="font-mono text-foreground">{program.companyId?.city || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Domain Verified</span>
                          <span className="font-mono text-zinc-700 dark:text-zinc-300">
                              {(program.companyId?.verifiedAssets && program.companyId.verifiedAssets.length > 0) ? <CheckCircle className="inline h-4 w-4 text-emerald-500"/> : <XCircle className="inline h-4 w-4 text-muted-foreground" />}
                          </span>
                      </div>
                  </div>
              </GlassCard>

              {/* Hall of Fame Card */}
              <GlassCard className="p-6">
                  <h3 className="text-sm font-bold font-mono uppercase mb-4 flex items-center gap-2">
                      <Award className="h-4 w-4 text-foreground" /> Hall of Fame
                  </h3>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 font-mono">
                      {hallOfFame.length} researcher{hallOfFame.length !== 1 ? 's' : ''} have worked on this program so far.
                  </div>
                  <div className="space-y-3">
                      {hallOfFame.length > 0 ? (
                          hallOfFame.slice(0, 5).map((researcher: any, idx: number) => (
                              <div key={researcher._id} className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900/30">
                                  <div className="flex items-center gap-3">
                                      <span className="text-xs text-muted-foreground w-4 text-right">#{idx + 1}</span>
                                      <Avatar className="h-8 w-8">
                                          <AvatarImage src={researcher.avatar} className="object-cover" />
                                          <AvatarFallback className="text-[10px]">{researcher.username?.substring(0,2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm font-medium">{researcher.username}</span>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] font-mono border-border text-foreground">
                                      {researcher.reputationScore || 0} REP
                                  </Badge>
                              </div>
                          ))
                      ) : (
                          <div className="text-sm text-zinc-500 italic p-4 text-center border border-dashed border-border rounded">
                              No researchers have submitted reports yet.
                          </div>
                      )}
                  </div>
              </GlassCard>
          </div>
      </div>
    </div>
  );
}
