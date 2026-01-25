import React from 'react';
import { SolutionsLayout } from '@/components/solutions/SolutionsLayout';
import { FlickerText } from '@/components/solutions/TextEffects';
import { HoloGlobe } from '@/components/solutions/HoloGlobe';
import { InvertedTiltCard } from '@/components/InvertedTiltCard';

const Sovereignty = () => {
    return (
        <SolutionsLayout>
            <div className="container mx-auto px-4 py-12 md:pb-24">
                <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-20">
                    <div className="flex-1 space-y-6">
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9]">
                            DATA <br />
                            <FlickerText text="SOVEREIGNTY" className="text-cyan-500" glowColor="#06b6d4" />
                        </h1>
                        <p className="text-xl text-white/50 max-w-2xl leading-relaxed font-light">
                            All data remains strictly within national borders. We adhere to the highest 
                            <span className="text-white font-medium"> residency and compliance standards</span>.
                        </p>
                    </div>
                    <div className="flex-1 flex justify-center md:justify-end relative">
                        <HoloGlobe />
                    </div>
                </div>
                
                <div className="space-y-8 max-w-4xl mx-auto font-mono text-cyan-500/80">
                    <div className="p-6 border border-cyan-500/20 bg-cyan-950/10 rounded-lg">
                        <h3 className="text-white text-xl mb-4 font-bold">{">>>"} REGIONAL_COMPLIANCE_ZONES</h3>
                        <p className="mb-4 text-white/70">Data centers are physically isolated. Cross-border traffic is null-routed by default.</p>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-cyan-400">
                            <li>GDPR (European Union) - STRICT</li>
                            <li>CCPA (California) - ENFORCED</li>
                            <li>PECA (Pakistan) - COMPLIANT</li>
                        </ul>
                    </div>
                </div>
            </div>
        </SolutionsLayout>
    );
};
export default Sovereignty;
