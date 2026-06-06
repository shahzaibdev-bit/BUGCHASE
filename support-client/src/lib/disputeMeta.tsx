import { DisputePriority, DisputeStatus } from '@/types';

export const STATUS_META: Record<DisputeStatus, { label: string; className: string }> = {
  open: {
    label: 'Open',
    className:
      'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  },
  in_review: {
    label: 'In Review',
    className:
      'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  },
  resolved: {
    label: 'Resolved',
    className:
      'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  },
  rejected: {
    label: 'Rejected',
    className:
      'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10',
  },
};

export const PRIORITY_META: Record<DisputePriority, { label: string; className: string }> = {
  low: {
    label: 'Low',
    className: 'bg-zinc-100 dark:bg-white/5 text-zinc-500 border-zinc-200 dark:border-white/10',
  },
  medium: {
    label: 'Medium',
    className:
      'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30',
  },
  high: {
    label: 'High',
    className:
      'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
  },
  critical: {
    label: 'Critical',
    className:
      'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30',
  },
};

export function formatDate(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}
