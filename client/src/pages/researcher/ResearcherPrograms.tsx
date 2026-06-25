import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgramCard, ProgramCardData } from '@/components/researcher/ProgramCard';
import { useNavigate } from 'react-router-dom';

interface Program extends ProgramCardData {
  _id: string;
  createdAt: string;
}

function normalizeProgram(raw: any, company?: any): Program {
  const companyRef = raw.companyId && typeof raw.companyId === 'object'
    ? raw.companyId
    : company ? { avatar: company.avatar } : undefined;

  return {
    _id: raw._id,
    title: raw.title,
    companyName: raw.companyName || company?.companyName || company?.name,
    companyId: companyRef,
    type: raw.type,
    description: raw.description,
    bountyRange: raw.bountyRange,
    isPrivate: raw.isPrivate ?? false,
    createdAt: raw.createdAt,
  };
}

const allTags = ['Web', 'Mobile', 'API', 'Fintech', 'E-commerce', 'Banking', 'IoT', 'Crypto'];

export default function ResearcherPrograms() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await apiFetch('/programs');
        const data = await res.json();
        if (res.ok) {
          const list = (data.data || [])
            .filter((p: any) => !p.isPrivate)
            .map((p: any) => normalizeProgram(p));
          setPrograms(list);
        }
      } catch (error) {
        console.error('Error fetching programs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.title?.toLowerCase().includes(search.toLowerCase()) ||
      program.companyName?.toLowerCase().includes(search.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => program.description?.includes(tag) || program.type === tag);
    return matchesSearch && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Bug Bounty Programs</h1>
        <p className="text-muted-foreground">Discover and join security programs</p>
      </div>

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
          {allTags.map((tag) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? [1, 2, 3].map((i) => (
              <GlassCard key={i} className="h-64 animate-pulse">
                <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-4" />
                <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </GlassCard>
            ))
          : filteredPrograms.map((program, index) => (
              <ProgramCard
                key={program._id}
                program={program}
                index={index}
                onClick={() => navigate(`/researcher/programs/${program._id}`)}
              />
            ))}
      </div>

      {!isLoading && filteredPrograms.length === 0 && (
        <GlassCard className="text-center py-12">
          <p className="text-muted-foreground">No programs found matching your criteria</p>
        </GlassCard>
      )}
    </div>
  );
}
