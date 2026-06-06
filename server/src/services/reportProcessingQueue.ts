/**
 * Single-worker FIFO queue that serialises the heavy per-report AI pipeline
 * (duplicate scan + CVSS triage). Reports submitted while another is still
 * processing wait their turn, so the local LLM is never asked to reason about
 * two reports concurrently — that keeps GPU memory predictable and the user
 * experience deterministic.
 *
 * In-process only by design: it's a thin orchestrator on top of MongoDB,
 * which is the source of truth. On server restart, jobs are recovered from
 * any report whose `aiDuplicateAnalysis.status` or `aiTriage.status` is
 * still `pending`/`processing`.
 */

import Report from '../models/Report';
import { runInitialDuplicateScanForNewReport } from './duplicateDetectionService';
import { runCvssTriageForReport } from './cvssTriageService';
import { getIO } from './socketService';

type QueueJob = {
  reportId: string;
  enqueuedAt: number;
};

const pending: QueueJob[] = [];
const enqueued = new Set<string>();
let isProcessing = false;
let currentJobId: string | null = null;

const log = (...args: any[]) => console.log('[report-queue]', ...args);

const safeEmit = (room: string | null, event: string, payload: any) => {
  try {
    const io = getIO();
    if (room) io.to(room).emit(event, payload);
    else io.emit(event, payload);
  } catch {
    // Socket layer not initialised yet (early boot recovery); safe to ignore.
  }
};

const emitQueueState = () => {
  safeEmit(null, 'report_queue_state', {
    processing: isProcessing,
    currentJobId,
    depth: pending.length,
    waiting: pending.map((p, idx) => ({ reportId: p.reportId, position: idx + 1 })),
  });
};

const emitJobPhase = (
  reportId: string,
  phase: 'queued' | 'processing' | 'phase:duplicate' | 'phase:cvss' | 'done' | 'failed',
  extras?: Record<string, any>,
) => {
  safeEmit(reportId, 'report_processing_phase', { reportId, phase, ...extras });
};

/**
 * Add a report to the back of the AI processing queue. Idempotent — calling
 * twice for the same id is a no-op while the job is still waiting or
 * actively processing.
 */
export function enqueueReportProcessing(reportId: string | { toString(): string }): void {
  const id = String(reportId);
  if (!id) return;
  if (id === currentJobId || enqueued.has(id)) {
    log(`already queued/processing: ${id}`);
    return;
  }
  enqueued.add(id);
  pending.push({ reportId: id, enqueuedAt: Date.now() });
  log(`enqueued ${id} (depth=${pending.length})`);
  emitJobPhase(id, 'queued', { position: pending.length, depth: pending.length });
  emitQueueState();
  setImmediate(tick);
}

/** Snapshot of the current queue, useful for debugging endpoints / logs. */
export function getQueueSnapshot() {
  return {
    processing: isProcessing,
    currentJobId,
    depth: pending.length,
    waiting: pending.map((p, idx) => ({ reportId: p.reportId, position: idx + 1, enqueuedAt: p.enqueuedAt })),
  };
}

async function tick(): Promise<void> {
  if (isProcessing) return;
  const job = pending.shift();
  if (!job) {
    emitQueueState();
    return;
  }
  isProcessing = true;
  currentJobId = job.reportId;
  enqueued.delete(job.reportId);
  emitQueueState();

  const startedAt = Date.now();
  log(`processing ${job.reportId} (waited ${startedAt - job.enqueuedAt}ms)`);
  emitJobPhase(job.reportId, 'processing');

  try {
    await runDuplicateScanPhase(job.reportId);
    await runCvssTriagePhase(job.reportId);
    log(`done ${job.reportId} in ${Date.now() - startedAt}ms`);
    emitJobPhase(job.reportId, 'done');
  } catch (err) {
    console.error('[report-queue] job failed', job.reportId, err);
    emitJobPhase(job.reportId, 'failed', { error: (err as Error)?.message });
  } finally {
    isProcessing = false;
    currentJobId = null;
    emitQueueState();
    // Yield to the event loop, then look for the next job.
    setImmediate(tick);
  }
}

async function runDuplicateScanPhase(reportId: string): Promise<void> {
  emitJobPhase(reportId, 'phase:duplicate');
  try {
    await Report.findByIdAndUpdate(reportId, {
      $set: { 'aiDuplicateAnalysis.status': 'processing' },
    });
    const fresh = await Report.findById(reportId).lean();
    if (!fresh) return;

    const { candidates, reviewStatus, aiAnalysis } =
      await runInitialDuplicateScanForNewReport(fresh);

    const update: any = {
      aiDuplicateAnalysis: {
        status: aiAnalysis.status,
        isDuplicate: aiAnalysis.isDuplicate,
        confidenceScore: aiAnalysis.confidenceScore,
        primaryDuplicateId: aiAnalysis.primaryDuplicateId ?? null,
        reasoning: aiAnalysis.reasoning,
        researcherCommunication: aiAnalysis.researcherCommunication,
        error: aiAnalysis.error,
        processedAt: aiAnalysis.processedAt,
        communicationPosted: false,
      },
    };
    if (candidates.length > 0) {
      update.duplicateCandidates = candidates as any;
      update.duplicateReviewStatus = reviewStatus;
    } else {
      update.duplicateCandidates = [];
      update.duplicateReviewStatus = 'not_applicable';
    }
    await Report.findByIdAndUpdate(reportId, { $set: update });
  } catch (scanErr) {
    console.error('[report-queue] duplicate scan failed', reportId, scanErr);
    try {
      await Report.findByIdAndUpdate(reportId, {
        'aiDuplicateAnalysis.status': 'failed',
        'aiDuplicateAnalysis.error': (scanErr as Error)?.message || 'scan failed',
        'aiDuplicateAnalysis.processedAt': new Date(),
      });
    } catch {
      /* noop */
    }
  }
}

async function runCvssTriagePhase(reportId: string): Promise<void> {
  emitJobPhase(reportId, 'phase:cvss');
  // runCvssTriageForReport already handles status transitions + error capture
  // internally, and it never throws — so the queue loop stays clean.
  await runCvssTriageForReport(reportId);
}

/**
 * On server boot, re-enqueue any reports that were mid-flight (status
 * pending or processing) the last time the process exited. Safe to call
 * multiple times; enqueue is idempotent per report id.
 */
export async function recoverPendingReportsIntoQueue(): Promise<void> {
  try {
    const stuck = await Report.find({
      $or: [
        { 'aiDuplicateAnalysis.status': { $in: ['pending', 'processing'] } },
        { 'aiTriage.status': { $in: ['pending', 'processing'] } },
      ],
    })
      .select('_id')
      .lean();

    if (stuck.length === 0) return;
    log(`recovering ${stuck.length} report(s) into queue on boot`);
    for (const row of stuck) {
      enqueueReportProcessing(String(row._id));
    }
  } catch (err) {
    console.error('[report-queue] boot recovery failed:', err);
  }
}
