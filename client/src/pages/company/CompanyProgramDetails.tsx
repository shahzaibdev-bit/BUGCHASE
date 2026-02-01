import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Settings, 
  Trash2, 
  Save, 
  X, 
  Shield, 
  DollarSign, 
  Globe, 
  Server, 
  Smartphone,
  CheckCircle,
  AlertTriangle,
  FileText,
  Ban,
  Edit2,
  ChevronRight,
  Plus,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { API_URL } from '@/config';

// Mock reports and assets removed


// --- Subcomponents ---

// Asset Selection Modal defined OUTSIDE to prevent re-renders
const AssetSelectionModal = ({ 
    open, 
    onOpenChange, 
    title, 
    currentList, 
    availableAssets, // New prop
    onToggle 
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    title: string; 
    currentList: any[]; 
    availableAssets: any[]; // New prop type
    onToggle: (asset: any) => void; 
}) => {
    // Group assets by parent (or just group by type if parent is missing)
    const groupedAssets = useMemo(() => {
        const groups: Record<string, any[]> = {};
        availableAssets.forEach(asset => {
            // If we don't have parent, use type or 'Other'
            const parent = asset.parent || (asset.domain ? 'Domain' : 'Other'); 
            // Note: API returns assets with `domain` field, sometimes mapped to `name`. 
            // We should ensure consistency. 
            // Let's assume availableAssets are the raw verified assets from API.
            // API returns: { id, domain, status, ... }
            // Mapped for selection: we might need to map them to display format.
            
            // Adaptation: The availableAssets passed here should probably be already mapped or we map here.
            // Let's assume they are passed as we get them from API, so we map them here for display.
            const displayAsset = {
                id: asset.id,
                name: asset.domain,
                type: 'Web', // Default to Web for verified assets
                tier: 'Low', // Default
                parent: 'Verified Assets'
            };
            
            if (!groups[displayAsset.parent]) groups[displayAsset.parent] = [];
            groups[displayAsset.parent].push(displayAsset);
        });
        return groups;
    }, [availableAssets]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-border bg-background sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
                <DialogHeader className="p-6 pb-4 border-b border-border/50">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Select assets to include in this list.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {Object.entries(groupedAssets).map(([parent, assets]) => (
                        <div key={parent} className="space-y-3">
                             <div className="flex items-center justify-between px-2">
                                <h4 className="font-bold text-lg text-foreground tracking-tight">{parent}</h4>
                                <Badge variant="secondary" className="rounded-full px-2.5 bg-muted/50 text-muted-foreground font-mono text-xs">
                                    {assets.length} Assets
                                </Badge>
                             </div>
                             
                             <div className="grid gap-2">
                                {assets.map((asset: any) => {
                                    const isSelected = currentList.some(curr => curr.name === asset.name);
                                    return (
                                        <div 
                                            key={asset.id} 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onToggle(asset);
                                            }}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none",
                                                isSelected 
                                                    ? "bg-foreground/5 border-foreground/30 shadow-sm" 
                                                    : "bg-background border-border hover:border-foreground/20 hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <span className="font-mono text-sm font-medium text-foreground">{asset.name}</span>
                                                <div className="flex items-center gap-2">
                                                     <Badge variant="outline" className={cn(
                                                         "rounded-md px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider border-0",
                                                         asset.tier === 'Critical' ? "bg-red-500/10 text-red-500" :
                                                         asset.tier === 'High' ? "bg-orange-500/10 text-orange-500" :
                                                         asset.tier === 'Medium' ? "bg-yellow-500/10 text-yellow-500" :
                                                         "bg-blue-500/10 text-blue-500"
                                                     )}>
                                                         {asset.tier || 'N/A'}
                                                     </Badge>
                                                     <span className="text-[10px] text-muted-foreground uppercase">{asset.type}</span>
                                                </div>
                                            </div>
                                            
                                            <div className={cn(
                                                "h-6 w-6 rounded-full border flex items-center justify-center transition-all",
                                                isSelected 
                                                    ? "bg-foreground border-foreground text-background" 
                                                    : "border-muted-foreground/30 text-transparent"
                                            )}>
                                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                            </div>
                                        </div>
                                    )
                                })}
                             </div>
                        </div>
                    ))}
                    {availableAssets.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No verified assets found. Verify a domain first.
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t border-border/50 bg-muted/10">
                    <Button onClick={() => onOpenChange(false)} className="w-full rounded-xl font-bold">
                        Done Selection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const CompanyProgramDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [verifiedAssets, setVerifiedAssets] = useState<any[]>([]); // Store verified assets
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Granular Edit States
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingPolicy, setIsEditingPolicy] = useState(false);
  const [isEditingScope, setIsEditingScope] = useState(false); 
  const [isEditingRewards, setIsEditingRewards] = useState(false);

  // Modal States
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isAddExcludedOpen, setIsAddExcludedOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [programRes, assetsRes] = await Promise.all([
                fetch(`${API_URL}/company/programs/${id}`, { headers }),
                fetch(`${API_URL}/company/assets`, { headers })
            ]);

            if (!programRes.ok) throw new Error('Failed to fetch program');
            
            const programJson = await programRes.json();
            setData(programJson.data);

            if (assetsRes.ok) {
                const assetsJson = await assetsRes.json();
                setVerifiedAssets(assetsJson.data);
            }
        } catch (error) {
            console.error(error);
            // navigate('/company/programs'); 
        } finally {
            setIsLoading(false);
        }
    };
    if (id) fetchData();
  }, [id]);

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
      );
  }

  if (!data) return null;

  // Derived Pagination Data
  const totalPages = Math.ceil((data.reports?.length || 0) / itemsPerPage);
  const currentReports = (data.reports || []).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleSaveTitle = (newTitle: string) => {
    setData({ ...data, title: newTitle });
    // TODO: persist change
  };

  const handleDelete = async () => {
    setIsDeleteDialogOpen(false); // Close dialog immediately
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/company/programs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            navigate('/company/programs');
        } else {
            console.error("Failed to delete program");
            // Optionally re-open dialog or show error
        }
    } catch (e) {
        console.error(e);
        // Optionally re-open dialog or show error
    }
  };

  const handleDeleteAsset = (assetId: number | string, listType: 'assets' | 'outOfScope') => {
    // Note: This updates local state only. Real implementation needs API call to save.
    if (listType === 'assets') {
        setData({ ...data, assets: data.assets.filter((a: any) => a.id !== assetId) });
    } else {
        setData({ ...data, outOfScope: data.outOfScope.filter((a: any) => a.id !== assetId) });
    }
  };

  const handleToggleAsset = (asset: any) => {
    const exists = data.assets.find((a: any) => a.name === asset.name);
    if (exists) {
        handleDeleteAsset(exists.id, 'assets');
    } else {
        // Add to assets, remove from outOfScope if present
        const newAsset = { ...asset, tier: asset.tier || 'Low' }; // Use source tier or default
        const newAssets = [...data.assets, newAsset];
        const newOutOfScope = data.outOfScope.filter((a: any) => a.id !== asset.id);
        setData({ ...data, assets: newAssets, outOfScope: newOutOfScope });
    }
  };

  const handleToggleExcluded = (asset: any) => {
      const exists = data.outOfScope.find((a: any) => a.name === asset.name);
      if (exists) {
          handleDeleteAsset(exists.id, 'outOfScope');
      } else {
          // Add to outOfScope, remove from assets if present
          const newAsset = { ...asset, reason: 'Other' }; // Default reason
          const newOutOfScope = [...data.outOfScope, newAsset];
          const newAssets = data.assets.filter((a: any) => a.id !== asset.id);
          setData({ ...data, assets: newAssets, outOfScope: newOutOfScope });
      }
  };

  return (
    <div className="min-h-screen  text-foreground font-sans p-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => navigate('/company/programs')}
                        className="rounded-full border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.title}</h1>
                            
                            <Dialog open={isEditingTitle} onOpenChange={setIsEditingTitle}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground">
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="border-border bg-background">
                                    <DialogHeader>
                                        <DialogTitle>Edit Program Details</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Program Title</Label>
                                            <Input 
                                                defaultValue={data.title} 
                                                onChange={(e) => setData({...data, title: e.target.value})} // Live update for demo
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={() => setIsEditingTitle(false)}>Done</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Badge variant="outline" className={cn(
                                "uppercase text-[10px] tracking-widest rounded-full px-2.5 ml-2",
                                data.status === 'Active' ? "border-foreground/20 text-foreground bg-foreground/5" : "border-muted text-muted-foreground"
                            )}>
                                {data.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs font-mono mt-1">ID: {id || data.id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50 rounded-full">
                                <Trash2 className="h-4 w-4" /> 
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="border-border bg-background sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" /> Delete Program?
                                </DialogTitle>
                                <DialogDescription className="pt-2">
                                    This action cannot be undone. This will permanently delete the 
                                    <span className="font-bold text-foreground"> {data.title} </span> 
                                    program.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-4">
                                <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleDelete}>Delete Program</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                    { label: 'Total Reports', value: data.stats.reports, icon: FileText },
                    { label: 'Bounties Paid', value: `$${data.stats.paid}`, icon: DollarSign },
                    { label: 'Avg Response', value: data.stats.avgResponse, icon: Smartphone },
                    { label: 'Program Type', value: data.type === 'BBP' ? 'Bug Bounty' : 'VDP', icon: Shield },
                 ].map((stat, i) => (
                    <InvertedTiltCard key={i} className="h-full">
                         <InverseSpotlightCard className="h-full p-6 border border-border bg-background rounded-2xl flex flex-col justify-between shadow-sm">
                             <div className="flex items-center justify-between mb-4">
                                 <span className="text-xs font-mono text-muted-foreground uppercase">{stat.label}</span>
                                 <stat.icon className="h-4 w-4 text-foreground/40" />
                             </div>
                             <p className="text-3xl font-bold text-foreground font-mono tracking-tighter">{stat.value}</p>
                         </InverseSpotlightCard>
                    </InvertedTiltCard>
                 ))}
            </div>

            {/* Main Content Tabs */}
            <div className="mt-8">
                <div className="flex border-b border-border mb-6 gap-8">
                    {['overview', 'scope', 'reports', ...(data.type === 'BBP' ? ['rewards'] : [])].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "pb-3 text-sm font-mono uppercase tracking-wider transition-all relative px-1",
                                activeTab === tab ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground/70"
                            )}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div 
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground shadow-sm"
                                />
                            )}
                        </button>
                    ))}
                </div>

                <div className="min-h-[400px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'overview' && (
                                <div className="space-y-8">
                                     <div className="grid md:grid-cols-3 gap-8">
                                         <div className="md:col-span-2 space-y-4">
                                             <div className="flex justify-between items-center">
                                                 <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                                     <FileText className="h-5 w-5" /> Program Policy
                                                 </h3>
                                                 <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => setIsEditingPolicy(!isEditingPolicy)}
                                                    className={cn("rounded-full h-8 px-3 text-xs", isEditingPolicy ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
                                                 >
                                                    {isEditingPolicy ? <><Save className="h-3 w-3 mr-1.5" /> Done</> : <><Edit2 className="h-3 w-3 mr-1.5" /> Edit Policy</>}
                                                 </Button>
                                             </div>
                                             
                                             {isEditingPolicy ? (
                                                 <div className="border border-border rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                     <CyberpunkEditor 
                                                         content={data.description}
                                                         onChange={(html) => setData({...data, description: html})}
                                                     />
                                                 </div>
                                             ) : (
                                                 <div 
                                                    className="text-muted-foreground leading-relaxed bg-muted/20 p-8 rounded-2xl border border-border"
                                                    dangerouslySetInnerHTML={{ __html: data.description }}
                                                 />
                                             )}
                                         </div>
                                         <div className="space-y-4">
                                             <h3 className="text-lg font-bold text-foreground">Program Health</h3>
                                             <div className="bg-muted/20 border border-border rounded-2xl p-6 space-y-4">
                                                 <div className="flex justify-between items-center">
                                                     <span className="text-sm text-muted-foreground">Response Rate</span>
                                                     <span className="font-mono font-bold">98%</span>
                                                 </div>
                                                 <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                     <div className="h-full bg-foreground w-[98%]" />
                                                 </div>
                                                 
                                                 <div className="flex justify-between items-center pt-2">
                                                     <span className="text-sm text-muted-foreground">Time to Bounty</span>
                                                     <span className="font-mono font-bold">3 Days</span>
                                                 </div>
                                                 <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                     <div className="h-full bg-foreground w-[70%]" />
                                                 </div>

                                                 <div className="flex justify-between items-center pt-2">
                                                     <span className="text-sm text-muted-foreground">Signal to Noise</span>
                                                     <span className="font-mono font-bold">High</span>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                </div>
                            )}

                            {activeTab === 'scope' && (
                                <div className="space-y-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="text-sm text-muted-foreground">
                                            Manage your program's scope definition.
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsEditingScope(!isEditingScope)}
                                            className={cn("rounded-full h-8 px-3 text-xs", isEditingScope ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
                                        >
                                            {isEditingScope ? <><Save className="h-3 w-3 mr-1.5" /> Done Editing</> : <><Edit2 className="h-3 w-3 mr-1.5" /> Edit Scope</>}
                                        </Button>
                                    </div>

                                    {/* Asset Selection Modals */}
                                    <AssetSelectionModal 
                                        open={isAddAssetOpen}
                                        onOpenChange={setIsAddAssetOpen}
                                        title="Select In-Scope Assets"
                                        currentList={data.assets}
                                        availableAssets={verifiedAssets}
                                        onToggle={handleToggleAsset}
                                    />

                                    <AssetSelectionModal 
                                        open={isAddExcludedOpen}
                                        onOpenChange={setIsAddExcludedOpen}
                                        title="Select Out-of-Scope Assets"
                                        currentList={data.outOfScope}
                                        availableAssets={verifiedAssets}
                                        onToggle={handleToggleExcluded}
                                    />

                                    {/* In-Scope */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5 text-foreground" /> In-Scope Assets
                                            </h3>
                                            {isEditingScope && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="rounded-full h-7 text-xs"
                                                    onClick={() => setIsAddAssetOpen(true)}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> Add Asset
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid gap-3">
                                            {data.assets.map((asset) => (
                                                <div key={asset.id} className="flex items-center justify-between p-4 bg-background border border-border hover:border-foreground/50 rounded-xl group transition-all shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "p-2.5 rounded-lg",
                                                            asset.type === 'Web' ? "bg-blue-500/10 text-blue-500" :
                                                            asset.type === 'API' ? "bg-purple-500/10 text-purple-500" :
                                                            "bg-orange-500/10 text-orange-500"
                                                        )}>
                                                            {asset.type === 'Web' && <Globe className="h-5 w-5" />}
                                                            {asset.type === 'API' && <Server className="h-5 w-5" />}
                                                            {asset.type === 'Mobile' && <Smartphone className="h-5 w-5" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-mono text-foreground font-medium">{asset.name}</p>
                                                            <p className="text-xs text-muted-foreground">Tier: {asset.tier}</p>
                                                        </div>
                                                    </div>
                                                    {isEditingScope && (
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                                            onClick={() => handleDeleteAsset(asset.id, 'assets')}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Out-of-Scope */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                                <Ban className="h-5 w-5 text-muted-foreground" /> Out-of-Scope
                                            </h3>
                                            {isEditingScope && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="rounded-full h-7 text-xs"
                                                    onClick={() => setIsAddExcludedOpen(true)}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> Add Excluded
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid gap-3">
                                            {data.outOfScope.map((asset) => (
                                                <div key={asset.id} className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl opacity-75">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
                                                            <Ban className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-mono text-foreground font-medium line-through decoration-muted-foreground">{asset.name}</p>
                                                            <p className="text-xs text-muted-foreground">{asset.reason}</p>
                                                        </div>
                                                    </div>
                                                    {isEditingScope && (
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDeleteAsset(asset.id, 'outOfScope')}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'reports' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-foreground">Program Reports</h3>
                                        <div className="text-xs text-muted-foreground font-mono">
                                            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, data.reports.length)} of {data.reports.length}
                                        </div>
                                    </div>
                                    <div className="border border-border rounded-2xl overflow-hidden bg-background">
                                        {currentReports.map((report) => (
                                            <div key={report.id} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/company/reports/${report.id}`)}>
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        report.severity === 'Critical' ? "bg-red-500" :
                                                        report.severity === 'High' ? "bg-orange-500" :
                                                        report.severity === 'Medium' ? "bg-yellow-500" : "bg-blue-500"
                                                    )} />
                                                    <span className="font-mono text-xs text-muted-foreground">{report.id}</span>
                                                    <h4 className="font-medium text-foreground">{report.title}</h4>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
                                                        {report.status}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground font-mono">{report.date}</span>
                                                    <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-4 pt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="rounded-full"
                                            >
                                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                            </Button>
                                            <span className="text-sm text-muted-foreground font-mono">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="rounded-full"
                                            >
                                                Next <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'rewards' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-foreground">Reward Table (BBP)</h3>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsEditingRewards(!isEditingRewards)}
                                            className={cn("rounded-full h-8 px-3 text-xs", isEditingRewards ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
                                        >
                                            {isEditingRewards ? <><Save className="h-3 w-3 mr-1.5" /> Save Rewards</> : <><Edit2 className="h-3 w-3 mr-1.5" /> Edit Rewards</>}
                                        </Button>
                                    </div>

                                    <div className="border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
                                        {/* Header */}
                                        <div className="grid grid-cols-3 bg-muted/40 p-4 text-xs font-mono font-bold text-muted-foreground uppercase border-b border-border">
                                            <div>Severity</div>
                                            <div className="col-span-2">Reward Range (USD)</div>
                                        </div>
                                        
                                        {/* Rows */}
                                        {Object.entries(data.bounties).map(([severity, range]: [string, any]) => (
                                            <div key={severity} className="grid grid-cols-3 p-5 items-center border-b border-border last:border-0 hover:bg-muted/20">
                                                <div className={cn(
                                                    "font-bold font-mono uppercase flex items-center gap-3",
                                                    severity === 'critical' ? "text-red-500" :
                                                    severity === 'high' ? "text-orange-500" :
                                                    severity === 'medium' ? "text-yellow-500" : "text-blue-500"
                                                )}>
                                                    <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", 
                                                         severity === 'critical' ? "bg-red-500" :
                                                         severity === 'high' ? "bg-orange-500" :
                                                         severity === 'medium' ? "bg-yellow-500" : "bg-blue-500" 
                                                    )} />
                                                    {severity}
                                                </div>
                                                <div className="col-span-2 font-mono text-foreground font-medium">
                                                    {isEditingRewards ? (
                                                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                                                            <Input 
                                                                defaultValue={range.min} 
                                                                className="h-9 w-28 bg-background border-border focus:border-foreground rounded-lg" 
                                                            />
                                                            <span className="text-muted-foreground">-</span>
                                                            <Input 
                                                                defaultValue={range.max} 
                                                                className="h-9 w-28 bg-background border-border focus:border-foreground rounded-lg" 
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span>${(range?.min || 0).toLocaleString()} - ${(range?.max || 0).toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

            </div>
        </div>
    </div>
  );
};

export default CompanyProgramDetails;
