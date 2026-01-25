import React from 'react';
import { SolutionsLayout } from '@/components/solutions/SolutionsLayout';
import { FlickerText } from '@/components/solutions/TextEffects';
import { HoloShield } from '@/components/solutions/HoloShield';

const Immunity = () => {
    return (
        <SolutionsLayout>
            <div className="container mx-auto px-4 py-12 md:pb-24">
                <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-20">
                    <div className="flex-1 space-y-6">
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9]">
                            LEGAL <br />
                            <FlickerText text="IMMUNITY" className="text-white" glowColor="#ffffff" />
                        </h1>
                        <p className="text-xl text-white/50 max-w-2xl leading-relaxed font-light">
                            Researchers acting within scope are considered 
                            <span className="text-white font-medium"> authorized assets</span>. We protect our own.
                        </p>
                    </div>
                    <div className="flex-1 flex justify-center md:justify-end relative">
                        <HoloShield />
                    </div>
                </div>
                
                <div className="prose prose-invert max-w-4xl mx-auto border border-white/20 p-8 rounded-lg bg-white/5 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 font-mono text-white/30 text-xs text-right">
                        DOC_ID: SAFE_HARBOR_V2<br/>STATUS: ACTIVE
                    </div>
                    <h3>Safe Harbor Provision</h3>
                    <p>
                        BugChase guarantees that we will not pursue legal action against researchers who comply with our Rules of Engagement.
                        We consider this activity authorized under the CFAA and relevant digital regulations.
                    </p>
                    <p>
                        If a third party initiates legal action against you for research conducted in accordance with this policy, 
                        we will provide confirmation that your activities were authorized.
                    </p>
                </div>
            </div>
        </SolutionsLayout>
    );
};
export default Immunity;
