import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Globally saves and restores scroll position per route path.
 * Place this inside BrowserRouter so useLocation() is available.
 *
 * On page reload:  restores the Y position the user was at.
 * On navigation:   scrolls to top (new page = fresh start).
 */
export function useScrollRestore() {
  const { pathname, key } = useLocation();

  // Save scroll position right before the page unloads (reload / close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem(`scroll:${pathname}`, String(Math.round(window.scrollY)));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pathname]);

  // Restore scroll position on mount / route change
  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll:${pathname}`);
    if (saved) {
      const y = parseInt(saved, 10);
      // Use requestAnimationFrame to wait for the DOM to fully paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
        });
      });
      // Clean up so normal future navigations start at top
      sessionStorage.removeItem(`scroll:${pathname}`);
    } else {
      // Fresh navigation → scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // `key` changes on every navigation (including reload via React Router)
}
