import React, { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { CyberLogo } from '@/components/CyberLogo';
import { 
  Search, 
  Sun, 
  Moon, 
  Bell, 
  LogOut,
  User,
  Menu,
  X,
  Ban,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AnimatedBackground from '@/components/effects/AnimatedBackground';
import { useAuth } from '@/contexts/AuthContext';
import NavDropdown from '@/components/dashboard/NavDropdown';

interface NavItem {
    label: string;
    path?: string;
    icon?: React.ElementType;
    items?: { label: string; path: string; }[];
}

interface DashboardLayoutProps {
    navItems: NavItem[];
    userRole: string;
}

export const DashboardLayout = ({ navItems, userRole }: DashboardLayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { user, logout, isLoading } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Scroll Listener
    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    if (isLoading) {
        return <div className="min-h-screen bg-zinc-50 dark:bg-black" />; // Prevent flicker
    }

    // Banned Screen Interception
    if (user?.status === 'Banned') {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-white flex flex-col items-center justify-center p-4">
                <AnimatedBackground opacity={0.05} />
                <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl text-center relative z-10">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Ban className="w-8 h-8 text-red-600 dark:text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-8">
                        Your account has been permanently banned due to a violation of our terms of service.
                    </p>
                    <div className="space-y-3">
                        <a 
                            href="mailto:support@bugchase.com" 
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
                        >
                            Contact Support
                        </a>
                        <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={handleLogout}>
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-white transition-colors duration-300 relative overflow-y-auto overflow-x-hidden flex flex-col">
            
            {/* 1. Global Animated Background (Low Opacity) */}
            <AnimatedBackground opacity={0.03} />

            {/* 2. Top Navigation Bar (Floating & Shrinking) */}
            <header 
                className={cn(
                    "fixed top-4 md:top-6 left-0 right-0 mx-auto z-50 rounded-xl border transition-all duration-500 ease-in-out backdrop-blur-md shadow-xl shadow-black/5 dark:shadow-black/40 animate-slide-down-fade",
                    isScrolled 
                        ? "w-[95%] md:w-[85%] max-w-5xl bg-white/70 dark:bg-black/70 border-zinc-200/50 dark:border-white/5 py-2 md:py-3" 
                        : "w-[95%] max-w-7xl bg-white/70 dark:bg-black/70 border-zinc-200 dark:border-white/10 py-3"
                )}
            >
                <div className="flex items-center justify-between px-4 md:px-6 h-full">
                    
                    {/* 1. Logo: CyberLogo Scaled */}
                    <div className="flex items-center gap-3">
                         <Link to="/" className="scale-75 origin-left">
                            <CyberLogo size="md" />
                        </Link>
                    </div>

                    {/* 2. Links: JetBrains Mono (font-mono) */}
                    <nav className="hidden lg:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
                        {navItems.map((item) => {
                            // Dropdown Rendering
                            if (item.items) {
                                return (
                                    <NavDropdown 
                                        key={item.label}
                                        label={item.label}
                                        icon={item.icon}
                                        items={item.items}
                                    />
                                );
                            }

                            // Standard Link Rendering
                            const isActive = location.pathname === item.path || 
                                           (item.path !== `/${userRole}` && location.pathname.startsWith(item.path || ''));
                            
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path || '#'}
                                    className="relative group flex items-center py-1"
                                >
                                    {/* Link Text */}
                                    <span className={cn(
                                        "text-xs font-bold font-mono uppercase tracking-widest transition-colors duration-200 whitespace-nowrap",
                                        isActive 
                                            ? "text-zinc-900 dark:text-white" 
                                            : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white"
                                    )}>
                                        {item.label}
                                    </span>
                                    
                                    {/* Animated Underline */}
                                    <span 
                                        className={cn(
                                            "absolute -bottom-1 left-0 w-full h-[2px] bg-zinc-900 dark:bg-white transition-transform duration-300 ease-out origin-center",
                                            isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                        )} 
                                    />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* 3. Right Side: Theme + Profile */}
                    <div className="flex items-center gap-4">
                        
                        {/* Theme Toggle */}
                        <Button variant="ghost" size="icon" onClick={(e) => {
                            if (!document.startViewTransition) {
                                toggleTheme();
                                return;
                            }
                            const x = e.clientX;
                            const y = e.clientY;
                            const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
                            const transition = document.startViewTransition(() => toggleTheme());
                            transition.ready.then(() => {
                                document.documentElement.animate(
                                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
                                { duration: 500, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
                                );
                            });
                        }} className="rounded-full text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0">
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </Button>

                        <div className="h-8 w-[1px] bg-zinc-200 dark:bg-white/10 hidden sm:block" />

                        {/* User Profile Dropdown (Custom) - Desktop Only */}
                        <div 
                            className="relative z-50 hidden lg:block"
                            onMouseEnter={() => setIsProfileOpen(true)}
                            onMouseLeave={() => setIsProfileOpen(false)}
                        >
                            <button 
                                className={cn(
                                    "relative rounded-full ring-2 ring-transparent hover:ring-emerald-500 transition-all overflow-hidden flex items-center justify-center",
                                    userRole === 'admin' ? "w-9 h-9 bg-zinc-900 dark:bg-zinc-800 text-white" : "w-9 h-9 bg-gradient-to-tr from-zinc-200 to-zinc-400"
                                )}
                            >
                                <span className="sr-only">Open user menu</span>
                                    {userRole === 'admin' ? (
                                        <User className="w-5 h-5" />
                                    ) : user?.avatar && user.avatar !== 'default.jpg' ? (
                                        <img 
                                            src={user.avatar}
                                            alt="Avatar" 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                                            <User className="w-5 h-5" />
                                        </div>
                                    )}
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileOpen && (
                                <div className="absolute right-0 top-full w-48 pt-3">
                                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        
                                        {/* Header */}
                                        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white">{user?.name || 'NeoAnderson'}</p>
                                            <p className="text-xs text-zinc-500 font-mono">{userRole?.toUpperCase() || 'RANK 4'}</p>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="p-1">
                                            {userRole !== 'company' && userRole !== 'admin' && (
                                                <Link 
                                                    to={`/${userRole}/profile`}
                                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                                >
                                                    <User className="w-4 h-4" />
                                                    Profile Settings
                                                </Link>
                                            )}

                                            <button 
                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                                onClick={() => {
                                                    handleLogout();
                                                }}
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden ml-2"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden w-full border-t border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl animate-fade-in-up rounded-b-2xl max-h-[85vh] overflow-y-auto">
                        <nav className="flex flex-col p-4 space-y-4">
                             {/* 1. Mobile Profile Header */}
                             <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-100 dark:border-white/5">
                                <div className={cn(
                                    "w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center",
                                    userRole === 'admin' ? "bg-zinc-900 dark:bg-zinc-800 text-white" : "bg-gradient-to-tr from-zinc-200 to-zinc-400"
                                )}>
                                    {userRole === 'admin' ? (
                                        <User className="w-5 h-5" />
                                    ) : (
                                        <img 
                                            src={user?.avatar && user.avatar !== 'default.jpg' ? user.avatar : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80"} 
                                            alt="Avatar" 
                                            className="w-full h-full object-cover" 
                                        />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{user?.name || 'NeoAnderson'}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono uppercase tracking-wide">{userRole || 'RESEARCHER'}</p>
                                </div>
                             </div>

                             {/* 2. Navigation Links */}
                             <div className="space-y-1">
                                {navItems.map((item) => {
                                    if (item.items) {
                                        return (
                                            <div key={item.label} className="space-y-1">
                                                <div className="px-4 py-2 text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mt-2">
                                                    {item.icon && <item.icon className="w-3 h-3 inline mr-2" />}
                                                    {item.label}
                                                </div>
                                                {item.items.map(subItem => {
                                                    const isActive = location.pathname === subItem.path;
                                                    return (
                                                        <Link
                                                            key={subItem.path}
                                                            to={subItem.path}
                                                            onClick={() => setMobileMenuOpen(false)}
                                                            className={cn(
                                                                "block ml-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors border border-transparent",
                                                                isActive
                                                                    ? "bg-zinc-100 dark:bg-white/10 text-black dark:text-white border-zinc-200 dark:border-white/10"
                                                                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5"
                                                            )}
                                                        >
                                                            {subItem.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )
                                    }

                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path || '#'}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors border border-transparent",
                                                isActive
                                                    ? "bg-zinc-100 dark:bg-white/10 text-black dark:text-white border-zinc-200 dark:border-white/10"
                                                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5"
                                            )}
                                        >
                                            {item.icon && <item.icon className="w-4 h-4" />}
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* 3. Footer Actions (Settings/Logout) */}
                            <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-white/10 space-y-2">
                                {userRole !== 'company' && userRole !== 'admin' && (
                                    <Link 
                                        to={`/${userRole}/profile`}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-lg transition-colors font-medium border border-transparent hover:border-zinc-200 dark:hover:border-white/10"
                                    >
                                        <User className="w-4 h-4" />
                                        Profile Settings
                                    </Link>
                                )}
                                <button 
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors font-medium border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                                    onClick={() => {
                                        handleLogout();
                                    }}
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        </nav>
                    </div>
                )}
            </header>

            {/* 3. Main Content Area */}
            <main className="flex-1 container mx-auto px-4 pt-32 pb-8 relative z-10 w-full max-w-7xl animate-fade-in-up">
                <Outlet />
            </main>

        </div>
    );
};
