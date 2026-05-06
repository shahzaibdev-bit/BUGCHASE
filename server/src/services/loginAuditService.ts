import crypto from 'crypto';
import mongoose from 'mongoose';
import LoginEvent from '../models/LoginEvent';
import { sendEmail, newLoginAlertTemplate } from './emailService';
import { summarizeUserAgent } from '../utils/requestMeta';

function uaHash(raw: string): string {
  return crypto.createHash('sha256').update(raw || '').digest('hex').slice(0, 48);
}

/**
 * Persists a successful login and emails the user when IP or browser fingerprint is new
 * (skips alert on the very first successful login for that account).
 */
export async function recordSuccessfulLoginAndNotify(opts: {
  userId: mongoose.Types.ObjectId;
  email: string;
  name: string;
  ip: string;
  rawUa: string;
}): Promise<void> {
  const hash = uaHash(opts.rawUa);
  const browserSummary = summarizeUserAgent(opts.rawUa);

  const prior = await LoginEvent.find({
    userId: opts.userId,
    success: true,
  })
    .sort({ createdAt: -1 })
    .limit(80)
    .select('ip uaHash')
    .lean();

  const hadPrior = prior.length > 0;
  const seenIps = new Set(prior.map((p) => p.ip).filter(Boolean));
  const seenUa = new Set(prior.map((p) => p.uaHash).filter(Boolean));

  const newIp = hadPrior && !seenIps.has(opts.ip);
  const newBrowser = hadPrior && !seenUa.has(hash);

  await LoginEvent.create({
    userId: opts.userId,
    ip: opts.ip,
    userAgent: (opts.rawUa || '').slice(0, 2000),
    uaHash: hash,
    browserSummary,
    success: true,
  });

  if (!hadPrior || (!newIp && !newBrowser)) return;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[loginAudit] Email not configured; skipping new-login alert.');
    return;
  }

  try {
    const html = newLoginAlertTemplate({
      name: opts.name || 'Researcher',
      ip: opts.ip,
      browserSummary,
      newIp,
      newBrowser,
      whenIso: new Date().toISOString(),
    });
    await sendEmail(opts.email, 'New sign-in to your BugChase account', html);
  } catch (e) {
    console.error('[loginAudit] Failed to send new-login email:', e);
  }
}

/** Trim old events per user (best-effort; keeps collection smaller). */
export async function pruneLoginEvents(userId: mongoose.Types.ObjectId, keep = 200): Promise<void> {
  const rows = await LoginEvent.find({ userId }).sort({ createdAt: -1 }).select('_id').lean();
  const toDelete = rows.slice(keep).map((r) => r._id);
  if (toDelete.length) await LoginEvent.deleteMany({ _id: { $in: toDelete } });
}
