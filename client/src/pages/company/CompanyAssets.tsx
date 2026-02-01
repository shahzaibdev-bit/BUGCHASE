import React, { useState, useEffect } from 'react';
import { 
  Radar, 
  Play, 
  Terminal, 
  Plus, 
  Trash2, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Ban, 
  X,
  RefreshCw,
  Server,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/config';

// Types
type ScanStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type AssetStatus = 'POTENTIAL' | 'IN_SCOPE' | 'OUT_OF_SCOPE';

interface ScanJob {
  id: string;
  target: string;
  status: ScanStatus;
  type: 'SUBDOMAIN' | 'PORT_SCAN';
  timestamp: Date;
  details?: string;
}

interface Asset {
  id: string;
  domain: string;
  type: 'Subdomain' | 'IP';
  ports: number[];
  service: string;
  status: AssetStatus;
  lastScanned?: string;
}

export default function CompanyAssets() {
  // State
  const [verifiedDomains, setVerifiedDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [scanType, setScanType] = useState<'SUBDOMAIN' | 'PORT_SCAN'>('SUBDOMAIN');
  const [scanQueue, setScanQueue] = useState<ScanJob[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeAssetTab, setActiveAssetTab] = useState<string>('all');
  const [activeMainTab, setActiveMainTab] = useState<string>('assets');

  useEffect(() => {
    const fetchAssets = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/company/assets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status === 'success') {
                setVerifiedDomains(data.data);
                if (data.data.length > 0) {
                    setSelectedDomain(data.data[0].domain);
                }
            }
        } catch (error) {
            console.error("Failed to fetch assets", error);
        }
    };
    fetchAssets();
  }, []);

  // Derived State
  const filteredAssets = assets.filter(asset => {
    if (activeAssetTab === 'all') return true;
    if (activeAssetTab === 'in-scope') return asset.status === 'IN_SCOPE';
    if (activeAssetTab === 'potential') return asset.status === 'POTENTIAL';
    if (activeAssetTab === 'out-of-scope') return asset.status === 'OUT_OF_SCOPE';
    return true;
  });

  // Handlers
  const queueJob = (target: string, type: 'SUBDOMAIN' | 'PORT_SCAN') => {
      const newJob: ScanJob = {
          id: `JOB-${Math.floor(Math.random() * 10000)}`,
          target: target,
          status: 'QUEUED',
          type: type,
          timestamp: new Date(),
          details: 'Waiting for available node...'
      };

      setScanQueue(prev => [newJob, ...prev]);

      toast({
          title: "Scan Queued",
          description: "Scan is queued and you will be notified accordingly.",
      });

      // Simulate Processing Start
      setTimeout(() => {
          updateJobStatus(newJob.id, 'PROCESSING', 'Enumerating subdomains via passive sources...');
      }, 2000);

      // Simulate Completion & Discovery
      setTimeout(() => {
          updateJobStatus(newJob.id, 'COMPLETED', type === 'SUBDOMAIN' ? 'Found 3 new assets' : 'Open ports: 80, 443');
          
          if (type === 'SUBDOMAIN') {
               const newAssets: Asset[] = [
                   { id: Math.random().toString(), domain: `api.${target}`, type: 'Subdomain', ports: [443], service: 'Nginx', status: 'POTENTIAL', lastScanned: new Date().toISOString() },
                   { id: Math.random().toString(), domain: `dev.${target}`, type: 'Subdomain', ports: [8080], service: 'Node.js', status: 'POTENTIAL', lastScanned: new Date().toISOString() },
                   { id: Math.random().toString(), domain: `admin.${target}`, type: 'Subdomain', ports: [443], service: 'Apache', status: 'POTENTIAL', lastScanned: new Date().toISOString() },
               ];
               setAssets(prev => [...newAssets, ...prev]);
               toast({ title: "Scan Completed", description: `Found 3 new assets for ${target}` });
          }
      }, 8000 + Math.random() * 5000);
  };

  const updateJobStatus = (id: string, status: ScanStatus, details?: string) => {
      setScanQueue(prev => prev.map(job => job.id === id ? { ...job, status, details } : job));
  };

  const handleQueueScan = () => {
    if (!selectedDomain) {
        toast({ title: "Error", description: "Please select a target domain", variant: "destructive" });
        return;
    }
    queueJob(selectedDomain, scanType);
    setActiveMainTab('scans'); // Switch to scans tab to show progress
  };

  const handleUpdateScope = (id: string, newStatus: AssetStatus) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    
    const asset = assets.find(a => a.id === id);
    const action = newStatus === 'IN_SCOPE' ? 'Added to Scope' : 'Marked Out-of-Scope';
    
    toast({
      title: `Asset ${action}`,
      description: `${asset?.domain} has been updated.`,
    });
  };

  const handlePortScan = (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (asset) {
        queueJob(asset.domain, 'PORT_SCAN');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-2 max-w-[1600px] mx-auto">
      
      {/* SECTION A: Recon Command Center */}
      <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-bold tracking-tight font-mono text-foreground">AUTOMATED ASSET DISCOVERY</h1>
                  <p className="text-muted-foreground">Manage your attack surface with asynchronous Kali microservices.</p>
              </div>

              <GlassCard className="p-6 relative overflow-hidden bg-background border-border shadow-sm">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <Radar className="w-32 h-32 text-foreground" />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 relative z-10">
                      <div className="space-y-4">
                          <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Target Domain</label>
                          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                              <SelectTrigger className="bg-background border-border font-mono h-12 text-lg focus:ring-0 focus:ring-offset-0">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border">
                                  {verifiedDomains.map(d => (
                                      <SelectItem key={d.id} value={d.domain} className="font-mono">{d.domain}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="space-y-4">
                          <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Scan Type</label>
                          <div className="flex gap-2">
                              <Button 
                                  variant="outline" 
                                  onClick={() => setScanType('SUBDOMAIN')}
                                  className={cn("flex-1 h-12 border-border hover:bg-muted text-muted-foreground hover:text-foreground", scanType === 'SUBDOMAIN' && "bg-foreground/5 text-foreground border-foreground")}
                              >
                                  <Globe className="w-4 h-4 mr-2" /> Subdomain
                              </Button>
                              <Button 
                                  variant="outline" 
                                  onClick={() => setScanType('PORT_SCAN')}
                                  className={cn("flex-1 h-12 border-border hover:bg-muted text-muted-foreground hover:text-foreground", scanType === 'PORT_SCAN' && "bg-foreground/5 text-foreground border-foreground")}
                              >
                                  <Server className="w-4 h-4 mr-2" /> Port Scan
                              </Button>
                          </div>
                      </div>
                  </div>

                  <div className="mt-8">
                       <Button 
                          className="w-full h-14 font-mono text-lg tracking-wider bg-foreground text-background hover:bg-foreground/90"
                          onClick={handleQueueScan}
                       >
                          <span className="flex items-center gap-2">
                              <Play className="w-5 h-5" /> QUEUE_RECON_SCAN
                          </span>
                       </Button>
                  </div>
              </GlassCard>
          </div>

          <div className="lg:col-span-1">
               <GlassCard className="h-full flex flex-col bg-zinc-950 border-zinc-900 shadow-2xl relative overflow-hidden">
                   <div className="bg-zinc-900/50 p-3 border-b border-zinc-800 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                           <Terminal className="w-4 h-4 text-emerald-500" />
                           <span className="text-xs font-mono text-zinc-400">kali_node_01:~/queue</span>
                       </div>
                       <div className="flex gap-1.5">
                           <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                           <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                           <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                       </div>
                   </div>
                   
                   <div className="flex-1 p-0 overflow-y-auto min-h-[250px] max-h-[300px] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                       {scanQueue.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-2 p-6 text-center">
                               <Radar className="w-8 h-8 opacity-20" />
                               <span className="text-xs font-mono">NO ACTIVE SCANS</span>
                           </div>
                       ) : (
                           <div className="divide-y divide-zinc-900">
                               <AnimatePresence>
                                   {scanQueue.slice(0, 5).map((job) => (
                                       <motion.div 
                                           key={job.id}
                                           initial={{ opacity: 0, height: 0 }}
                                           animate={{ opacity: 1, height: 'auto' }}
                                           exit={{ opacity: 0, height: 0 }}
                                           className="p-3 hover:bg-zinc-900/30 transition-colors"
                                       >
                                           <div className="flex items-start justify-between mb-1">
                                               <span className="text-xs font-mono font-bold text-zinc-300 break-all mr-2">{job.target}</span>
                                               <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                                   {job.status === 'QUEUED' && <Clock className="w-3 h-3 text-zinc-500" />}
                                                   {job.status === 'PROCESSING' && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
                                                   {job.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                   {job.status === 'FAILED' && <AlertCircle className="w-3 h-3 text-red-500" />}
                                                   
                                                   <span className={cn(
                                                       "text-[10px] font-mono tracking-wider",
                                                       job.status === 'QUEUED' && "text-zinc-500",
                                                       job.status === 'PROCESSING' && "text-blue-400",
                                                       job.status === 'COMPLETED' && "text-emerald-500",
                                                       job.status === 'FAILED' && "text-red-500",
                                                   )}>{job.status}</span>
                                               </div>
                                           </div>
                                           <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-500 h-4 px-1">{job.type}</Badge>
                                                <span className="text-[9px] text-zinc-600 font-mono">{job.timestamp.toLocaleTimeString()}</span>
                                           </div>
                                       </motion.div>
                                   ))}
                               </AnimatePresence>
                           </div>
                       )}
                   </div>
               </GlassCard>
          </div>
      </div>

      {/* SECTION B: Main Tabs (Assets vs. Scans) */}
      <Tabs defaultValue="assets" value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
           <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 mb-6 gap-6">
               <TabsTrigger 
                   value="assets" 
                   className="relative rounded-none border-b-2 border-transparent data-[state=active]:shadow-none px-0 py-2 font-mono text-sm uppercase tracking-wide data-[state=active]:text-foreground data-[state=active]:bg-transparent text-muted-foreground transition-all hover:text-foreground"
               >
                   <ShieldCheck className="w-4 h-4 mr-2" /> Managed Assets
                   {activeMainTab === 'assets' && (
                       <motion.div 
                           layoutId="activeTab"
                           className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground"
                       />
                   )}
               </TabsTrigger>
               <TabsTrigger 
                   value="scans" 
                   className="relative rounded-none border-b-2 border-transparent data-[state=active]:shadow-none px-0 py-2 font-mono text-sm uppercase tracking-wide data-[state=active]:text-foreground data-[state=active]:bg-transparent text-muted-foreground transition-all hover:text-foreground"
               >
                   <History className="w-4 h-4 mr-2" /> Scan Activity
                   {activeMainTab === 'scans' && (
                       <motion.div 
                           layoutId="activeTab"
                           className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground"
                       />
                   )}
               </TabsTrigger>
           </TabsList>

           <TabsContent value="assets" className="space-y-4">
               <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.3 }}
               >
               {/* Sub-Tabs for Asset Status */}
               <Tabs defaultValue="all" value={activeAssetTab} onValueChange={setActiveAssetTab}>
                  <div className="flex items-center justify-between mb-4">
                      <TabsList className="bg-background border border-border p-1">
                          <TabsTrigger value="all" className="data-[state=active]:bg-foreground data-[state=active]:text-background font-mono text-xs">ALL</TabsTrigger>
                          <TabsTrigger value="in-scope" className="data-[state=active]:bg-foreground data-[state=active]:text-background font-mono text-xs">IN_SCOPE</TabsTrigger>
                          <TabsTrigger value="potential" className="data-[state=active]:bg-foreground data-[state=active]:text-background font-mono text-xs">POTENTIAL</TabsTrigger>
                          <TabsTrigger value="out-of-scope" className="data-[state=active]:bg-foreground data-[state=active]:text-background font-mono text-xs">EXCLUDED</TabsTrigger>
                      </TabsList>
                      
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/60">
                          <RefreshCw className="w-3 h-3" /> LAST SYNC: JUST NOW
                      </div>
                  </div>

                  <GlassCard className="overflow-hidden p-0 bg-background border-border">
                       <div className="overflow-x-auto">
                          <table className="w-full">
                              <thead className="bg-muted/30 border-b border-border">
                                  <tr>
                                      <th className="text-left py-4 px-6 font-mono text-xs text-muted-foreground font-normal">ASSET</th>
                                      <th className="text-left py-4 px-6 font-mono text-xs text-muted-foreground font-normal">TYPE</th>
                                      <th className="text-left py-4 px-6 font-mono text-xs text-muted-foreground font-normal">PORTS</th>
                                      <th className="text-left py-4 px-6 font-mono text-xs text-muted-foreground font-normal">SERVICE</th>
                                      <th className="text-left py-4 px-6 font-mono text-xs text-muted-foreground font-normal">STATUS</th>
                                      <th className="text-right py-4 px-6 font-mono text-xs text-muted-foreground font-normal">ACTIONS</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {filteredAssets.length === 0 ? (
                                      <tr>
                                          <td colSpan={6} className="py-12 text-center text-muted-foreground font-mono">
                                              No assets found in this category.
                                          </td>
                                      </tr>
                                  ) : (
                                      filteredAssets.map((asset) => (
                                          <motion.tr 
                                              key={asset.id} 
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                                          >
                                              <td className="py-4 px-6">
                                                  <span className="font-mono text-sm text-foreground">{asset.domain}</span>
                                              </td>
                                              <td className="py-4 px-6">
                                                  <Badge variant="outline" className="rounded-md border-border text-muted-foreground text-[10px] bg-background">{asset.type}</Badge>
                                              </td>
                                              <td className="py-4 px-6">
                                                  <div className="flex gap-1 flex-wrap">
                                                      {asset.ports.map(p => (
                                                          <span key={p} className="text-[10px] font-mono bg-muted text-foreground px-1.5 py-0.5 rounded border border-border">{p}</span>
                                                      ))}
                                                  </div>
                                              </td>
                                              <td className="py-4 px-6">
                                                  <span className="text-xs text-muted-foreground">{asset.service}</span>
                                              </td>
                                              <td className="py-4 px-6">
                                                  {asset.status === 'IN_SCOPE' && (
                                                      <Badge className="bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700">In Scope</Badge>
                                                  )}
                                                  {asset.status === 'POTENTIAL' && (
                                                      <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 border-dashed">Potential</Badge>
                                                  )}
                                                  {asset.status === 'OUT_OF_SCOPE' && (
                                                      <Badge variant="outline" className="text-muted-foreground/50 border-border/50 decoration-slate-500 line-through">Excluded</Badge>
                                                  )}
                                              </td>
                                              <td className="py-4 px-6 text-right">
                                                  <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                      {asset.status === 'POTENTIAL' && (
                                                          <>
                                                              <Button size="sm" className="h-7 bg-foreground text-background hover:bg-foreground/80 font-mono text-[10px]" onClick={() => handleUpdateScope(asset.id, 'IN_SCOPE')}>
                                                                  <Plus className="w-3 h-3 mr-1" /> SCOPE
                                                              </Button>
                                                              <Button size="sm" variant="ghost" className="h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-mono text-[10px]" onClick={() => handleUpdateScope(asset.id, 'OUT_OF_SCOPE')}>
                                                                  <Ban className="w-3 h-3 mr-1" /> EXCLUDE
                                                              </Button>
                                                          </>
                                                      )}
                                                      {asset.status === 'IN_SCOPE' && (
                                                          <Button size="sm" variant="outline" className="h-7 border-border text-muted-foreground hover:text-foreground hover:bg-muted font-mono text-[10px]" onClick={() => handlePortScan(asset.id)}>
                                                              <Search className="w-3 h-3 mr-1" /> DEEP SCAN
                                                          </Button>
                                                      )}
                                                      {(asset.status === 'OUT_OF_SCOPE' || asset.status === 'IN_SCOPE') && (
                                                           <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleUpdateScope(asset.id, 'POTENTIAL')}>
                                                              <RefreshCw className="w-3 h-3" />
                                                           </Button>
                                                      )}
                                                  </div>
                                              </td>
                                          </motion.tr>
                                      ))
                                  )}
                              </tbody>
                          </table>
                       </div>
                  </GlassCard>
               </Tabs>
               </motion.div>
           </TabsContent>

           <TabsContent value="scans">
               <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.3 }}
               >
               <GlassCard className="overflow-hidden p-0 bg-background border-border">
                   <div className="overflow-x-auto">
                      <table className="w-full">
                          <thead className="bg-muted/30 border-b border-border">
                              <tr>
                                  <th className="text-left py-4 px-6 font-mono text-xs text-muted-foreground font-normal">SCAN ID</th>
                                  <th className="text-left py-4 px-6 font-mono text-xs text-muted-foreground font-normal">TARGET</th>
                                  <th className="text-left py-4 px-6 font-mono text-xs text-muted-foreground font-normal">TYPE</th>
                                  <th className="text-left py-4 px-6 font-mono text-xs text-muted-foreground font-normal">STATUS</th>
                                  <th className="text-left py-4 px-6 font-mono text-xs text-muted-foreground font-normal">FINDINGS / DETAILS</th>
                                  <th className="text-right py-4 px-6 font-mono text-xs text-muted-foreground font-normal">TIMESTAMP</th>
                              </tr>
                          </thead>
                          <tbody>
                              {scanQueue.length === 0 ? (
                                  <tr>
                                      <td colSpan={6} className="py-16 text-center text-muted-foreground">
                                          <div className="flex flex-col items-center gap-3">
                                              <Activity className="w-8 h-8 opacity-20" />
                                              <p className="font-mono text-sm">No scan history available.</p>
                                          </div>
                                      </td>
                                  </tr>
                              ) : (
                                  scanQueue.map((job) => (
                                      <tr key={job.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                          <td className="py-4 px-6 font-mono text-xs text-muted-foreground">{job.id}</td>
                                          <td className="py-4 px-6 font-mono text-sm text-foreground">{job.target}</td>
                                          <td className="py-4 px-6">
                                              <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">{job.type}</Badge>
                                          </td>
                                          <td className="py-4 px-6">
                                               <div className="flex items-center gap-2">
                                                   {job.status === 'QUEUED' && <Clock className="w-3 h-3 text-muted-foreground" />}
                                                   {job.status === 'PROCESSING' && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
                                                   {job.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                   {job.status === 'FAILED' && <AlertCircle className="w-3 h-3 text-red-500" />}
                                                    <span className={cn(
                                                        "text-xs font-medium",
                                                        job.status === 'QUEUED' && "text-muted-foreground",
                                                        job.status === 'PROCESSING' && "text-blue-500",
                                                        job.status === 'COMPLETED' && "text-emerald-500",
                                                    )}>{job.status}</span>
                                               </div>
                                          </td>
                                          <td className="py-4 px-6 text-sm text-muted-foreground truncate max-w-[250px]">
                                              {job.details || '-'}
                                          </td>
                                          <td className="py-4 px-6 text-right font-mono text-xs text-muted-foreground">
                                              {job.timestamp.toLocaleString()}
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                   </div>
               </GlassCard>
               </motion.div>
           </TabsContent>
      </Tabs>

    </div>
  );
}
