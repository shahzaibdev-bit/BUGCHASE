import User from '../models/User';
import Report from '../models/Report';
import crypto from 'crypto';

const ACTIVE_TRIAGER_STATUSES = ['Triaging', 'Under Review', 'Needs Info', 'In Dispute'] as const;

/** Map report asset types to expertise tokens used on triager profiles. */
const ASSET_EXPERTISE_ALIASES: Record<string, string[]> = {
  web: ['web', 'websecurity', 'network', 'networkinfra', 'desktop', 'infra'],
  api: ['api', 'apisecurity'],
  contract: [
    'contract',
    'smart_contracts',
    'smartcontracts',
    'blockchain',
    'crypto',
    'source',
    'source_code',
    'sourcecode',
    'sourcecodereview',
  ],
  mobile: ['mobile', 'mobileapplication'],
  cloud: ['cloud'],
  iot: ['iot'],
  database: ['database', 'db'],
};

export const normalizeExpertiseKey = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

/** Resolve a single skill label (admin UI or onboarding) to a canonical asset bucket. */
export const resolveExpertiseAssetKey = (skill: string): string | null => {
  const n = normalizeExpertiseKey(skill);
  if (!n) return null;
  if (n.includes('api')) return 'api';
  if (
    n.includes('contract') ||
    n.includes('blockchain') ||
    n.includes('smartcontract') ||
    n.includes('crypto') ||
    n.includes('sourcecode') ||
    n.includes('sourcereview')
  ) {
    return 'contract';
  }
  if (n.includes('mobile')) return 'mobile';
  if (n.includes('cloud')) return 'cloud';
  if (n.includes('iot')) return 'iot';
  if (n.includes('database') || n === 'db') return 'database';
  if (n.includes('web') || n.includes('network') || n.includes('desktop') || n.includes('infra')) {
    return 'web';
  }
  return null;
};

export const collectTriagerSkills = (user: { expertise?: string[]; skills?: string[] }) => {
  const merged = [...(user.expertise || []), ...(user.skills || [])];
  return [...new Set(merged.map((s) => String(s).trim()).filter(Boolean))];
};

export const inferReportAssetKey = (report: {
  assetType?: string | null;
  assets?: string[];
  vulnerabilityCategory?: string;
}) => {
  const raw = (report.assetType || report.assets?.[0] || 'Web').trim();
  const key = normalizeExpertiseKey(raw);
  if (key.includes('api')) return 'api';
  if (key.includes('contract') || key.includes('blockchain') || key.includes('crypto')) return 'contract';
  if (key.includes('mobile')) return 'mobile';
  if (key.includes('cloud')) return 'cloud';
  if (key.includes('iot')) return 'iot';
  if (key.includes('database') || key === 'db') return 'database';
  return 'web';
};

export const expertiseMatchesAsset = (triagerExpertise: string[], assetKey: string) => {
  const aliases = ASSET_EXPERTISE_ALIASES[assetKey] || [assetKey];
  const normalizedAliases = aliases.map(normalizeExpertiseKey);

  return (triagerExpertise || []).some((skill) => {
    const resolved = resolveExpertiseAssetKey(skill);
    if (resolved === assetKey) return true;
    const n = normalizeExpertiseKey(skill);
    return normalizedAliases.some((a) => n === a || n.includes(a) || a.includes(n));
  });
};

export const countActiveTriagerReports = async (triagerId: any) =>
  Report.countDocuments({
    triagerId,
    status: { $in: [...ACTIVE_TRIAGER_STATUSES] },
  });

export type TriagerCandidate = {
  _id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  expertise: string[];
  activeReports: number;
  maxConcurrentReports: number;
  availableSlots: number;
  matchSummary: string;
};

export type TriagerIneligible = {
  _id: string;
  name: string;
  reason: 'current_assignee' | 'no_expertise' | 'at_capacity' | 'unavailable' | 'inactive';
  detail: string;
  expertise: string[];
};

export type TriagerSearchResult = {
  assetKey: string;
  candidates: TriagerCandidate[];
  ineligible: TriagerIneligible[];
};

export const findEligibleTriagerCandidates = async (
  report: any,
  options?: { excludeTriagerIds?: string[] },
): Promise<TriagerCandidate[]> => {
  const result = await searchTriagerCandidates(report, options);
  return result.candidates;
};

export const searchTriagerCandidates = async (
  report: any,
  options?: { excludeTriagerIds?: string[] },
): Promise<TriagerSearchResult> => {
  const assetKey = inferReportAssetKey(report);
  const exclude = new Set((options?.excludeTriagerIds || []).map(String));

  const triagers = await User.find({
    role: 'triager',
    status: { $nin: ['Suspended', 'Banned'] },
  })
    .select('name username email avatar expertise skills maxConcurrentReports isAvailable status')
    .lean();

  const candidates: TriagerCandidate[] = [];
  const ineligible: TriagerIneligible[] = [];

  for (const t of triagers) {
    const id = String(t._id);
    const name = t.name || t.username || 'Triager';
    const expertise = collectTriagerSkills(t);

    if (exclude.has(id)) {
      ineligible.push({
        _id: id,
        name,
        reason: 'current_assignee',
        detail: 'Already the primary triager on this report.',
        expertise,
      });
      continue;
    }

    if (t.isAvailable === false) {
      ineligible.push({
        _id: id,
        name,
        reason: 'unavailable',
        detail: 'Marked unavailable for new assignments.',
        expertise,
      });
      continue;
    }

    if (!expertiseMatchesAsset(expertise, assetKey)) {
      ineligible.push({
        _id: id,
        name,
        reason: 'no_expertise',
        detail: `No ${assetKey.toUpperCase()} expertise on profile.`,
        expertise,
      });
      continue;
    }

    const activeReports = await countActiveTriagerReports(t._id);
    const max = t.maxConcurrentReports ?? 10;
    if (activeReports >= max) {
      ineligible.push({
        _id: id,
        name,
        reason: 'at_capacity',
        detail: `At capacity (${activeReports}/${max} active reports).`,
        expertise,
      });
      continue;
    }

    candidates.push({
      _id: id,
      name,
      username: t.username,
      email: t.email,
      avatar: t.avatar,
      expertise,
      activeReports,
      maxConcurrentReports: max,
      availableSlots: max - activeReports,
      matchSummary: `${assetKey.toUpperCase()} expertise · ${activeReports}/${max} active reports`,
    });
  }

  candidates.sort((a, b) => b.availableSlots - a.availableSlots || a.activeReports - b.activeReports);

  return { assetKey, candidates, ineligible };
};

export const generateInviteToken = () => crypto.randomBytes(32).toString('hex');

export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
