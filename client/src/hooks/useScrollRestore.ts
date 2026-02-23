import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Globally saves and restores scroll position per route path.
 *
 * The key problem with async React pages: content loads after mount,
 * so document.body isn't tall enough when we first try to scroll.
 * Solution: poll every 50ms until the page is tall enough, then scroll.
 */
export function useScrollRestore() {
  const { pathname, key } = useLocation();

  // Save scroll position right before the page unloads (reload)
  useEffect(() => {
    const save = () => {
      if (window.scrollY > 0) {
        sessionStorage.setItem(`scroll:${pathname}`, String(Math.round(window.scrollY)));
      }
    };
    window.addEventListener('beforeunload', save);
    // Also save periodically while on the page so it's always fresh
    const interval = setInterval(save, 500);
    return () => {
      window.removeEventListener('beforeunload', save);
      clearInterval(interval);
    };
  }, [pathname]);

  // Restore scroll after navigation/reload
  useEffect(() => {
    const key_storage = `scroll:${pathname}`;
    const saved = sessionStorage.getItem(key_storage);

    if (!saved) {
      // Fresh navigation — scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }

    const targetY = parseInt(saved, 10);
    if (targetY <= 0) {
      sessionStorage.removeItem(key_storage);
      return;
    }

    // Remove immediately so future normal navigations to this route start at top
    sessionStorage.removeItem(key_storage);

    // Poll until page is tall enough to scroll to targetY (async content)
    const MAX_ATTEMPTS = 60; // 60 × 50ms = 3 seconds max
    let attempts = 0;

    const tryScroll = () => {
      const pageHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;

      // Page is tall enough — scroll now
      if (pageHeight - viewportHeight >= targetY || attempts >= MAX_ATTEMPTS) {
        window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });
        return;
      }

      attempts++;
      setTimeout(tryScroll, 50);
    };

    // Small initial delay to let React paint the skeleton/first frame
    setTimeout(tryScroll, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
