import React from 'react';
import { SolutionsLayout } from '@/components/solutions/SolutionsLayout';
import { DecryptionText } from '@/components/solutions/TextEffects';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { Globe, Server, Smartphone, Zap, Shield, Box } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const programs = [
  {
    type: "BBP",
    title: "CAREEM RIDES V4",
    desc: "Focus on the mobile app APIs and customer wallet integration.",
    bounty: "PKR 1M",
    assets: "Mobile / API",
    icon: Smartphone,
    color: "text-zinc-900 dark:text-white",
    badgeColor: "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white border-[0.2px] border-black dark:border-white/20",
  },
  {
    type: "VDP",
    title: "JAZZ CASH CORE",
    desc: "Security testing for core fintech infrastructure and payment gateways.",
    bounty: "PKR 750K", 
    assets: "Fintech / Infra",
    icon: Server,
    color: "text-zinc-500 dark:text-gray-300",
    badgeColor: "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-gray-300 border-[0.2px] border-black dark:border-white/10",
  },
  {
    type: "PTAAS",
    title: "NAYAPAY GATEWAY",
    desc: "Continuous penetration testing for payment processing APIs.",
    bounty: "PKR 500K",
    assets: "API / Web",
    icon: Globe,
    color: "text-zinc-500 dark:text-gray-400",
    badgeColor: "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-gray-400 border-[0.2px] border-black dark:border-white/10",
  },
  {
    type: "BBP",
    title: "K-ELECTRIC GRID",
    desc: "Critical infrastructure security for SCADA and IoT networks.",
    bounty: "PKR 2M",
    assets: "IoT / SCADA",
    icon: Zap,
    color: "text-zinc-900 dark:text-white",
    badgeColor: "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white border-[0.2px] border-black dark:border-white/20",
  },
  {
    type: "VDP",
    title: "DARAZ MALL",
    desc: "Vulnerability disclosure program for e-commerce web and mobile platforms.",
    bounty: "PKR 300K",
    assets: "E-Commerce",
    icon: Shield,
    color: "text-zinc-500 dark:text-gray-500",
    badgeColor: "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-gray-500 border-[0.2px] border-black dark:border-white/10",
  }
];

const SecurityRewards = () => {
  return (
    <SolutionsLayout>
      <div className="container mx-auto px-4 py-12 md:pb-0">
        
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto mb-32 relative z-10">
            <Badge variant="outline" className="mb-4 bg-white/50 dark:bg-white/5 border border-black/15 dark:border-white/20 text-zinc-900 dark:text-white backdrop-blur-sm font-mono tracking-widest">
              FOR SECURITY RESEARCHERS
            </Badge>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-zinc-900 dark:text-white leading-none">
              MONETIZE YOUR <br />
              <span className="text-zinc-900 dark:text-white">
                 <DecryptionText text="SKILLS" className="text-zinc-900 dark:text-white" />
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mt-6">
              Access exclusive, high-yield security programs from top organizations. Report critical vulnerabilities, climb the leaderboard, and get paid instantly.
            </p>
        </div>

        {/* Bounty Board */}
        <div className="pb-0">
            <div className="mb-10 text-center md:text-left">
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">DISCOVER PROGRAMS</h2>
                <p className="text-zinc-500 dark:text-white/40 font-mono text-sm">Find vulnerabilities in authorized assets</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.map((program, idx) => (
                    <InvertedTiltCard key={idx} intensity={12} className="h-full">
                        <InverseSpotlightCard 
                            className="h-full bg-white dark:bg-[#0a0a0a] border border-black/15 dark:border-white/10 p-6 rounded-xl flex flex-col justify-between group hover:border-black/50 dark:hover:border-white/20 transition-all shadow-xl shadow-zinc-200/50 dark:shadow-2xl relative overflow-hidden"
                        >
                           {/* Noise Texture Overlay for Premium Feel */}
                           <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />

                           {/* Card Top */}
                           <div className="mb-6 space-y-4 relative z-10">
                               <div className="flex justify-between items-start">
                                   <Badge 
                                    variant="outline" 
                                    className={`rounded-sm border font-mono text-[10px] tracking-wider py-1 ${program.badgeColor}`}
                                   >
                                    {program.type}
                                   </Badge>
                                   <program.icon className={`w-5 h-5 ${program.color} opacity-80`} />
                               </div>
                               
                               <div>
                                   <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 font-display uppercase tracking-tight">{program.title}</h3>
                                   <p className="text-zinc-500 dark:text-white/50 text-xs leading-relaxed line-clamp-2 font-mono">
                                       {program.desc}
                                   </p>
                               </div>
                           </div>

                           {/* Stats Row */}
                           <div className="pt-4 border-t border-zinc-100 dark:border-white/5 flex items-end justify-between relative z-10">
                               <div>
                                   <div className="text-[10px] text-zinc-400 dark:text-white/30 uppercase tracking-widest font-mono mb-1">Max Bounty</div>
                                   <div className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
                                       {program.bounty.replace("PKR", "")} <span className="text-xs opacity-50">PKR</span>
                                   </div>
                               </div>
                               <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-white/40 font-mono bg-zinc-50 dark:bg-white/5 px-2 py-1 rounded border border-zinc-100 dark:border-white/5">
                                   <Box className="w-3 h-3" />
                                   {program.assets}
                               </div>
                           </div>
                        </InverseSpotlightCard>
                    </InvertedTiltCard>
                ))}
            </div>
        </div>

      </div>
    </SolutionsLayout>
  );
};

export default SecurityRewards;
