import React, { useRef } from 'react';
import { SolutionsLayout } from '@/components/solutions/SolutionsLayout';
import { DecryptionText, TypewriterText } from '@/components/solutions/TextEffects';


import { motion, useScroll, useTransform, useInView, MotionValue } from 'framer-motion';

const AboutUs = () => {
  const timelineRef = useRef(null);
  const { scrollYProgress: mobileScrollProgress } = useScroll({
      target: timelineRef,
      offset: ["start center", "end center"] // Adjusted for better mobile trigger
  });
  
  // Use a different scroll tracker for the precise timeline line connection
  const { scrollYProgress: lineProgress } = useScroll({
      target: timelineRef,
      offset: ["start center", "end center"]
  });

  return (
    <SolutionsLayout>
      <div className="container mx-auto px-4 py-12 md:pb-24 overflow-hidden">
        
        {/* 1. Hero Section: The Digital Firewall */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-32 mt-12 md:mt-24">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[0.9]">
              ABOUT <br />
              <span className="text-zinc-900 dark:text-white">
                <DecryptionText text="US." />
              </span>
            </h1>
            
            <div className="text-xl text-zinc-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-light font-mono mt-6 h-[4rem] md:h-auto">
               <TypewriterText text="We are the digital firewall for Pakistan's critical infrastructure." delay={30} />
            </div>
        </div>

        {/* 2. Mission Section: Building Trust */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-32 items-center">
            <div>
                 <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">Building Trust in Zero Trust.</h2>
                 <p className="text-zinc-600 dark:text-white/60 text-lg leading-relaxed">
                    BugChase was founded on the principle that security is not a product, but a process. 
                    By harnessing collective intelligence, we provide continuous, improved security for the nation's most critical digital assets.
                 </p>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-8">
                {[
                    { val: 2023, label: "FOUNDED" },
                    { val: 5000, label: "RESEARCHERS", suffix: "+" },
                    { val: 99, label: "UPTIME", suffix: "%" },
                    { val: 150, label: "CRITICAL BUGS", suffix: "+" }
                ].map((stat, i) => (
                    <CountUpStat key={i} value={stat.val} label={stat.label} suffix={stat.suffix} />
                ))}
            </div>
        </div>

        {/* 3. System Boot Timeline */}
        <div className="relative mb-32" ref={timelineRef}>

             <div className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-[2px] bg-zinc-200 dark:bg-white/10 -translate-x-1/2" />
             <motion.div 
                style={{ scaleY: lineProgress, transformOrigin: "top" }}
                className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-[2px] bg-zinc-900 dark:bg-white -translate-x-1/2 shadow-[0_0_10px_rgba(0,0,0,0.2)] dark:shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
             />

             <div className="space-y-24">
                 {[
                     { year: "2023", title: "KERNEL_INIT", text: "Prototype launched in a garage. First 50 researchers." },
                     { year: "2024", title: "NETWORK_EXPANSION", text: "Series A funding. Platform opens to enterprise nodes." },
                     { year: "2025", title: "GLOBAL_SYNC", text: "20,000+ Researcher nodes active. Cloud integration live." },
                     { year: "2026", title: "CURRENT_STATE", text: "Dominating the PTaaS landscape. The Security Standard." }
                 ].map((event, i, arr) => (
                     <TimelineNode key={i} event={event} index={i} total={arr.length} progress={lineProgress} />
                 ))}
             </div>
        </div>

        {/* 4. Leadership Team */}
        <div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-12 border-b-[0.5px] border-black dark:border-white/10 pb-4">{">>>"} LEADERSHIP TEAM</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { 
                        name: "SHAHZAIB AHMAD", 
                        title: "CHIEF OPERATING OFFICER", 
                        desc: "Strategic leader ensuring operational excellence.",
                        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop"
                    },
                    { 
                        name: "M. QASIM", 
                        title: "HEAD OF OFFENSIVE OPS", 
                        desc: "Elite bug hunter and red team specialist.",
                        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=500&fit=crop"
                    },
                    { 
                        name: "SHAHZAIB", 
                        title: "VP ENGINEERING", 
                        desc: "Architect of the core platform and secure infrastructure.",
                        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&h=500&fit=crop"
                    },
                    { 
                        name: "TAUSEEF AHMAD", 
                        title: "SECURITY DIRECTOR", 
                        desc: "Expert in vulnerability assessment and network defense.",
                        image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&h=500&fit=crop"
                    }
                ].map((leader, i) => (
                    <div key={i} className="group relative bg-white dark:bg-[#050505] border border-black/15 dark:border-white/10 p-6 rounded hover:border-black/50 dark:hover:border-white transition-colors overflow-hidden">
                        {/* ID Photo */}
                        <div className="w-full h-64 bg-zinc-100 dark:bg-white/5 mb-6 rounded flex items-center justify-center grayscale group-hover:grayscale-0 transition-all duration-500 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent dark:from-black dark:to-transparent opacity-50 z-10" />
                            <img 
                                src={leader.image} 
                                alt={leader.name}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                            />
                        </div>

                        {/* Details */}
                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">{leader.name}</h3>
                        <div className="text-zinc-500 dark:text-gray-400 font-mono text-sm mb-4 group-hover:text-zinc-800 dark:group-hover:text-white transition-colors">{leader.title}</div>
                        <p className="text-zinc-500 dark:text-white/60 font-mono text-xs leading-relaxed border-t border-zinc-100 dark:border-white/10 pt-4">
                            {leader.desc}
                        </p>

                        {/* Corner Brackets */}
                        <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-zinc-300 dark:border-white/20 group-hover:border-zinc-900 dark:group-hover:border-white transition-colors" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-zinc-300 dark:border-white/20 group-hover:border-zinc-900 dark:group-hover:border-white transition-colors" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-zinc-300 dark:border-white/20 group-hover:border-zinc-900 dark:group-hover:border-white transition-colors" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-zinc-300 dark:border-white/20 group-hover:border-zinc-900 dark:group-hover:border-white transition-colors" />
                    </div>
                ))}
            </div>
        </div>

      </div>
    </SolutionsLayout>
  );
};

// Helper Components

const CountUpStat = ({ value, label, suffix = "" }: { value: number, label: string, suffix?: string }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    // Detailed countup logic omitted for brevity, using simple transition
    const count = useSpringCount(value, isInView);

    return (
        <div ref={ref} className="border-[0.5px] border-black dark:border-white/20 bg-zinc-50 dark:bg-white/5 p-6 rounded hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors">
            <div className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white mb-2 font-mono tabular-nums">
                {count}{suffix}
            </div>
            <div className="text-xs font-mono text-zinc-500 dark:text-gray-400 tracking-widest">{label}</div>
        </div>
    )
}

// Simple counter hook placeholder
const useSpringCount = (target: number, isActive: boolean) => {
    const [count, setCount] = React.useState(0);
    React.useEffect(() => {
        if (!isActive) return;
        let start = 0;
        const duration = 2000;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = target / steps;
        
        const timer = setInterval(() => {
            start += increment;
            if(start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, stepTime);
        return () => clearInterval(timer);
    }, [target, isActive]);
    return count;
}




const TimelineNode = ({ event, index, total, progress }: { event: any, index: number, total: number, progress: MotionValue<number> }) => {
    const isLeft = index % 2 === 0;
    
    // Calculate threshold for this node to activate
    // We adjust the range from [0, 1] to [0.05, 0.95] so:
    // 1. First dot (0) triggers slightly after start (0.05), ensuring it starts hollow.
    // 2. Last dot triggers before the absolute end (0.95), ensuring it fills while visible.
    const threshold = 0.02 + (index / (total - 1)) * 0.93;
    
    // Animation Transforms
    const scale = useTransform(progress, [threshold - 0.05, threshold], [1, 1.2]); 
    const opacity = useTransform(progress, [threshold - 0.1, threshold], [0.3, 1]);
    const fillOpacity = useTransform(progress, [threshold - 0.05, threshold], [0, 1]);
    
    return (
        <div className={`relative flex items-center ${isLeft ? 'md:flex-row-reverse' : ''} md:justify-end`}>
            {/* Center Node: Perfectly centered on the line */}
            <div className="absolute left-[20px] md:left-1/2 -translate-x-1/2 flex items-center justify-center z-10 w-8 h-8">
                 {/* The Dot Container - Always has Border (Hollow initially) */}
                 <motion.div 
                    style={{ scale }}
                    className="relative w-4 h-4 rounded-full border-2 border-zinc-900 dark:border-white"
                >
                    {/* Inner Fill - Fills up when active */}
                    <motion.div 
                        style={{ opacity: fillOpacity }}
                        className="absolute inset-0 rounded-full bg-zinc-900 dark:bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] dark:shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                    />
                </motion.div>
            </div>
            
            {/* Content Card */}
            <div className={`ml-12 md:ml-0 md:w-[45%] p-6 border border-black/15 dark:border-white/10 bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded hover:border-black/50 dark:hover:border-white transition-all group shadow-sm ${isLeft ? 'md:mr-12 text-right' : 'md:ml-12 text-left'}`}>
                {/* Year - Lighter initially, Darkens up on activate */}
                <motion.div 
                    style={{ opacity }}
                    className="text-4xl font-black transition-colors mb-2 text-zinc-900 dark:text-white"
                >
                    {event.year}
                </motion.div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white font-mono mb-2">{event.title}</h3>
                <p className="text-zinc-600 dark:text-white/60 text-sm">{event.text}</p>
            </div>
        </div>
    )
}

export default AboutUs;
