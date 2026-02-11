import React, { useState } from 'react';
import { Globe, ArrowRight, Copy, CheckCircle, AlertTriangle, RefreshCw, Smartphone, ShieldCheck, Terminal, AlertCircle, Eye, EyeOff, MoreHorizontal, Ban, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GlassCard } from '@/components/ui/glass-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { API_URL } from '@/config';

// Types
type VerificationStatus = 'idle' | 'pending' | 'verifying' | 'verified' | 'error';

interface VerifiedDomain {
  id: string;
  domain: string;
  method: 'DNS_TXT' | 'SECURITY_TXT';
  verificationToken?: string;
  dateVerified: string;
  status: 'verified' | 'disabled';
}

export function DomainVerificationTab() {
  const [rootDomain, setRootDomain] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [verificationToken, setVerificationToken] = useState('');
  const [verifiedDomains, setVerifiedDomains] = useState<VerifiedDomain[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [visibleTokens, setVisibleTokens] = useState<Record<string, boolean>>({});

  // Fetch existing assets
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/company/assets`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                setVerifiedDomains(data.data);
            }
        });
  }, []);

  const handleGenerateToken = async () => {
    if (!rootDomain) return;
    
    // Check if domain is already verified
    const isAlreadyVerified = verifiedDomains.some(d => d.domain === rootDomain);
    if (isAlreadyVerified) {
        setErrorMsg('This domain is already verified.');
        setVerificationStatus('error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/company/generate-token`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ rootDomain })
        });
        const data = await res.json();
        
        if (res.ok) {
            setErrorMsg('');
            setVerificationStatus('pending');
            setVerificationToken(data.token);
        } else {
            toast.error(data.message || 'Failed to generate token');
        }
    } catch (e) {
        toast.error('Network error');
    }
  };

  const handleVerifyDns = async () => {
    setVerificationStatus('verifying');
    
    try {
        const res = await fetch(`${API_URL}/company/verify-domain`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ rootDomain })
        });
        const data = await res.json();

        if (res.ok) {
            setVerificationStatus('verified');
            setVerifiedDomains(prev => [...prev, data.asset]);
            toast.success("Domain Verified Successfully. Asset Discovery Enabled.");
            
            // Reset form
            setTimeout(() => {
                setVerificationStatus('idle');
                setRootDomain('');
                setVerificationToken('');
            }, 2000);
        } else {
            setVerificationStatus('error');
            setErrorMsg(data.message || "Verification failed. Could not find or parse security.txt.");
        }
    } catch (e) {
        setVerificationStatus('error');
        setErrorMsg("Network error occurred.");
    }
  };

  const toggleAssetStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'verified' ? 'disabled' : 'verified';
    try {
        const res = await fetch(`${API_URL}/company/assets/${id}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (res.ok) {
            setVerifiedDomains(prev => 
                prev.map(d => d.id === id ? { ...d, status: newStatus as any } : d)
            );
            toast.success(`Asset ${newStatus === 'disabled' ? 'Disabled' : 'Enabled'}`);
        } else {
            toast.error("Failed to update status");
        }
    } catch (e) {
        toast.error("Network error");
    }
  };

  const deleteAsset = async (id: string) => {
    if(!confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;

    try {
        const res = await fetch(`${API_URL}/company/assets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (res.ok) {
            setVerifiedDomains(prev => prev.filter(d => d.id !== id));
            toast.success("Asset deleted successfully");
        } else {
            toast.error("Failed to delete asset");
        }
    } catch (e) {
        toast.error("Network error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleTokenVisibility = (id: string) => {
      setVisibleTokens(prev => ({
          ...prev,
          [id]: !prev[id]
      }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Section A: Add Domain Workflow */}
      <GlassCard className="p-6 border-border bg-card/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-mono text-foreground tracking-tight">DOMAIN_OWNERSHIP_VERIFICATION</h3>
            <p className="text-xs text-muted-foreground font-mono">Verify root domain to enable asset discovery</p>
          </div>
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* Input Area */}
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase text-muted-foreground">Root Domain</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="example.com" 
                  className="pl-10 bg-background/50 border-input font-mono text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
                  value={rootDomain}
                  onChange={(e) => setRootDomain(e.target.value)}
                  disabled={verificationStatus === 'pending' || verificationStatus === 'verifying'}
                  onKeyDown={(e) => {
                    if(e.key === 'Enter') handleGenerateToken();
                  }}
                />
              </div>
              {verificationStatus === 'idle' || verificationStatus === 'error' ? (
                <Button 
                   onClick={handleGenerateToken}
                   className="font-mono font-bold tracking-tight"
                >
                  GENERATE_TOKEN
                </Button>
              ) : (
                <Button 
                   onClick={() => {
                       setVerificationStatus('idle');
                       setVerificationToken('');
                       setErrorMsg('');
                   }}
                   variant="outline"
                   className="font-mono"
                >
                   CANCEL
                </Button>
              )}
            </div>
            {verificationStatus === 'error' && (
                <div className="flex items-center gap-2 text-destructive text-xs font-mono mt-2 animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    {errorMsg}
                </div>
            )}
          </div>

          {/* Verification Instructions (Pending State) */}
          {(verificationStatus === 'pending' || verificationStatus === 'verifying') && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                <Alert className="bg-primary/5 border-primary/20">
                    <Terminal className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-mono text-sm font-bold">SECURITY.TXT CONFIGURATION</AlertTitle>
                    <AlertDescription className="text-muted-foreground text-xs font-mono mt-1">
                        Create a file at <code className="bg-muted px-1 py-0.5 rounded text-primary">/.well-known/security.txt</code> on your root domain containing the unique token below.
                    </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 bg-muted/50 border border-border rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase font-mono mb-1">File Path</p>
                        <p className="font-mono text-xs text-foreground break-all">
                            https://{rootDomain}/.well-known/security.txt
                        </p>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase font-mono">Value</Label>
                        <div className="flex gap-2">
                            <Input 
                                readOnly 
                                value={verificationToken} 
                                className="font-mono text-sm bg-muted/50 border-border text-primary font-bold"
                            />
                            <Button
                                size="icon"
                                variant="outline"
                                className="shrink-0 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={() => copyToClipboard(verificationToken)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={handleVerifyDns} 
                    disabled={verificationStatus === 'verifying'}
                    className="w-full font-mono font-bold tracking-tight shadow-lg"
                >
                    {verificationStatus === 'verifying' ? (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            VERIFYING_SECURITY_TXT...
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            VERIFY_TEXT_FILE
                        </>
                    )}
                </Button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Section B: Verified Domains List */}
      <GlassCard className="p-0 overflow-hidden border-border bg-card/50">
         <div className="p-6 border-b border-border/50">
             <h3 className="text-sm font-bold font-mono text-muted-foreground uppercase tracking-widest">VERIFIED_ASSETS</h3>
         </div>
         
         {verifiedDomains.length > 0 ? (
             <div className="overflow-visible">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-muted/50 font-mono text-xs uppercase text-muted-foreground">
                         <tr>
                             <th className="px-6 py-3 font-medium">Domain</th>
                             <th className="px-6 py-3 font-medium">Method</th>
                             <th className="px-6 py-3 font-medium">Token</th>
                             <th className="px-6 py-3 font-medium">Date Verified</th>
                             <th className="px-6 py-3 font-medium">Status</th>
                             <th className="px-6 py-3 font-medium text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-border/50">
                         {verifiedDomains.map((domain) => (
                             <tr key={domain.id} className={cn("transition-colors", domain.status === 'disabled' ? "bg-muted/30 opacity-60" : "hover:bg-muted/50")}>
                                 <td className="px-6 py-4 font-mono font-medium text-foreground">
                                     {domain.domain}
                                     {domain.status === 'disabled' && <span className="ml-2 text-xs text-muted-foreground">(Disabled)</span>}
                                 </td>
                                 <td className="px-6 py-4 font-mono text-muted-foreground">{domain.method}</td>
                                 <td className="px-6 py-4 font-mono text-muted-foreground text-xs">
                                     <div className="flex items-center gap-2">
                                         <span className={cn("font-mono text-xs", visibleTokens[domain.id] ? "w-auto select-all" : "w-24 truncate")}>
                                             {visibleTokens[domain.id] ? domain.verificationToken : '••••••••••••••••'}
                                         </span>
                                         <div className="flex items-center">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6" 
                                                onClick={() => toggleTokenVisibility(domain.id)}
                                            >
                                                {visibleTokens[domain.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6" 
                                                onClick={() => copyToClipboard(domain.verificationToken || '')}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                         </div>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4 font-mono text-muted-foreground">{domain.dateVerified}</td>
                                 <td className="px-6 py-4">
                                     <Badge 
                                         variant={domain.status === 'verified' ? "secondary" : "destructive"} 
                                         className="font-mono text-xs uppercase"
                                     >
                                         {domain.status}
                                     </Badge>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <DropdownMenu>
                                         <DropdownMenuTrigger asChild>
                                             <Button variant="ghost" className="h-8 w-8 p-0">
                                                 <span className="sr-only">Open menu</span>
                                                 <MoreHorizontal className="h-4 w-4" />
                                             </Button>
                                         </DropdownMenuTrigger>
                                         <DropdownMenuContent align="end">
                                             <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                             <DropdownMenuItem onClick={() => navigator.clipboard.writeText(domain.domain)}>
                                                 <Copy className="mr-2 h-4 w-4" />
                                                 Copy Domain
                                             </DropdownMenuItem>
                                             <DropdownMenuSeparator />
                                             <DropdownMenuItem onClick={() => toggleAssetStatus(domain.id, domain.status)}>
                                                 {domain.status === 'verified' ? (
                                                     <>
                                                         <Ban className="mr-2 h-4 w-4 text-yellow-500" />
                                                         Disable Asset
                                                     </>
                                                 ) : (
                                                     <>
                                                         <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                         Enable Asset
                                                     </>
                                                 )}
                                             </DropdownMenuItem>
                                             <DropdownMenuSeparator />
                                             <DropdownMenuItem onClick={() => deleteAsset(domain.id)}>
                                                 <Trash className="mr-2 h-4 w-4 text-red-500" />
                                                 <span className="text-red-500">Delete Asset</span>
                                             </DropdownMenuItem>
                                         </DropdownMenuContent>
                                     </DropdownMenu>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         ) : (
             <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                 <div className="p-3 bg-muted rounded-full">
                    <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                 </div>
                 <div className="max-w-xs">
                     <p className="text-foreground font-medium font-mono">No verified domains</p>
                     <p className="text-muted-foreground text-xs mt-1">Verify a root domain to enable Asset Discovery for your organization.</p>
                 </div>
             </div>
         )}
      </GlassCard>
    </div>
  );
}
