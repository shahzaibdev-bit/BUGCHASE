import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';

export default function LoginRequired() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background selection:bg-emerald-500/30 transition-colors duration-300">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

        <div className="max-w-md w-full relative z-10">
            <InvertedTiltCard intensity={10}>
                <InverseSpotlightCard className="p-8 text-center bg-card/40 dark:bg-black/40 backdrop-blur-xl border border-border/50 dark:border-zinc-800 rounded-2xl shadow-2xl">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-muted dark:bg-zinc-900 border border-border dark:border-zinc-800 flex items-center justify-center mb-6 shadow-inner">
                        <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                    </div>

                    <h1 className="text-3xl font-bold text-foreground dark:text-white mb-3 font-mono tracking-tight">Access Restricted</h1>
                    
                    <p className="text-muted-foreground dark:text-zinc-400 mb-8 leading-relaxed">
                        You need to be logged in to access this area. <br/>
                        Please sign in to continue your session.
                    </p>

                    <div className="space-y-3">
                        <Button 
                            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => navigate('/login', { state: { from } })}
                        >
                            <LogIn className="w-4 h-4 mr-2" />
                            LOGIN TO CONTINUE
                        </Button>
                        
                        <Button 
                            variant="ghost" 
                            className="w-full h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-zinc-900/50 font-mono text-sm"
                            onClick={() => navigate('/')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Return Home
                        </Button>
                    </div>
                </InverseSpotlightCard>
            </InvertedTiltCard>
        </div>
    </div>
  );
}
