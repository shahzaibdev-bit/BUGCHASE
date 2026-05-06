import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { CyberLogo } from '@/components/CyberLogo';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Menu as MenuIcon, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { MagneticButton } from '@/components/MagneticButton';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// @ts-ignore
import CardNav from '@/components/CardNav';

const navItems = [
  {
    label: 'Solution',
    headerLeft: 'SECURITY SOLUTIONS',
    headerRight: 'V 4.0',
    links: [
      { href: '/solutions/rewards', label: 'Security Rewards', description: 'Crowdsourced Intelligence.' },
      { href: '/solutions/vdp', label: 'VDP Programs', description: 'Vulnerability Disclosure Programs.' },
      { href: '/solutions/ptaas', label: 'PTaaS', description: 'Security Assessment Services.' },
    ]
  },
  {
    label: 'Company',
    headerLeft: 'ORGANIZATION',
    headerRight: 'EST. 2023',
    links: [
      { href: '/company/about', label: 'About Us', description: 'Corporate Overview.' },
      { href: '/company/careers', label: 'Careers', description: 'Join the Team.' },
      { href: '/company/contact', label: 'Secure Communications', description: 'Secure Connection.' },
    ]
  },
  {
    label: 'Legal',
    headerLeft: 'COMPLIANCE FRAMEWORKS',
    headerRight: 'SECURE',
    links: [
      { href: '/legal/sovereignty', label: 'Data Sovereignty', description: 'National Residency Standards.' },
      { href: '/legal/rules', label: 'Rules of Engagement', description: 'Operational Directives.' },
      { href: '/legal/immunity', label: 'Legal Immunity', description: 'Authorized Research Protection.' },
    ]
  }
];

export const MorphingNavbar = ({ simple = false }: { simple?: boolean }) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const { scrollY } = useScroll();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const isPublicProfilePage = location.pathname.startsWith('/h/');
  
  // Use resolvedTheme for display logic to handle 'system' preference correctly
  const currentTheme = resolvedTheme || theme;

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  // Scroll Animations
  // Map scrollY: 0 -> 100 to width: 95% -> 85% (Mobile friendly)
  const widthRaw = useTransform(scrollY, [0, 100], ['95%', '85%']);
  const width = useSpring(widthRaw, { stiffness: 300, damping: 30, restDelta: 0.001 });

  const borderOpacityRaw = useTransform(scrollY, [0, 100], [0.1, 0.3]);
  const borderOpacity = useSpring(borderOpacityRaw, { stiffness: 300, damping: 30 });

  return (
    <>
    <div className="fixed top-6 w-full flex justify-center z-50 pointer-events-none">
      <motion.nav
        style={{
          width,
        }}
        className={cn(
          "pointer-events-auto relative px-6 py-4 rounded-xl backdrop-blur-md group transition-[height,background-color,border-color] duration-300 ease-out",
          isPublicProfilePage
            ? "bg-white/22 dark:bg-black/18 border border-white/25 dark:border-white/15 shadow-lg shadow-black/5"
            : "bg-white/70 dark:bg-black/70 border border-black/15 dark:border-white/10 shadow-2xl shadow-black/20",
        )}
      >
        {/* Flashlight/Torch Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 dark:via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer rounded-xl overflow-hidden" />

        {/* LAYER 1: The Control Bar (Always on Top) */}
        <div className="relative z-50 flex items-start justify-between md:justify-center min-h-[40px] px-2">
            
          {/* Left: Logo */}
          <div className="h-[40px] flex items-center flex-shrink-0 scale-75 origin-left md:absolute md:left-0 md:top-0 z-50">
             <Link to="/">
                <CyberLogo size="md" />
             </Link>
          </div>

          {/* Center: CardNav Triggers (Desktop Only) */}
          {!simple && (
            <div className="hidden md:flex flex-1 justify-center w-full max-w-2xl mx-auto relative z-50">
               <CardNav 
                  items={navItems} 
                  theme={currentTheme === 'dark' ? 'dark' : 'light'}
                  baseColor="transparent"
                  menuColor={currentTheme === 'dark' ? '#ffffff' : '#000000'}
                  buttonBgColor="transparent"
                  buttonTextColor={currentTheme === 'dark' ? '#ffffff' : '#18181b'}
                  className="w-full"
              />
            </div>
          )}

          {/* Right: Buttons (Desktop Only) */}
          <div className="hidden md:flex h-[40px] items-center gap-3 md:absolute md:right-0 md:top-0 z-50">
            <MagneticButton strength={0.3} triggerRadius={50} className="rounded-full">
                <Button variant="ghost" size="icon" onClick={(e) => {
                  // View Transition Logic
                  if (!document.startViewTransition) {
                    setTheme(theme === 'dark' ? 'light' : 'dark');
                    return;
                  }

                  const x = e.clientX;
                  const y = e.clientY;
                  const endRadius = Math.hypot(
                    Math.max(x, window.innerWidth - x),
                    Math.max(y, window.innerHeight - y)
                  );

                  const transition = document.startViewTransition(() => {
                    setTheme(theme === 'dark' ? 'light' : 'dark');
                  });

                  transition.ready.then(() => {
                    document.documentElement.animate(
                      {
                        clipPath: [
                          `circle(0px at ${x}px ${y}px)`,
                          `circle(${endRadius}px at ${x}px ${y}px)`,
                        ],
                      },
                      {
                        duration: 500,
                        easing: 'ease-in-out',
                        pseudoElement: '::view-transition-new(root)',
                      }
                    );
                  });
                }} className="rounded-full text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors">
                {currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
            </MagneticButton>
            
            {simple && user ? (
               <MagneticButton strength={0.3} triggerRadius={60}>
                  <Button onClick={logout} className="rounded-full bg-transparent hover:bg-red-500/10 text-zinc-900 hover:text-red-500 dark:text-white dark:hover:text-red-400 transition-colors duration-300 font-mono text-xs border border-zinc-200 dark:border-zinc-800">
                      LOGOUT
                  </Button>
               </MagneticButton>
            ) : (
                <>
                    <Link to="/login">
                    <MagneticButton strength={0.3} triggerRadius={60}>
                        <Button className="rounded-full bg-transparent hover:bg-zinc-900 text-zinc-900 hover:text-white dark:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-300 font-mono text-xs border border-transparent">LOGIN</Button>
                    </MagneticButton>
                    </Link>
                    <Link to="/signup">
                    <MagneticButton strength={0.3} triggerRadius={60}>
                        <Button className="btn-3d font-mono text-xs rounded-full px-6 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-lg shadow-zinc-900/20 dark:shadow-white/20 border-0">INITIALIZE</Button>
                    </MagneticButton>
                    </Link>
                </>
            )}
          </div>

          {/* Right: Mobile Helper Actions (Theme + Hamburger) */}
           <div className="flex md:hidden items-center gap-2">
             {/* Mobile Hamburger Trigger */}
             <button 
                className="p-2 text-zinc-900 dark:text-white"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open Menu"
             >
                <MenuIcon className="w-6 h-6" />
             </button>
           </div>

        </div>
      </motion.nav>
    </div>

    {/* Full Screen Mobile Menu Overlay */}
    <AnimatePresence>
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-white dark:bg-zinc-950 flex flex-col pointer-events-auto"
        >
           {/* 1. Header */}
           <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="scale-75 origin-left">
                  <CyberLogo size="md" />
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-zinc-900 dark:text-white">
                    {currentTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                 </button>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-zinc-900 dark:text-white" aria-label="Close Menu">
                    <X className="w-6 h-6" />
                 </button>
              </div>
           </div>

           {/* 2. Scrollable Content Links */}
           <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {!simple ? (
                /* Standard Menu Items */
                navItems.map((group) => (
                    <div key={group.label} className="space-y-4">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{group.label}</h3>
                    <div className="flex flex-col gap-3 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800">
                        {group.links.map(link => (
                            <Link 
                                key={link.label} 
                                to={link.href} 
                                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors text-lg" 
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    </div>
                ))
              ) : (
                /* Simple Menu Items (e.g. for Public Profile) */
                <div className="space-y-4">
                     <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="block text-xl font-bold text-zinc-900 dark:text-white">Home</Link>
                </div>
              )}
           </div>

           {/* 3. Footer Actions */}
           <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pb-safe flex items-center justify-between gap-4">
              {simple && user ? (
                 <div className="w-full">
                     <MagneticButton strength={0.3} triggerRadius={60} className="block w-full">
                        <Button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="w-full rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 py-6 font-mono">
                            LOGOUT
                        </Button>
                    </MagneticButton>
                 </div>
              ) : (
                <>
                    <Link to="/login" className="flex w-[48%] justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                        <MagneticButton strength={0.3} triggerRadius={60} className="block">
                        <Button className="w-auto px-10 rounded-full bg-transparent hover:bg-zinc-900 text-zinc-900 hover:text-white dark:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-300 font-mono text-xs md:text-sm border border-zinc-300 dark:border-zinc-700 py-6">LOGIN</Button>
                        </MagneticButton>
                    </Link>
                    <Link to="/signup" className="flex w-[48%] justify-end" onClick={() => setIsMobileMenuOpen(false)}>
                        <MagneticButton strength={0.3} triggerRadius={60} className="block">
                        <Button className="btn-3d w-auto px-10 font-mono text-xs md:text-sm rounded-full py-6 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-lg shadow-zinc-900/20 dark:shadow-white/20 border-0">INITIALIZE</Button>
                        </MagneticButton>
                    </Link>
                </>
              )}
           </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};
