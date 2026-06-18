export const REPORT_IN_DISPUTE_STATUS = 'In Dispute';

export const isReportThreadLocked = (status?: string | null) =>
  status === REPORT_IN_DISPUTE_STATUS;

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
