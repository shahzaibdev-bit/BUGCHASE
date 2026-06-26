export const REPORT_IN_DISPUTE_STATUS = 'In Dispute';

export const isReportThreadLocked = (status?: string | null) =>
  status === REPORT_IN_DISPUTE_STATUS;

export const RESEARCHER_THREAD_CLOSED_STATUSES = new Set([
  'Duplicate',
  'Spam',
  'NA',
  'Out-of-Scope',
  'Closed',
  'Resolved',
  'Paid',
]);

export const isResearcherReportThreadLocked = (status?: string | null) => {
  const normalized = String(status || '').trim();
  if (!normalized) return false;
  if (normalized === REPORT_IN_DISPUTE_STATUS) return true;
  return RESEARCHER_THREAD_CLOSED_STATUSES.has(normalized);
};

export const getResearcherThreadLockedMessage = (status?: string | null) => {
  if (status === REPORT_IN_DISPUTE_STATUS) return REPORT_THREAD_LOCKED_MESSAGE;
  return 'This report is closed. You cannot participate in the thread until a triager reopens it for triage.';
};

export const isSystemDisputeStatusEvent = (metadata?: {
  systemAction?: boolean;
  kind?: string;
}) =>
  Boolean(
    metadata?.systemAction ||
      metadata?.kind === 'dispute_opened' ||
      metadata?.kind === 'dispute_closed',
  );

export const REPORT_THREAD_LOCKED_MESSAGE =
  'This report thread is locked while a support dispute is in progress. Please use your Support ticket or wait for a decision.';
