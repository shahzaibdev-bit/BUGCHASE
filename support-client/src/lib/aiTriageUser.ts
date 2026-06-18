import { SupportReportUser } from '@/types';

const AI_TRIAGE_USERNAME = 'bugchase_ai_triage';

export function isAiTriageUser(user?: Pick<SupportReportUser, 'username' | 'name'> | null) {
  if (!user) return false;
  const handle = (user.username || '').toLowerCase().replace(/-/g, '_');
  const name = (user.name || '').toLowerCase();
  return handle === AI_TRIAGE_USERNAME || name.includes('bugchase ai');
}

export function userAvatarUrl(user?: Pick<SupportReportUser, 'username' | 'name' | 'avatar'> | null) {
  if (isAiTriageUser(user)) return null;
  const url = user?.avatar;
  if (!url || url === 'default.jpg') return null;
  return url;
}
