import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Building2, Shield, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, completeTwoFactorLogin, isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [totp, setTotp] = useState('');

  // Role Routing Map
  const roleRoutes = {
    'researcher': '/researcher',
    'company': '/company',
    'triager': '/triager',
    'admin': '/admin'
  };

  React.useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
        toast({ title: 'Already Logged In', description: 'Redirecting to dashboard...' });
        const target = roleRoutes[user.role as keyof typeof roleRoutes] || '/researcher';
        navigate(target, { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken || totp.replace(/\D/g, '').length !== 6) {
      toast({ title: 'Error', description: 'Enter the 6-digit code from your authenticator app.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await completeTwoFactorLogin(twoFactorToken, totp.replace(/\D/g, ''));
      if (result.success) {
        toast({ title: 'ACCESS GRANTED', description: 'Welcome back!' });
        const actualRole = result.user?.role;
        if (actualRole && roleRoutes[actualRole as keyof typeof roleRoutes]) {
          navigate(roleRoutes[actualRole as keyof typeof roleRoutes]);
        } else {
          navigate('/researcher');
        }
        setNeeds2fa(false);
        setTwoFactorToken('');
        setTotp('');
      } else {
        toast({ title: 'Login Failed', description: result.error || 'Invalid code', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Login Failed', description: 'System error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        if (!email || !password) {
            toast({ title: 'Error', description: 'Please enter both email and password.', variant: 'destructive' });
            setIsLoading(false);
            return;
        }

        const result = await login(email, password);

        if (result.success) {
            toast({ title: 'ACCESS GRANTED', description: `Welcome back!` });
            const actualRole = result.user?.role;
            if (actualRole && roleRoutes[actualRole as keyof typeof roleRoutes]) {
                navigate(roleRoutes[actualRole as keyof typeof roleRoutes]);
            } else {
                navigate('/researcher');
            }
        } else if ('requiresTwoFactor' in result && result.requiresTwoFactor && result.twoFactorToken) {
            setNeeds2fa(true);
            setTwoFactorToken(result.twoFactorToken);
            setTotp('');
            toast({ title: 'Two-factor required', description: 'Enter the 6-digit code from your authenticator app.' });
        } else {
            toast({ title: 'Login Failed', description: result.error || 'Invalid credentials', variant: 'destructive' });
        }
        
    } catch (error) {
        toast({ title: 'Login Failed', description: 'System Error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
        {/* Header */}
        <div className="mb-5 flex items-end justify-between border-b border-gray-200 dark:border-white/10 pb-4">
            <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">Login to Dashboard</h2>
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase font-medium tracking-wider">SECURE GATEWAY v4.0.2</p>
            </div>
            <div className="w-2 h-2 bg-zinc-900 dark:bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.5)] dark:shadow-[0_0_10px_white]" />
        </div>

        {/* Login Form */}
        {!needs2fa ? (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-sm font-bold font-mono text-zinc-900 dark:text-white ml-0.5 tracking-wide">EMAIL ADDRESS</label>
                <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-50 dark:bg-transparent border border-gray-300 dark:border-white/20 rounded px-3 py-2 text-zinc-900 dark:text-white text-base focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all font-mono font-medium h-10"
                    placeholder="user@bugchase.io"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-bold font-mono text-zinc-900 dark:text-white ml-0.5 tracking-wide">PASSWORD</label>
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
        ) : (
        <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-mono">
              Enter the 6-digit code from your authenticator app for <span className="text-zinc-900 dark:text-white">{email}</span>.
            </p>
            <div className="space-y-1.5">
                <label className="text-sm font-bold font-mono text-zinc-900 dark:text-white ml-0.5 tracking-wide">AUTHENTICATOR CODE</label>
                <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="bg-gray-50 dark:bg-transparent border border-gray-300 dark:border-white/20 rounded px-3 py-2 text-zinc-900 dark:text-white text-base font-mono font-medium h-10 tracking-widest"
                    placeholder="000000"
                />
            </div>
            <Button
              type="submit"
              className="w-full flex justify-center items-center bg-zinc-900 text-white font-bold tracking-widest uppercase text-sm py-4 rounded-lg mt-6 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-all duration-200 h-auto"
              disabled={isLoading || totp.replace(/\D/g, '').length !== 6}
            >
              {isLoading ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm text-zinc-500"
              onClick={() => {
                setNeeds2fa(false);
                setTwoFactorToken('');
                setTotp('');
              }}
            >
              Back to password
            </Button>
        </form>
        )}

        {/* Footer */}
        <div className="mt-5 text-center border-t border-gray-200 dark:border-white/10 pt-4">
            <Link 
                to="/signup"
                className="text-sm font-mono text-gray-500 hover:text-zinc-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium"
            >
                New user? Create Account
                <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </div>
    </div>
  );
}
