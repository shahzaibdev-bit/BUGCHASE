/**
 * Points from profile setup + KYC (same rules as the researcher submit checklist).
 * This is NOT persisted on the user document — it is computed for gating / progress only.
 * Stored bounty/triage reputation stays in `User.reputationScore` only.
 */
export function getProfileCompletionReputationScore(user: {
  username?: string;
  bioUpdated?: boolean;
  bio?: string;
  country?: string;
  linkedAccounts?: { github?: string; linkedin?: string; twitter?: string };
  isVerified?: boolean;
}): number {
  let score = 0;
  score += 10;
  if (user.username) score += 10;
  if (user.bioUpdated && user.bio && user.bio.length > 0) score += 20;
  if (user.country) score += 10;
  const hasSocial = !!(
    user.linkedAccounts?.github ||
    user.linkedAccounts?.linkedin ||
    user.linkedAccounts?.twitter
  );
  if (hasSocial) score += 20;
  if (user.isVerified) score += 80;
  return score;
}
