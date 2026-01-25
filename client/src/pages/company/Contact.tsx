import React, { useState } from 'react';
import { SolutionsLayout } from '@/components/solutions/SolutionsLayout';
import { DecryptionText, FlickerText } from '@/components/solutions/TextEffects';
import { HoloSatellite } from '@/components/solutions/HoloSatellite';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';
import { InverseSpotlightCard } from '@/components/InverseSpotlightCard';
import { MapPin, Mail, Phone, ChevronRight, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isTransmitting, setIsTransmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTransmitting(true);
    setTimeout(() => {
        setIsTransmitting(false);
        setFormData({ name: '', email: '', subject: '', message: '' });
    }, 2000);
  };

  return (
    <SolutionsLayout>
      {/* Page-wide Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.5)_51%)] dark:bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.05)_51%)] bg-[size:100%_4px]" />
      <div className="fixed inset-0 pointer-events-none z-[100] bg-gradient-to-b from-transparent via-zinc-900/5 dark:via-white/5 to-transparent h-[10vh] animate-scan-slow opacity-20" />

      <div className="container mx-auto px-4 py-12 md:pb-24">
        
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-20">
          <div className="flex-1 space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[0.9]">
              SECURE <br />
              <div className="text-zinc-900 dark:text-white">
                <FlickerText text="COMMUNICATIONS" className="text-zinc-900 dark:text-white" glowColor="currentColor" />
              </div>
            </h1>
            
             <div className="flex items-center gap-3 text-zinc-500 dark:text-gray-500 font-mono text-sm">
                {/* Signal Waveform Animation */}
                <div className="flex items-end gap-1 h-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                            key={i}
                            className="w-1 bg-zinc-900 dark:bg-white"
                            animate={{ height: ["20%", "100%", "20%"] }}
                            transition={{ 
                                duration: 0.8, 
                                repeat: Infinity, 
                                ease: "easeInOut",
                                delay: i * 0.1,
                                repeatType: "mirror"
                            }}
                        />
                    ))}
                </div>
                <span>CHANNELS_OPEN :: ENCRYPTION_ACTIVE</span>
            </div>
            
            <p className="text-xl text-zinc-500 dark:text-white/50 max-w-2xl leading-relaxed font-light">
               Establish a direct, encrypted uplink to our security command center. All transmissions are protected by 
              <span className="text-zinc-900 dark:text-white font-medium"> end-to-end military grade protocols</span>.
            </p>
          </div>
          
          <div className="flex-1 flex justify-center md:justify-end relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-zinc-200/50 dark:bg-white/5 blur-[100px] rounded-full pointer-events-none" />
             <HoloSatellite className="drop-shadow-2xl" />
          </div>
        </div>

        {/* Console / Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Left Column: Node Info */}
            <div className="space-y-6">
                {[
                    { 
                        icon: MapPin, 
                        title: "HQ LOCATION", 
                        data: "Gift University,\nGujranwala, Pakistan", 
                        sub: "LAT: 32.161 | LNG: 74.188" 
                    },
                    { 
                        icon: Mail, 
                        title: "EMAIL ADDRESS", 
                        data: "security@bugchase.io", 
                        sub: "PGP KEY: 0x9281...A2B1" 
                    },
                    { 
                        icon: Phone, 
                        title: "HOTLINE", 
                        data: "+92 (051) 882-9912", 
                        sub: "24/7 EMERGENCY LINE" 
                    }
                ].map((item, i) => (
                    <InvertedTiltCard key={i} intensity={5}>
                        <InverseSpotlightCard 
                            className="bg-white dark:bg-[#050505] border border-zinc-200 dark:border-white/10 p-6 rounded-lg group hover:border-black/50 dark:hover:border-white/30 transition-all flex items-start gap-4 shadow-lg shadow-zinc-200/50 dark:shadow-none"
                        >
                            <div className="p-3 bg-zinc-100 dark:bg-white/10 rounded border border-zinc-200 dark:border-white/20 text-zinc-900 dark:text-white">
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xs font-mono text-zinc-500 dark:text-gray-400 mb-1">{item.title}</h3>
                                <div className="text-lg font-bold text-zinc-900 dark:text-white whitespace-pre-line mb-1">{item.data}</div>
                                <div className="text-[10px] font-mono text-zinc-400 dark:text-gray-500">{item.sub}</div>
                            </div>
                        </InverseSpotlightCard>
                    </InvertedTiltCard>
                ))}
            </div>

            {/* Right Column: Terminal Input Form */}
            <InvertedTiltCard intensity={2} className="h-full">
                <InverseSpotlightCard className="h-full bg-zinc-900/5 dark:bg-[#020202]/80 backdrop-blur-md border-[0.2px] border-black dark:border-white/20 p-8 rounded-xl relative overflow-hidden text-zinc-900 dark:text-white">
                    
                    {/* Corner Brackets - Floating Inward */}
                    <div className="absolute top-2 left-2 w-6 h-6 border-l-[3px] border-t-[3px] border-zinc-400 dark:border-white/30 z-10" />
                    <div className="absolute top-2 right-2 w-6 h-6 border-r-[3px] border-t-[3px] border-zinc-400 dark:border-white/30 z-10" />
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-l-[3px] border-b-[3px] border-zinc-400 dark:border-white/30 z-10" />
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-r-[3px] border-b-[3px] border-zinc-400 dark:border-white/30 z-10" />

                    <div className="flex items-center gap-2 mb-8 border-b border-zinc-200 dark:border-white/20 pb-4">
                        <Terminal className="w-5 h-5 text-zinc-900 dark:text-white" />
                        <span className="font-mono text-zinc-900 dark:text-white text-lg">{">>>"} SEND_MESSAGE <span className="animate-pulse">_</span></span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-zinc-500 dark:text-gray-400 ml-1">FULL NAME</label>
                                <input 
                                    type="text" 
                                    placeholder="Execute command..."
                                    className="w-full bg-white dark:bg-transparent border border-zinc-300 dark:border-white/10 rounded p-3 text-zinc-900 dark:text-white font-mono text-sm focus:border-zinc-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-white/20"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-zinc-500 dark:text-gray-400 ml-1">EMAIL ADDRESS</label>
                                <input 
                                    type="email" 
                                    placeholder="user@domain.com"
                                    className="w-full bg-white dark:bg-transparent border border-zinc-300 dark:border-white/10 rounded p-3 text-zinc-900 dark:text-white font-mono text-sm focus:border-zinc-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-white/20"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-xs font-mono text-zinc-500 dark:text-gray-400 ml-1">SUBJECT</label>
                             <input 
                                type="text" 
                                placeholder="Security Inquiry..."
                                className="w-full bg-white dark:bg-transparent border border-zinc-300 dark:border-white/10 rounded p-3 text-zinc-900 dark:text-white font-mono text-sm focus:border-zinc-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-white/20"
                                value={formData.subject}
                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                             <label className="text-xs font-mono text-zinc-500 dark:text-gray-400 ml-1">MESSAGE</label>
                             <textarea 
                                rows={5}
                                placeholder="Enter encrypted data..."
                                className="w-full bg-white dark:bg-transparent border border-zinc-300 dark:border-white/10 rounded p-3 text-zinc-900 dark:text-white font-mono text-sm focus:border-zinc-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-white/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-white/20 resize-none"
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isTransmitting}
                            className="w-full group/btn relative overflow-hidden bg-zinc-900 dark:bg-transparent border border-zinc-900 dark:border-white/50 p-4 rounded transition-all hover:bg-zinc-800 dark:hover:bg-white hover:text-white dark:hover:text-black dark:hover:border-white shadow-lg shadow-zinc-200/50 dark:shadow-none"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-2 text-white font-mono font-bold group-hover/btn:text-white dark:group-hover/btn:text-black">
                                {isTransmitting ? (
                                    <>
                                        <div className="w-1 h-4 bg-white dark:bg-black animate-spin" />
                                        {">>"} TRANSMITTING...
                                    </>
                                ) : (
                                    <>
                                        <ChevronRight className="w-4 h-4" />
                                        SEND MESSAGE
                                    </>
                                )}
                            </div>
                            {/* Glitch Overlay on Hover */}
                            <div className="absolute inset-0 bg-white/10 dark:bg-white/20 translate-x-[-100%] ml:group-hover/btn:translate-x-[100%] transition-transform duration-500" />
                        </button>

                    </form>
                </InverseSpotlightCard>
            </InvertedTiltCard>

        </div>
      </div>
    </SolutionsLayout>
  );
};

export default Contact;
