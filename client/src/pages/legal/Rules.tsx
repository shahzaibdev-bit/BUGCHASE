import React from 'react';
import { SolutionsLayout } from '@/components/solutions/SolutionsLayout';
import { FlickerText } from '@/components/solutions/TextEffects';
import { CyberLock } from '@/components/solutions/CyberLock';

const Rules = () => {
    return (
        <SolutionsLayout>
            <div className="container mx-auto px-4 py-12 md:pb-24">
                <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-20">
                    <div className="flex-1 space-y-6">
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9]">
                            RULES OF <br />
                            <FlickerText text="ENGAGEMENT" className="text-red-500" glowColor="#ef4444" />
                        </h1>
                        <p className="text-xl text-white/50 max-w-2xl leading-relaxed font-light">
                            Operational directives for authorized research. 
                            <span className="text-white font-medium"> Strict adherence is mandatory.</span>
                        </p>
                    </div>
                    <div className="flex-1 flex justify-center md:justify-end relative">
                        <CyberLock />
                    </div>
                </div>
                
                <div className="grid gap-6 max-w-4xl mx-auto">
                    {[
                        { title: "SCOPE_DEFINITION", text: "Only test assets explicitly listed in the program scope." },
                        { title: "NO_DESTRUCTION", text: "Do not delete, alter, or corrupt data. Proof of Concept only." },
                        { title: "PRIVACY_FIRST", text: "Do not access PII. If encountered, stop and report immediately." }
                    ].map((rule, i) => (
                        <div key={i} className="p-6 border-l-4 border-red-500 bg-red-950/10 rounded-r-lg">
                            <h3 className="text-red-500 font-mono font-bold text-lg mb-1">{rule.title}</h3>
                            <p className="text-white/70">{rule.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </SolutionsLayout>
    );
};
export default Rules;
