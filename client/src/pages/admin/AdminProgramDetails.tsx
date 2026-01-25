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
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);

  const fetchProgram = async () => {
    setIsLoading(true);
    try {
       const adminRes = await fetch(`${API_URL}/admin/programs`);
       const adminData = await adminRes.json();
       const found = adminData.data.programs.find((p: any) => p._id === id);
       setProgram(found);

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

          const res = await fetch(`${API_URL}/admin/programs/${id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
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
                    <Button onClick={() => handleAction('Active')} className="bg-green-600 hover:bg-green-700 text-white font-mono gap-2">
                        <CheckCircle className="h-4 w-4" /> APPROVE_PROGRAM
                    </Button>
                    <Button onClick={() => handleAction('Rejected')} variant="destructive" className="font-mono gap-2">
                        <XCircle className="h-4 w-4" /> REJECT
                    </Button>
                </>
            )}
            {program.status === 'Active' && (
                 <Button onClick={() => setIsSuspendOpen(true)} variant="outline" className="text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/10 font-mono gap-2">
                    <AlertTriangle className="h-4 w-4" /> SUSPEND_PROTOCOL
                 </Button>
            )}
             {(program.status === 'Suspended' || program.status === 'Rejected') && (
                 <Button onClick={() => handleAction('Active')} className="bg-green-600 hover:bg-green-700 text-white font-mono gap-2">
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
                      <Shield className="h-5 w-5 text-emerald-500" /> Program Overview
                  </h3>
                  <div className="prose dark:prose-invert max-w-none text-sm text-zinc-400">
                      {program.description || "No description provided."}
                  </div>
              </GlassCard>

              {/* Scope */}
              <GlassCard className="p-6">
                  <h3 className="text-lg font-bold font-mono uppercase mb-4 flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" /> Scope Assets
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
                      <XCircle className="h-5 w-5 text-red-500" /> Out of Scope
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
                      <div className={`inline-flex items-center justify-center p-3 rounded-full mb-4 ${
                          program.status === 'Active' ? 'bg-green-500/10 text-green-500' :
                          program.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          program.status === 'Rejected' ? 'bg-red-500/10 text-red-500' :
                          'bg-zinc-500/10 text-zinc-500'
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
                          <span className="text-muted-foreground">Submitted</span>
                          <span className="font-mono">{new Date(program.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-mono uppercase">{program.type}</span>
                      </div>
                       <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Bounty Range</span>
                          <span className="font-mono">{program.bountyRange || 'N/A'}</span>
                      </div>
                  </div>
              </GlassCard>

              {/* Rewards Card */}
              <GlassCard className="p-6">
                  <h3 className="text-sm font-bold font-mono uppercase mb-4 flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-500" /> Reward Structure
                  </h3>
                   <div className="space-y-2">
                      {['critical', 'high', 'medium', 'low'].map((severity) => {
                          const reward = program.rewards?.[severity];
                          if (!reward) return null;
                          return (
                              <div key={severity} className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900/30">
                                   <Badge variant="outline" className={`capitalize w-20 justify-center ${
                                       severity === 'critical' ? 'border-red-500 text-red-500' :
                                       severity === 'high' ? 'border-orange-500 text-orange-500' :
                                       severity === 'medium' ? 'border-yellow-500 text-yellow-500' :
                                       'border-blue-500 text-blue-500'
                                   }`}>
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
          </div>
      </div>
    </div>
  );
}
