import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Building2, Shield, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); // Keeping hook for future use if needed, but bypassing for now
  
  const [selectedRole, setSelectedRole] = useState<'researcher' | 'company' | 'triager' | 'admin'>('researcher');
  
  // State kept for visual purpose but not required for instant login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Role Routing Map
  const roleRoutes = {
    'researcher': '/researcher',
    'company': '/company',
    'triager': '/triager',
    'admin': '/admin'
  };

  // Mock Emails for Auto-Fill
  const roleEmails = {
    'researcher': 'researcher@bugchase.io',
    'company': 'org@bugchase.io',
    'triager': 'triager@bugchase.io',
    'admin': 'admin@bugchase.io'
  };

  // Auto-fill email when role changes
  const handleRoleSelect = (role: 'researcher' | 'company' | 'triager' | 'admin') => {
      setSelectedRole(role);
      setEmail(roleEmails[role]);
  };
  
  // Set initial email
  React.useEffect(() => {
      setEmail(roleEmails[selectedRole]);
  }, []);

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
            
            // Redirect based on actual user role from server response
            const actualRole = result.user?.role || selectedRole;
            navigate(roleRoutes[actualRole as keyof typeof roleRoutes] || `/${actualRole}`); 
        } else {
            toast({ title: 'Login Failed', description: result.error || 'Invalid credentials', variant: 'destructive' });
        }
        
    } catch (error) {
        toast({ title: 'Login Failed', description: 'System Error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const designationOptions = [
      { id: 'researcher', label: 'Researcher', icon: User },
      { id: 'company', label: 'Organization', icon: Building2 },
      { id: 'triager', label: 'Triager', icon: Shield },
      { id: 'admin', label: 'Admin', icon: Lock },
  ];

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

        {/* Designation Grid */}
        <div className="mb-5">
            <div className="grid grid-cols-2 gap-3">
                {designationOptions.map((role) => (
                    <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleSelect(role.id as any)}
                        className={`
                            flex items-center justify-center gap-2 h-10 border rounded transition-all duration-200 group
                            ${selectedRole === role.id 
                                ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg dark:bg-white dark:border-white dark:text-black dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                                : 'bg-transparent border-gray-300 dark:border-white/20 text-gray-600 dark:text-white hover:border-zinc-900 dark:hover:border-white hover:bg-gray-100 dark:hover:bg-white/10'
                            }
                        `}
                    >
                        <role.icon className={`w-3.5 h-3.5 ${selectedRole === role.id ? 'text-white dark:text-black' : 'text-gray-600 dark:text-white'}`} />
                        <span className="text-xs font-bold font-mono uppercase tracking-wide">{role.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Login Form */}
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

            {/* LOGIN BUTTON: Full Width */}
            <Button 
                type="submit" 
                className="w-full flex justify-center items-center bg-zinc-900 text-white font-bold tracking-widest uppercase text-sm py-4 rounded-lg mt-6 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-all duration-200 h-auto"
                disabled={isLoading}
            >
                {isLoading ? 'ACCESSING...' : 'LOGIN'}
            </Button>
        </form>

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
