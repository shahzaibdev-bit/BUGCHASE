import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SubmissionData } from './types';
import { cn } from '@/lib/utils';
import { Globe, Smartphone, FileCode, Layers, Loader2, Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  filterVrtTree,
  groupVrtByParent,
  vrtEntryKey,
} from '@/data/vrt-categories';

interface StepClassificationProps {
  data: SubmissionData;
  updateData: (updates: Partial<SubmissionData>) => void;
  programScope?: any[];
  isLoading?: boolean;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim().toLowerCase();
  if (!q) return text;

  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200/80 dark:bg-yellow-500/30 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function CollapsiblePanel({
  open,
  children,
  className,
  onTransitionEnd,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  onTransitionEnd?: () => void;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [shouldRender, setShouldRender] = useState(open);

  useLayoutEffect(() => {
    if (open) {
      setShouldRender(true);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!shouldRender || !innerRef.current) {
      if (!open) setHeight(0);
      return;
    }

    if (open) {
      setHeight(innerRef.current.scrollHeight);
      return;
    }

    setHeight(innerRef.current.scrollHeight);
    const frame = requestAnimationFrame(() => setHeight(0));
    return () => cancelAnimationFrame(frame);
  }, [open, shouldRender, children]);

  const handleTransitionEnd = () => {
    if (!open) {
      setShouldRender(false);
    }
    onTransitionEnd?.();
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={cn('overflow-hidden transition-[height] duration-300 ease-in-out', className)}
      style={{ height }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

function preventFocusScroll(e: React.MouseEvent) {
  e.preventDefault();
}

export const StepClassification = ({
  data,
  updateData,
  programScope = [],
  isLoading = false,
}: StepClassificationProps) => {
  const [search, setSearch] = useState('');
  const [manualExpandedKeys, setManualExpandedKeys] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const preserveListScroll = (action: () => void) => {
    const scrollTop = listRef.current?.scrollTop ?? 0;
    action();
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = scrollTop;
      }
    });
  };

  const allGroups = useMemo(() => groupVrtByParent(), []);
  const filteredGroups = useMemo(
    () => filterVrtTree(allGroups, search),
    [allGroups, search],
  );


  const searchExpandedKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set<string>();

    const keys = new Set<string>();
    for (const group of filteredGroups) {
      for (const item of group.items) {
        const key = vrtEntryKey(group.parent, item.vrt_category);
        const vrtMatches = item.vrt_category.toLowerCase().includes(q);
        const childMatches = item.children.some((c) => c.toLowerCase().includes(q));
        if (vrtMatches || childMatches) {
          keys.add(key);
        }
      }
    }
    return keys;
  }, [search, filteredGroups]);

  const collapseToSelection = () => {
    setManualExpandedKeys((prev) => {
      const next = new Set<string>();
      for (const key of prev) {
        if (data.vrtParent && data.vrtCategory && key === vrtEntryKey(data.vrtParent, data.vrtCategory)) {
          next.add(key);
        }
      }
      return next;
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (!value.trim()) {
      collapseToSelection();
    }
  };

  useEffect(() => {
    if (search.trim() && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [search, filteredGroups]);

  const toggleVrtCategory = (parent: string, vrtCategory: string) => {
    if (search.trim()) return;

    const key = vrtEntryKey(parent, vrtCategory);
    preserveListScroll(() => {
      setManualExpandedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    });
  };

  const handleSelectVariant = (parent: string, vrtCategory: string, variant: string) => {
    const key = vrtEntryKey(parent, vrtCategory);
    const isAlreadySelected =
      data.vrtParent === parent &&
      data.vrtCategory === vrtCategory &&
      data.vrtVariant === variant;

    preserveListScroll(() => {
      setManualExpandedKeys((prev) => new Set(prev).add(key));

      if (isAlreadySelected) {
        updateData({ vrtVariant: null });
        return;
      }

      updateData({
        vrtParent: parent,
        vrtCategory,
        vrtVariant: variant,
      });
    });
  };

  const isVrtExpanded = (key: string) =>
    search.trim() ? searchExpandedKeys.has(key) : manualExpandedKeys.has(key);

  const displayTargets =
    programScope && programScope.length > 0
      ? programScope.map((scopeItem, idx) => ({
          id: `scope-${idx}`,
          url: scopeItem.asset,
          type: scopeItem.type || 'Other',
          icon: scopeItem.type?.toLowerCase().includes('web')
            ? Globe
            : scopeItem.type?.toLowerCase().includes('mobile') ||
                scopeItem.type?.toLowerCase().includes('app')
              ? Smartphone
              : scopeItem.type?.toLowerCase().includes('contract')
                ? FileCode
                : Layers,
        }))
      : [];


  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-mono text-zinc-900 dark:text-white flex items-center gap-2">
          <span className="text-zinc-500 dark:text-zinc-400">01.</span> TARGET ASSET
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center p-8 border border-dashed border-zinc-200 dark:border-white/10 rounded-xl">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            <span className="ml-2 text-zinc-500">Loading program scope...</span>
          </div>
        ) : displayTargets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayTargets.map((target) => (
              <div
                key={target.id}
                onClick={() => updateData({ target: target.url, assetType: target.type as any })}
                className={cn(
                  'cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:border-zinc-500/50 hover:bg-zinc-500/5',
                  data.target === target.url
                    ? 'border-black dark:border-white bg-zinc-50 dark:bg-white/10 ring-1 ring-black dark:ring-white'
                    : 'border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      data.target === target.url
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-zinc-100 dark:bg-white/10 text-zinc-500',
                    )}
                  >
                    <target.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                      {target.type}
                    </div>
                    <div
                      className="text-xs text-zinc-500 font-mono truncate max-w-[150px]"
                      title={target.url}
                    >
                      {target.url}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 border border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-50 dark:bg-white/5 text-center">
            <p className="text-zinc-500">
              No specific assets found in scope. Please ensure you are submitting to a valid program.
            </p>
          </div>
        )}
      </div>

      {data.target && (
        <div className="space-y-4 animate-slide-down-fade">
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-mono text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="text-zinc-500 dark:text-zinc-400">02.</span> VULNERABILITY TYPE
            </h2>
            <p className="text-sm text-zinc-500 ml-8">
              Choose the Bugcrowd VRT category that best describes your finding
            </p>
          </div>

          <div className="border border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-50 dark:bg-zinc-950 overflow-hidden shadow-lg">
            <CollapsiblePanel
              open={!!data.vrtVariant}
              className="border-b border-emerald-200/60 dark:border-emerald-900/50"
            >
              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30">
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-0.5">
                  Selected
                </div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {data.vrtVariant}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {data.vrtParent} → {data.vrtCategory}
                </div>
              </div>
            </CollapsiblePanel>

            <div className="flex items-center gap-2 p-3 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-white/10 focus-visible:ring-black/20 dark:focus-visible:ring-white/20"
                  placeholder="Search parent, VRT category, or variant..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div
              ref={listRef}
              className="h-[480px] overflow-y-auto overscroll-contain [overflow-anchor:none] scrollbar-thin scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-600 scrollbar-track-transparent"
            >
              {filteredGroups.length > 0 ? (
                <div className="py-2">
                  {filteredGroups.map((group) => (
                      <div key={group.parent} className="mb-1">
                        <div
                          className="sticky top-0 z-20 px-4 py-2.5 bg-zinc-100/95 dark:bg-zinc-900/95 backdrop-blur-sm border-y border-zinc-200/80 dark:border-white/5"
                        >
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
                            {highlightMatch(group.parent, search)}
                          </h3>
                        </div>

                        <div className="pl-2 sm:pl-4">
                          {group.items.map((item) => {
                            const key = vrtEntryKey(group.parent, item.vrt_category);
                            const isExpanded = isVrtExpanded(key);
                            const isActiveVrt =
                              data.vrtParent === group.parent &&
                              data.vrtCategory === item.vrt_category;

                            return (
                              <div
                                key={key}
                                className="border-l-2 border-zinc-200 dark:border-white/10 ml-2 sm:ml-3"
                              >
                                <button
                                  type="button"
                                  onMouseDown={preventFocusScroll}
                                  onClick={() => toggleVrtCategory(group.parent, item.vrt_category)}
                                  className={cn(
                                    'w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 text-left transition-colors',
                                    'hover:bg-white dark:hover:bg-white/5',
                                    isActiveVrt && 'bg-white dark:bg-white/5',
                                  )}
                                >
                                  <ChevronRight
                                    className={cn(
                                      'w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-300 ease-in-out',
                                      isExpanded && 'rotate-90',
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      'text-sm',
                                      isActiveVrt
                                        ? 'font-semibold text-zinc-900 dark:text-white'
                                        : 'font-medium text-zinc-700 dark:text-zinc-300',
                                    )}
                                  >
                                    {highlightMatch(item.vrt_category, search)}
                                  </span>
                                </button>

                                <CollapsiblePanel open={isExpanded}>
                                  <div className="pb-2 pl-8 sm:pl-10 pr-2 sm:pr-4 space-y-0.5">
                                    {item.children.map((child) => {
                                      const isSelected =
                                        data.vrtParent === group.parent &&
                                        data.vrtCategory === item.vrt_category &&
                                        data.vrtVariant === child;

                                      return (
                                        <button
                                          key={child}
                                          type="button"
                                          onMouseDown={preventFocusScroll}
                                          onClick={() =>
                                            handleSelectVariant(
                                              group.parent,
                                              item.vrt_category,
                                              child,
                                            )
                                          }
                                          className={cn(
                                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150',
                                            'hover:bg-zinc-100 dark:hover:bg-white/10',
                                            isSelected &&
                                              'bg-zinc-100 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/20',
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                                              isSelected
                                                ? 'border-black dark:border-white'
                                                : 'border-zinc-300 dark:border-zinc-600',
                                            )}
                                          >
                                            {isSelected && (
                                              <div className="w-2 h-2 rounded-full bg-black dark:bg-white" />
                                            )}
                                          </div>
                                          <span
                                            className={cn(
                                              'text-sm',
                                              isSelected
                                                ? 'font-medium text-zinc-900 dark:text-white'
                                                : 'text-zinc-600 dark:text-zinc-400',
                                            )}
                                          >
                                            {highlightMatch(child, search)}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </CollapsiblePanel>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-16">
                  <Search className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No categories match &ldquo;{search}&rdquo;</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
