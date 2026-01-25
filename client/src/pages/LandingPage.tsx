import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { Shield, Globe, Lock, Terminal, Award, Eye, ChevronRight, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CountUp from '@/components/CountUp';
import { MorphingNavbar } from '@/components/MorphingNavbar';
import { CyberTerminal } from '@/components/CyberTerminal';
import { InfiniteTicker } from '@/components/InfiniteTicker';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { ProgramRegistry } from '@/components/ProgramRegistry';
import { OurDNA } from '@/components/OurDNA';
import { InverseSpotlightCTA } from '@/components/InverseSpotlightCTA';
import ShinyText from '@/components/ShinyText';
import { MagneticButton } from '@/components/MagneticButton';

// Replaced custom Cyber3DCard with the requested InvertedTiltCard
function Cyber3DCard({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <InvertedTiltCard className={`glass-card relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-6 transition-all duration-500 hover:border-white/50 group ${className}`}>
      <div className="relative z-10">{children}</div>
      {/* Animated background element */}
       <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100"></div>
      </div>
    </InvertedTiltCard>
  );
}

// Stats Item with "Melting" Ghost Box and specific hover logic
// Stats Item with "Melting" Ghost Box and specific hover logic
const StatItem = ({ value, label, suffix = "+" }: { value: React.ReactNode, label: string, suffix?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center group relative cursor-default px-8 py-4 rounded-xl transition-all duration-300 w-full min-w-fit">
      
      {/* 1. The Melting Ghost Box (Hover State) */}
      {/* Background Gradient: Melt to bottom */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[linear-gradient(to_bottom,rgba(0,0,0,0.1),transparent)] dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent)]"
      />
      {/* Border Gradient: Top, Left, Right ONLY (Fading at bottom) */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none p-[1px] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.1),transparent)] dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.2),transparent)]"
        style={{
           mask: 'linear-gradient(to bottom, #fff 60%, transparent 100%) content-box, linear-gradient(to bottom, #fff 60%, transparent 100%)',
           WebkitMask: 'linear-gradient(to bottom, #fff 60%, transparent 100%) content-box, linear-gradient(to bottom, #fff 60%, transparent 100%)',
           maskComposite: 'exclude',
           WebkitMaskComposite: 'xor'
        }}
      />
      
      {/* 2. Content Stack: Number -> Underline -> Label */}
      <div className="relative z-10 flex flex-col items-center whitespace-nowrap gap-1">
        {/* Top: The Number */}
        <div className="text-3xl md:text-5xl font-bold font-sans tracking-tight transition-colors duration-300 flex items-center text-zinc-900 dark:text-white group-hover:text-zinc-900 dark:group-hover:text-white">
          {value}
          <span className="text-zinc-400 dark:text-white/20 ml-1 text-2xl md:text-4xl transition-colors duration-300 group-hover:text-zinc-600 dark:group-hover:text-white/40">{suffix}</span>
        </div>

        {/* Center: The Underline (1px, ScaleX) */}
        <div className="w-12 h-[1px] bg-zinc-300 dark:bg-white/20 my-2 transition-all duration-300 ease-out origin-center transform scale-x-100 group-hover:scale-x-150 group-hover:bg-zinc-900 dark:group-hover:bg-white" />
        
        {/* Bottom: The Label */}
        <div className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-[0.2em] text-center">
          {label}
        </div>
      </div>
      
    </div>
  );
};

export default function LandingPage() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);
  
  const terminalCommands = [
    { prompt: 'root@bugchase:~#', cmd: 'subfinder -d target.com -silent | tee subdomains.txt' },
    { prompt: 'root@bugchase:~#', cmd: 'nmap -iL subdomains.txt -p80,443 --open' },
    { prompt: 'root@bugchase:~#', cmd: './exploit_rce.py --target=api.target.com' },
    { prompt: 'root@target-server:~#', cmd: 'whoami', color: 'text-zinc-900 dark:text-white' }, // NEW COMMAND
    { prompt: '>>', cmd: 'REMOTE SHELL ESTABLISHED...', color: 'text-emerald-400 font-bold tracking-widest' }
  ];

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden">
      
      {/* Hero Section */}
      <section className="relative z-10 min-h-[100dvh] md:min-h-0 flex flex-col justify-center pt-20 pb-10 md:pt-20 md:pb-32 container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center flex-1">
          <div className="relative z-10 text-center lg:text-left flex flex-col justify-center h-full">
             <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex justify-center lg:justify-start">
                  <Badge variant="outline" className="mb-6 px-4 py-1.5 border border-black/15 dark:border-white/20 text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/5 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white mr-2 animate-pulse" />
                    NATIONAL SECURITY INFRASTRUCTURE
                  </Badge>
              </div>
              <div className="group relative inline-block cursor-default transition-transform duration-500 hover:scale-105">
                
                {/* Layer 1: Base Color-Flipping Text */}
                <h1 className="font-display text-[10vw] md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6 relative z-10 text-zinc-900 dark:text-transparent whitespace-nowrap">
                  {/* BUG: Solid Black (Light) -> White/Gray Gradient (Dark) */}
                  <span className="inline-block bg-none dark:bg-[linear-gradient(90deg,#ffffff_50%,#a3a3a3_50%)] bg-[length:200%_100%] bg-left group-hover:bg-right transition-[background-position] duration-500 ease-linear bg-clip-text text-zinc-900 dark:text-transparent mr-2 md:mr-4">
                    BUG
                  </span>
                   {/* CHASE.: Solid Gray (Light) -> Gray/White Gradient (Dark) */}
                   <span className="inline-block italic bg-none dark:bg-[linear-gradient(90deg,#a3a3a3_50%,#ffffff_50%)] bg-[length:200%_100%] bg-left group-hover:bg-right transition-[background-position] duration-500 ease-linear bg-clip-text text-zinc-500 dark:text-transparent">
                    CHASE.
                  </span>
                </h1>
                
                {/* Layer 2: ShinyText Overlay (The Glow Effect) */}
                {/* color="transparent" ensures we only see the traveling shine */}
                <div 
                  className="hidden md:block absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  aria-hidden="true"
                >
                   <h1 className="font-display text-[10vw] md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6 whitespace-nowrap">
                    <ShinyText 
                      text="BUG" 
                      disabled={false} 
                      speed={3} 
                      className="inline-block mr-2 md:mr-4" 
                      color="transparent" 
                      shineColor="#ffffff" 
                      spread={120}
                      direction="left"
                      yoyo={false}
                      pauseOnHover={false}
                    />
                    <ShinyText 
                      text="CHASE." 
                      disabled={false} 
                      speed={3} 
                      className="inline-block italic" 
                      color="transparent" 
                      shineColor="#ffffff"
                      spread={120}
                      direction="left"
                      yoyo={false}
                      pauseOnHover={false}
                    />
                   </h1>
                </div>
              </div>

              <p className="text-zinc-600 dark:text-white/60 text-sm md:text-sm font-mono mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed px-4 md:px-0">
                Mobilizing elite cyber-intelligence for sovereign defense. We architect the shield against asymmetric digital threats.
              </p>
              
              <div className="flex flex-row flex-nowrap items-center justify-center lg:justify-start gap-2 md:gap-4 w-full md:w-auto max-w-[95vw] mx-auto lg:mx-0">
                {/* GET STARTED */}
                <Link to="/signup">
                  <MagneticButton strength={0.2} triggerRadius={100} className="block">
                    <Button className="h-12 md:h-14 px-4 md:px-8 text-xs md:text-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-white/90 rounded-xl border border-transparent shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-xl dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-300 group font-bold whitespace-nowrap">
                      GET STARTED <ChevronRight className="ml-1 md:ml-2 h-3 w-3 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </MagneticButton>
                </Link>
                
                {/* RESEARCHER ACCESS */}
                <Link to="/login" className="flex-shrink-1 min-w-0">
                  <MagneticButton strength={0.2} triggerRadius={100} className="block">
                    <Button variant="outline" className="h-12 md:h-14 px-3 md:px-8 text-[10px] sm:text-xs md:text-lg rounded-xl border border-black/15 dark:border-white/20 hover:bg-zinc-900 dark:hover:bg-white dark:hover:border-white text-zinc-600 dark:text-muted-foreground hover:text-white dark:hover:text-black transition-all duration-300 font-mono uppercase truncate max-w-full">
                      <span className="opacity-50 mr-1 md:mr-2 font-mono">{">_"}</span> RESEARCHER ACCESS
                    </Button>
                  </MagneticButton>
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="relative hidden lg:block h-[600px] w-full">
            {/* The Cyber Terminal - 3D Transform Container */}
            <motion.div 
               style={{ y: y1 }} 
               className="relative w-full h-full flex items-center justify-center perspective-1000"
            >
               {/* Decorative background circles - Monochrome */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full animate-[spin_60s_linear_infinite]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-dashed border-white/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
            
            {/* Right Content - Terminal */}
            {/* 4. Terminal Component Width: Fixed to max-w-2xl as updated requirement */}
            <div className="relative animate-fade-in w-full max-w-2xl mx-auto" style={{ animationDelay: '0.3s' }}>
              <div className="relative z-10 h-full flex items-center justify-center">
                <InvertedTiltCard intensity={20} className="w-full">
                  <CyberTerminal commands={terminalCommands} className="shadow-2xl shadow-white/5 w-full" />
                </InvertedTiltCard>
              </div>
              
              {/* Decorative elements - Monochrome */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
              <div className="absolute bottom-10 -left-10 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
            </div>

            </motion.div>
          </div>
        </div>
        
      </section>

      {/* Stats Section with Infinite Ticker */}
      <section id="stats" className="relative z-10 pb-20 pt-10">
        <InfiniteTicker />

        {/* 2. Intelligence Overview (Stats Panel) */}
        {/* Fix: Width fit-content, centered, no tilt on container */}
        {/* 2. Intelligence Overview (Stats Panel) */}
        {/* Fix: Width fit-content, centered, no tilt on container */}
        <div className="container mx-auto px-4 mt-8 flex justify-center">
          <div 
             className="w-full max-w-[95%] lg:max-w-[1600px] mx-auto backdrop-blur-xl bg-white/60 dark:bg-black/60 border border-black/15 dark:border-white/10 rounded-xl overflow-hidden p-6 md:p-8 shadow-2xl shadow-zinc-300/50 dark:shadow-none"
          >
            {/* 2. Layout Width & Spacing: Grid with repeat(4, 1fr) and gap-8 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 items-stretch justify-items-center text-center relative z-10">
              
              <div className="w-full">
                <StatItem 
                  value={<CountUp 
                    to={5400} 
                    separator="," 
                    duration={4} 
                    useEasing={true}
                    easingFn={(t, b, c, d) => (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b}
                  />}
                  label="Active Researchers"
                  suffix="+"
                />
              </div>

              <div className="w-full">
                <StatItem 
                  value={<CountUp 
                    to={1200} 
                    separator="," 
                    duration={4} 
                    useEasing={true}
                    easingFn={(t, b, c, d) => (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b}
                  />}
                  label="Threats Neutralized"
                  suffix="+"
                />
              </div>

              <div className="w-full">
                <StatItem 
                  value={<CountUp 
                    to={85000000} 
                    separator="," 
                    duration={4} 
                    useEasing={true}
                    easingFn={(t, b, c, d) => (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b}
                  />}
                  label="Capital Deployed (PKR)"
                  suffix="+"
                />
              </div>

              <div className="w-full">
                <StatItem 
                  value={<CountUp 
                    to={99} 
                    duration={4} 
                    useEasing={true}
                    easingFn={(t, b, c, d) => (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b}
                  />}
                  label="Intelligence Accuracy"
                  suffix="%"
                />
              </div>

            </div>
            
            {/* Background Texture (Code Shard) - Hidden in Light Mode */}
            <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none hidden dark:block">
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02),rgba(255,255,255,0.06))] bg-[length:100%_4px,3px_100%]" />
            </div>
          </div>
        </div>
      </section>

      {/* Program Registry Section */}
      <ProgramRegistry />

      {/* Sovereign Architects (Our DNA) */}
      <OurDNA />

      {/* Features Grid */}




       {/* CTA Section */}
       <InverseSpotlightCTA />

      <footer className="relative z-10 py-12 border-t border-black/15 dark:border-white/10 bg-gray-100 dark:bg-black/60 backdrop-blur-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-300 dark:bg-white/20 flex items-center justify-center rounded-sm">
              <span className="text-xs font-bold text-black dark:text-white">B</span>
            </div>
            <span className="font-display font-bold tracking-wider text-zinc-900 dark:text-white">BUGCHASE</span>
          </div>
          <div className="text-sm text-zinc-600 dark:text-muted-foreground font-mono">
            &copy; 2024 BUGCHASE PLATFORM. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>
    </div>
  );
}
