import React, { useState } from 'react';
import {
  Headphones,
  CheckCircle,
  Scale,
  CreditCard,
  UserCog,
  LifeBuoy,
  Wrench,
  Mail,
  Key,
  RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { API_URL } from '@/config';

interface SupportOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SPECIALIZATION_OPTIONS = [
  { id: 'disputes', label: 'Disputes', icon: Scale },
  { id: 'payments', label: 'Payments & Payouts', icon: CreditCard },
  { id: 'account', label: 'Account & Access', icon: UserCog },
  { id: 'technical', label: 'Technical Support', icon: Wrench },
  { id: 'general', label: 'General Support', icon: LifeBuoy },
];

export const SupportOnboardingModal = ({ isOpen, onClose, onSuccess }: SupportOnboardingModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tempPassword: '',
    expertise: [] as string[],
    trainingCompleted: false,
    identityVerified: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSpecialization = (id: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(id)
        ? prev.expertise.filter(e => e !== id)
        : [...prev.expertise, id]
    }));
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, tempPassword: password }));
  };

  const handleCreateSupport = async () => {
    if (!formData.trainingCompleted || !formData.identityVerified) {
      toast.error("Verification Required", { description: "You must complete the Onboarding Validation checklist." });
      return;
    }

    if (formData.expertise.length === 0) {
      toast.error("Specialization Required", { description: "Assign at least one support area." });
      return;
    }

    if (!formData.name || !formData.email || !formData.tempPassword) {
        toast.error("Missing Information", { description: "Please fill in all identity fields." });
        return;
    }

    setIsSubmitting(true);

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/support`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        const data = await res.json();

        if (res.ok) {
            toast.success("Support Account Created", {
                description: `Credentials sent to ${formData.email}. ID: ${data.data.user._id}`
            });
            onSuccess();
            onClose();
            setFormData({
                name: '',
                email: '',
                tempPassword: '',
                expertise: [],
                trainingCompleted: false,
                identityVerified: false
            });
        } else {
            toast.error("Failed to Create Support Member", { description: data.message || "An error occurred." });
        }
    } catch (error) {
        toast.error("Network Error", { description: "Could not reach server." });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 p-0 gap-0 rounded-2xl">
        <DialogHeader className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-900">
          <div className="flex items-center justify-between">
             <DialogTitle className="text-xl font-mono font-bold text-foreground flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                AUTHORIZE_NEW_SUPPORT
             </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5">
            {/* Step 1: Identity */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center text-[10px]">1</span>
                    Identity Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500 dark:text-zinc-400">Full Name</Label>
                        <div className="relative">
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:border-zinc-500 transition-colors h-9"
                                placeholder="e.g. Jordan Blake"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                         <Label className="text-xs text-zinc-500 dark:text-zinc-400">Email Address</Label>
                         <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                            <Input
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="pl-9 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:border-zinc-500 transition-colors h-9"
                                placeholder="jordan@bugchase.io"
                            />
                         </div>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                         <div className="flex items-center justify-between">
                             <Label className="text-xs text-zinc-500 dark:text-zinc-400">Temporary Password</Label>
                             <button
                                onClick={generatePassword}
                                className="text-[10px] flex items-center gap-1 text-emerald-600 dark:text-emerald-500 hover:underline"
                             >
                                <RefreshCw className="h-3 w-3" /> Generate Random
                             </button>
                         </div>
                         <div className="relative">
                             <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                            <Input
                                type="text"
                                value={formData.tempPassword}
                                onChange={(e) => setFormData({...formData, tempPassword: e.target.value})}
                                className="pl-9 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:border-zinc-500 transition-colors font-mono h-9"
                                placeholder="Click generate or type..."
                            />
                         </div>
                    </div>
                </div>
            </div>

            <Separator className="bg-zinc-200 dark:bg-zinc-800/50" />

            {/* Step 2: Specializations */}
             <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center text-[10px]">2</span>
                    Assign Support Areas
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SPECIALIZATION_OPTIONS.map((option) => {
                        const isSelected = formData.expertise.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                onClick={() => toggleSpecialization(option.id)}
                                className={`p-2.5 rounded-lg border text-left transition-all relative overflow-hidden group
                                    ${isSelected
                                        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-white'
                                        : 'bg-white dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <option.icon className={`h-3.5 w-3.5 ${isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`} />
                                    {isSelected && <CheckCircle className="h-3 w-3 text-zinc-900 dark:text-white ml-auto" />}
                                </div>
                                <span className="text-[10px] font-medium block uppercase tracking-wide">{option.label}</span>
                            </button>
                        );
                    })}
                </div>
             </div>

             <Separator className="bg-zinc-200 dark:bg-zinc-800/50" />

             {/* Step 3: Validation */}
             <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center text-[10px]">3</span>
                    Onboarding Validation
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                            ${formData.trainingCompleted
                                ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black'
                                : 'border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400 dark:group-hover:border-zinc-500'
                            }`}
                        >
                            {formData.trainingCompleted && <CheckCircle className="h-3 w-3" />}
                        </div>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={formData.trainingCompleted}
                            onChange={(e) => setFormData({...formData, trainingCompleted: e.target.checked})}
                        />
                        <span className={`text-xs font-medium ${formData.trainingCompleted ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            Support Onboarding Training Completed
                        </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                            ${formData.identityVerified
                                ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black'
                                : 'border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400 dark:group-hover:border-zinc-500'
                            }`}
                        >
                            {formData.identityVerified && <CheckCircle className="h-3 w-3" />}
                        </div>
                         <input
                            type="checkbox"
                            className="hidden"
                            checked={formData.identityVerified}
                            onChange={(e) => setFormData({...formData, identityVerified: e.target.checked})}
                        />
                        <span className={`text-xs font-medium ${formData.identityVerified ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            Identity Documents Verified
                        </span>
                    </label>
                </div>
             </div>
        </div>

        <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-900 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="h-9 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">CANCEL</Button>
            <Button
                onClick={handleCreateSupport}
                disabled={!formData.trainingCompleted || !formData.identityVerified || isSubmitting}
                className="bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black min-w-[160px] h-9 text-xs"
            >
                {isSubmitting ? 'ISSUING...' : 'ISSUE_CREDENTIALS'}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
