import React, { useState, useEffect } from 'react';
import { Search, Filter, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { Link } from 'react-router-dom';

// Simplified Program Interface matching backend response
interface Program {
    _id: string; // MongoDB ID
    id?: string; // Fallback
    title: string;
    companyName: string;
    companyId?: {
        avatar?: string;
    };
    type: string;
    description: string;
    bountyRange: string;
    rewards: {
        critical: { min: number, max: number };
        high: { min: number, max: number };
        medium: { min: number, max: number };
        low: { min: number, max: number };
    };
    createdAt: string;
}

const allTags = ['Web', 'Mobile', 'API', 'Fintech', 'E-commerce', 'Banking', 'IoT', 'Crypto'];

export default function ResearcherPrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchPrograms = async () => {
        try {
            const res = await fetch('/api/programs');
            const data = await res.json();
            if (res.ok) {
                setPrograms(data.data);
            } else {
                console.error("Failed to fetch programs");
            }
        } catch (error) {
            console.error("Error fetching programs:", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchPrograms();
  }, []);

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.title?.toLowerCase().includes(search.toLowerCase()) ||
                          program.companyName?.toLowerCase().includes(search.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                        selectedTags.some(tag => program.description?.includes(tag) || program.type === tag);
    return matchesSearch && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Bug Bounty Programs</h1>
        <p className="text-muted-foreground">Discover and join security programs</p>
      </div>

      {/* Search and Filters */}
      <GlassCard className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? 'default' : 'tag'}
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </GlassCard>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
            // Skeleton / Loading State
            [1, 2, 3].map(i => (
                <GlassCard key={i} className="h-64 animate-pulse">
                    <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-4" />
                    <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </GlassCard>
            ))
        ) : (
            filteredPrograms.map((program, index) => (
            <GlassCard 
                key={program._id}
                variant="glow"
                className="group hover:scale-[1.02] transition-all duration-300 animate-fade-in flex flex-col"
                style={{ animationDelay: `${index * 0.1}s` }}
            >
                <div className="flex items-start gap-4 mb-4">
                {/* Logo or Placeholder */}
                <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {program.companyId?.avatar && program.companyId.avatar !== 'default.jpg' ? (
                        <img 
                            src={program.companyId.avatar} 
                            alt={`${program.companyName} logo`} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-xl font-bold text-zinc-500">
                            {program.companyName.charAt(0)}
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{program.title}</h3>
                    <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 capitalize">
                        {program.type}
                    </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{program.companyName}</p>
                </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
                {program.description.replace(/<[^>]*>?/gm, '')}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-auto">
                <div>
                    <p className="text-xs text-muted-foreground">Bounty</p>
                    <p className="font-bold text-primary font-mono text-sm">{program.bountyRange}</p>
                </div>
                <Link to={`/researcher/programs/${program._id}`}>
                    <Button variant="glass" size="sm" className="gap-1 group-hover:bg-primary/20">
                    View Program
                    <ExternalLink className="h-3 w-3" />
                    </Button>
                </Link>
                </div>
            </GlassCard>
            ))
        )}
      </div>

      {!isLoading && filteredPrograms.length === 0 && (
        <GlassCard className="text-center py-12">
          <p className="text-muted-foreground">No programs found matching your criteria</p>
        </GlassCard>
      )}
    </div>
  );
}
