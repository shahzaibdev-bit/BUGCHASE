import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Building2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  // Restricted Roles for Signup: Researcher & Company ONLY
  const [selectedRole, setSelectedRole] = useState<'researcher' | 'company'>('researcher');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Role Routing Map
  const roleRoutes = {
    'researcher': '/researcher',
    'company': '/company'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
      const result = await signup(email, password, name, selectedRole);
      
      if (result.success) {
        toast({ title: 'Verification Code Sent', description: 'Please check your email.' });
        localStorage.setItem('email', email); // Backup
        navigate('/verify-otp', { state: { email } }); 
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const designationOptions = [
      { id: 'researcher', label: 'Researcher', icon: User },
      { id: 'company', label: 'Organization', icon: Building2 },
      // Admin and Triager removed for Signup
  ];

  return (
    <div className="w-full">
         {/* Header */}
        <div className="mb-5 flex items-end justify-between border-b border-gray-200 dark:border-white/10 pb-4">
            <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">Create Account</h2>
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase font-medium tracking-wider">Set up your profile</p>
            </div>
            <div className="w-2 h-2 bg-zinc-900 dark:bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.5)] dark:shadow-[0_0_10px_white]" />
        </div>

        {/* Designation Grid (Restricted) */}
        <div className="mb-5">
            <div className="grid grid-cols-2 gap-3">
                {designationOptions.map((role) => (
                    <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id as any)}
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

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-sm font-bold font-mono text-zinc-900 dark:text-white ml-0.5 tracking-wide">FULL NAME</label>
                <Input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-gray-50 dark:bg-transparent border border-gray-300 dark:border-white/20 rounded px-3 py-2 text-zinc-900 dark:text-white text-base focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all font-mono font-medium h-10"
                    placeholder="John Doe"
                    required
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-bold font-mono text-zinc-900 dark:text-white ml-0.5 tracking-wide">EMAIL ADDRESS</label>
                <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-50 dark:bg-transparent border border-gray-300 dark:border-white/20 rounded px-3 py-2 text-zinc-900 dark:text-white text-base focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all font-mono font-medium h-10"
                    placeholder="name@example.com"
                    required
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-bold font-mono text-zinc-900 dark:text-white ml-0.5 tracking-wide">PASSWORD</label>
                <div className="relative">
                    <Input 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-gray-50 dark:bg-transparent border border-gray-300 dark:border-white/20 rounded px-3 py-2 text-zinc-900 dark:text-white text-base focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all font-mono font-medium h-10 pr-10"
                        placeholder="••••••••"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-bold font-mono text-zinc-900 dark:text-white ml-0.5 tracking-wide">CONFIRM PASSWORD</label>
                <div className="relative">
                    <Input 
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-gray-50 dark:bg-transparent border border-gray-300 dark:border-white/20 rounded px-3 py-2 text-zinc-900 dark:text-white text-base focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all font-mono font-medium h-10 pr-10"
                        placeholder="••••••••"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <Button 
                type="submit" 
                className="w-full flex justify-center items-center bg-zinc-900 text-white font-bold tracking-widest uppercase text-sm py-4 rounded-lg mt-6 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-all duration-200 h-auto"
                disabled={isLoading}
            >
                {isLoading ? 'PROCESSING...' : 'SIGN UP'}
            </Button>
        </form>

        {/* Footer */}
        <div className="mt-5 text-center border-t border-gray-200 dark:border-white/10 pt-4">
            <Link 
                to="/login"
                className="text-sm font-mono text-gray-500 hover:text-zinc-900 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium"
            >
                Already have an account? Login
                <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </div>
    </div>
  );
}
