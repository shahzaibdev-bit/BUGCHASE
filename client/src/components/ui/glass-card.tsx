import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'prominent' | 'glow';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassCard({ 
  className, 
  variant = 'default', 
  padding = 'md',
  children, 
  action,
  ...props 
}: GlassCardProps & { action?: React.ReactNode }) {
  const variants = {
    default: 'bg-card/60 backdrop-blur-md md:backdrop-blur-xl border border-border/30',
    subtle: 'bg-card/40 backdrop-blur-sm md:backdrop-blur-lg border border-border/20',
    prominent: 'bg-card/80 backdrop-blur-lg md:backdrop-blur-2xl border border-primary/20 shadow-xl',
    glow: 'bg-card/60 backdrop-blur-md md:backdrop-blur-xl border border-primary/30 shadow-lg shadow-primary/10',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div 
      className={cn(
        'rounded-xl transition-all duration-300',
        variants[variant],
        paddings[padding],
        className
      )} 
      {...props}
    >
      {action && <div className="mb-4 flex justify-end">{action}</div>}
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <GlassCard className={cn('group hover:border-primary/30 transition-all duration-300', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1 gradient-text">{value}</p>
          {trend && (
            <p className={cn(
              'text-xs mt-2 flex items-center gap-1',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
