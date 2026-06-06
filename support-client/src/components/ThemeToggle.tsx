import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

/**
 * Theme toggle that replicates the main BugChase app's animated circular
 * reveal (View Transitions API), falling back to an instant switch where the
 * API isn't supported.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const current = theme === 'system' ? resolvedTheme : theme;

  const toggle = () => setTheme(current === 'dark' ? 'light' : 'dark');

  const handleClick = (e: React.MouseEvent) => {
    if (!document.startViewTransition) {
      toggle();
      return;
    }
    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const transition = document.startViewTransition(() => toggle());
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        'rounded-full text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0',
        className
      )}
      aria-label="Toggle theme"
    >
      {current === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}
