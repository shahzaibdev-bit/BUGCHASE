import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Fingerprint, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CyberLogo } from '@/components/CyberLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import AnimatedBackground from '@/components/effects/AnimatedBackground';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/', { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Error', description: 'Please enter your email and password.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (result.success) {
      toast({ title: 'ACCESS GRANTED', description: 'Welcome back!' });
      navigate('/', { replace: true });
    } else {
      toast({ title: 'Login Failed', description: result.error || 'Login failed.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white relative overflow-hidden">
      <AnimatedBackground opacity={0.5} />

      {/* Top bar: logo + theme toggle */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
        <div className="scale-90 origin-left">
          <CyberLogo size="md" />
        </div>
        <ThemeToggle />
      </div>

      <div className="min-h-screen w-full flex justify-center pt-32 pb-12 relative z-10">
        <div className="w-full max-w-5xl mx-auto px-6 grid lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: visuals (mirrors main app AuthLayout) */}
          <div className="flex flex-col justify-center text-center lg:text-left space-y-5 h-full pt-4 animate-fade-in-up">
            <div className="select-none space-y-2">
              <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-zinc-900 dark:text-white leading-none">
                SECURE <br />
                ACCESS
              </h1>
            </div>

            <div className="h-1 w-20 bg-zinc-900/30 dark:bg-white/30 rounded-full mx-auto lg:mx-0" />

            <p className="font-mono text-base text-gray-600 dark:text-gray-300 max-w-sm mx-auto lg:mx-0 leading-relaxed font-medium">
              Support operations console. Authorized personnel only — identify yourself to manage platform disputes.
            </p>

            <div className="flex flex-wrap lg:flex-nowrap gap-4 justify-center lg:justify-start pt-4">
              <div className="bg-white/90 dark:bg-zinc-900/90 border border-black/15 dark:border-white/20 p-4 rounded-lg min-w-[160px] backdrop-blur-md hover:border-black/50 dark:hover:border-white/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-default group shadow-sm dark:shadow-none">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                  Biometric Sync
                </div>
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-lg">
                  <Fingerprint className="w-5 h-5 text-zinc-900 dark:text-white" />
                  <span className="drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">ACTIVE</span>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-zinc-900/90 border border-black/15 dark:border-white/20 p-4 rounded-lg min-w-[160px] backdrop-blur-md hover:border-black/50 dark:hover:border-white/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-default group shadow-sm dark:shadow-none">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                  Encryption
                </div>
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-lg">
                  <Lock className="w-5 h-5 text-zinc-900 dark:text-white" />
                  <span className="drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">TLS 1.3</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: login card (mirrors main app spotlight card) */}
          <div className="order-2 lg:order-none w-full max-w-md mx-auto lg:mr-0">
            <div className="bg-white/80 dark:bg-black border border-black/15 dark:border-white/20 hover:border-black/50 dark:hover:border-zinc-600 shadow-xl dark:shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all duration-500 backdrop-blur-xl p-8 rounded-xl relative overflow-hidden animate-fade-in-up">
              <div className="w-full">
                <div className="mb-5 flex items-end justify-between border-b border-gray-200 dark:border-white/10 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                      Support Login
                    </h2>
                    <p className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase font-medium tracking-wider">
                      SECURE GATEWAY v4.0.2
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-zinc-900 dark:bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.5)] dark:shadow-[0_0_10px_white]" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold font-mono text-zinc-900 dark:text-white ml-0.5 tracking-wide">
                      EMAIL ADDRESS
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-50 dark:bg-transparent border border-gray-300 dark:border-white/20 rounded px-3 py-2 text-zinc-900 dark:text-white text-base focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all font-mono font-medium h-10"
                      placeholder="support@bugchase.io"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold font-mono text-zinc-900 dark:text-white ml-0.5 tracking-wide">
                      PASSWORD
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-gray-50 dark:bg-transparent border border-gray-300 dark:border-white/20 rounded px-3 py-2 text-zinc-900 dark:text-white text-base focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all font-mono font-medium h-10"
                      placeholder="••••••••"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full flex justify-center items-center bg-zinc-900 text-white font-bold tracking-widest uppercase text-sm py-4 rounded-lg mt-6 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-all duration-200 h-auto"
                    disabled={isLoading}
                  >
                    {isLoading ? 'ACCESSING...' : 'LOGIN'}
                  </Button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
                    or
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                </div>

                <GoogleLoginButton onSuccess={() => navigate('/', { replace: true })} />

                <div className="mt-5 text-center border-t border-gray-200 dark:border-white/10 pt-4">
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    Support accounts are provisioned by BugChase administrators.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
