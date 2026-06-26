import { useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { cn } from '@/lib/utils';

export interface SlidingSegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ComponentType<{ className?: string }>;
}

interface SlidingSegmentControlProps<T extends string> {
  options: SlidingSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SlidingSegmentControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SlidingSegmentControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    const btn = buttonRefs.current[idx];
    if (!btn) return;

    const update = () => {
      setThumb({ left: btn.offsetLeft, width: btn.offsetWidth });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex w-full max-w-2xl rounded-lg border border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 p-1',
        className,
      )}
    >
      <div
        className="absolute top-1 bottom-1 rounded-md bg-zinc-900 dark:bg-white shadow-sm transition-all duration-300 ease-out pointer-events-none"
        style={{ left: thumb.left, width: thumb.width }}
        aria-hidden
      />
      {options.map((option, index) => {
        const isActive = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold font-mono uppercase tracking-wider transition-colors duration-200',
              isActive
                ? 'text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white',
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span className={cn('opacity-80', !isActive && 'opacity-60')}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
