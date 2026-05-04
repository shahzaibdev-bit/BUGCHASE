import mongoose from 'mongoose';
import User from '../models/User';

export const SEVERITY_RESOLVE_POINTS: Record<string, number> = {
  Critical: 50,
  High: 30,
  Medium: 20,
  Low: 5,
  None: 0,
};

const INITIAL_TRIAGE_POINTS = 2;
const DUPLICATE_POINTS = 2;
const NA_POINTS = -5;
const SPAM_POINTS = -10;

export type ResearcherReputationActor = 'triager' | 'company' | 'admin' | 'mark_duplicate';

function getResearcherObjectId(report: { researcherId?: unknown }): mongoose.Types.ObjectId | null {
  const r = report.researcherId as { _id?: mongoose.Types.ObjectId } | mongoose.Types.ObjectId | undefined;
  if (!r) return null;
  if (r instanceof mongoose.Types.ObjectId) return r;
  if (typeof r === 'object' && r !== null && '_id' in r && r._id) return r._id as mongoose.Types.ObjectId;
  return null;
}

function ensureSnapshot(report: any) {
  if (!report.reputationSnapshot || typeof report.reputationSnapshot !== 'object') {
    report.reputationSnapshot = {
      triagePromoteAwarded: false,
      companyResolvedAwarded: false,
      duplicateAwarded: false,
      naPenaltyAwarded: false,
      spamPenaltyAwarded: false,
    };
  }
}

/** Call when a report returns to Triaging so promote/resolve (and closure outcomes) can be earned again on the next cycle. */
export function clearReputationMilestonesForReTriage(report: any) {
  report.reputationSnapshot = {
    triagePromoteAwarded: false,
    companyResolvedAwarded: false,
    duplicateAwarded: false,
    naPenaltyAwarded: false,
    spamPenaltyAwarded: false,
  };
}

async function incResearcherReputation(researcherId: mongoose.Types.ObjectId, delta: number) {
  if (delta === 0) return;
  await User.findByIdAndUpdate(researcherId, { $inc: { reputationScore: delta } });
}

/**
 * Applies one-time researcher reputation deltas for a status transition.
 * Mutates `report.reputationSnapshot`; caller must save the report.
 */
export async function applyResearcherReputationOnStatusTransition(
  report: any,
  oldStatus: string,
  newStatus: string,
  actor: ResearcherReputationActor
): Promise<void> {
  if (oldStatus === newStatus) return;

  const researcherId = getResearcherObjectId(report);
  if (!researcherId) return;

  ensureSnapshot(report);
  const snap = report.reputationSnapshot;

  const triagerLike = actor === 'triager' || actor === 'admin';

  // Promote to company (initial triage engagement)
  if (newStatus === 'Triaged' && oldStatus !== 'Triaged' && triagerLike && !snap.triagePromoteAwarded) {
    snap.triagePromoteAwarded = true;
    await incResearcherReputation(researcherId, INITIAL_TRIAGE_POINTS);
  }

  // Duplicate recognition (triager UI, admin, or explicit duplicate endpoint)
  if (newStatus === 'Duplicate' && oldStatus !== 'Duplicate' && !snap.duplicateAwarded) {
    if (triagerLike || actor === 'mark_duplicate') {
      snap.duplicateAwarded = true;
      await incResearcherReputation(researcherId, DUPLICATE_POINTS);
    }
  }

  // Not applicable
  if (newStatus === 'NA' && oldStatus !== 'NA' && triagerLike && !snap.naPenaltyAwarded) {
    snap.naPenaltyAwarded = true;
    await incResearcherReputation(researcherId, NA_POINTS);
  }

  // Spam / malicious
  if (newStatus === 'Spam' && oldStatus !== 'Spam' && triagerLike && !snap.spamPenaltyAwarded) {
    snap.spamPenaltyAwarded = true;
    await incResearcherReputation(researcherId, SPAM_POINTS);
  }

  // Final severity points when the report first reaches Resolved (company, triager, or admin)
  if (newStatus === 'Resolved' && oldStatus !== 'Resolved' && !snap.companyResolvedAwarded) {
    snap.companyResolvedAwarded = true;
    const sev = String(report.severity || 'None');
    const pts = SEVERITY_RESOLVE_POINTS[sev] ?? 0;
    await incResearcherReputation(researcherId, pts);
  }
}
