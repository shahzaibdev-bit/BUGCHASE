import axios from 'axios';
import mongoose from 'mongoose';
import Report from '../models/Report';
import User from '../models/User';
import { getIO } from './socketService';
import { sendEmail, reportEmailTemplate } from './emailService';

/**
 * Result from POST /analyze-cvss on the cvss_engine FastAPI service.
 */
export interface CvssTriageResponse {
  cvss_vector: string;
  cvss_score: number;
  calculated_severity: 'Low' | 'Medium' | 'High' | 'Critical';
  researcher_severity: 'Low' | 'Medium' | 'High' | 'Critical';
  severity_changed: boolean;
  severity_change_explanation: string;
  reasoning_breakdown: string;
  model_used: { key: string; label: string; tag: string };
}

const AI_USER_EMAIL = 'ai-triage@bugchase.system';
const AI_USERNAME = 'bugchase_ai_triage';
const AI_DISPLAY_NAME = 'BugChase AI';
// Bugchase logo (served by the client at /favicon.svg). Clients that render
// avatars by URL just point at this path; the client also recognises the AI
// username and falls back to the inline logo if the avatar isn't loaded.
const AI_AVATAR = '/favicon.svg';

let cachedAiUserId: mongoose.Types.ObjectId | null = null;

/**
 * Lazily get-or-create the dedicated system user that authors AI-triage
 * thread comments. Cached after first lookup so we don't hit Mongo every
 * triage. The user has role=admin (so its messages render correctly in the
 * existing timeline) but is gated from sign-in by an unguessable password
 * hash; this account is never authenticated against.
 *
 * On each call we also migrate the persisted username / display name /
 * avatar so legacy records (e.g. `bugchase_ai-triage`, `BugChase AI Triage`)
 * pick up the canonical "BugChase AI" identity without needing a manual
 * data fix.
 */
export async function getAiTriageUserId(): Promise<mongoose.Types.ObjectId> {
  if (cachedAiUserId) return cachedAiUserId;

  let user = await User.findOne({ email: AI_USER_EMAIL });
  if (!user) {
    const created = await User.create({
      name: AI_DISPLAY_NAME,
      username: AI_USERNAME,
      email: AI_USER_EMAIL,
      password: `disabled-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: 'admin',
      isVerified: true,
      isEmailVerified: true,
      avatar: AI_AVATAR,
      status: 'Active',
    });
    cachedAiUserId = created._id as mongoose.Types.ObjectId;
    return cachedAiUserId;
  }

  // Idempotent identity migration for legacy records.
  let mutated = false;
  if ((user as any).username !== AI_USERNAME) { (user as any).username = AI_USERNAME; mutated = true; }
  if ((user as any).name !== AI_DISPLAY_NAME) { (user as any).name = AI_DISPLAY_NAME; mutated = true; }
  if ((user as any).avatar !== AI_AVATAR) { (user as any).avatar = AI_AVATAR; mutated = true; }
  if (mutated) {
    try {
      await user.save({ validateBeforeSave: false });
    } catch (e) {
      console.warn('[cvssTriage] could not migrate AI user identity:', (e as Error).message);
    }
  }

  cachedAiUserId = user._id as mongoose.Types.ObjectId;
  return cachedAiUserId;
}

/**
 * Build the markdown body posted to the report thread when the AI changes
 * the severity. Keeps the reasoning compact and structured so it renders
 * nicely in the existing timeline UI.
 */
function formatAiTriageComment(opts: {
  oldSeverity: string;
  newSeverity: string;
  cvssVector: string;
  cvssScore: number;
  reasoning: string;
  explanation: string;
  modelLabel: string;
}): string {
  const lines = [
    `**@${AI_USERNAME}** changed the report severity from **${opts.oldSeverity}** to **${opts.newSeverity}**.`,
    '',
    '**Why was the severity changed?**',
    opts.explanation ||
      `The CVSS v3.1 vector ${opts.cvssVector} computes to ${opts.cvssScore.toFixed(1)} (${opts.newSeverity}).`,
    '',
    '**Reasoning breakdown**',
    opts.reasoning || '_No reasoning returned by the model._',
    '',
    '---',
    `*Vector:* \`${opts.cvssVector}\`  ·  *Base score:* **${opts.cvssScore.toFixed(1)}**`,
  ];
  return lines.join('\n');
}

/**
 * Compose the HTML body emailed to the researcher when the AI re-evaluates
 * their CVSS severity. Keeps it short, plain and grounded in the LLM's
 * reasoning so the researcher understands the change without needing the
 * dashboard.
 */
function buildAiSeverityEmailMessage(opts: {
  oldSeverity: string;
  newSeverity: string;
  cvssVector: string;
  cvssScore: number;
  reasoning: string;
  explanation: string;
  modelLabel: string;
}): string {
  const escape = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  return [
    `BugChase AI re-evaluated your submission and adjusted the severity from <strong>${escape(
      opts.oldSeverity,
    )}</strong> to <strong>${escape(opts.newSeverity)}</strong>.`,
    '',
    `<strong>Why was the severity changed?</strong><br/>${escape(
      opts.explanation ||
        `The CVSS v3.1 vector ${opts.cvssVector} computes to ${opts.cvssScore.toFixed(
          1,
        )} (${opts.newSeverity}).`,
    )}`,
    '',
    `<strong>Reasoning breakdown</strong><br/>${escape(
      opts.reasoning || 'No reasoning was returned by the model.',
    )}`,
    '',
    `<strong>Vector:</strong> <code>${escape(
      opts.cvssVector,
    )}</code> &middot; <strong>Base score:</strong> ${opts.cvssScore.toFixed(1)}`,
    '',
    'Your original severity is preserved on the report. A human triager will review the full thread before any further action is taken.',
  ].join('<br/>');
}

function buildTriagePayload(report: any) {
  const stripHtml = (s: any) =>
    String(s ?? '')
      .replace(/<\/?[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const severity =
    typeof report.severity === 'string' && report.severity.length > 0
      ? report.severity
      : 'Medium';

  const allowedSeverities = ['Low', 'Medium', 'High', 'Critical'];
  const researcherSeverity = allowedSeverities.includes(severity) ? severity : 'Medium';

  return {
    title: String(report.title || 'Untitled report'),
    vulnerable_endpoint: String(report.vulnerableEndpoint || 'n/a'),
    description: stripHtml(report.description) || 'n/a',
    steps_to_reproduce: stripHtml(report.pocSteps) || 'n/a',
    impact: stripHtml(report.impact) || 'n/a',
    category: String(report.vulnerabilityCategory || report.assetType || 'General'),
    researcher_severity: researcherSeverity,
    model: process.env.CVSS_TRIAGE_MODEL_KEY || undefined,
  };
}

function isTriageEnabled(): boolean {
  const flag = (process.env.CVSS_TRIAGE_ENABLED || 'true').toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

function triageBaseUrl(): string {
  return (process.env.CVSS_TRIAGE_URL || 'http://127.0.0.1:7860').replace(/\/+$/, '');
}

/**
 * Run AI CVSS triage for a single report. Designed to be invoked in the
 * background by the report controller: it never throws; on any failure it
 * records the error on `report.aiTriage` and moves on. While running it
 * keeps `report.aiTriage.status` in ('pending' | 'processing'), which the
 * triager-claim guard uses to block the Claim button.
 */
export async function runCvssTriageForReport(reportId: string | mongoose.Types.ObjectId): Promise<void> {
  if (!isTriageEnabled()) {
    await Report.updateOne(
      { _id: reportId },
      {
        $set: {
          'aiTriage.status': 'skipped',
          'aiTriage.processedAt': new Date(),
        },
      }
    );
    return;
  }

  await Report.updateOne(
    { _id: reportId },
    { $set: { 'aiTriage.status': 'processing' } }
  );

    let report: any;
  try {
    report = await Report.findById(reportId).populate('researcher', 'name email');
    if (!report) return;

    const url = `${triageBaseUrl()}/analyze-cvss`;
    const timeout = Number(process.env.CVSS_TRIAGE_TIMEOUT_MS || 300000);
    const payload = buildTriagePayload(report);

    const { data } = await axios.post<CvssTriageResponse>(url, payload, {
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    const newSeverity = (data.calculated_severity || '').trim();
    const oldSeverity = String(report.severity || 'Medium');
    const severityChanged =
      newSeverity.length > 0 && newSeverity.toLowerCase() !== oldSeverity.toLowerCase();

    report.aiTriage = {
      status: 'completed',
      severity: newSeverity as any,
      cvssVector: data.cvss_vector,
      cvssScore: data.cvss_score,
      reasoning: data.reasoning_breakdown,
      severityChanged,
      processedAt: new Date(),
      modelKey: data.model_used?.key,
      modelLabel: data.model_used?.label,
    } as any;

    if (severityChanged) {
      report.severity = newSeverity;
      if (data.cvss_vector) report.cvssVector = data.cvss_vector;
      if (typeof data.cvss_score === 'number') report.cvssScore = data.cvss_score;

      const aiUserId = await getAiTriageUserId();
      const commentContent = formatAiTriageComment({
        oldSeverity,
        newSeverity,
        cvssVector: data.cvss_vector,
        cvssScore: data.cvss_score,
        reasoning: data.reasoning_breakdown,
        explanation: data.severity_change_explanation,
        modelLabel: data.model_used?.label || 'BugChase AI',
      });

      report.comments.push({
        sender: aiUserId,
        content: commentContent,
        type: 'ai_triage',
        metadata: {
          oldSeverity,
          newSeverity,
          cvssVector: data.cvss_vector,
          cvssScore: data.cvss_score,
          modelKey: data.model_used?.key,
          modelLabel: data.model_used?.label,
        },
        createdAt: new Date(),
      } as any);
    }

    await report.save();

    try {
      const io = getIO();
      io.to(String(report._id)).emit('ai_triage_completed', {
        severity: report.severity,
        cvssVector: report.cvssVector,
        cvssScore: report.cvssScore,
        aiTriage: report.aiTriage,
      });
      if (severityChanged) {
        const lastComment = report.comments[report.comments.length - 1];
        io.to(String(report._id)).emit('new_activity', {
          id: lastComment._id,
          type: 'ai_triage',
          author: AI_USERNAME,
          authorName: AI_DISPLAY_NAME,
          authorUsername: AI_USERNAME,
          authorAvatar: AI_AVATAR,
          role: 'Admin',
          content: lastComment.content,
          timestamp: lastComment.createdAt,
          metadata: lastComment.metadata,
        });
        io.to(String(report._id)).emit('report_updated', {
          severity: report.severity,
          cvssScore: report.cvssScore,
          cvssVector: report.cvssVector,
        });
      }
    } catch (socketErr) {
      console.error('[cvssTriage] socket emit failed:', socketErr);
    }

    // Email the researcher when the AI lands a different severity. Best-effort
    // only: never let SMTP problems fail the triage pipeline.
    if (severityChanged) {
      try {
        const researcher: any = (report as any).researcher;
        const recipientEmail: string | undefined = researcher?.email;
        const recipientName: string =
          researcher?.name || researcher?.username || 'Security Researcher';
        if (recipientEmail) {
          const html = reportEmailTemplate({
            recipientName,
            recipientRole: 'researcher',
            actorName: AI_DISPLAY_NAME,
            actorRole: 'triager',
            actionType: 'status_change',
            reportTitle: String(report.title || 'your submission'),
            reportId: String(report._id),
            severity: newSeverity,
            cvssScore: typeof data.cvss_score === 'number' ? data.cvss_score : undefined,
            oldStatus: `Severity: ${oldSeverity}`,
            newStatus: `Severity: ${newSeverity}`,
            message: buildAiSeverityEmailMessage({
              oldSeverity,
              newSeverity,
              cvssVector: data.cvss_vector,
              cvssScore: data.cvss_score,
              reasoning: data.reasoning_breakdown,
              explanation: data.severity_change_explanation,
              modelLabel: data.model_used?.label || 'BugChase AI',
            }),
            link: `${(process.env.CLIENT_URL || 'http://localhost:3000').replace(
              /\/+$/,
              '',
            )}/researcher/reports/${report._id}`,
          });
          await sendEmail(
            recipientEmail,
            `BugChase AI updated the severity on "${String(report.title || 'your report')}"`,
            html,
          );
        }
      } catch (mailErr) {
        console.error('[cvssTriage] severity-change email failed:', mailErr);
      }
    }
  } catch (error: any) {
    const message =
      error?.response?.data?.detail || error?.message || 'CVSS triage failed';
    console.error('[cvssTriage] failed for', String(reportId), ':', message);
    await Report.updateOne(
      { _id: reportId },
      {
        $set: {
          'aiTriage.status': 'failed',
          'aiTriage.error': String(message).slice(0, 500),
          'aiTriage.processedAt': new Date(),
        },
      }
    );
  }
}

const AI_DUPLICATE_TERMINAL = new Set(['completed', 'failed', 'no_candidates', 'skipped']);
const AI_TRIAGE_TERMINAL = new Set(['completed', 'failed', 'skipped']);

/**
 * True while duplicate scan and/or CVSS triage are still queued or running.
 * Triagers cannot claim until both pipelines reach a terminal state.
 */
export function isReportAiProcessing(report: any): boolean {
  const dupStatus = String(report?.aiDuplicateAnalysis?.status || 'pending');
  const triageStatus = String(report?.aiTriage?.status || 'pending');
  return !AI_DUPLICATE_TERMINAL.has(dupStatus) || !AI_TRIAGE_TERMINAL.has(triageStatus);
}

/**
 * @deprecated Use isReportAiProcessing — kept for existing imports.
 */
export function isReportInAiTriage(report: any): boolean {
  return isReportAiProcessing(report);
}

export const AI_TRIAGE_USERNAME = AI_USERNAME;
export const AI_TRIAGE_DISPLAY_NAME = AI_DISPLAY_NAME;
export const AI_TRIAGE_AVATAR = AI_AVATAR;
