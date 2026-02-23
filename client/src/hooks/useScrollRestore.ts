import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Disable browser's built-in scroll restoration — must happen before any render
// Without this, the browser fights our manual restore (Edge is particularly aggressive)
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const SK = (path: string) => `__scroll__${path}`;

/** Smooth scroll to targetY using requestAnimationFrame — works in all browsers */
function smoothScrollTo(targetY: number, durationMs = 600) {
  const startY = window.scrollY || document.documentElement.scrollTop || 0;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) return; // Already there

  const startTime = performance.now();

  // Ease-in-out cubic
  const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = ease(progress);
    const y = startY + distance * eased;

    // Use both methods for cross-browser compatibility
    window.scrollTo(0, y);
    document.documentElement.scrollTop = y;
    document.body.scrollTop = y; // Safari fallback

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

export function useScrollRestore() {
  const { pathname, key } = useLocation();

  // Save on every scroll + beforeunload for maximum reliability
  useEffect(() => {
    const save = () => {
      // Read from all scroll sources for cross-browser compatibility
      const y =
        window.scrollY ??
        document.documentElement.scrollTop ??
        document.body.scrollTop ??
        0;
      if (y > 0) {
        sessionStorage.setItem(SK(pathname), String(Math.round(y)));
      }
    };

    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('beforeunload', save);
    return () => {
      window.removeEventListener('scroll', save);
      window.removeEventListener('beforeunload', save);
    };
  }, [pathname]);

  // Restore after reload / navigation
  useEffect(() => {
    const sk = SK(pathname);
    const saved = sessionStorage.getItem(sk);

    if (!saved || parseInt(saved, 10) <= 0) {
      // Normal navigation → go to top (instant, no animation)
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      return;
    }

    const targetY = parseInt(saved, 10);
    sessionStorage.removeItem(sk); // Clear so next normal nav starts at top

    // Poll until page has enough content to scroll to targetY, then animate
    let attempts = 0;
    const MAX = 100; // 100 × 50ms = 5 seconds max

    const tryScroll = () => {
      const scrollable =
        (document.documentElement.scrollHeight || document.body.scrollHeight) -
        (window.innerHeight || document.documentElement.clientHeight);

      if (scrollable >= targetY || attempts >= MAX) {
        // Smooth animated scroll to saved position
        smoothScrollTo(targetY, 700);
        return;
      }
      attempts++;
      setTimeout(tryScroll, 50);
    };

    // Wait one frame for React to paint skeleton, then start polling
    setTimeout(tryScroll, 100);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
