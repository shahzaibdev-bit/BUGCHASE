export type ReportTimelineConfig = {
  steps: string[];
  activeIndex: number;
  variant: 'default' | 'dispute' | 'terminal';
};

const TERMINAL_STATUSES = ['Duplicate', 'Spam', 'NA', 'Out-of-Scope', 'Closed'] as const;

const PROGRESS_INDEX: Record<string, number> = {
  Submitted: 0,
  Triaging: 1,
  'Under Review': 1,
  'Needs Info': 1,
  Triaged: 2,
  Pending_Fix: 2,
  Paid: 3,
  Resolved: 4 };

/** Build timeline steps that match the report's real lifecycle status. */
export function getReportTimelineConfig(
  status: string,
  statusBeforeDispute?: string | null,
): ReportTimelineConfig {
  if (status === 'In Dispute') {
    const prior = statusBeforeDispute || 'Triaging';
    const base = ['Submitted', 'Triaging', 'Triaged'];
    const priorIdx = Math.max(PROGRESS_INDEX[prior] ?? 1, 1);
    const steps = [...base.slice(0, priorIdx + 1), 'In Dispute'];
    return { steps, activeIndex: steps.length - 1, variant: 'dispute' };
  }

  if (TERMINAL_STATUSES.includes(status as (typeof TERMINAL_STATUSES)[number])) {
    const steps =
      status === 'Duplicate' || status === 'Spam'
        ? ['Submitted', 'Triaging', status]
        : ['Submitted', status];
    return { steps, activeIndex: steps.length - 1, variant: 'terminal' };
  }

  const steps = ['Submitted', 'Triaging', 'Triaged', 'Paid', 'Resolved'];
  return {
    steps,
    activeIndex: PROGRESS_INDEX[status] ?? 0,
    variant: 'default' };
}
