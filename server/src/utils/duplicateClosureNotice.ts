/**
 * Markdown for thread (`metadata.reason`) and duplicate-resolution email.
 * References only report identifiers and dates — no titles, descriptions, or similarity scores.
 */
export const formatDuplicateClosureMarkdown = (params: {
  thisReportPublicId: string;
  canonicalReportPublicId: string;
  canonicalSubmittedAt: Date | string | undefined;
  actorDisplayName: string;
}): string => {
  const filed = params.canonicalSubmittedAt ? new Date(params.canonicalSubmittedAt) : new Date();
  const originalDate = filed.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const originalTime = filed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const recorded = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return [
    '**Duplicate resolution**',
    '',
    `**Your report ID:** \`${params.thisReportPublicId}\``,
    '**Outcome:** Duplicate — closed after triage review',
    '',
    '**Canonical submission**',
    '',
    'Under standard bug bounty policy, the **first** qualifying submission that documents a given issue is treated as the record for triage and any program decision (including bounty eligibility where rules allow). Your submission has been aligned with that earlier record.',
    '',
    `- **Canonical report ID:** \`${params.canonicalReportPublicId}\``,
    `- **Original filing date:** ${originalDate}`,
    `- **Original filing time:** ${originalTime}`,
    '',
    '**What this means for you**',
    '',
    '- Program review and status updates for this finding will continue on the **canonical** report identifier above.',
    '- This report thread remains available for correspondence about **this closure** only.',
    '- If you believe the duplicate determination is incorrect, reply **in this thread** with a brief, factual explanation (for example: different root cause, asset, or scope) so triage can reassess.',
    '',
    `**Recorded by:** ${params.actorDisplayName}`,
    `**Recorded at:** ${recorded}`,
  ].join('\n');
};

/** Short line for `status_change` content (timeline summary); details live in `metadata.reason`. */
export const duplicateClosureTimelineSummary = () =>
  'Duplicate resolution — this submission is closed. See the notice below for the canonical reference.';
