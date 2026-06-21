import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Link } from 'react-router-dom';
import { 
  Radar, 
  Play, 
  Terminal, 
  Plus, 
  Search, 
  ShieldCheck, 
  Ban, 
  RefreshCw,
  Server,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Activity,
  ExternalLink,
  Crosshair,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/config';

// Types
type ScanStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type AssetStatus = 'POTENTIAL' | 'IN_SCOPE' | 'OUT_OF_SCOPE';
type ScanModuleId = 'subdomain' | 'nmap' | 'shodan';

type ScanModules = Record<ScanModuleId, boolean>;

const SCAN_MODULE_OPTIONS: {
  id: ScanModuleId;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'subdomain', label: 'Subdomain discovery', shortLabel: 'Subdomain', description: 'Find live hosts via subfinder + httpx', icon: Globe },
  { id: 'nmap', label: 'Port scanning', shortLabel: 'Port scan', description: 'Nmap on root domain and known assets (no subdomain scan required)', icon: Server },
  { id: 'shodan', label: 'Shodan intelligence', shortLabel: 'Shodan', description: 'Public exposure and service metadata', icon: Crosshair },
];

const DEFAULT_SCAN_MODULES: ScanModules = {
  subdomain: true,
  nmap: true,
  shodan: false,
};

type DiscoveryResults = {
  domain?: string;
  live_subdomains?: string[];
  scan_data?: Record<string, { ports: number[]; protocol?: string }>;
  shodan_intel?: string;
  error?: string;
};

function formatScanModules(modules: ScanModules): string {
  const labels = SCAN_MODULE_OPTIONS.filter((o) => modules[o.id]).map((o) => o.shortLabel);
  if (labels.length === 0) return 'No scans selected';
  if (labels.length === SCAN_MODULE_OPTIONS.length) return 'All scans';
  return labels.join(', ');
}

function buildScanSummary(modules: ScanModules, results: DiscoveryResults): string {
  const parts: string[] = [];
  if (modules.subdomain) {
    parts.push(`Live hosts: ${results.live_subdomains?.length ?? 0}`);
  }
  if (modules.nmap) {
    parts.push(`Nmap: ${results.scan_data ? Object.keys(results.scan_data).length : 0} host(s)`);
  }
  if (modules.shodan) {
    const intel = results.shodan_intel?.trim();
    parts.push(intel && intel !== 'Skipped' && intel !== 'No data' ? 'Shodan: data received' : 'Shodan: no data');
  }
  return parts.join(' · ') || 'Scan finished';
}

interface ScanJob {
  id: string;
  target: string;
  status: ScanStatus;
  modulesLabel: string;
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
  const [scanModules, setScanModules] = useState<ScanModules>(DEFAULT_SCAN_MODULES);
  const [scanQueue, setScanQueue] = useState<ScanJob[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeAssetTab, setActiveAssetTab] = useState<string>('all');
  const [activeMainTab, setActiveMainTab] = useState<string>('assets');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  const hydrateAssetsFromVerifiedDomains = useCallback((domains: any[]): Asset[] => {
    const hydratedAssets: Asset[] = [];
    const portDataFor = (vd: any, host: string) => {
      const scan = vd.portScanData?.[host];
      return scan?.ports?.length ? scan.ports : [];
    };
    const serviceFor = (vd: any, host: string) => {
      const scan = vd.portScanData?.[host];
      return scan?.ports?.length ? 'Nmap' : 'Unknown';
    };

    domains.forEach((vd: any) => {
      const lastScanned = vd.dateVerified || new Date().toISOString();
      if (vd.inScope && Array.isArray(vd.inScope)) {
        vd.inScope.forEach((sub: string) => {
          const ports = portDataFor(vd, sub);
          hydratedAssets.push({
            id: `db-in-${vd.id}-${sub}`,
            domain: sub,
            type: 'Subdomain',
            ports: ports.length ? ports : [443, 80],
            service: serviceFor(vd, sub),
            status: 'IN_SCOPE',
            lastScanned,
          });
        });
      }
      if (vd.outScope && Array.isArray(vd.outScope)) {
        vd.outScope.forEach((sub: string) => {
          hydratedAssets.push({
            id: `db-out-${vd.id}-${sub}`,
            domain: sub,
            type: 'Subdomain',
            ports: portDataFor(vd, sub),
            service: serviceFor(vd, sub),
            status: 'OUT_OF_SCOPE',
            lastScanned,
          });
        });
      }
      if (vd.discovered && Array.isArray(vd.discovered)) {
        vd.discovered.forEach((sub: string) => {
          hydratedAssets.push({
            id: `db-pot-${vd.id}-${sub}`,
            domain: sub,
            type: 'Subdomain',
            ports: portDataFor(vd, sub),
            service: serviceFor(vd, sub),
            status: 'POTENTIAL',
            lastScanned,
          });
        });
      }
    });
    return hydratedAssets;
  }, []);

  const fetchAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/company/assets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status === 'success') {
        const verified = (data.data || []).filter((d: { status?: string }) => d.status === 'verified');
        setVerifiedDomains(verified);
        if (verified.length > 0) {
          setSelectedDomain((prev) => (verified.some((d: { domain: string }) => d.domain === prev) ? prev : verified[0].domain));
        } else {
          setSelectedDomain('');
        }
        setAssets(hydrateAssetsFromVerifiedDomains(verified));
      }
    } catch (error) {
      console.error('Failed to fetch assets', error);
      toast({ title: 'Could not load assets', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setIsLoadingAssets(false);
    }
  }, [hydrateAssetsFromVerifiedDomains]);

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  // Derived State
  const filteredAssets = assets.filter(asset => {
    if (activeAssetTab === 'all') return true;
    if (activeAssetTab === 'in-scope') return asset.status === 'IN_SCOPE';
    if (activeAssetTab === 'potential') return asset.status === 'POTENTIAL';
    if (activeAssetTab === 'out-of-scope') return asset.status === 'OUT_OF_SCOPE';
    return true;
  });

  const mergeDiscoveryIntoAssets = (prev: Asset[], results: DiscoveryResults): Asset[] => {
    const byDomain = new Map<string, Asset>(prev.map((a) => [a.domain, { ...a }]));
    const live = results.live_subdomains || [];
    for (const host of live) {
      const h = host.trim();
      if (!h || byDomain.has(h)) continue;
      byDomain.set(h, {
        id: `disc-${h}-${Date.now()}`,
        domain: h,
        type: 'Subdomain',
        ports: [],
        service: 'Unknown',
        status: 'POTENTIAL',
        lastScanned: new Date().toISOString(),
      });
    }
    const scanData = results.scan_data || {};
    for (const [host, info] of Object.entries(scanData)) {
      const h = host.trim();
      if (!h) continue;
      const ports = info?.ports || [];
      const existing = byDomain.get(h);
      if (existing) {
        byDomain.set(h, {
          ...existing,
          ports: ports.length ? ports : existing.ports,
          service: ports.length ? 'Nmap' : existing.service,
          lastScanned: new Date().toISOString(),
        });
      } else {
        byDomain.set(h, {
          id: `nmap-${h}-${Date.now()}`,
          domain: h,
          type: 'Subdomain',
          ports,
          service: ports.length ? 'Nmap' : 'Unknown',
          status: 'POTENTIAL',
          lastScanned: new Date().toISOString(),
        });
      }
    }
    return Array.from(byDomain.values());
  };

  const updateJobStatus = (id: string, status: ScanStatus, details?: string) => {
    setScanQueue((prev) => prev.map((job) => (job.id === id ? { ...job, status, details } : job)));
  };

  const toggleScanModule = (id: ScanModuleId, checked: boolean) => {
    setScanModules((prev) => {
      const next = { ...prev, [id]: checked };
      const anySelected = SCAN_MODULE_OPTIONS.some((o) => next[o.id]);
      if (!anySelected) return prev;
      return next;
    });
  };

  const runDiscoveryScan = async (opts: {
    targetLabel: string;
    modules: ScanModules;
    verifiedAssetId: string;
    focusHost?: string;
  }) => {
    const jobId = `JOB-${Date.now()}`;
    const modulesLabel = formatScanModules(opts.modules);
    const newJob: ScanJob = {
      id: jobId,
      target: opts.targetLabel,
      status: 'PROCESSING',
      modulesLabel,
      timestamp: new Date(),
      details: `Running: ${modulesLabel}`,
    };
    setScanQueue((prev) => [newJob, ...prev]);
    setActiveMainTab('scans');
    setIsScanning(true);

    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/company/assets/discovery-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          verifiedAssetId: opts.verifiedAssetId,
          scanSubdomains: opts.modules.subdomain,
          scanNmap: opts.modules.nmap,
          scanShodan: opts.modules.shodan,
          ...(opts.focusHost ? { focusHost: opts.focusHost } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = body.message || body.error || `Discovery failed (${res.status})`;
        updateJobStatus(jobId, 'FAILED', msg);
        toast({ title: 'Discovery failed', description: String(msg), variant: 'destructive' });
        return;
      }

      const payload = body.data as { success?: boolean; results?: DiscoveryResults };
      const results = payload?.results;
      if (!results) {
        updateJobStatus(jobId, 'FAILED', 'Empty response from engine');
        toast({ title: 'Discovery failed', description: 'Engine returned no results.', variant: 'destructive' });
        return;
      }
      if (results.error) {
        updateJobStatus(jobId, 'FAILED', results.error);
        toast({ title: 'Scan error', description: results.error, variant: 'destructive' });
        return;
      }

      setAssets((prev) => mergeDiscoveryIntoAssets(prev, results));
      void fetchAssets();

      const summary = buildScanSummary(opts.modules, results);

      updateJobStatus(jobId, 'COMPLETED', summary);
      toast({ title: 'Scan completed', description: summary });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      updateJobStatus(jobId, 'FAILED', msg);
      toast({ title: 'Discovery failed', description: msg, variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleQueueScan = () => {
    if (!selectedDomain) {
      toast({ title: 'Error', description: 'Please select a target domain', variant: 'destructive' });
      return;
    }
    const anyModule = SCAN_MODULE_OPTIONS.some((o) => scanModules[o.id]);
    if (!anyModule) {
      toast({ title: 'Error', description: 'Select at least one scan type', variant: 'destructive' });
      return;
    }
    const vd = verifiedDomains.find((d) => d.domain === selectedDomain);
    if (!vd?.id) {
      toast({ title: 'Error', description: 'Could not resolve verified asset id', variant: 'destructive' });
      return;
    }
    void runDiscoveryScan({
      targetLabel: selectedDomain,
      modules: scanModules,
      verifiedAssetId: vd.id,
    });
  };

  const handleUpdateScope = async (id: string, newStatus: AssetStatus) => {
    // 1. Update local state
    setAssets(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    const action = newStatus === 'IN_SCOPE' ? 'Added to Scope' : 'Marked Out-of-Scope';
    
    toast({
      title: `Asset ${action}`,
      description: `${asset.domain} has been updated.`,
    });

    // 2. Identify the root domain this asset belongs to.
    // Assuming the asset.domain is something like prefix.rootdomain.com
    // Let's just find the verified domain that's a suffix of this asset
    const rootVerifiedDomain = verifiedDomains.find(vd => asset.domain.endsWith(vd.domain));
    
    if (rootVerifiedDomain) {
        // Collect all assets currently classified for this root domain
        // INCLUDING this new change we just applied locally
        const updatedAssetsList = assets.map(a => a.id === id ? { ...a, status: newStatus } : a);
        
        const inScopeSubdomains = updatedAssetsList
            .filter(a => a.status === 'IN_SCOPE' && a.domain.endsWith(rootVerifiedDomain.domain))
            .map(a => a.domain);
            
        const outScopeSubdomains = updatedAssetsList
            .filter(a => a.status === 'OUT_OF_SCOPE' && a.domain.endsWith(rootVerifiedDomain.domain))
            .map(a => a.domain);

        try {
            const token = localStorage.getItem('token');
            await apiFetch(`/company/assets/${rootVerifiedDomain.id}/scope`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    inScope: inScopeSubdomains,
                    outScope: outScopeSubdomains
                })
            });
        } catch (err) {
            console.error("Failed to sync scope with backend", err);
        }
    }
  };

  const findRootVerifiedForAsset = (asset: Asset) =>
    verifiedDomains.find(
      (vd) => asset.domain === vd.domain || asset.domain.endsWith('.' + vd.domain),
    );

  const handleDeleteAsset = async (asset: Asset) => {
    if (!window.confirm(`Remove ${asset.domain} from your asset inventory?`)) return;

    const rootVerifiedDomain = findRootVerifiedForAsset(asset);
    if (!rootVerifiedDomain?.id) {
      toast({ title: 'Error', description: 'Could not map asset to a verified root domain', variant: 'destructive' });
      return;
    }

    setAssets((prev) => prev.filter((a) => a.id !== asset.id));

    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/company/assets/${rootVerifiedDomain.id}/host`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ host: asset.domain }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        void fetchAssets();
        toast({
          title: 'Delete failed',
          description: data.message || 'Could not remove asset',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Asset removed', description: `${asset.domain} was deleted from inventory.` });
    } catch {
      void fetchAssets();
      toast({ title: 'Delete failed', description: 'Network error', variant: 'destructive' });
    }
  };

  const handlePortScan = (id: string) => {
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;
    const rootVerifiedDomain = findRootVerifiedForAsset(asset);
    if (!rootVerifiedDomain?.id) {
      toast({ title: 'Error', description: 'Could not map asset to a verified root domain', variant: 'destructive' });
      return;
    }
    void runDiscoveryScan({
      targetLabel: asset.domain,
      modules: { subdomain: false, nmap: true, shodan: false },
      verifiedAssetId: rootVerifiedDomain.id,
      focusHost: asset.domain,
    });
  };

  return (
    <div className="space-y-8 animate-fade-in p-2 max-w-[1600px] mx-auto">
      
      {/* SECTION A: Recon Command Center */}
      <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <motion.div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-bold tracking-tight font-mono text-foreground">AUTOMATED ASSET DISCOVERY</h1>
                  <p className="text-muted-foreground">
                    Queue subdomain and port scans against verified domains. Results sync to your asset inventory.
                  </p>
              </motion.div>

              {!isLoadingAssets && verifiedDomains.filter((d) => d.status === 'verified').length === 0 && (
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="font-mono text-sm">No verified domains</AlertTitle>
                  <AlertDescription className="text-sm">
                    Verify a root domain in Settings before running discovery scans.{' '}
                    <Link to="/company/settings" className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">
                      Go to domain verification <ExternalLink className="w-3 h-3" />
                    </Link>
                  </AlertDescription>
                </Alert>
              )}

              <GlassCard className="p-6 relative overflow-hidden bg-background border-border shadow-sm">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <Radar className="w-32 h-32 text-foreground" />
                  </div>
                  
                  <motion.div className="space-y-8 relative z-10">
                      <div className="space-y-2">
                          <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Target domain</label>
                          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                              <SelectTrigger className="bg-background border-border font-mono h-12 text-base focus:ring-0 focus:ring-offset-0 max-w-xl">
                                  <SelectValue placeholder="Select verified domain" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border">
                                  {verifiedDomains.map(d => (
                                      <SelectItem key={d.id} value={d.domain} className="font-mono">{d.domain}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      <motion.div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Scan types</label>
                              <div className="flex items-center gap-3">
                                  <button
                                      type="button"
                                      onClick={() => setScanModules({ subdomain: true, nmap: true, shodan: true })}
                                      className="text-xs font-mono text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                                  >
                                      Select all
                                  </button>
                                  <span className="text-muted-foreground/40">|</span>
                                  <button
                                      type="button"
                                      onClick={() => setScanModules(DEFAULT_SCAN_MODULES)}
                                      className="text-xs font-mono text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                                  >
                                      Reset default
                                  </button>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {SCAN_MODULE_OPTIONS.map((option) => {
                                  const Icon = option.icon;
                                  const checked = scanModules[option.id];
                                  return (
                                      <button
                                          key={option.id}
                                          type="button"
                                          onClick={() => toggleScanModule(option.id, !checked)}
                                          className={cn(
                                              'relative flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-all',
                                              'hover:border-foreground/30 hover:bg-muted/30',
                                              checked
                                                  ? 'border-foreground bg-foreground/[0.03] ring-1 ring-foreground/10'
                                                  : 'border-border bg-background',
                                          )}
                                      >
                                          <div className="flex w-full items-start justify-between gap-3">
                                              <div className={cn(
                                                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border',
                                                  checked ? 'border-foreground/20 bg-foreground/5' : 'border-border bg-muted/40',
                                              )}>
                                                  <Icon className={cn('h-5 w-5', checked ? 'text-foreground' : 'text-muted-foreground')} />
                                              </div>
                                              <Checkbox
                                                  checked={checked}
                                                  onCheckedChange={(v) => toggleScanModule(option.id, v === true)}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="mt-0.5"
                                                  aria-label={option.label}
                                              />
                                          </div>
                                          <div className="space-y-1 pr-1">
                                              <p className="font-mono text-sm font-medium text-foreground leading-tight">
                                                  {option.shortLabel}
                                              </p>
                                              <p className="text-xs text-muted-foreground leading-relaxed">
                                                  {option.description}
                                              </p>
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>

                          <p className="text-xs font-mono text-muted-foreground">
                              Selected: <span className="text-foreground">{formatScanModules(scanModules)}</span>
                          </p>
                      </motion.div>
                  </motion.div>


                  <div className="mt-8">
                       <Button 
                          className="w-full h-14 font-mono text-lg tracking-wider bg-foreground text-background hover:bg-foreground/90"
                          onClick={handleQueueScan}
                          disabled={
                            isScanning ||
                            isLoadingAssets ||
                            verifiedDomains.filter((d) => d.status === 'verified').length === 0 ||
                            !SCAN_MODULE_OPTIONS.some((o) => scanModules[o.id])
                          }
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
                                           <motion.div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-500 h-4 px-1">{job.modulesLabel}</Badge>
                                                <span className="text-[9px] text-zinc-600 font-mono">{job.timestamp.toLocaleTimeString()}</span>
                                           </motion.div>
                                           {job.details && (
                                             <p className="text-[10px] text-zinc-500 font-mono mt-1 line-clamp-2">{job.details}</p>
                                           )}
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
                                  {isLoadingAssets ? (
                                      <tr>
                                          <td colSpan={6} className="py-12 text-center text-muted-foreground font-mono">
                                              <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
                                              Loading assets…
                                          </td>
                                      </tr>
                                  ) : filteredAssets.length === 0 ? (
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
                                                      <Button
                                                          size="icon"
                                                          variant="ghost"
                                                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                          onClick={() => void handleDeleteAsset(asset)}
                                                          title="Delete asset"
                                                      >
                                                          <Trash2 className="w-3.5 h-3.5" />
                                                      </Button>
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
                                              <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">{job.modulesLabel}</Badge>
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
