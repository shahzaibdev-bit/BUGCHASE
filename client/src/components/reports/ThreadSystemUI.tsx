import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const BUGCHASE_SYSTEM_LABEL = 'BugChase System';

export function formatThreadStatusLabel(status: string) {
  return String(status || 'unknown').replace(/_/g, ' ');
}

export function BugChaseSystemActor() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{BUGCHASE_SYSTEM_LABEL}</span>
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 font-medium bg-amber-50 dark:bg-amber-950/40"
      >
        Platform
      </Badge>
    </div>
  );
}

export function ThreadStatusPill({ status }: { status: string }) {
  const label = formatThreadStatusLabel(status);
  const isDispute = status === 'In Dispute';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-md border font-bold text-[11px] uppercase tracking-wide',
        isDispute
          ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-sm dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-600'
          : 'bg-zinc-100 text-zinc-900 border-zinc-300 shadow-sm dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600',
      )}
    >
      {label}
    </span>
  );
}

export function ThreadStatusChangeLine({
  newStatus,
  content,
}: {
  newStatus?: string;
  content?: string;
}) {
  const resolved =
    newStatus ||
    content
      ?.replace('Changed status to ', '')
      .replace('System changed status to ', '')
      .split('.')[0]
      .trim() ||
    'unknown';

  return (
    <span className="text-zinc-800 dark:text-zinc-200 text-[14px] flex flex-wrap items-center gap-1.5 font-medium tracking-tight">
      changed the status to <ThreadStatusPill status={resolved} />
    </span>
  );
}
