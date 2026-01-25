import React, { useState, useEffect } from 'react';
import { SubmissionData } from './types';
import { cn } from '@/lib/utils';
import { Globe, Smartphone, FileCode, Search, ChevronDown, Layers, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { vulnerabilityGroups } from '@/data/vulnerability-groups';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StepClassificationProps {
    data: SubmissionData;
    updateData: (updates: Partial<SubmissionData>) => void;
    programScope?: any[]; // Array from backend
    isLoading?: boolean;
}

// Fallback hardcoded targets if scope fetch fails or is empty (Optional, or just show empty)
const mockTargets = [
    { id: 't1', url: 'https://example.com', type: 'Web', icon: Globe },
];

export const StepClassification = ({ data, updateData, programScope = [], isLoading = false }: StepClassificationProps) => {
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState('All');

    // Filter Logic
    const filteredGroups = vulnerabilityGroups
        .filter(group => groupFilter === 'All' || group.heading === groupFilter)
        .map(group => ({
            ...group,
            items: group.items.filter(item => 
                item.label.toLowerCase().includes(search.toLowerCase()) || 
                item.cwe.toLowerCase().includes(search.toLowerCase())
            )
        }))
        .filter(group => group.items.length > 0);

    const handleSelectCategory = (heading: string, item: { label: string; cwe: string }) => {
        updateData({ category: heading, bugType: item.label, cwe: item.cwe });
    };

    // Determine targets to display
    // If programScope is provided (and has items), map it.
    // Otherwise fallback? Or empty? Better to show empty if loading finished and no scope.
    const displayTargets = (programScope && programScope.length > 0) 
        ? programScope.map((scopeItem, idx) => ({
            id: `scope-${idx}`,
            url: scopeItem.asset,
            type: scopeItem.type || 'Other',
            icon: scopeItem.type?.toLowerCase().includes('web') ? Globe : 
                  scopeItem.type?.toLowerCase().includes('mobile') || scopeItem.type?.toLowerCase().includes('app') ? Smartphone : 
                  scopeItem.type?.toLowerCase().includes('contract') ? FileCode : Layers
        }))
        : []; 

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Section A: Target Selector */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold font-mono text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="text-emerald-500">01.</span> TARGET ASSET
                </h2>
                
                {isLoading ? (
                    <div className="flex items-center justify-center p-8 border border-dashed border-zinc-200 dark:border-white/10 rounded-xl">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                        <span className="ml-2 text-zinc-500">Loading program scope...</span>
                    </div>
                ) : displayTargets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayTargets.map((target) => (
                            <div 
                                key={target.id}
                                onClick={() => updateData({ target: target.url, assetType: target.type as any })}
                                className={cn(
                                    "cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/5",
                                    data.target === target.url 
                                        ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500" 
                                        : "border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        data.target === target.url ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-white/10 text-zinc-500"
                                    )}>
                                        <target.icon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm text-zinc-900 dark:text-white truncate">{target.type}</div>
                                        <div className="text-xs text-zinc-500 font-mono truncate max-w-[150px]" title={target.url}>{target.url}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                     /* Empty State or Manual Entry Fallback could go here */
                    <div className="p-6 border border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-50 dark:bg-white/5 text-center">
                        <p className="text-zinc-500">No specific assets found in scope. Please ensure you are submitting to a valid program.</p>
                    </div>
                )}
            </div>

            {/* Section B: Category Selector (Embedded List Design) */}
            {data.target && (
                <div className="space-y-4 animate-slide-down-fade">
                    <div className="space-y-1">
                         <h2 className="text-xl font-bold font-mono text-zinc-900 dark:text-white flex items-center gap-2">
                            <span className="text-emerald-500">02.</span> CATEGORY
                        </h2>
                        <p className="text-sm text-zinc-500 ml-8">Choose the category that best describes the type of vulnerability you are reporting</p>
                    </div>

                    <div className="border border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-50 dark:bg-zinc-950 overflow-hidden shadow-lg">
                        {/* Toolbar */}
                        <div className="flex items-center gap-2 p-2 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors min-w-[120px] justify-between">
                                        {groupFilter}
                                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[200px]">
                                    <DropdownMenuItem onClick={() => setGroupFilter('All')}>All</DropdownMenuItem>
                                    {vulnerabilityGroups.map(g => (
                                        <DropdownMenuItem key={g.heading} onClick={() => setGroupFilter(g.heading)}>
                                            {g.heading}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />

                            <div className="flex-1 relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input 
                                    className="border-0 bg-transparent focus-visible:ring-0 pl-8 h-9" 
                                    placeholder="Search..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent p-2 space-y-2">
                             {filteredGroups.length > 0 ? (
                                filteredGroups.map((group) => (
                                    <div key={group.heading} className="space-y-1">
                                        <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase font-mono tracking-wider sticky top-0 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-sm z-10">
                                            {group.heading}
                                        </div>
                                        {group.items.map((item) => {
                                            const isSelected = data.bugType === item.label;
                                            return (
                                                <div
                                                    key={item.label}
                                                    onClick={() => handleSelectCategory(group.heading, item)}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 border",
                                                        isSelected 
                                                            ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                                                            : "bg-white dark:bg-white/5 border-transparent hover:bg-zinc-100 dark:hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className="space-y-0.5">
                                                        <div className={cn("text-sm font-medium", isSelected ? "text-emerald-500" : "text-zinc-700 dark:text-zinc-300")}>
                                                            {item.label}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-zinc-500">{item.cwe}</div>
                                                    </div>
                                                    
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                                        isSelected ? "border-emerald-500" : "border-zinc-300 dark:border-zinc-700"
                                                    )}>
                                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-in zoom-in-50 duration-200" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))
                             ) : (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                    <Search className="w-8 h-8 mb-2 opacity-50" />
                                    <p>No categories found</p>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
