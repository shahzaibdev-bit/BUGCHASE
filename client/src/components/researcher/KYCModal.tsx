import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { IdCard, Camera, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KYCModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onVerified: () => void;
}

export const KYCModal = ({ isOpen, setIsOpen, onVerified }: KYCModalProps) => {
  const [step, setStep] = useState(1);

  const handleSubmit = () => {
    // Simulate API call
    setTimeout(() => {
      onVerified();
      setIsOpen(false);
      setStep(1); // Reset for next time
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-mono text-zinc-900 dark:text-white flex items-center gap-2">
            Identity Verification
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-500 ml-2 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-full">Step {step}/3</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Step 1: Upload Documents */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
               {/* Upload CNIC Front */}
              <div 
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:border-black dark:hover:border-white/50 transition-all cursor-pointer group"
                onClick={() => setStep(2)} // Auto advance for demo
              >
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                    <IdCard className="w-6 h-6 text-zinc-500 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Upload CNIC Front</span>
                <span className="text-xs text-zinc-500 mt-1">Max 2MB (JPG/PNG)</span>
              </div>

              {/* Upload CNIC Back */}
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:border-black dark:hover:border-white/50 transition-all cursor-pointer group">
                <IdCard className="w-8 h-8 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 mb-2 transition-colors" />
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400">Upload CNIC Back</span>
              </div>
              
              <p className="text-xs text-center text-zinc-500 mt-2">Click 'Front' to simulate upload & advance</p>
            </div>
          )}

           {/* Step 2: Upload Back (Simulated separation) */}
           {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
               {/* Upload CNIC Front (Done) */}
              <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-black dark:text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200">CNIC Front</span>
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">Uploaded successfully</span>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="text-zinc-500" onClick={() => setStep(1)}>Edit</Button>
              </div>

              {/* Upload CNIC Back */}
              <div 
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:border-black dark:hover:border-white/50 transition-all cursor-pointer group"
                 onClick={() => setStep(3)} // Auto advance for demo
              >
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                    <IdCard className="w-6 h-6 text-zinc-500 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Upload CNIC Back</span>
                <span className="text-xs text-zinc-500 mt-1">Max 2MB (JPG/PNG)</span>
              </div>
              <p className="text-xs text-center text-zinc-500 mt-2">Click box to advance</p>
            </div>
          )}


          {/* Step 3: Live Scan */}
          {step === 3 && (
             <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-black dark:text-white ml-2" />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">Documents uploaded successfully</span>
                 </div>

                <div className="bg-zinc-100 dark:bg-black rounded-xl h-64 relative border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-full w-full bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.1)_50%,transparent_100%)] dark:bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] animate-scan" style={{ animationDuration: '3s' }} />
                    
                    <div className="absolute inset-12 border-2 border-black/30 dark:border-white/30 rounded-lg pointer-events-none">
                    {/* Corner Brackets for 'Tech' look */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-black dark:border-white"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-black dark:border-white"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-black dark:border-white"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-black dark:border-white"></div>
                    </div>

                    <div className="text-center z-10 space-y-4">
                         <div className="w-16 h-16 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-700 mx-auto flex items-center justify-center animate-pulse">
                            <Camera className="w-8 h-8 text-zinc-500 dark:text-zinc-400" />
                         </div>
                        <p className="text-zinc-600 dark:text-zinc-500 text-xs">Position your face within the frame</p>
                    </div>

                    <div className="absolute bottom-4">
                         <button className="bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white px-4 py-2 rounded-full text-sm font-mono flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 transition-colors">
                            <Camera className="w-4 h-4 text-black dark:text-white" /> Start Live Scan
                        </button>
                    </div>
                </div>
             </div>
          )}

        </div>

        <div className="flex justify-between items-center pt-2">
            <Button 
                variant="ghost" 
                onClick={() => setIsOpen(false)} 
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
                Cancel
            </Button>

            {step === 3 && (
                <button 
                onClick={handleSubmit} 
                className="bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black px-6 py-2 rounded-lg font-bold tracking-wide text-sm shadow-lg shadow-zinc-500/20 dark:shadow-white/10 transition-all hover:scale-105 active:scale-95"
                >
                SUBMIT FOR REVIEW
                </button>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
