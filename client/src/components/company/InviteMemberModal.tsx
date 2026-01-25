import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Copy } from 'lucide-react';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInviteSuccess: () => void;
    companyName: string; // Used for email/username inference if needed
}

export function InviteMemberModal({ isOpen, onClose, onInviteSuccess, companyName }: InviteMemberModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'viewer',
        permissions: [] as string[]
    });
    const [generatedUsername, setGeneratedUsername] = useState('');
    const [generatedPassword, setGeneratedPassword] = useState('');

    const generateCredentials = (name: string, company: string) => {
        // Format: companyemail@member_name (User requested specific format: companyemail@member_name)
        // Assuming "companyemail" refers to a company identifier prefix.
        // Let's sanitize company name to act as prefix.
        const prefix = company.toLowerCase().replace(/[^a-z0-9]/g, '');
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Update: User said "username like name of the companyemail@member_name"
        // Wait, "companyemail@member_name" is an odd username format if it contains @. Emails have @. 
        // Maybe they meant "company_prefix@member_name" or just a specific pattern.
        // "companyemail@member_name" -> If company email is support@bugchase.com, and member is john
        // username = support@john ?
        // Or "companyname@membername".
        // Let's assume standard "prefix.username" or similar to avoid confusing with real emails.
        // Re-reading user request: "username like name of the companyemail@member_name"
        // "user only have to enter memer_name companyemail@ will be ther in the input already"
        
        // So the input field should show "company_prefix@" as a fixed prefix, and user types "member_name".
        // I will implement this logic.
        
        if (!name) return;
        const password = Math.random().toString(36).slice(-8) + "!Aa1";
        setGeneratedPassword(password);
    };

    const handleInvite = async () => {
        setIsLoading(true);
        try {
            // Construct full username
            // We need the company prefix. We can pass it or derive it.
            // Using company name for now as prefix.
            const prefix = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const fullUsername = `${prefix}@${generatedUsername}`;

            const res = await fetch('/api/company/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    username: fullUsername,
                    // Password is generated on backend as per my controller implementation, 
                    // BUT my controller implementation says: "Generate random password".
                    // The user Requirement says: "generate password button this will autimaticaly generate password in the password feild... then after send invite button click... data is stored".
                    // This implies the Frontend generates it (or sees it) to show it to the user? 
                    // "also there will be a passord input beside this there will be generate password button this will autimaticaly generate password in the password feild"
                    // If I generate on frontend and send it, I need to update controller to accept `password`.
                    // My previous controller generate it itself.
                    // I should Updating controller to accept password if provided, or rely on backend.
                    // If user sees password in frontend, it's better if frontend sends it.
                    // I will update controller logic in next step if needed. 
                    // For now, I'll send it.
                    password: generatedPassword 
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast({ title: 'Invitation Sent', description: `Invite sent to ${formData.email}` });
                onInviteSuccess();
                onClose();
            } else {
                toast({ title: 'Error', description: data.message || 'Failed to send invite', variant: 'destructive' });
            }
        } catch (error) {
           toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const roles = ['admin', 'manager', 'viewer', 'custom'];

    const prefix = companyName ? companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '@' : 'company@';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-card dark:bg-[#090909] border border-border">
                <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>Add a new member to your organization.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label>Display Name</Label>
                             <Input 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="John Doe"
                                className="bg-background dark:bg-[#151515]"
                             />
                        </div>
                        <div className="space-y-2">
                             <Label>Email Address</Label>
                             <Input 
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                placeholder="john@example.com"
                                className="bg-background dark:bg-[#151515]"
                             />
                        </div>
                    </div>

                    <div className="space-y-2">
                         <Label>Username</Label>
                         <div className="flex items-center">
                            <div className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm border-input">
                                {prefix}
                            </div>
                            <Input 
                                value={generatedUsername}
                                onChange={(e) => setGeneratedUsername(e.target.value)}
                                placeholder="username"
                                className="rounded-l-none bg-background dark:bg-[#151515]"
                            />
                         </div>
                         <p className="text-xs text-muted-foreground">User will log in with {prefix}{generatedUsername || 'username'}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                            <SelectTrigger className="bg-background dark:bg-[#151515]">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map(r => (
                                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                
                    {/* // Password Generation */}
                    <div className="space-y-2">
                         <Label>Temporary Password</Label>
                         <div className="flex gap-2">
                             <Input 
                                value={generatedPassword}
                                onChange={(e) => setGeneratedPassword(e.target.value)}
                                className="bg-background dark:bg-[#151515] font-mono"
                                placeholder="Click generate"
                             />
                             <Button type="button" variant="outline" onClick={() => generateCredentials(formData.name, companyName)}>
                                 <RefreshCw className="h-4 w-4 mr-2" />
                                 Generate
                             </Button>
                         </div>
                    </div>

                    {/* Permissions Checkboxes (simplified for now) */}
                    <div className="space-y-2">
                        <Label>Permissions</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {['view_reports', 'manage_reports', 'manage_team', 'view_billing'].map(perm => (
                                <div key={perm} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={perm} 
                                        checked={formData.permissions.includes(perm)}
                                        onCheckedChange={(checked) => {
                                            if (checked) setFormData({...formData, permissions: [...formData.permissions, perm]});
                                            else setFormData({...formData, permissions: formData.permissions.filter(p => p !== perm)});
                                        }}
                                    />
                                    <label htmlFor={perm} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize">
                                        {perm.replace('_', ' ')}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleInvite} disabled={isLoading || !formData.email || !generatedUsername}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Invitation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
