import React from 'react';
import { cn } from '@/lib/utils';

interface CyberLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function CyberLogo({ size = 'md', showText = true, className }: CyberLogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg' },
    md: { icon: 'w-10 h-10', text: 'text-xl' },
    lg: { icon: 'w-14 h-14', text: 'text-2xl' },
    xl: { icon: 'w-20 h-20', text: 'text-4xl' },
  };

  return (
    <div className={cn('flex items-center gap-3 cursor-pointer group', className)}>
      {/* Minimalist Bug Box Icon */}
      <div className={cn(
        'relative bg-zinc-900 dark:bg-black rounded-xl flex items-center justify-center transition-all duration-300',
        'border border-black/15 dark:border-white/20 group-hover:border-zinc-900 dark:group-hover:border-white/60',
        'shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.05)] group-hover:shadow-xl dark:group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]',
        sizes[size].icon
      )}>
        {/* Inner Scan Shine (Pseudo-element substitute) */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </div>

        {/* Bug Icon */}
        <div className="relative z-10 text-white transition-transform duration-300 group-hover:scale-110">
            <BugSvg className={cn(
                size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : size === 'lg' ? 'w-8 h-8' : 'w-12 h-12'
            )} strokeWidth={2} />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            'font-display font-bold tracking-wider uppercase text-zinc-900 dark:text-white transition-opacity duration-300 group-hover:opacity-100',
            sizes[size].text
          )}>
            Bug<span className="text-zinc-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">CHASE</span>
          </span>
        </div>
      )}
    </div>
  );
}

const BugSvg = ({ strokeWidth = 1.5, ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    {...props}
    strokeWidth={strokeWidth}
  >
    {/* Geometric Head/Mandibles */}
    <path d="M8 3v2" />
    <path d="M16 3v2" />
    <path d="M9 5l-2-2" />
    <path d="M15 5l2-2" />
    
    {/* Cyber Body - Hexagonal/Circuit style */}
    <path d="M12 5l3 2v4l-3 2-3-2V7z" /> {/* Thorax */}
    <path d="M12 13l3.5 1.5v4l-3.5 2.5-3.5-2.5v-4z" /> {/* Abdomen */}
    
    {/* Tech Legs - Angular & Segmented */}
    <path d="M9 8H6l-2 3" />
    <path d="M15 8h3l2 3" />
    <path d="M9 11H5l-1 4" />
    <path d="M15 11h4l1 4" />
    <path d="M8.5 14L5 18l-1 2" />
    <path d="M15.5 14L19 18l1 2" />
    
    {/* Circuit details */}
    <rect x="11" y="8" width="2" height="2" rx="0.5" fill="currentColor" className="opacity-50" />
    <line x1="12" y1="13" x2="12" y2="15" />
  </svg>
);
