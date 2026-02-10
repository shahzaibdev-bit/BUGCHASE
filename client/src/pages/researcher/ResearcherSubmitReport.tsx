import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubmissionWizard } from '@/components/researcher/submission/SubmissionWizard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Lock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function ResearcherSubmitReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const reputation = (user as any)?.reputationScore || 0;
  const REQUIRED_SCORE = 150;

  if (reputation < REQUIRED_SCORE) {
      // Calculate what's missing
      const items = [
          { label: 'Account Created', points: 10, done: true }, // Always true if logged in
          { label: 'Set a unique nickname', points: 10, done: !!(user as any)?.username },
          { label: 'Update your bio', points: 20, done: !!(user as any)?.bioUpdated }, // Check flag instead of length
          { label: 'Select your country', points: 10, done: !!(user as any)?.country },
          { label: 'Link social accounts', points: 20, done: ['github', 'linkedin', 'twitter'].some(k => (user as any)?.linkedAccounts?.[k]) },
          { label: 'Complete Identity Verification (KYC)', points: 80, done: !!user?.isVerified },
      ];

      return (
          <div className="animate-fade-in-up max-w-2xl mx-auto py-12">
              <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-black dark:bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                      <Lock className="w-10 h-10 text-zinc-900 dark:text-zinc-200" />
                  </div>
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">Submission Locked</h1>
                  <p className="text-zinc-500 max-w-md mx-auto text-lg leading-relaxed">
                      You need a reputation score of <span className="font-bold text-black dark:text-white">{REQUIRED_SCORE}</span> to report vulnerabilities.
                      <br/>
                      Your current score is <span className="font-bold text-red-500">{reputation}</span>.
                  </p>
              </div>

              <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                          Requirements Checklist
                      </h3>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                      {items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                              <div className="flex items-center gap-4">
                                  {item.done ? (
                                      <div className="w-6 h-6 rounded-full bg-black dark:bg-white flex items-center justify-center">
                                          <CheckCircle2 className="w-4 h-4 text-white dark:text-black" />
                                      </div>
                                  ) : (
                                      <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                                          <XCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                                      </div>
                                  )}
                                  <span className={cn("text-sm font-medium", item.done ? 'text-zinc-900 dark:text-zinc-200' : 'text-zinc-500')}>
                                      {item.label}
                                  </span>
                              </div>
                              <span className={cn(
                                  "text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border",
                                  item.done 
                                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" 
                                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800"
                              )}>
                                  +{item.points} PTS
                              </span>
                          </div>
                      ))}
                  </div>
                  <div className="p-6 bg-zinc-50/50 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 text-center">
                      <Button onClick={() => navigate('/researcher/profile')} className="w-full sm:w-auto gap-2 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-semibold h-11 px-8">
                          Go to Profile Settings <ArrowRight className="w-4 h-4" />
                      </Button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
         <h1 className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">SUBMIT VULNERABILITY</h1>
         <p className="text-zinc-500">Follow the wizard to classify and report your finding.</p>
      </div>
      <SubmissionWizard />
    </div>
  );
}
