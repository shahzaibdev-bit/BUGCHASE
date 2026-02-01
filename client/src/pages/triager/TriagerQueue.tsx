import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Brain, 
  Calculator, 
  Clock, 
  Filter, 
  Search,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { API_URL } from '@/config';

// Enhanced Mock Data Types
type ReportStatus = 'Submitted' | 'Under Review' | 'Needs Info' | 'Triaged' | 'Spam' | 'Duplicate' | 'OOS';

interface TriageReport {
  id: string; // _id
  _id?: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'None';
  status: ReportStatus;
  program: any; // Populated or String ID
  submittedAt: string; // createdAt
  isLocked: boolean;
  lockedBy?: string;
  assignedTo?: string; // 'me' or undefined for this context
  expertise: 'Web' | 'Mobile' | 'Source Code' | 'IoT' | 'Cloud';
  createdAt?: string;
}

// Removed Mock Data

export default function TriagerQueue() {
  const navigate = useNavigate();
  const [myQueue, setMyQueue] = useState<TriageReport[]>([]);
  const [unassignedPool, setUnassignedPool] = useState<TriageReport[]>([]);
  const [expertiseFilter, setExpertiseFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const [queueRes, poolRes] = await Promise.all([
            fetch(`${API_URL}/triager/queue`, { headers }),
            fetch(`${API_URL}/triager/pool`, { headers })
        ]);
        
        const queueData = await queueRes.json();
        const poolData = await poolRes.json();

        if (queueRes.ok) setMyQueue(queueData.data.reports);
        if (poolRes.ok) setUnassignedPool(poolData.data.reports);

    } catch (error) {
        console.error("Failed to fetch reports", error);
        toast({ title: "Error", description: "Failed to load reports.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const filteredPool = unassignedPool.filter(r => 
    expertiseFilter === 'all' || (r.expertise || 'Web') === expertiseFilter
  );

  const handleClaim = async (id: string) => {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/triager/claim/${id}`, { 
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok) {
             toast({
              title: "Report Claimed",
              description: `You have successfully claimed report. It is now in your active queue.`,
            });
            fetchData(); // Refresh lists
            setActiveTab('active');
        } else {
            toast({ title: "Error", description: data.message || "Failed to claim report", variant: "destructive" });
        }
    } catch (error) {
         toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  };

  const handleOpenReport = (id: string) => {
     navigate(`/triager/reports/${id}`);
  };

  const SeverityBadge = ({ severity }: { severity: string }) => {
    // Semantic Colors (No Green)
    const normalizedSeverity = severity?.toLowerCase() || 'low';
    const styles = {
      critical: 'border-red-500 text-red-600 bg-red-500/10 dark:text-red-400 dark:border-red-500/50',
      high: 'border-orange-500 text-orange-600 bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/50',
      medium: 'border-yellow-500 text-yellow-600 bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/50',
      low: 'border-blue-500 text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/50', // Replaced Green with Blue
    };
    
    return (
      <Badge variant="outline" className={`uppercase font-mono tracking-wider ${styles[severity as keyof typeof styles] || 'border-zinc-500 text-zinc-500'}`}>
        {severity}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in p-6 min-h-screen bg-white dark:bg-black">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
             <div>
                <h1 className="text-2xl font-bold font-mono text-black dark:text-white tracking-tighter uppercase">TRIAGE_OPERATIONS_CENTER</h1>
                <div className="flex items-center gap-2 mt-2">
                    <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></div>
                    <p className="text-zinc-500 font-mono text-xs">SYSTEM_READY // OPERATIVE: {`[CURRENT_USER]`}</p>
                </div>
             </div>
             <div className="px-3 py-1.5 border border-purple-500/30 bg-purple-500/5 rounded flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-mono text-purple-700 dark:text-purple-300 font-bold uppercase">AI_ASSIST: ONLINE</span>
            </div>
        </div>

        {/* Workload Stats - Monochrome Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InvertedTiltCard>
                <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg group hover:border-black dark:hover:border-white transition-colors relative overflow-hidden h-full">
                    <div className="relative z-10">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">MY ACTIVE QUEUE</span>
                        <p className="text-4xl font-bold text-black dark:text-white mt-2 tracking-tight">{myQueue.length}</p>
                    </div>
                    <CheckCircle className="absolute right-[-10px] top-[-10px] h-24 w-24 text-zinc-200 dark:text-zinc-800/50 group-hover:text-zinc-300 dark:group-hover:text-zinc-700 transition-colors" />
                </InverseSpotlightCard>
            </InvertedTiltCard>

             <InvertedTiltCard>
                 <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg group hover:border-black dark:hover:border-white transition-colors relative overflow-hidden h-full">
                    <div className="relative z-10">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">GLOBAL POOL</span>
                        <p className="text-4xl font-bold text-black dark:text-white mt-2 tracking-tight">{filteredPool.length}</p>
                    </div>
                    <Search className="absolute right-[-10px] top-[-10px] h-24 w-24 text-zinc-200 dark:text-zinc-800/50 group-hover:text-zinc-300 dark:group-hover:text-zinc-700 transition-colors" />
                </InverseSpotlightCard>
            </InvertedTiltCard>

             <InvertedTiltCard>
                 <InverseSpotlightCard className="p-6 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg group hover:border-black dark:hover:border-white transition-colors relative overflow-hidden h-full">
                    <div className="relative z-10">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">AVG RESOLUTION</span>
                        <p className="text-4xl font-bold text-zinc-400 dark:text-zinc-500 mt-2 tracking-tight">4h 12m</p>
                    </div>
                    <Clock className="absolute right-[-10px] top-[-10px] h-24 w-24 text-zinc-100 dark:text-zinc-900 group-hover:text-zinc-200 dark:group-hover:text-zinc-800 transition-colors" />
                </InverseSpotlightCard>
            </InvertedTiltCard>
        </div>
      </div>

      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start gap-8 bg-transparent border-b border-zinc-200 dark:border-zinc-800 pb-0 mb-8 rounded-none h-auto p-0">
          <TabsTrigger 
            value="active" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:bg-transparent pb-4 px-0 font-mono text-sm font-bold uppercase text-zinc-400 data-[state=active]:text-black dark:data-[state=active]:text-white transition-all"
          >
            My Active Queue
          </TabsTrigger>
          <TabsTrigger 
            value="pool" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:bg-transparent pb-4 px-0 font-mono text-sm font-bold uppercase text-zinc-400 data-[state=active]:text-black dark:data-[state=active]:text-white transition-all"
          >
            Global Unassigned Pool
          </TabsTrigger>
        </TabsList>

        {/* My Active Queue Content */}
        <TabsContent value="active" className="space-y-4">
            {myQueue.length === 0 ? (
                 <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/20">
                    <CheckCircle className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500 font-mono text-sm">Everything clear. Queue empty.</p>
                </div>
            ) : (
                myQueue.map((report) => (
                    <div key={report._id || report.id} className="group border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-4 rounded-lg hover:border-black dark:hover:border-white transition-colors cursor-pointer" onClick={() => handleOpenReport(report._id || report.id)}>
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                        {report.id}
                                    </span>
                                    <SeverityBadge severity={report.severity} />
                                    <Badge variant="outline" className="uppercase font-mono text-[10px] border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                                        {report.status}
                                    </Badge>
                                    {(report.severity === 'Critical' || report.severity === 'High') && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-black/10 dark:border-white/10 bg-zinc-100 dark:bg-zinc-900 text-[10px] font-mono text-black dark:text-white animate-pulse">
                                            <AlertTriangle className="h-3 w-3" />
                                            <span>SLA WARNING</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-bold font-mono text-zinc-900 dark:text-white group-hover:underline decoration-1 underline-offset-4 tracking-tight">
                                        {report.title}
                                    </h3>
                                    <p className="text-zinc-500 text-sm line-clamp-1 mt-1 font-sans">
                                        {report.description}
                                    </p>
                                </div>

                                <div className="flex items-center gap-6 text-xs font-mono text-zinc-400 pt-2">
                                    <span className="flex items-center gap-1.5">
                                        <Brain className="h-3 w-3" /> {report.program}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Filter className="h-3 w-3" /> {report.expertise}
                                    </span>
                                    <span className="flex items-center gap-1.5 relative">
                                        <Clock className="h-3 w-3" /> {new Date(report.submittedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col justify-center items-end gap-2 lg:border-l lg:border-zinc-100 dark:lg:border-zinc-900 lg:pl-6">
                                <Button 
                                    className="w-full lg:w-32 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-mono text-xs font-bold gap-2"
                                    onClick={(e) => { e.stopPropagation(); handleOpenReport(report._id || report.id); }}
                                >
                                    REVIEW <ArrowRight className="h-3 w-3" />
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full lg:w-32 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white font-mono text-xs gap-2"
                                    onClick={(e) => { e.stopPropagation(); handleOpenReport(report._id || report.id); navigate(`/triager/reports/${report._id || report.id}#reply`); }}
                                >
                                    REPLY
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </TabsContent>

        {/* Unassigned Pool Content */}
        <TabsContent value="pool" className="space-y-4">
            <div className="flex items-center justify-between mb-6 pt-2">
                <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs font-bold font-mono text-zinc-500 uppercase">FILTER BY EXPERTISE:</span>
                    <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
                        <SelectTrigger className="w-[180px] h-8 bg-white dark:bg-black border-zinc-300 dark:border-zinc-700 font-mono text-xs text-black dark:text-white rounded-md">
                            <SelectValue placeholder="All Areas" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
                            <SelectItem value="all">ALL EXPERTISE</SelectItem>
                            <SelectItem value="Web">WEB SECURITY</SelectItem>
                            <SelectItem value="Mobile">MOBILE SECURITY</SelectItem>
                            <SelectItem value="Source Code">SOURCE CODE</SelectItem>
                            <SelectItem value="IoT">IOT / FIRMWARE</SelectItem>
                            <SelectItem value="Cloud">CLOUD INFRA</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {filteredPool.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/20">
                    <p className="text-zinc-500 font-mono text-sm">No unassigned reports found.</p>
                </div>
            ) : (
                filteredPool.map((report) => (
                    <div key={report._id || report.id} className="group border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-4 rounded-lg hover:bg-white dark:hover:bg-black hover:border-black dark:hover:border-white transition-all cursor-pointer">
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1 space-y-2">
                                 <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                        {report.id}
                                    </span>
                                    <SeverityBadge severity={report.severity} />
                                    <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[10px] uppercase">
                                        {report.expertise}
                                    </Badge>
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-bold font-mono text-zinc-900 dark:text-white group-hover:underline decoration-1 underline-offset-4 tracking-tight">
                                        {report.title}
                                    </h3>
                                    <p className="text-zinc-500 text-sm line-clamp-1 mt-1 font-sans">
                                        {report.description}
                                    </p>
                                </div>
                            </div>

                             <div className="flex flex-col justify-center gap-2 lg:border-l lg:border-zinc-200 dark:lg:border-zinc-800 lg:pl-6">
                                    <Button className="w-full lg:w-32 bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 font-mono text-xs font-bold gap-2" onClick={() => handleClaim(report._id || report.id)}>
                                    <Lock className="h-3 w-3" /> CLAIM
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </TabsContent>
        </Tabs>
    </div>
  );
}
