import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * CRITICAL: Disable the browser's own scroll restoration.
 * Without this the browser overrides everything we do.
 */
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const storageKey = (path: string) => `__scroll__${path}`;

export function useScrollRestore() {
  const { pathname, key } = useLocation();

  // Save on every scroll event (most reliable — catches position even if
  // beforeunload is throttled/blocked by the browser)
  useEffect(() => {
    const save = () => {
      const y = window.scrollY ?? document.documentElement.scrollTop ?? 0;
      if (y > 0) {
        sessionStorage.setItem(storageKey(pathname), String(Math.round(y)));
      }
    };
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('beforeunload', save);
    return () => {
      window.removeEventListener('scroll', save);
      window.removeEventListener('beforeunload', save);
    };
  }, [pathname]);

  // Restore after every navigation / reload
  useEffect(() => {
    const sk = storageKey(pathname);
    const saved = sessionStorage.getItem(sk);

    if (!saved || parseInt(saved, 10) <= 0) {
      window.scrollTo(0, 0);
      return;
    }

    const targetY = parseInt(saved, 10);
    // Remove now — so future normal navigations to this route start at top
    sessionStorage.removeItem(sk);

    // Poll until the page is tall enough to actually reach targetY.
    // Needed because async data fetches mean the DOM starts short.
    let attempts = 0;
    const MAX = 100; // 100 × 50ms = 5 seconds max

    const tryScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable >= targetY || attempts >= MAX) {
        window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });
        return;
      }
      attempts++;
      setTimeout(tryScroll, 50);
    };

    // Give React one tick to paint the first frame before we start polling
    setTimeout(tryScroll, 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // key changes on every navigation AND on fresh page load
}
