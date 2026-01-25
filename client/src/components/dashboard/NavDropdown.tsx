import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DropdownItem {
  label: string;
  path: string;
}

interface NavDropdownProps {
  label: string;
  icon?: React.ElementType;
  items: DropdownItem[];
}

export default function NavDropdown({ label, items }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Check if any child is active
  const isActive = items.some(item => {
    // Exact match for root paths to prevent greedy matching (e.g., /admin matching /admin/finance)
    if (item.path === '/admin') {
      return location.pathname === item.path;
    }
    // For other paths, ensure it matches exactly or is a true sub-path (starts with path + /)
    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  });

  return (
    <div 
      className="relative h-full flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Trigger Button */}
      <button 
        className={cn(
          "relative py-1 text-sm font-bold font-mono tracking-widest uppercase transition-colors duration-200",
          isOpen || isActive 
            ? "text-zinc-900 dark:text-white" 
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        )}
      >
        {label}
        {/* Animated Underline */}
        <span 
            className={cn(
                "absolute -bottom-1 left-0 w-full h-[2px] bg-zinc-900 dark:bg-white transition-transform duration-300 ease-out origin-center",
                isOpen || isActive ? "scale-x-100" : "scale-x-0"
            )} 
        />
      </button>

      {/* The Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full pt-4 w-56 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="bg-white dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl p-1">
            {items.map((item) => {
              const isItemActive = location.pathname === item.path;
              return (
                 <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                        "group flex items-center gap-3 px-4 py-3 text-xs font-mono rounded-md transition-all",
                         isItemActive 
                            ? "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/10 font-bold" 
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                    )}
                  >
                    {/* Hover Indicator Dot (Only on Hover) */}
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    {item.label}
                  </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
