const AI_DUPLICATE_TERMINAL = new Set(['completed', 'failed', 'no_candidates', 'skipped']);
const AI_TRIAGE_TERMINAL = new Set(['completed', 'failed', 'skipped']);

/** True while duplicate scan and/or CVSS triage are still queued or running. */
export function isReportAiProcessing(report: any): boolean {
  const dupStatus = String(report?.aiDuplicateAnalysis?.status || 'pending');
  const triageStatus = String(report?.aiTriage?.status || 'pending');
  return !AI_DUPLICATE_TERMINAL.has(dupStatus) || !AI_TRIAGE_TERMINAL.has(triageStatus);
}

export function aiProcessingLabel(report: any): string {
  const dupBusy = !AI_DUPLICATE_TERMINAL.has(String(report?.aiDuplicateAnalysis?.status || 'pending'));
  const triageBusy = !AI_TRIAGE_TERMINAL.has(String(report?.aiTriage?.status || 'pending'));
  if (dupBusy && triageBusy) return 'Duplicate scan & CVSS triage running…';
  if (dupBusy) return 'Duplicate scan running…';
  if (triageBusy) return 'CVSS triage running…';
  return 'Processing…';
}
