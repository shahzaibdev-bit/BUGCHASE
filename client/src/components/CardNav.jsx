import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
// use your own icon import if react-icons is not available
import { GoArrowUpRight } from 'react-icons/go';
import { InteractiveNavLink } from './InteractiveNavLink';

const CardNav = ({
  logo,
  logoAlt = 'Logo',
  items,
  className = '',
  ease = 'power3.out',
  baseColor = '#fff',
  menuColor,
  buttonBgColor,
  buttonTextColor,
  theme
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const navRef = useRef(null);
  const contentRef = useRef(null);
  const tlRef = useRef(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 40;

    const contentEl = contentRef.current;
    if (contentEl) {
        // Simple measurement of the active content
        const h = contentEl.scrollHeight;
        return 40 + h;
    }
    return 300;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    const contentEl = contentRef.current;
    if (!navEl || !contentEl) return null;

    gsap.set(navEl, { height: 40 });
    // Animate the content container itself
    gsap.set(contentEl, { y: 20, opacity: 0, autoAlpha: 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.3,
      ease
    });

    tl.to(contentEl, { 
        y: 0, 
        opacity: 1, 
        autoAlpha: 1, 
        duration: 0.3, 
        ease 
    }, 0); // Play together

    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
  }, [items]); // Re-create if items change

  // Dynamic Height Update on Tab Change
  useLayoutEffect(() => {
     if (isExpanded) {
         const newH = calculateHeight();
         gsap.to(navRef.current, { height: newH, duration: 0.3, ease });
     }
  }, [activeIndex, isExpanded]);

  const hoverTimeout = useRef(null);
  const closeTimeout = useRef(null);

  const clearTimeouts = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  };

  const openMenu = () => {
    clearTimeouts();
    if (!tlRef.current) tlRef.current = createTimeline(); 
    if (!tlRef.current) return;
    
    setIsHamburgerOpen(true);
    setIsExpanded(true);
    tlRef.current.play();
  };

  const closeMenu = () => {
    clearTimeouts();
    closeTimeout.current = setTimeout(() => {
        if (!tlRef.current) return;
        setIsHamburgerOpen(false);
        tlRef.current.reverse();
        tlRef.current.eventCallback('onReverseComplete', () => setIsExpanded(false));
    }, 100); // 100ms buffer for smoother exit
  };

  const handleTriggerHover = (idx) => {
      clearTimeouts();
      setActiveIndex(idx);
      
      // If already open, stay open. If closed, wait for intent.
      if (isExpanded) {
          // No delay if switching tabs
      } else {
          hoverTimeout.current = setTimeout(() => {
              openMenu();
          }, 150); // 150ms delay - prevents "drive-by" expansion
      }
  };

  return (
    <div
      className={`card-nav-container relative z-auto ${className}`} 
      onMouseEnter={() => {
        // Keep it open if we enter the container (e.g. from button to list)
        clearTimeouts();
      }} 
      onMouseLeave={closeMenu}
    >
      <nav
        ref={navRef}
        className={`card-nav ${isExpanded ? 'open' : ''} block h-[40px] p-0 relative transition-none`} // Removed overflow-hidden to allow dropdown to breakout if needed (though we want it contained in parent height for expansion effect?? User said absolute top-full)
        style={{ backgroundColor: baseColor }}
      >
        <div className="card-nav-top relative h-[40px] flex items-center justify-between px-2 z-50"> 
          {/* Hamburger (Mobile) */}
          <div
            className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''} group h-full w-8 shrink-0 ml-auto flex flex-col items-center justify-center cursor-pointer gap-[6px] order-2 md:hidden z-50 pointer-events-auto`}
            onClick={(e) => {
                 e.stopPropagation();
                 isExpanded ? closeMenu() : openMenu();
            }}
            role="button"
            tabIndex={0}
            style={{ color: menuColor || '#000' }}
          >
            <div className={`hamburger-line w-6 h-0.5 bg-current rounded-full transition-all duration-300 ${isHamburgerOpen ? 'translate-y-[5px] rotate-45' : ''}`} />
            <div className={`hamburger-line w-6 h-0.5 bg-current rounded-full transition-all duration-300 ${isHamburgerOpen ? '-translate-y-[5px] -rotate-45' : ''}`} />
          </div>

          {/* Desktop Triggers */}
          <div className="hidden md:flex items-center gap-8 h-full">
             {(items || []).map((item, idx) => (
                <div
                    key={idx}
                    onMouseEnter={() => handleTriggerHover(idx)}
                    className={`group relative text-sm font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer h-full flex items-center justify-center translate-y-[1px] ${
                        isExpanded && activeIndex === idx 
                          ? (theme === 'dark' ? 'text-white' : 'text-zinc-900') 
                          : (theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-zinc-500 hover:text-zinc-900')
                    }`}
                >
                    {item.label}
                </div>
             ))}
          </div> <div/> 
        </div>

        {/* LAYER 2: Dropdown Content */}
        <div
          ref={contentRef}
          className="card-nav-content absolute left-0 right-0 top-[40px] pt-6 p-0 flex flex-col items-center justify-start z-40" 
        >
          {/* Active Card */}
          {(items || [])[activeIndex] && (
            <div
              key={`${items[activeIndex].label}-${activeIndex}`}
              className="nav-card select-none relative flex flex-col gap-2 p-2 rounded-lg w-full max-w-3xl mx-auto"
              ref={(el) => {
                  if (el) {
                      gsap.fromTo(el, 
                          { opacity: 0, y: 10, scale: 0.98 }, 
                          { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out', clearProps: 'transform,opacity,scale' }
                      );
                  }
              }}
              style={{ color: items[activeIndex].textColor }}
            >
              <div className="nav-card-label font-bold tracking-tight text-lg mb-1 flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-1">
                <span className="text-xs font-mono uppercase text-zinc-500 dark:text-white/50 opacity-100 tracking-widest">{items[activeIndex].headerLeft}</span>
                <span className="text-xs font-mono uppercase text-zinc-500 dark:text-white/50 opacity-100 tracking-widest">{items[activeIndex].headerRight}</span>
              </div>
              <div className="nav-card-links grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                {items[activeIndex].links?.map((lnk, i) => (
                  <InteractiveNavLink
                    key={i}
                    href={lnk.href}
                    label={lnk.label}
                    description={lnk.description}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
