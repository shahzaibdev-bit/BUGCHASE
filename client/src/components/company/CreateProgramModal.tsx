import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, ChevronRight, ChevronLeft, Shield, DollarSign, 
  Globe, Smartphone, Server, Plus, ChevronDown, CheckCircle, Trash2
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import CyberpunkEditor from '@/components/ui/CyberpunkEditor';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { API_URL } from '@/config';

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  verifiedAssets: { id: string; domain: string; type?: string }[];
  onSuccess?: () => void;
}

export const CreateProgramModal = ({ isOpen, onClose, companyName, verifiedAssets, onSuccess }: CreateProgramModalProps) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'VDP', 
    description: '',
    isPrivate: false,
    selectedAssets: [] as string[],
    outOfScope: [] as { asset: string; reason: string }[],
    rulesOfEngagement: '',
    safeHarbor: '',
    submissionGuidelines: '',
    slas: {
        firstResponse: 24,
        triage: 48,
        bounty: 168,
        resolution: 360
    },
    rewards: {
        critical: { min: '', max: '' },
        high: { min: '', max: '' },
        medium: { min: '', max: '' },
        low: { min: '', max: '' }
    } as Record<string, { min: string; max: string }>
  });

  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [newOosAsset, setNewOosAsset] = useState('');
  const [newOosReason, setNewOosReason] = useState('');

  // Helper to toggle asset
  const toggleAsset = (assetId: string) => {
      setFormData(prev => {
          const exists = prev.selectedAssets.includes(assetId);
          return {
              ...prev,
              selectedAssets: exists 
                  ? prev.selectedAssets.filter(id => id !== assetId)
                  : [...prev.selectedAssets, assetId]
          };
      });
  };

  const getSelectedAssetDetails = () => {
      // Map selected IDs back to asset objects
      return verifiedAssets.filter(a => formData.selectedAssets.includes(a.id)).map(a => ({
          id: a.id,
          name: a.domain,
          tier: 'Web'
      }));
  };

  const addOutOfScopeAsset = () => {
      if (!newOosAsset) return;
      setFormData(prev => ({
          ...prev,
          outOfScope: [...prev.outOfScope, { asset: newOosAsset, reason: newOosReason || 'Out of bounds' }]
      }));
      setNewOosAsset('');
      setNewOosReason('');
  };

  const removeOutOfScopeAsset = (index: number) => {
      setFormData(prev => ({
          ...prev,
          outOfScope: prev.outOfScope.filter((_, i) => i !== index)
      }));
  };

  const updateReward = (severity: string, field: 'min' | 'max', value: string) => {
      setFormData(prev => ({
          ...prev,
          rewards: {
              ...prev.rewards,
              [severity]: {
                  ...prev.rewards[severity],
                  [field]: value
              }
          }
      }));
  };
  
  const handlePublish = async () => {
      if(!formData.title) return;
      setIsSubmitting(true);
      
      try {
          const payload = {
              title: formData.title,
              type: formData.type,
              description: formData.description,
              isPrivate: formData.isPrivate,
              selectedAssets: formData.selectedAssets,
              outOfScope: formData.outOfScope,
              rulesOfEngagement: formData.rulesOfEngagement,
              safeHarbor: formData.safeHarbor,
              submissionGuidelines: formData.submissionGuidelines,
              slas: formData.slas,
              rewards: formData.rewards
          };

          const res = await fetch(`${API_URL}/company/programs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if(res.ok) {
              if(onSuccess) onSuccess();
              onClose();
          } else {
              // Handle error
              console.error("Failed to create program");
          }
      } catch(e) {
          console.error(e);
      } finally {
          setIsSubmitting(false);
      }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border text-foreground font-sans gap-0 [&>button]:hidden">
        
        {/* Modal Header / Progress */}
        <div className="border-b border-border p-6 flex justify-between items-center bg-background/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center border border-foreground/10 text-foreground font-mono font-bold">
               0{step}
             </div>
             <div>
               <h2 className="text-lg font-bold font-mono tracking-tight uppercase text-foreground">
                 {step === 1 && "PROGRAM BASICS"}
                 {step === 2 && "SCOPE DEFINITION"}
                 {step === 3 && "RULES & GUIDELINES"}
                 {step === 4 && "OPERATIONS & SLA"}
                 {step === 5 && "PROGRAM READY"}
               </h2>
               <p className="text-xs text-muted-foreground font-mono">STEP {step} OF 5</p>
             </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="min-h-[500px] max-h-[70vh] flex flex-col items-center overflow-y-auto w-full bg-background/50 scrollbar-hide">
          <AnimatePresence mode="wait">
             <motion.div
               key={step}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="w-full max-w-3xl py-8 px-6 space-y-8"
             >
                {/* STEP 1: BASIC INFO */}
                {step === 1 && (
                  <>
                     <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-xs font-mono text-muted-foreground uppercase">Company Name</label>
                             <div className="h-10 px-3 flex items-center bg-muted/50 border border-border rounded-md text-muted-foreground font-mono text-sm cursor-not-allowed">
                               {companyName}
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-mono text-foreground uppercase">Program Title</label>
                             <Input 
                               value={formData.title}
                               onChange={(e) => setFormData({...formData, title: e.target.value})}
                               placeholder="e.g. Public Bug Bounty" 
                               className="bg-background border-border focus:border-foreground text-foreground font-mono"
                             />
                          </div>
                       </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-xs font-mono text-muted-foreground uppercase">Program Type</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {/* VDP Card */}
                           <div onClick={() => setFormData({...formData, type: 'VDP'})} className="cursor-pointer h-full">
                               <InvertedTiltCard>
                                   <InverseSpotlightCard className={cn(
                                       "p-6 h-full flex flex-col items-center text-center gap-3 transition-all border rounded-xl",
                                       formData.type === 'VDP' 
                                         ? "border-foreground bg-foreground/5" 
                                         : "border-border bg-background hover:border-foreground/50"
                                   )}>
                                      <div className={cn("p-3 rounded-full transition-colors", formData.type === 'VDP' ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
                                         <Shield className="h-6 w-6" />
                                      </div>
                                      <div>
                                        <h3 className="font-bold text-foreground">Vulnerability Disclosure</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Unpaid / Swag Only</p>
                                      </div>
                                   </InverseSpotlightCard>
                               </InvertedTiltCard>
                           </div>

                           {/* BBP Card */}
                           <div onClick={() => setFormData({...formData, type: 'BBP'})} className="cursor-pointer h-full">
                               <InvertedTiltCard>
                                   <InverseSpotlightCard className={cn(
                                       "p-6 h-full flex flex-col items-center text-center gap-3 transition-all border rounded-xl",
                                       formData.type === 'BBP' 
                                         ? "border-foreground bg-foreground/5" 
                                         : "border-border bg-background hover:border-foreground/50"
                                   )}>
                                      <div className={cn("p-3 rounded-full transition-colors", formData.type === 'BBP' ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
                                         <DollarSign className="h-6 w-6" />
                                      </div>
                                      <div>
                                        <h3 className="font-bold text-foreground">Bug Bounty Program</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Paid Rewards</p>
                                      </div>
                                   </InverseSpotlightCard>
                               </InvertedTiltCard>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-xs font-mono text-muted-foreground uppercase">Program Description</label>
                        <div className="border border-border rounded-md overflow-hidden">
                           <CyberpunkEditor 
                              content={formData.description}
                              onChange={(html) => setFormData({...formData, description: html})}
                           />
                        </div>
                     </div>

                     <div className="space-y-2 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-mono text-foreground uppercase">Program Visibility</label>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-mono", !formData.isPrivate ? "text-foreground font-bold" : "text-muted-foreground")}>Public</span>
                                <Switch 
                                    checked={formData.isPrivate} 
                                    onCheckedChange={(c) => setFormData({...formData, isPrivate: c})} 
                                    className="data-[state=checked]:bg-foreground" 
                                />
                                <span className={cn("text-xs font-mono", formData.isPrivate ? "text-foreground font-bold" : "text-muted-foreground")}>Private</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Private programs are invitation-only. Public programs are visible to all registered researchers.</p>
                     </div>
                  </>
                )}

                {/* STEP 2: SCOPE & ASSETS */}
                {step === 2 && (
                  <div className="space-y-6">
                     {/* Asset Types */}
                     <div className="flex gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                        {['Web / API', 'Mobile App', 'Infrastructure'].map(type => (
                           <div key={type} className="flex items-center gap-2">
                              <Switch defaultChecked={true} className="data-[state=checked]:bg-foreground" />
                              <span className="text-sm font-mono text-muted-foreground">{type}</span>
                           </div>
                        ))}
                     </div>

                     {/* Main Asset Selection Logic */}
                     <div className="space-y-2 relative">
                        <label className="text-xs font-mono text-foreground uppercase">Add Assets to Scope</label>
                        
                        {/* Custom Dropdown Trigger */}
                        <div 
                          onClick={() => setAssetDropdownOpen(!assetDropdownOpen)}
                          className="w-full flex justify-between items-center h-12 px-4 bg-background border border-border hover:border-foreground/50 rounded-md cursor-pointer transition-colors"
                        >
                           <span className="text-muted-foreground text-sm">
                             {formData.selectedAssets.length > 0 ? `${formData.selectedAssets.length} assets selected` : "Select assets from verified domains..."}
                           </span>
                           <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", assetDropdownOpen && "rotate-180")} />
                        </div>

                        {/* Custom Floating Dropdown */}
                        {assetDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-background border border-border rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                             {verifiedAssets.length === 0 && (
                                 <div className="p-4 text-center text-muted-foreground text-xs font-mono">
                                     No verified assets found. Verify domains first.
                                 </div>
                             )}
                             {verifiedAssets.map(domain => {
                               const isSelected = formData.selectedAssets.includes(domain.id);
                               
                               return (
                                 <div 
                                      key={domain.id}
                                      onClick={() => toggleAsset(domain.id)}
                                      className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer group"
                                 >
                                    <div className={cn(
                                       "h-4 w-4 border rounded flex items-center justify-center transition-colors",
                                       isSelected ? "bg-foreground border-foreground" : "border-muted-foreground group-hover:border-foreground"
                                    )}>
                                       {isSelected && <Check className="h-3 w-3 text-background" />}
                                    </div>
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-bold text-sm text-foreground">{domain.domain}</span>
                                 </div>
                               );
                             })}
                          </div>
                        )}
                     </div>

                     {/* Selected Assets List */}
                     <ScrollArea className="h-[200px] bg-muted/10 rounded-lg border border-border p-4">
                        {formData.selectedAssets.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                               <Server className="h-8 w-8 opacity-20" />
                               <span className="text-xs font-mono">NO ASSETS DEFINED</span>
                            </div>
                        ) : (
                           <div className="space-y-2">
                              {getSelectedAssetDetails().map((asset: { id: string; name: string; tier: string }) => (
                                 <div key={asset.id} className="flex items-center justify-between p-3 bg-background border border-border rounded group">
                                     <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-foreground shadow-sm"></div>
                                        <span className="font-mono text-sm text-foreground">{asset.name}</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <span className="text-[10px] font-bold text-muted-foreground">IN_SCOPE</span>
                                         <Badge className="bg-foreground/5 text-foreground border-none rounded-sm font-mono text-[10px]">
                                            {asset.tier}
                                         </Badge>
                                         <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                            onClick={() => toggleAsset(asset.id)}
                                         >
                                            <X className="h-3 w-3" />
                                         </Button>
                                     </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </ScrollArea>

                     {/* Out of Scope Section */}
                     <div className="space-y-4 pt-4 border-t border-border">
                         <label className="text-xs font-mono text-foreground uppercase">Out of Scope Definitions</label>
                         
                         <div className="flex gap-2">
                             <Input 
                                 placeholder="e.g. staging.example.com" 
                                 value={newOosAsset} 
                                 onChange={(e) => setNewOosAsset(e.target.value)}
                                 className="bg-background border-border text-sm font-mono"
                             />
                             <Input 
                                 placeholder="Reason (optional)" 
                                 value={newOosReason} 
                                 onChange={(e) => setNewOosReason(e.target.value)}
                                 className="bg-background border-border text-sm font-mono"
                             />
                             <Button type="button" onClick={addOutOfScopeAsset} variant="outline" className="shrink-0 bg-muted/50 border-border">
                                 <Plus className="h-4 w-4" /> Add
                             </Button>
                         </div>

                         {formData.outOfScope.length > 0 && (
                             <div className="space-y-2 mt-4">
                                {formData.outOfScope.map((oos, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/5 border border-dashed border-border rounded text-sm group">
                                         <div className="flex items-center gap-3">
                                            <Shield className="h-4 w-4 text-muted-foreground/50" />
                                            <span className="font-mono font-bold text-foreground">{oos.asset}</span>
                                            {oos.reason && <span className="text-muted-foreground text-xs">— {oos.reason}</span>}
                                         </div>
                                         <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                            onClick={() => removeOutOfScopeAsset(idx)}
                                         >
                                            <Trash2 className="h-4 w-4" />
                                         </Button>
                                    </div>
                                ))}
                             </div>
                         )}
                     </div>
                  </div>
                )}

                {/* STEP 3: RULES & GUIDELINES */}
                {step === 3 && (
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-xs font-mono text-foreground uppercase flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Rules of Engagement
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">Define what researchers are allowed to do and what is strictly prohibited.</p>
                        <div className="border border-border rounded-md overflow-hidden h-40">
                           <CyberpunkEditor 
                               content={formData.rulesOfEngagement}
                               onChange={(html) => setFormData({...formData, rulesOfEngagement: html})}
                           />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-xs font-mono text-foreground uppercase flex items-center gap-2">
                            <Globe className="h-4 w-4" /> Safe Harbor Policy
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">Provide legal protection for researchers acting in good faith.</p>
                        <div className="border border-border rounded-md overflow-hidden h-40">
                           <CyberpunkEditor 
                               content={formData.safeHarbor}
                               onChange={(html) => setFormData({...formData, safeHarbor: html})}
                           />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-xs font-mono text-foreground uppercase flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" /> Submission Guidelines
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">Instructions on how to write a good report (e.g., PoC, steps to reproduce).</p>
                        <div className="border border-border rounded-md overflow-hidden h-40">
                           <CyberpunkEditor 
                               content={formData.submissionGuidelines}
                               onChange={(html) => setFormData({...formData, submissionGuidelines: html})}
                           />
                        </div>
                     </div>
                  </div>
                )}

                {/* STEP 4: OPERATIONS & SLA */}
                {step === 4 && (
                  <div className="space-y-8">
                     {/* SLAs Section */}
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <h3 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                              <Smartphone className="h-4 w-4" /> RESPONSE SLAs (HOURS)
                           </h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           {[
                              { label: 'First Response', key: 'firstResponse', default: 24 },
                              { label: 'Triage Time', key: 'triage', default: 48 },
                              { label: 'Bounty Paid', key: 'bounty', default: 168 },
                              { label: 'Resolution', key: 'resolution', default: 360 }
                           ].map((sla) => (
                              <div key={sla.key} className="p-4 bg-muted/10 border border-border rounded-lg space-y-2">
                                 <label className="text-[10px] font-mono text-muted-foreground uppercase">{sla.label}</label>
                                 <div className="relative">
                                    <Input 
                                       type="number" 
                                       className="h-9 bg-background border-border font-mono text-sm"
                                       value={formData.slas[sla.key as keyof typeof formData.slas]}
                                       onChange={(e) => setFormData({...formData, slas: {...formData.slas, [sla.key]: Number(e.target.value)}})}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">hrs</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Rewards Section */}
                     <div className="pt-6 border-t border-border">
                    {formData.type === 'VDP' ? (
                       <div className="flex flex-col items-center justify-center py-10 text-center gap-4 bg-muted/10 border border-dashed border-border rounded-xl">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                             <Shield className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                             <h3 className="text-xl font-bold text-foreground mb-2">Volunteer Program Selected</h3>
                             <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                               This is a VDP. Researchers will receive <span className="text-foreground font-bold">Points & Reputation</span> for valid submissions. Swag may be awarded at your discretion.
                             </p>
                          </div>
                       </div>
                    ) : (
                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                             <h3 className="text-sm font-bold font-mono text-foreground">BOUNTY TABLE (PKR)</h3>
                          </div>
                          
                          <div className="border border-border rounded-lg overflow-hidden">
                             {/* Header Row */}
                             <div className="grid grid-cols-12 bg-muted p-3 text-xs font-mono font-bold text-muted-foreground uppercase border-b border-border">
                                <div className="col-span-4">Severity</div>
                                <div className="col-span-8">Reward Range</div>
                             </div>

                             {/* Rows */}
                             {[
                               { label: 'Critical', key: 'critical', color: 'text-red-500' },
                               { label: 'High', key: 'high', color: 'text-orange-500' },
                               { label: 'Medium', key: 'medium', color: 'text-yellow-500' },
                               { label: 'Low', key: 'low', color: 'text-blue-500' }
                             ].map((level) => (
                                <div key={level.label} className="grid grid-cols-12 p-4 items-center gap-4 border-b border-border last:border-0 bg-background hover:bg-muted/30 transition-colors">
                                   <div className={cn("col-span-4 font-bold font-mono uppercase", level.color)}>
                                      {level.label}
                                   </div>
                                   <div className="col-span-8 flex items-center gap-4">
                                      <div className="relative w-full">
                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">PKR</span>
                                         <Input 
                                            placeholder="Min" 
                                            className="pl-10 h-9 bg-background border-border text-sm" 
                                            value={formData.rewards[level.key].min}
                                            onChange={(e) => updateReward(level.key, 'min', e.target.value)}
                                            type="number"
                                         />
                                      </div>
                                      <span className="text-muted-foreground">-</span>
                                      <div className="relative w-full">
                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">PKR</span>
                                         <Input 
                                            placeholder="Max" 
                                            className="pl-10 h-9 bg-background border-border text-sm" 
                                            value={formData.rewards[level.key].max}
                                            onChange={(e) => updateReward(level.key, 'max', e.target.value)}
                                            type="number"
                                         />
                                      </div>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}
                     </div>
                  </div>
                )}

                {/* STEP 5: REVIEW */}
                {step === 5 && (
                   <div className="flex flex-col items-center justify-center space-y-8 py-4">
                      <div className="relative">
                         <div className="absolute inset-0 bg-foreground blur-3xl opacity-10 rounded-full"></div>
                         <CheckCircle className="h-24 w-24 text-foreground relative z-10" />
                      </div>

                      <div className="text-center space-y-2">
                         <h1 className="text-3xl font-bold tracking-tight text-foreground">PROGRAM READY</h1>
                         <p className="text-muted-foreground max-w-sm mx-auto">
                           Your program is ready to be published. It will be reviewed by the BugChase Triage Team within 24 hours.
                         </p>
                      </div>

                      <div className="w-full bg-muted/20 border border-border rounded-xl p-6 grid grid-cols-2 gap-y-8 gap-x-12">
                         <div>
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">PROGRAM TITLE</p>
                            <p className="text-xl font-mono font-bold text-foreground">{formData.title}</p>
                         </div>
                         <div>
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">ASSET SCOPE</p>
                            <p className="text-xl font-mono font-bold text-foreground">{formData.selectedAssets.length} ASSETS</p>
                         </div>
                         {formData.type === 'BBP' && (
                           <div className="col-span-2 border-t border-border pt-6">
                              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">PROGRAM TYPE</p>
                              <p className="text-3xl font-mono font-bold text-foreground">Bug Bounty</p>
                           </div>
                         )}
                      </div>
                   </div>
                 )}
              </motion.div>
           </AnimatePresence>
         </div>

         {/* Modal Footer */}
         <div className="p-6 border-t border-border bg-background flex justify-between items-center z-10">
            {step > 1 ? (
              <Button 
                variant="outline" 
                onClick={prevStep}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> BACK
              </Button>
            ) : (
              <div></div> 
            )}

            {step < 5 ? (
              <Button 
                onClick={nextStep}
                className="bg-foreground hover:bg-foreground/90 text-background font-mono font-bold tracking-wide"
              >
                NEXT_STEP <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handlePublish}
                disabled={isSubmitting}
                className="bg-foreground hover:bg-foreground/90 text-background font-mono font-bold tracking-wide px-8"
              >
                {isSubmitting ? 'PUBLISHING...' : 'PUBLISH_PROGRAM'}
              </Button>
            )}
         </div>

       </DialogContent>
     </Dialog>
   );
 };
