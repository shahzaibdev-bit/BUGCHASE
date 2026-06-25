import crypto from 'crypto';
import mongoose from 'mongoose';
import Program from '../models/Program';
import Report from '../models/Report';
import User from '../models/User';
import PrivateProgramInvite from '../models/PrivateProgramInvite';
import redisClient from '../config/redis';
import { sendEmail, privateProgramInviteTemplate } from './emailService';

export const INVITE_TTL_DAYS = 14;
export const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 10;

const VALID_REPORT_STATUSES = new Set([
  'Resolved',
  'Paid',
  'Triaged',
  'Pending_Fix',
  'Closed',
  'Under Review',
]);

const INVALID_REPORT_STATUSES = new Set(['Spam', 'Duplicate', 'NA', 'Out-of-Scope']);

export type PrivateInviteSettings = {
  autoInviteEnabled: boolean;
  targetMonthlyReports: number;
  inviteToReportMultiplier: number;
  dailyInviteBatchSize: number;
  minSnrPercent: number;
  minReputationScore: number;
  minImpactScore: number;
  maxActivePrivateInvitesPerResearcher: number;
  assetTags: string[];
  lookbackDays: number;
};

export const DEFAULT_PRIVATE_INVITE_SETTINGS: PrivateInviteSettings = {
  autoInviteEnabled: false,
  targetMonthlyReports: 15,
  inviteToReportMultiplier: 4,
  dailyInviteBatchSize: DEFAULT_BATCH_SIZE,
  minSnrPercent: 80,
  minReputationScore: 0,
  minImpactScore: 0,
  maxActivePrivateInvitesPerResearcher: 5,
  assetTags: ['Web', 'API'],
  lookbackDays: 30,
};

function toFiniteNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizePrivateInviteSettings(raw?: Partial<PrivateInviteSettings> | null): PrivateInviteSettings {
  return {
    autoInviteEnabled: Boolean(raw?.autoInviteEnabled),
    targetMonthlyReports: Math.max(1, toFiniteNumber(raw?.targetMonthlyReports, DEFAULT_PRIVATE_INVITE_SETTINGS.targetMonthlyReports)),
    inviteToReportMultiplier: Math.max(1, toFiniteNumber(raw?.inviteToReportMultiplier, DEFAULT_PRIVATE_INVITE_SETTINGS.inviteToReportMultiplier)),
    dailyInviteBatchSize: Math.min(50, Math.max(1, toFiniteNumber(raw?.dailyInviteBatchSize, DEFAULT_PRIVATE_INVITE_SETTINGS.dailyInviteBatchSize))),
    minSnrPercent: Math.min(100, Math.max(0, toFiniteNumber(raw?.minSnrPercent, DEFAULT_PRIVATE_INVITE_SETTINGS.minSnrPercent))),
    minReputationScore: Math.max(0, toFiniteNumber(raw?.minReputationScore, DEFAULT_PRIVATE_INVITE_SETTINGS.minReputationScore)),
    minImpactScore: Math.max(0, toFiniteNumber(raw?.minImpactScore, DEFAULT_PRIVATE_INVITE_SETTINGS.minImpactScore)),
    maxActivePrivateInvitesPerResearcher: Math.max(1, toFiniteNumber(raw?.maxActivePrivateInvitesPerResearcher, DEFAULT_PRIVATE_INVITE_SETTINGS.maxActivePrivateInvitesPerResearcher)),
    assetTags: Array.isArray(raw?.assetTags) && raw!.assetTags.length ? raw!.assetTags.map(String) : [...DEFAULT_PRIVATE_INVITE_SETTINGS.assetTags],
    lookbackDays: Math.max(7, toFiniteNumber(raw?.lookbackDays, DEFAULT_PRIVATE_INVITE_SETTINGS.lookbackDays)),
  };
}

export function generateInviteToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function redisInviteKey(token: string) {
  return `private_program_invite:${token}`;
}

async function setInviteRedisTtl(token: string) {
  try {
    await redisClient.set(redisInviteKey(token), '1', 'EX', INVITE_TTL_DAYS * 24 * 60 * 60);
  } catch (err) {
    console.error('[private-invite] Redis TTL set failed:', err);
  }
}

function isReportInvalid(status: string) {
  return INVALID_REPORT_STATUSES.has(status);
}

function isReportValid(status: string) {
  return !isReportInvalid(status);
}

function severityWeight(severity?: string) {
  switch (severity) {
    case 'Critical': return 4;
    case 'High': return 3;
    case 'Medium': return 2;
    case 'Low': return 1;
    default: return 0;
  }
}

export type ResearcherTrustMetrics = {
  researcherId: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  reputationScore: number;
  totalReports: number;
  validReports: number;
  snrPercent: number;
  impactScore: number;
  assetTagCounts: Record<string, number>;
  assetMatchScore: number;
  activePrivateInvites: number;
  lastActiveAt: string | null;
  isActiveRecently: boolean;
  compositeScore: number;
  passesTrustGate: boolean;
  eligibleForAutoInvite: boolean;
  eligibleForManualInvite: boolean;
  gateReasons: string[];
};

export async function buildResearcherTrustMetrics(
  researcher: any,
  allReports: any[],
  programSettings: PrivateInviteSettings,
  programAssetTags: string[],
  activeInviteCount: number,
): Promise<ResearcherTrustMetrics> {
  const researcherId = researcher._id.toString();
  const researcherReports = allReports.filter((r) => r.researcherId?.toString?.() === researcherId || r.researcherId?._id?.toString?.() === researcherId);

  const totalReports = researcherReports.length;
  const invalidReports = researcherReports.filter((r) => isReportInvalid(r.status)).length;
  const validReports = totalReports - invalidReports;
  const snrPercent = totalReports > 0 ? Math.round((validReports / totalReports) * 100) : 0;

  const scorableReports = researcherReports.filter((r) => !isReportInvalid(r.status));
  const validWithCvss = scorableReports.filter((r) => typeof r.cvssScore === 'number' && r.cvssScore > 0);
  let impactScore = 0;
  if (validWithCvss.length) {
    impactScore = Math.round((validWithCvss.reduce((s, r) => s + (r.cvssScore || 0), 0) / validWithCvss.length) * 10) / 10;
  } else if (scorableReports.length) {
    impactScore = Math.round(
      (scorableReports.reduce((s, r) => s + severityWeight(r.severity), 0) / scorableReports.length) * 10,
    ) / 10;
  }

  const assetTagCounts: Record<string, number> = {};
  for (const r of researcherReports) {
    if (isReportInvalid(r.status)) continue;
    const tag = (r.assetType || 'Web').trim() || 'Web';
    assetTagCounts[tag] = (assetTagCounts[tag] || 0) + 1;
  }

  let assetMatchScore = 0;
  for (const tag of programAssetTags) {
    assetMatchScore += (assetTagCounts[tag] || 0) * 2;
    assetMatchScore += severityWeight(
      scorableReports.find((r) => (r.assetType || 'Web') === tag)?.severity,
    );
  }

  const lastReportAt = researcherReports.reduce<Date | null>((max, r) => {
    const d = r.createdAt ? new Date(r.createdAt) : null;
    if (!d) return max;
    return !max || d > max ? d : max;
  }, null);
  const userUpdated = researcher.updatedAt ? new Date(researcher.updatedAt) : null;
  const lastActive = lastReportAt && userUpdated
    ? (lastReportAt > userUpdated ? lastReportAt : userUpdated)
    : (lastReportAt || userUpdated);
  const lookbackMs = programSettings.lookbackDays * 24 * 60 * 60 * 1000;
  const isActiveRecently = lastActive ? Date.now() - lastActive.getTime() <= lookbackMs : false;

  const gateReasons: string[] = [];
  if (totalReports === 0) gateReasons.push('No prior reports on your programs');
  if (snrPercent < programSettings.minSnrPercent) gateReasons.push(`SNR below ${programSettings.minSnrPercent}%`);
  if ((researcher.reputationScore || 0) < programSettings.minReputationScore) gateReasons.push('Reputation too low');
  if (impactScore < programSettings.minImpactScore) gateReasons.push('Impact score too low');
  if (!isActiveRecently) gateReasons.push(`Inactive in last ${programSettings.lookbackDays} days`);
  if (activeInviteCount >= programSettings.maxActivePrivateInvitesPerResearcher) gateReasons.push('Too many active private invites');

  const eligibleForManualInvite = totalReports > 0;
  const eligibleForAutoInvite =
    eligibleForManualInvite &&
    snrPercent >= programSettings.minSnrPercent &&
    (researcher.reputationScore || 0) >= programSettings.minReputationScore &&
    impactScore >= programSettings.minImpactScore &&
    isActiveRecently &&
    activeInviteCount < programSettings.maxActivePrivateInvitesPerResearcher;

  const compositeScore =
    snrPercent * 2 +
    (researcher.reputationScore || 0) * 0.5 +
    impactScore * 5 +
    assetMatchScore * 3 -
    activeInviteCount * 10;

  return {
    researcherId,
    name: researcher.name || researcher.username || 'Researcher',
    username: researcher.username || '',
    email: researcher.email || '',
    avatar: researcher.avatar || '',
    reputationScore: researcher.reputationScore || 0,
    totalReports,
    validReports,
    snrPercent,
    impactScore,
    assetTagCounts,
    assetMatchScore,
    activePrivateInvites: activeInviteCount,
    lastActiveAt: lastActive ? lastActive.toISOString() : null,
    isActiveRecently,
    compositeScore,
    passesTrustGate: eligibleForAutoInvite,
    eligibleForAutoInvite,
    eligibleForManualInvite,
    gateReasons,
  };
}

export async function getProgramThirtyDayValidReportCount(programId: mongoose.Types.ObjectId | string, lookbackDays = 30) {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const reports = await Report.find({
    programId: programId.toString(),
    createdAt: { $gte: since },
    status: { $in: Array.from(VALID_REPORT_STATUSES) },
  }).select('_id');
  return reports.length;
}

export async function scoreEligibleResearchersForProgram(program: any, options?: { limit?: number; autoInviteOnly?: boolean }) {
  const settings = normalizePrivateInviteSettings(program.privateInviteSettings);
  const companyId = program.companyId?.toString?.() || String(program.companyId);
  const companyPrograms = await Program.find({ companyId }).select('_id');
  const companyProgramIds = companyPrograms.map((p) => p._id.toString());

  if (!companyProgramIds.length) return [];

  const reports = await Report.find({ programId: { $in: companyProgramIds } })
    .select('researcherId programId severity status createdAt cvssScore assetType')
    .populate('researcherId', 'name username email avatar reputationScore updatedAt role');

  const researcherIdSet = new Set<string>();
  for (const r of reports as any[]) {
    const rid = r.researcherId?._id?.toString?.() || r.researcherId?.toString?.();
    if (rid) researcherIdSet.add(rid);
  }

  if (!researcherIdSet.size) return [];

  const researcherIds = [...researcherIdSet];
  const researchers = await User.find({
    _id: { $in: researcherIds },
  }).select('name username email avatar reputationScore updatedAt role');

  const activeInviteCounts = await PrivateProgramInvite.aggregate([
    {
      $match: {
        researcherId: { $in: researcherIds.map((id) => new mongoose.Types.ObjectId(id)) },
        status: { $in: ['invited', 'accepted'] },
      },
    },
    { $group: { _id: '$researcherId', count: { $sum: 1 } } },
  ]);
  const activeMap = new Map(activeInviteCounts.map((r: any) => [r._id.toString(), r.count]));

  const existingInvites = await PrivateProgramInvite.find({ programId: program._id }).select('researcherId status invitedAt token expiresAt source');
  const inviteMap = new Map(existingInvites.map((i: any) => [i.researcherId.toString(), i]));

  const programAssetTags: string[] = settings.assetTags.length
    ? settings.assetTags
    : Array.from(new Set((program.scope || []).map((s: any) => String(s.type || 'Web'))));

  const scored: (ResearcherTrustMetrics & {
    inviteStatus: string | null;
    invitedAt: Date | null;
    inviteToken?: string;
    hasPriorReportWithCompany: boolean;
  })[] = [];

  for (const researcher of researchers) {
    if (researcher.role && researcher.role !== 'researcher') continue;
    const rid = researcher._id.toString();
    const metrics = await buildResearcherTrustMetrics(
      researcher,
      reports,
      settings,
      programAssetTags,
      activeMap.get(rid) || 0,
    );

    if (!metrics.eligibleForManualInvite) continue;
    if (options?.autoInviteOnly && !metrics.eligibleForAutoInvite) continue;

    const invite = inviteMap.get(rid);
    scored.push({
      ...metrics,
      inviteStatus: invite?.status || null,
      invitedAt: invite?.invitedAt || null,
      inviteToken: invite?.token,
      hasPriorReportWithCompany: true,
    });
  }

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  if (options?.limit) return scored.slice(0, options.limit);
  return scored;
}

export async function sendPrivateProgramInviteEmail(invite: any, program: any, researcher: any) {
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const inviteUrl = `${clientUrl}/researcher/private-invite/${invite.token}`;
  const settings = normalizePrivateInviteSettings(program.privateInviteSettings);

  await sendEmail(
    researcher.email,
    `[BugChase] Private program invite — ${program.title}`,
    privateProgramInviteTemplate({
      researcherName: researcher.name || researcher.username || 'Researcher',
      programTitle: program.title,
      companyName: program.companyName || 'BugChase Partner',
      programType: program.type,
      bountyRange: program.bountyRange || 'Varies',
      assetTags: settings.assetTags,
      expiresAt: invite.expiresAt,
      inviteUrl,
      matchSummary: invite.scoreSnapshot?.matchSummary || 'Matched by trust and skill alignment',
    }),
  );
}

export async function createPrivateProgramInvite(
  program: any,
  researcherId: string,
  source: 'manual' | 'auto',
  scoreSnapshot?: Record<string, unknown>,
) {
  const researcher = await User.findOne({ _id: researcherId, role: 'researcher' }).select('name username email');
  if (!researcher) throw new Error('Researcher not found');

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const invite = await PrivateProgramInvite.findOneAndUpdate(
    { programId: program._id, researcherId: researcher._id },
    {
      $set: {
        companyId: program.companyId,
        status: 'invited',
        invitedAt: new Date(),
        respondedAt: null,
        token,
        expiresAt,
        source,
        scoreSnapshot: scoreSnapshot || {},
        emailSentAt: new Date(),
      },
    },
    { new: true, upsert: true },
  );

  await setInviteRedisTtl(token);
  await sendPrivateProgramInviteEmail(invite, program, researcher);
  return invite;
}

export async function runAutoInviteScalingForProgram(program: any) {
  const settings = normalizePrivateInviteSettings(program.privateInviteSettings);
  if (!settings.autoInviteEnabled || program.status !== 'Active' || !program.isPrivate) {
    return { programId: program._id, sent: 0, skipped: true, reason: 'auto_invite_disabled_or_inactive' };
  }

  const actualReports = await getProgramThirtyDayValidReportCount(program._id, settings.lookbackDays);
  const deficit = Math.max(0, settings.targetMonthlyReports - actualReports);
  if (deficit <= 0) {
    return { programId: program._id, sent: 0, skipped: true, reason: 'target_met', actualReports };
  }

  const invitesNeeded = deficit * settings.inviteToReportMultiplier;
  const batchSize = Math.min(settings.dailyInviteBatchSize, invitesNeeded, DEFAULT_BATCH_SIZE);

  const eligible = await scoreEligibleResearchersForProgram(program, { limit: batchSize * 3, autoInviteOnly: true });
  const toInvite = eligible
    .filter((r) => !r.inviteStatus || r.inviteStatus === 'declined' || r.inviteStatus === 'revoked')
    .slice(0, batchSize);

  let sent = 0;
  for (const candidate of toInvite) {
    try {
      await createPrivateProgramInvite(program, candidate.researcherId, 'auto', {
        snrPercent: candidate.snrPercent,
        impactScore: candidate.impactScore,
        reputationScore: candidate.reputationScore,
        assetMatchScore: candidate.assetMatchScore,
        compositeScore: candidate.compositeScore,
        matchSummary: `SNR ${candidate.snrPercent}% · Impact ${candidate.impactScore} · Asset match ${candidate.assetMatchScore}`,
      });
      sent += 1;
    } catch (err) {
      console.error('[private-invite] auto batch failed for', candidate.researcherId, err);
    }
  }

  return { programId: program._id, sent, deficit, actualReports, batchSize };
}

export async function runAutoInviteScalingForAllPrograms() {
  const programs = await Program.find({ isPrivate: true, status: 'Active' });
  const results = [];
  for (const program of programs) {
    results.push(await runAutoInviteScalingForProgram(program));
  }
  return results;
}

export async function expireStalePrivateInvite(invite: any) {
  if (invite.status !== 'invited') return invite;
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    invite.status = 'revoked';
    await invite.save();
  }
  return invite;
}
