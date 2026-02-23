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
    let elementsScrollMap: Record<string, number> = {};

    // Restore previously saved state into our map so we don't lose it on next save
    const sk = SK(pathname);
    const savedRaw = sessionStorage.getItem(sk);
    if (savedRaw) {
        try {
            const data = JSON.parse(savedRaw);
            elementsScrollMap = data.elements || {};
        } catch { /* ignore */ }
    }

    let saveTimeout: any;

    const saveToStorage = () => {
      const mainY = getScrollY();
      const hasElements = Object.keys(elementsScrollMap).length > 0;
      
      if (mainY > 0 || hasElements) {
         sessionStorage.setItem(sk, JSON.stringify({
             main: Math.round(mainY),
             elements: elementsScrollMap
         }));
      } else {
         sessionStorage.removeItem(sk);
      }
    };

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      
      if (target === document || target === document.documentElement || target === document.body) {
         // It's the main scroll, handled implicitly by saveToStorage
      } else {
         // It's a nested scrollable element
         const el = target as HTMLElement;
         const path = getElementPath(el);
         if (path) {
            elementsScrollMap[path] = el.scrollTop;
         }
      }

      // Throttle the JSON stringify & storage write
      if (!saveTimeout) {
         saveTimeout = setTimeout(() => {
            saveToStorage();
            saveTimeout = null;
         }, 100);
      }
    };

    const forceSave = () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveToStorage();
    }

    // Capture: true ensures we catch ALL scroll events, even those that don't bubble
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('pagehide', forceSave);
    window.addEventListener('beforeunload', forceSave);

    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      window.removeEventListener('scroll', handleScroll, { capture: true } as any);
      window.removeEventListener('pagehide', forceSave);
      window.removeEventListener('beforeunload', forceSave);
    };
  }, [pathname]);

  // Restore mechanism
  useEffect(() => {
    const sk = SK(pathname);
    const savedRaw = sessionStorage.getItem(sk);
    
    if (!savedRaw) {
      setScrollY(0);
      return;
    }

    let targetMainY = 0;
    let targetElements: Record<string, number> = {};
    
    try {
        const data = JSON.parse(savedRaw);
        targetMainY = data.main || 0;
        targetElements = data.elements || {};
    } catch {
        // Fallback for old integer format
        targetMainY = parseInt(savedRaw, 10) || 0;
    }

    // Clean up storage so standard links start fresh
    sessionStorage.removeItem(sk);

    let attempts = 0;
    const MAX_ATTEMPTS = 120; // 6 seconds
    
    const tryRestore = () => {
      // 1. Check main scroll readiness
      const scrollable =
        Math.max(
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0
        ) - window.innerHeight;
      
      const mainReady = targetMainY === 0 || scrollable >= targetMainY;

      // 2. Try restoring elements
      let allElementsReady = true;
      for (const [selector, scrollTop] of Object.entries(targetElements)) {
          try {
              const el = document.querySelector(selector) as HTMLElement;
              if (el) {
                  el.scrollTop = scrollTop as number;
              } else {
                  allElementsReady = false; // still waiting for this element to render
              }
          } catch(e) {
              // Invalid selector — ignore and don't let it block readiness
          }
      }

      if ((mainReady && allElementsReady) || attempts >= MAX_ATTEMPTS) {
        if (targetMainY > 0) {
            smoothScrollTo(targetMainY);
        } else {
            setScrollY(0);
        }
        return;
      }
      
      attempts++;
      setTimeout(tryRestore, 50);
    };

    setTimeout(tryRestore, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** 
 * Generates a stable CSS selector path to uniquely identify nested scrollable elements.
 * Ignores dynamic/auto-generated IDs (like radix UI) for stability.
 */
function getElementPath(el: HTMLElement | null): string {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
  const path: string[] = [];
  
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    
    // Stop at body/html as they belong to the main scroll
    if (selector === 'html' || selector === 'body') break;
    
    // Use ID if stable
    if (el.id && !el.id.includes(':') && !el.id.match(/^radix-/)) {
      selector += `#${el.id}`;
      path.unshift(selector);
      break; 
    } else {
      let sib = el, nth = 1;
      while ((sib = sib.previousElementSibling as HTMLElement)) {
        if (sib.nodeName.toLowerCase() === selector) nth++;
      }
      selector += `:nth-of-type(${nth})`;
    }
    
    path.unshift(selector);
    el = el.parentNode as HTMLElement;
  }
  
  return path.join(' > ');
}

