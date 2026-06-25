import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgramCardData {
  _id?: string;
  title: string;
  companyName?: string;
  companyId?: { avatar?: string };
  type?: string;
  description?: string;
  bountyRange?: string;
  isPrivate?: boolean;
  avgTriageTime?: string;
}

interface ProgramCardProps {
  program: ProgramCardData;
  onClick?: () => void;
  index?: number;
  className?: string;
  footer?: React.ReactNode;
  statusBadge?: React.ReactNode;
}

export function ProgramCard({
  program,
  onClick,
  index = 0,
  className,
  footer,
  statusBadge,
}: ProgramCardProps) {
  const companyName = program.companyName || 'Company';
  const plainDescription = (program.description || '').replace(/<[^>]*>?/gm, '');

  return (
    <GlassCard
      variant="glow"
      className={cn(
        'group hover:scale-[1.02] transition-all duration-300 animate-fade-in flex flex-col',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={onClick}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
          {program.companyId?.avatar && program.companyId.avatar !== 'default.jpg' ? (
            <img
              src={program.companyId.avatar}
              alt={`${companyName} logo`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-zinc-500">{companyName.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{program.title}</h3>
            {program.type && (
              <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 capitalize">
                {program.type}
              </Badge>
            )}
            {program.isPrivate && (
              <Badge variant="outline" className="text-xs border-violet-500/50 text-violet-600 dark:text-violet-400 gap-1">
                <Lock className="h-3 w-3" /> Private
              </Badge>
            )}
            {statusBadge}
          </div>
          <p className="text-sm text-muted-foreground">{companyName}</p>
        </div>
      </div>

      {plainDescription && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">{plainDescription}</p>
      )}

      {footer ?? (
        <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-auto">
          <div>
            <p className="text-xs text-muted-foreground">Bounty</p>
            <p className="font-bold text-primary font-mono text-sm">
              {program.bountyRange?.replace(/\$/g, 'PKR ') || 'Varies'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Avg Response</p>
            <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
              {program.avgTriageTime ? `~${program.avgTriageTime}` : '~24h'}
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
