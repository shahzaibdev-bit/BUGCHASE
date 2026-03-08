import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, ChevronRight, ChevronLeft, Shield, Banknote, 
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

interface VerifiedAsset {
  id: string;
  domain: string;
  type?: string;
  inScope?: string[];
  outScope?: string[];
}

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  verifiedAssets: VerifiedAsset[];
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
          tier: 'Web',
          inScope: a.inScope || [],
          outScope: a.outScope || []
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
              // Derive outOfScope from the selected verified assets directly to send to backend if needed
              outOfScope: getSelectedAssetDetails().flatMap(a => a.outScope.map(domain => ({ asset: domain, reason: 'Out of scope subdomain' }))),
              rulesOfEngagement: formData.rulesOfEngagement,
              safeHarbor: formData.safeHarbor,
              submissionGuidelines: formData.submissionGuidelines,
              slas: formData.slas,
              rewards: formData.rewards
          };

          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/company/programs`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
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
                                         <Banknote className="h-6 w-6" />
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
                     <ScrollArea className="h-[400px] rounded-lg border border-border p-4 bg-background overflow-y-auto">
                        {formData.selectedAssets.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 py-12">
                               <Server className="h-8 w-8 opacity-20" />
                               <span className="text-xs font-mono">NO ASSETS DEFINED</span>
                            </div>
                        ) : (
                           <div className="space-y-8">
                              {getSelectedAssetDetails().map((asset) => (
                                 <div key={asset.id} className="flex flex-col gap-4">
                                     <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-foreground flex items-center justify-center shadow-sm shrink-0">
                                            <Globe className="h-6 w-6 text-background" />
                                        </div>
                                        <span className="font-mono text-lg font-bold text-foreground truncate">{asset.name}</span>
                                     </div>
                                     
                                     <div className="pl-6 ml-6 border-l-2 border-muted-foreground/20 space-y-6">
                                        {/* In-scope */}
                                        <div className="space-y-3">
                                            <span className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                                                In-scope:
                                            </span>
                                            {asset.inScope.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {asset.inScope.map((sub, idx) => (
                                                        <li key={idx} className="flex items-center gap-3">
                                                            <div className="h-4 w-4 rounded-full bg-foreground shrink-0 shadow-sm" />
                                                            <span className="font-mono text-sm text-muted-foreground">{sub}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="font-mono text-xs text-muted-foreground italic pl-7">No specific subdomains defined.</p>
                                            )}
                                        </div>

                                        {/* Out-scope */}
                                        <div className="space-y-3">
                                            <span className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                                                Out-scope:
                                            </span>
                                            {asset.outScope.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {asset.outScope.map((sub, idx) => (
                                                        <li key={idx} className="flex items-center gap-3">
                                                            <div className="h-4 w-4 rounded-full bg-foreground shrink-0 shadow-sm" />
                                                            <span className="font-mono text-sm text-muted-foreground">{sub}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="font-mono text-xs text-muted-foreground italic pl-7">None defined.</p>
                                            )}
                                        </div>
                                     </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </ScrollArea>
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
                   <div className="flex flex-col items-center justify-center space-y-8 py-4 w-full">
                      <div className="relative">
                         <div className="absolute inset-0 bg-foreground blur-3xl opacity-10 rounded-full"></div>
                         <CheckCircle className="h-16 w-16 text-foreground relative z-10" />
                      </div>

                      <div className="text-center space-y-2">
                         <h1 className="text-3xl font-bold tracking-tight text-foreground">PROGRAM READY</h1>
                         <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                           Please review your program details before publishing. It will be reviewed by the BugChase Triage Team within 24 hours.
                         </p>
                      </div>

                      <div className="w-full bg-muted/20 border border-border rounded-xl p-6 space-y-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
                         {/* Basic Info */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                               <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">PROGRAM TITLE</p>
                               <p className="text-lg font-bold text-foreground">{formData.title || 'N/A'}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">PROGRAM TYPE</p>
                               <div className="flex items-center gap-2 mt-1">
                                   {formData.type === 'BBP' ? <Banknote className="h-4 w-4 text-foreground" /> : <Shield className="h-4 w-4 text-foreground" />}
                                  <p className="text-sm font-bold text-foreground">
                                     {formData.type === 'BBP' ? 'Bug Bounty (Paid)' : 'Vulnerability Disclosure (Unpaid)'}
                                  </p>
                               </div>
                            </div>
                            <div>
                               <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">VISIBILITY</p>
                               <p className="text-sm text-foreground">{formData.isPrivate ? 'Private (Invite Only)' : 'Public'}</p>
                            </div>
                             <div>
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">ASSET SCOPE</p>
                                <p className="text-sm text-foreground">
                                    {getSelectedAssetDetails().reduce((acc, curr) => acc + curr.inScope.length, 0)} In-Scope,{' '}
                                    {getSelectedAssetDetails().reduce((acc, curr) => acc + curr.outScope.length, 0)} Out-of-Scope
                                </p>
                             </div>
                         </div>

                         {/* Details & Policies */}
                         <div className="border-t border-border pt-6 space-y-6">
                            <h3 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                               <Shield className="h-4 w-4" /> POLICIES & DETAILS
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4">
                               <div className="bg-background border border-border rounded p-4">
                                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Description</p>
                                  <div className="text-sm text-foreground/80 line-clamp-3 prose prose-sm prose-invert" dangerouslySetInnerHTML={{ __html: formData.description || 'No description provided.' }} />
                               </div>
                               
                               {(formData.rulesOfEngagement || formData.safeHarbor || formData.submissionGuidelines) && (
                                   <div className="bg-background border border-border rounded p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {formData.rulesOfEngagement && (
                                          <div>
                                             <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Rules of Engagement</p>
                                             <p className="text-xs text-foreground/70">Provided ✓</p>
                                          </div>
                                      )}
                                      {formData.safeHarbor && (
                                          <div>
                                             <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Safe Harbor</p>
                                             <p className="text-xs text-foreground/70">Provided ✓</p>
                                          </div>
                                      )}
                                      {formData.submissionGuidelines && (
                                          <div>
                                             <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Guidelines</p>
                                             <p className="text-xs text-foreground/70">Provided ✓</p>
                                          </div>
                                      )}
                                   </div>
                               )}
                            </div>
                         </div>

                         {/* Rewards (if BBP) */}
                         {formData.type === 'BBP' && (
                             <div className="border-t border-border pt-6 space-y-4">
                                <h3 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                                   <Banknote className="h-4 w-4" /> REWARD STRUCTURE (PKR)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                   {Object.entries(formData.rewards).map(([severity, range]) => (
                                       <div key={severity} className="bg-background border border-border rounded p-3 flex justify-between items-center">
                                          <p className={cn(
                                              "text-xs font-mono uppercase font-bold",
                                              severity === 'critical' ? "text-red-500" :
                                              severity === 'high' ? "text-orange-500" :
                                              severity === 'medium' ? "text-yellow-500" : "text-blue-500"
                                          )}>{severity}</p>
                                          <p className="text-xs text-foreground font-mono">
                                              {range.min || '0'} - {range.max || '0'}
                                          </p>
                                       </div>
                                   ))}
                                </div>
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
