import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { LogOut, User, LifeBuoy } from 'lucide-react';
import { CyberLogo } from '@/components/CyberLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import AnimatedBackground from '@/components/effects/AnimatedBackground';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'DASHBOARD', path: '/' },
  { label: 'DISPUTES', path: '/disputes' },
];

export function SupportLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-white transition-colors duration-300 relative overflow-y-auto overflow-x-hidden flex flex-col">
      <AnimatedBackground opacity={0.04} />

      <header
        className={cn(
          'fixed top-4 md:top-6 left-0 right-0 mx-auto z-50 rounded-xl border transition-all duration-500 ease-in-out backdrop-blur-md shadow-xl shadow-black/5 dark:shadow-black/40 animate-slide-down-fade',
          isScrolled
            ? 'w-[95%] md:w-[85%] max-w-5xl bg-white/70 dark:bg-black/70 border-zinc-200/50 dark:border-white/5 py-2 md:py-3'
            : 'w-[95%] max-w-7xl bg-white/70 dark:bg-black/70 border-zinc-200 dark:border-white/10 py-3'
        )}
      >
        <div className="flex items-center justify-between px-4 md:px-6 h-full">
          <div className="flex items-center gap-3">
            <Link to="/" className="scale-75 origin-left">
              <CyberLogo size="md" />
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/10 rounded-full px-2 py-0.5">
              <LifeBuoy className="w-3 h-3" /> Support
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            {NAV_ITEMS.map((item) => (
              <Link key={item.path} to={item.path} className="relative group flex items-center py-1">
                <span
                  className={cn(
                    'text-xs font-bold font-mono uppercase tracking-widest transition-colors duration-200 whitespace-nowrap',
                    isActive(item.path)
                      ? 'text-zinc-900 dark:text-white'
                      : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    'absolute -bottom-1 left-0 w-full h-[2px] bg-zinc-900 dark:bg-white transition-transform duration-300 ease-out origin-center',
                    isActive(item.path) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  )}
                />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            <div className="h-8 w-[1px] bg-zinc-200 dark:bg-white/10 hidden sm:block" />

            <div
              className="relative z-50"
              onMouseEnter={() => setIsProfileOpen(true)}
              onMouseLeave={() => setIsProfileOpen(false)}
            >
              <button className="relative rounded-full ring-2 ring-transparent hover:ring-emerald-500 transition-all overflow-hidden flex items-center justify-center w-9 h-9 bg-zinc-900 dark:bg-zinc-800 text-white">
                {user?.avatar && user.avatar !== 'default.jpg' ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-full w-48 pt-3">
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {user?.name || 'Support Agent'}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono uppercase">
                        {user?.role || 'support'}
                      </p>
                    </div>
                    <div className="p-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile Settings
                      </Link>
                      <button
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 w-[95%] max-w-7xl mx-auto pt-28 md:pt-32 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
