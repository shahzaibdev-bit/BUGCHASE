/** Prior workflow states where moving back to Triaging is treated as a formal “reopen for triage”. */
export const PRIOR_STATUSES_REOPEN_TO_TRIAGING = new Set([
  'Triaged',
  'Closed',
  'Duplicate',
  'Resolved',
  'Spam',
  'NA',
  'Paid',
  'Out-of-Scope',
]);

export const isReopenToTriaging = (oldStatus: string | undefined, newStatus: string): boolean =>
  newStatus === 'Triaging' &&
  !!oldStatus &&
  String(oldStatus) !== 'Triaging' &&
  PRIOR_STATUSES_REOPEN_TO_TRIAGING.has(String(oldStatus));

/**
 * Markdown for thread (`metadata.reason`) and email triage section when a report is reopened for triage.
 * Intentionally excludes report title, program, description, or other finding content — only workflow metadata.
 */
export const formatReopenForTriageMarkdown = (params: {
  reportPublicId: string;
  previousStatus: string;
  actorDisplayName: string;
  optionalTriagerNote?: string;
}): string => {
  const stamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const note = params.optionalTriagerNote?.trim()
    ? `\n\n---\n**Additional note from triage**\n\n${params.optionalTriagerNote.trim()}`
    : '';

  return [
    '**Report reopened for triage**',
    '',
    `**Report ID:** \`${params.reportPublicId}\``,
    `**Previous status:** ${params.previousStatus}`,
    '**Current status:** Triaging',
    `**Action by:** ${params.actorDisplayName}`,
    `**Effective time:** ${stamp}`,
    '',
    'This submission has been returned to the **active triage queue**. The triage team may reassess workflow fields (such as scope, severity, or duplicate indicators) and may request clarifications in the thread.',
    '',
    '**What you should do next**',
    '',
    '- Watch this report thread for questions from triagers.',
    '- Add any new material **as replies on the thread** — it will not be duplicated here.',
    '- You do not need to reply unless a triager asks for information.',
    note,
  ].join('\n');
};
