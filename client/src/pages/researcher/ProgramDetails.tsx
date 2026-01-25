
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    ChevronLeft, 
    Shield, 
    Zap, 
    Activity, 
    CheckCircle, 
    XCircle, 
    Lock,
    Trophy,
    ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ProgramDetails = () => {
    const { id } = useParams();
    const [program, setProgram] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    useEffect(() => {
        const fetchProgramData = async () => {
             if (!id) return;
             try {
                 // 1. Fetch Program Details
                 const res = await fetch(`/api/programs/${id}`);
                 const data = await res.json();
                 
                 if (res.ok) {
                     setProgram(data.data);
                 } else {
                     console.error('Failed to fetch program');
                 }

                 // 2. Fetch Leaderboard (Keep existing logic or integrate if new endpoint ready)
                 // For now, keeping the reported-stats based leaderboard logic if we had a reports endpoint
                 // But since we are focusing on connecting program *details*, we might skip reports integration here for a sec 
                 // or just use empty if endpoints not fully ready for public aggregation.
                 // We will skip report aggregation for now to ensure the main page loads.
             } catch (err) {
                 console.error('Failed to fetch details', err);
             } finally {
                 setLoading(false);
             }
        };
        fetchProgramData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
                <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-4"></div>
                <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            </div>
        );
    }

    if (!program) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h1 className="text-2xl font-bold font-mono">PROGRAM NOT FOUND</h1>
                <Link to="/researcher">
                    <Button>Return to Programs</Button>
                </Link>
            </div>
        );
    }

    // Backend Response Mapping
    // Backend returns: { title, companyName, rewards: { critical: {min,max}, ... }, description, scope: [{ asset, type, instruction, tier }], ... }
    
    // Helper for rewards display
    const formatReward = (range: { min: number, max: number }) => {
        if (!range || (range.min === 0 && range.max === 0)) return 'Varies';
        return `$${range.min} - $${range.max}`; // Or PKR based on currency pref, using $ default for now
    };

    const maxPayout = program.rewards?.critical?.max > 0 
        ? `$${program.rewards.critical.max.toLocaleString()}` 
        : program.bountyRange || 'Varies';

    // Map Scope
    // Backend 'scope' array: { asset: string, type: 'Web/API'|..., instruction: string, tier: string }
    // Frontend expects: url, type, inScope
    const assets = (program.scope || []).map((s: any) => ({
        url: s.asset,
        type: s.type || 'Target',
        inScope: true, // Assuming backend 'scope' is purely In-Scope items
        instruction: s.instruction
    }));
    // Append out of scope if exist
    (program.outOfScope || []).forEach((os: any) => {
        assets.push({
            url: os.asset,
            type: 'Out-of-Scope',
            inScope: false,
            instruction: os.reason
        });
    });

    const rewardTiers = [
        { label: 'Critical', amount: formatReward(program.rewards?.critical), color: 'text-red-500' },
        { label: 'High', amount: formatReward(program.rewards?.high), color: 'text-orange-500' },
        { label: 'Medium', amount: formatReward(program.rewards?.medium), color: 'text-yellow-500' },
        { label: 'Low', amount: formatReward(program.rewards?.low), color: 'text-blue-500' },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            
            {/* A. Header Section */}
            <header className="relative w-full rounded-2xl bg-white/5 dark:bg-black/40 backdrop-blur-md border border-zinc-200 dark:border-white/10 p-6 overflow-hidden group">
               {/* Background Glow */}
               <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

               <div className="relative z-10 space-y-6">
                    {/* Back Button */}
                    <Link 
                        to="/researcher" 
                        className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        BACK TO PROGRAMS
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        {/* Title & Badge */}
                        <div className="space-y-2">
                             <div className="flex items-center gap-4">
                                <h1 className="text-3xl font-bold font-sans text-zinc-900 dark:text-white tracking-tight">
                                    {program.title}
                                </h1>
                                <div className="px-3 py-1 rounded-full border border-emerald-500/50 flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{program.status || 'Active'}</span>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                                <Shield className="w-4 h-4" />
                                <span>Public Bug Bounty Program • {program.companyName}</span>
                             </div>
                        </div>

                        {/* Stats Row (Aligned Left) */}
                        <div className="flex items-center gap-8">
                            <div className="flex flex-col">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mb-0.5">Max Payout</div>
                                <div className="text-xl font-bold text-amber-500 font-mono tracking-tight">{maxPayout}</div>
                            </div>
                            <div className="w-px h-8 bg-zinc-200 dark:bg-white/10" />
                            <div className="flex flex-col">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mb-0.5">Avg Triage</div>
                                <div className="text-xl font-bold text-zinc-900 dark:text-white font-mono tracking-tight">~24h</div>
                            </div>
                            {/* <div className="w-px h-8 bg-zinc-200 dark:bg-white/10" />
                            <div className="flex flex-col">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mb-0.5">Resolved</div>
                                <div className="text-xl font-bold text-zinc-900 dark:text-white font-mono tracking-tight">{program.resolved || '-'}</div>
                            </div> */}
                        </div>
                    </div>
               </div>
            </header>

            {/* B. Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Policy & Scope (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Policy Card */}
                    <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm p-6 space-y-6">
                        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-white/10 pb-4">
                            <Activity className="w-5 h-5 text-zinc-500" />
                            <h2 className="text-sm font-bold font-mono tracking-wide text-zinc-500 uppercase">PROGRAM POLICY</h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: program.description }} />
                        
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-white uppercase tracking-wider">Default Rules</h3>
                            <ul className="space-y-3">
                                {[
                                    "No social engineering (phishing, vishing, smishing).",
                                    "Do not access customer data without explicit permission.",
                                    "Strictly adhere to asset scope; out-of-scope testing will result in a ban.",
                                    "Load testing and DDoS attacks are strictly prohibited."
                                ].map((rule, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                        <span>{rule}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Scope Table */}
                    <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm overflow-hidden">
                        <div className="p-6 border-b border-zinc-200 dark:border-white/10 flex items-center gap-3">
                            <Lock className="w-5 h-5 text-zinc-500" />
                            <h2 className="text-sm font-bold font-mono tracking-wide text-zinc-500 uppercase">ASSET SCOPE</h2>
                        </div>
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-100/50 dark:bg-white/5 text-xs uppercase font-mono text-zinc-500">
                                    <tr>
                                        <th className="px-6 py-4 font-bold tracking-wider">Asset</th>
                                        <th className="px-6 py-4 font-bold tracking-wider">Type</th>
                                        <th className="px-6 py-4 font-bold tracking-wider text-right">In Scope</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-white/5 font-mono">
                                    {assets.map((asset: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">
                                                {asset.url}
                                                {asset.instruction && <div className="text-xs text-zinc-500 mt-1 font-sans">{asset.instruction}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">{asset.type}</td>
                                            <td className="px-6 py-4 text-right">
                                                {asset.inScope ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-wider">
                                                        YES
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20 uppercase tracking-wider">
                                                        NO
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {assets.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">No assets explicitly listed.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Right Column: Actions & Info (1/3) */}
                <div className="space-y-6">
                    
                    {/* Primary Action */}
                    {/* Pass program ID directly to submit page */}
                    <Link to={`/researcher/submit?program=${program._id}`}>
                        <Button className="w-full h-14 text-base font-bold uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                            Submit Report
                            <ExternalLink className="ml-2 w-4 h-4" />
                        </Button>
                    </Link>

                    {/* Rewards Card */}
                    <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm p-6 space-y-5">
                         <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-white/10 pb-4">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <h2 className="text-sm font-bold font-mono tracking-wide text-zinc-900 dark:text-white uppercase">REWARDS</h2>
                        </div>
                        <div className="space-y-3">
                            {rewardTiers.map((tier, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5">
                                    <span className={cn("text-xs font-bold uppercase tracking-wider font-mono", tier.color)}>
                                        {tier.label}
                                    </span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white font-mono">
                                        {tier.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Researchers Widget - Placeholder until Reports are linked */}
                    <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm p-6 space-y-5">
                        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-white/10 pb-4">
                            <Zap className="w-5 h-5 text-zinc-500" />
                            <h2 className="text-sm font-bold font-mono tracking-wide text-zinc-900 dark:text-white uppercase">TOP RESEARCHERS</h2>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-zinc-500 text-center py-4">No reports yet. Be the first!</p>
                            {/* 
                            {programData.topResearchers.map((hacker, idx) => (
                                <div key={idx} className="flex items-center justify-between group cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
                                            {hacker.avatar}
                                        </div>
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                                            {hacker.name}
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono text-zinc-500">
                                        {hacker.count} Reports
                                    </span>
                                </div>
                            ))} 
                            */}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default ProgramDetails;
