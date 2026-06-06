import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface AnimatedBackgroundProps {
  opacity?: number;
}

/**
 * Lightweight themed backdrop (cyber grid + spotlight that follows the cursor).
 * Mirrors the look of the main app's background without the heavy WebGL shader,
 * so the support portal stays fast and dependency-light.
 */
const AnimatedBackground = ({ opacity = 1 }: AnimatedBackgroundProps) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    setMounted(true);
    const onMove = (e: MouseEvent) => {
      setPos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  if (!mounted) return null;

  const isLight = resolvedTheme === 'light';
  const bg = isLight ? '#ffffff' : '#000000';
  const line = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const glow = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none transition-colors duration-300"
      style={{ backgroundColor: bg, opacity }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      <div
        className="absolute inset-0 transition-[background] duration-200"
        style={{
          background: `radial-gradient(600px circle at ${pos.x}% ${pos.y}%, ${glow}, transparent 60%)`,
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
