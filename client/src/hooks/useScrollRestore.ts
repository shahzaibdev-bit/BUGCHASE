import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// NOTE: history.scrollRestoration = 'manual' is set in index.html BEFORE
// any JS loads — that is the only reliable way to beat Edge/Opera/Firefox.
// We keep it here too as a belt-and-suspenders guard.
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const SK = (path: string) => `__scroll__${path}`;

const getScrollY = () =>
  window.scrollY ??
  (document.documentElement && document.documentElement.scrollTop) ??
  (document.body && document.body.scrollTop) ??
  0;

const setScrollY = (y: number) => {
  window.scrollTo(0, y);
  if (document.documentElement) document.documentElement.scrollTop = y;
  if (document.body) document.body.scrollTop = y;
};

/** Custom smooth scroll using rAF — works in every browser */
function smoothScrollTo(targetY: number, duration = 650) {
  const startY = getScrollY();
  const dist = targetY - startY;
  if (Math.abs(dist) < 1) return;

  const startTime = performance.now();
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const tick = (now: number) => {
    const t = Math.min((now - startTime) / duration, 1);
    setScrollY(Math.round(startY + dist * ease(t)));
    if (t < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

export function useScrollRestore() {
  const { pathname, key } = useLocation();

  useEffect(() => {
    const save = () => {
      const y = getScrollY();
      if (y > 0) sessionStorage.setItem(SK(pathname), String(Math.round(y)));
    };

    // 'pagehide' is more reliable than 'beforeunload' in Edge/Firefox/Safari
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
    window.addEventListener('scroll', save, { passive: true });

    return () => {
      window.removeEventListener('pagehide', save);
      window.removeEventListener('beforeunload', save);
      window.removeEventListener('scroll', save);
    };
  }, [pathname]);

  useEffect(() => {
    const sk = SK(pathname);
    const saved = sessionStorage.getItem(sk);

    if (!saved || parseInt(saved, 10) <= 0) {
      setScrollY(0);
      return;
    }

    const targetY = parseInt(saved, 10);
    sessionStorage.removeItem(sk);

    // Poll until the page is tall enough, then smooth-scroll
    let attempts = 0;
    const tryScroll = () => {
      const scrollable =
        Math.max(
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0
        ) - window.innerHeight;

      if (scrollable >= targetY || attempts >= 120) {
        smoothScrollTo(targetY);
        return;
      }
      attempts++;
      setTimeout(tryScroll, 50);
    };

    setTimeout(tryScroll, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
