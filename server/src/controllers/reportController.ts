import { Request, Response, NextFunction } from 'express';
import Report from '../models/Report';
import User from '../models/User';
import Program from '../models/Program';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import mongoose from 'mongoose';
import { sendEmail, reportEmailTemplate } from '../services/emailService';
import { getIO } from '../services/socketService';
import { uploadToCloudinary } from '../utils/cloudinary';
import { searchDuplicateCandidates } from '../services/duplicateDetectionService';
import {
  formatDuplicateClosureMarkdown,
  duplicateClosureTimelineSummary,
} from '../utils/duplicateClosureNotice';
import { syncReportDisputeStatus, syncReportsDisputeStatus, isReportThreadLocked, REPORT_THREAD_LOCKED_MESSAGE } from '../services/disputeReportLinkService';
import { applyResearcherReputationOnStatusTransition } from '../services/researcherReputationService';
import { enqueueReportProcessing, getQueueSnapshot } from '../services/reportProcessingQueue';

const randomAlphaNum = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

const toInitials = (value: string, maxLen: number) => {
  const words = String(value || '')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let raw = '';
  if (words.length >= 2) raw = words.map((w) => w[0]).join('');
  else if (words.length === 1) raw = words[0];

  const compact = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const padded = (compact || 'X').padEnd(maxLen, 'X');
  return padded.slice(0, maxLen);
};

const generateUniqueReportId = async (companyName: string, programTitle: string) => {
  const companyInitials = toInitials(companyName, 2);
  const programInitials = toInitials(programTitle, 3);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = `${companyInitials}-${programInitials}-${randomAlphaNum(6)}`;
    const exists = await Report.findOne({ reportId: candidate }).select('_id').lean();
    if (!exists) return candidate;
  }

  throw new AppError('Unable to generate unique report ID. Please retry.', 500);
};

// Create a new report
export const createReport = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { 
    programId, 
    title, 
    vulnerabilityCategory,
    severity,
    cvssVector,
    cvssScore,
    target, // asset url
    assetType,
    vulnerableEndpoint,
    vulnerabilityDetails, // mapped to description
    validationSteps, // mapped to pocSteps
    impact
  } = req.body;

  if (!programId) {
    return next(new AppError('Program ID is required', 400));
  }

  const program = await Program.findById(programId).select('title companyName');
  if (!program) {
    return next(new AppError('Program not found', 404));
  }

  const generatedReportId = await generateUniqueReportId(program.companyName || 'BC', program.title || 'PRG');

  // Process uploaded files if any
  const uploadedUrls: string[] = [];
  if (req.files && Array.isArray(req.files)) {
      const uploadPromises = req.files.map((file: Express.Multer.File) => {
          return uploadToCloudinary(file);
      });
      const results = await Promise.all(uploadPromises);
      results.forEach(result => {
          uploadedUrls.push(result.url);
      });
  }

  // Basic validation mapping
  const aiTriageEnabled = (process.env.CVSS_TRIAGE_ENABLED || 'true').toLowerCase() !== 'false';
  const reportData = {
    researcherId: req.user!.id,
    programId,
    reportId: generatedReportId,
    title,
    vulnerableEndpoint,
    assetType: assetType ? String(assetType).trim() : undefined,
    vulnerabilityCategory,
    severity,
    researcherSeverity: severity,
    cvssVector,
    cvssScore,
    description: vulnerabilityDetails,
    pocSteps: validationSteps,
    impact,
    assets: target ? [target, ...uploadedUrls] : uploadedUrls, // Use target as primary asset, append Cloudinary URLs
    status: 'Submitted',
    aiTriage: {
      status: aiTriageEnabled ? 'pending' : 'skipped',
    },
    // `pending` here means "queued, waiting for the single-worker AI pipeline".
    // The processing queue transitions it through processing → completed/failed
    // when its turn arrives.
    aiDuplicateAnalysis: {
      status: 'pending',
      isDuplicate: false,
      confidenceScore: 0,
      primaryDuplicateId: null,
      communicationPosted: false,
    },
  };

  // Single database write — Atlas Search automatically syncs the indexed
  // fields (vulnerableEndpoint / vulnerabilityCategory / title) inside the
  // cluster, so we no longer need a second external indexing call.
  const newReport = await Report.create(reportData);

  // Respond to the researcher IMMEDIATELY — duplicate detection and CVSS
  // triage continue in the background. The researcher gets redirected to
  // their reports list without waiting for Atlas Search + LLM.
  const createdPayload: any = newReport.toJSON ? newReport.toJSON() : newReport;
  delete createdPayload.duplicateCandidates;
  delete createdPayload.duplicateReviewStatus;

  res.status(201).json({
    status: 'success',
    data: createdPayload,
  });

  // Enqueue the heavy AI pipeline (duplicate scan + CVSS triage) into the
  // single-worker queue. If another report is already being processed, this
  // one waits its turn instead of competing for the local LLM.
  enqueueReportProcessing(String(newReport._id));
  try {
    const snap = getQueueSnapshot();
    console.log(
      `[createReport] enqueued ${newReport._id} — queue depth=${snap.depth}, processing=${snap.processing}`,
    );
  } catch {
    /* logging only */
  }

  // Send submission confirmation to researcher in background
  (async () => {
    try {
      const researcher = await User.findById(req.user!.id).select('name email');
      if (researcher?.email) {
        await sendEmail(
          researcher.email,
          `Report Received: ${title}`,
          reportEmailTemplate({
            recipientName: researcher.name || 'Researcher',
            recipientRole: 'researcher',
            actorName: 'BugChase',
            actorRole: 'triager',
            actionType: 'submitted',
            reportTitle: title,
            reportId: newReport.reportId || String(newReport._id),
            severity,
            newStatus: 'Submitted',
            link: `${process.env.CLIENT_URL}/researcher/reports/${newReport._id}`
          })
        );
      }
    } catch (e) {
      console.error('Failed to send submission confirmation email:', e);
    }
  })();
});

// Get reports for logged-in researcher
export const getMyReports = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const reports = await Report.find({ researcherId: req.user!.id })
    .populate({
         path: 'programId',
         model: 'Program',
         select: 'title companyId companyName type bountyRange description rewards rulesOfEngagement safeHarbor submissionGuidelines scope',
         populate: {
             path: 'companyId',
             model: 'User',
             select: 'avatar name'
         }
    })
    .sort({ createdAt: -1 });

  await syncReportsDisputeStatus(reports);

  res.status(200).json({
    status: 'success',
    results: reports.length,
    data: reports
  });
});

// Get single report details
export const getReport = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const report = await Report.findById(req.params.id)
    .populate('researcherId', 'username name nickname avatar')
    .populate({
         path: 'programId',
         model: 'Program',
         select: 'title companyId companyName type bountyRange description rewards rulesOfEngagement safeHarbor submissionGuidelines scope',
         populate: {
             path: 'companyId',
             model: 'User',
             select: 'avatar name'
         }
    })
    .populate('comments.sender', 'username name nickname role avatar');

  if (!report) {
    return next(new AppError('Report not found', 404));
  }

  await syncReportDisputeStatus(report);

  // Authorization check: Only Author or Triager/Admin can view
  if (
      report.researcherId._id.toString() !== req.user!.id && 
      req.user!.role !== 'admin' && 
      req.user!.role !== 'triager'
  ) {
      return next(new AppError('You do not have permission to view this report', 403));
  }

  const payload: any = report.toJSON ? report.toJSON() : report;
  if (req.user!.role === 'researcher') {
    delete payload.duplicateCandidates;
    delete payload.duplicateReviewStatus;
    // Keep only the high-level processing status for researchers.
    // Never expose the LLM reasoning / discrepancy report — that's posted
    // explicitly by a triager when (and if) the report is confirmed duplicate.
    if (payload.aiDuplicateAnalysis) {
      payload.aiDuplicateAnalysis = {
        status: payload.aiDuplicateAnalysis.status || 'pending',
        processedAt: payload.aiDuplicateAnalysis.processedAt,
      };
    }
  }

  res.status(200).json({
    status: 'success',
    data: payload
  });
});

// Add a comment
export const addComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { content } = req.body;
  const report = await Report.findById(req.params.id);

  if (!report) {
    return next(new AppError('Report not found', 404));
  }

  if (isReportThreadLocked(report.status)) {
    return next(new AppError(REPORT_THREAD_LOCKED_MESSAGE, 403));
  }
  
  // Auth check
   if (
      report.researcherId.toString() !== req.user!.id && 
      req.user!.role !== 'admin' && 
      req.user!.role !== 'triager'
  ) {
      return next(new AppError('You do not have permission to comment on this report', 403));
  }

  // Process uploaded files if any
  const uploadedUrls: string[] = [];
  if (req.files && Array.isArray(req.files)) {
      const uploadPromises = req.files.map((file: Express.Multer.File) => {
          return uploadToCloudinary(file);
      });
      const results = await Promise.all(uploadPromises);
      results.forEach(result => {
          uploadedUrls.push(result.url);
      });
  }

  report.comments.push({
    sender: req.user!.id,
    content,
    attachments: uploadedUrls,
    createdAt: new Date()
  });

  await report.save();
  
  // Re-populate to return the new comment with user info
  await report.populate('comments.sender', 'username name nickname role avatar');

  const newComment = report.comments[report.comments.length - 1];

  try {
      const io = getIO();
      // Determine role based on sender
      let roleLabel = 'System';
      if (req.user!.role === 'researcher') roleLabel = 'Researcher';
      else if (req.user!.role === 'triager') roleLabel = 'Triager';
      else if (req.user!.role === 'admin') roleLabel = 'Admin';
      
      io.to(req.params.id).emit('new_activity', {
           id: newComment._id,
           type: 'comment',
           author: req.user!.role !== 'company' ? (req.user!.username || req.user!.name || 'Unknown User') : (req.user!.name || 'Unknown Company'),
           authorName: req.user!.name,
           authorUsername: req.user!.username,
           role: roleLabel,
           content: newComment.content,
           attachments: newComment.attachments,
           timestamp: newComment.createdAt,
           authorAvatar: req.user!.avatar
      });
  } catch (socketError) {
      console.error("Socket emit failed:", socketError);
  }

  res.status(200).json({
    status: 'success',
    data: report.comments
  });

  // Trigger Email Notification in background
  (async () => {
    try {
        const senderId = req.user!.id;
        const senderRole = req.user!.role as string;
        const isResearcher = report.researcherId.toString() === senderId;
        const isCompany = senderRole === 'company';

        if (isResearcher) {
            // Researcher commented → notify triager
            if (report.triagerId) {
                await report.populate('triagerId', 'email name');
                const triager = report.triagerId as any;
                if (triager?.email) {
                    await sendEmail(
                        triager.email,
                        `New Comment on: ${report.title}`,
                        reportEmailTemplate({
                            recipientName: triager.name || 'Triager',
                            recipientRole: 'triager',
                            actorName: req.user!.name || req.user!.username || 'Researcher',
                            actorRole: 'researcher',
                            actionType: 'comment',
                            reportTitle: report.title,
                            reportId: report.reportId || String(report._id),
                            severity: report.severity,
                            message: content,
                            link: `${process.env.CLIENT_URL}/triager/app/reports/${report._id}`
                        })
                    );
                }
            }
        } else if (isCompany) {
            // Company commented → notify BOTH researcher and triager
            await report.populate('researcherId', 'email name');
            const researcher = report.researcherId as any;
            if (researcher?.email) {
                await sendEmail(
                    researcher.email,
                    `New Comment on: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: req.user!.name || 'Company',
                        actorRole: 'company',
                        actionType: 'comment',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        message: content,
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                    })
                );
            }
            if (report.triagerId) {
                await report.populate('triagerId', 'email name');
                const triager = report.triagerId as any;
                if (triager?.email) {
                    await sendEmail(
                        triager.email,
                        `New Comment on: ${report.title}`,
                        reportEmailTemplate({
                            recipientName: triager.name || 'Triager',
                            recipientRole: 'triager',
                            actorName: req.user!.name || 'Company',
                            actorRole: 'company',
                            actionType: 'comment',
                            reportTitle: report.title,
                            reportId: report.reportId || String(report._id),
                            severity: report.severity,
                            message: content,
                            link: `${process.env.CLIENT_URL}/triager/app/reports/${report._id}`
                        })
                    );
                }
            }
        } else {
            // Triager/Admin commented → notify researcher
            await report.populate('researcherId', 'email name');
            const researcher = report.researcherId as any;
            if (researcher?.email) {
                await sendEmail(
                    researcher.email,
                    `New Comment on: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: req.user!.name || req.user!.username || 'Triager',
                        actorRole: 'triager',
                        actionType: 'comment',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        message: content,
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                    })
                );
            }
        }
    } catch (emailError) {
        console.error('Failed to send comment notification email:', emailError);
    }
  })();
});

// Get reports by program ID (for leaderboard)
export const getReportsByProgram = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { programId } = req.params;
    const reports = await Report.find({ programId })
        .populate('researcherId', 'username name nickname avatar')
        .select('researcherId status severity'); // Select fields needed for count/leaderboard

    res.status(200).json({
        status: 'success',
        results: reports.length,
        data: reports
    });
});

export const checkReportDuplicates = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const report = await Report.findById(id)
    .populate('researcherId', 'username name')
    .populate('programId', 'title companyName');

  if (!report) return next(new AppError('Report not found', 404));
  if (!['triager', 'admin'].includes(req.user!.role)) {
    return next(new AppError('Only triagers/admin can run duplicate check', 403));
  }

  try {
    const matches = await searchDuplicateCandidates(report);
    const formatted = matches.map((m) => ({
      reportMongoId: m.report_id,
      score: Number(m.score || 0),
      source: m.source,
      confidence:
        m.source === 'strict'
          ? 'HIGH_CONFIDENCE'
          : Number(m.score || 0) >= 1
          ? 'POTENTIAL'
          : 'LOW',
      metadata: m.metadata || {},
    }));

    res.status(200).json({
      status: 'success',
      data: {
        reportId: report.reportId,
        reportMongoId: String(report._id),
        matches: formatted,
      },
    });
  } catch (error: any) {
    return next(
      new AppError((error as Error)?.message || 'Failed to run duplicate detection', 500)
    );
  }
});

export const markReportAsDuplicate = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { duplicateOf } = req.body || {};

  if (!['triager', 'admin'].includes(req.user!.role)) {
    return next(new AppError('Only triagers/admin can mark duplicates', 403));
  }

  if (!duplicateOf) return next(new AppError('duplicateOf is required', 400));
  if (String(duplicateOf) === String(id)) return next(new AppError('A report cannot be duplicate of itself', 400));

  const [report, duplicateParent] = await Promise.all([
    Report.findById(id),
    Report.findById(duplicateOf).select('_id reportId title createdAt'),
  ]);

  if (!report) return next(new AppError('Report not found', 404));
  if (!duplicateParent) return next(new AppError('Reference duplicate report not found', 404));

  const oldStatus = report.status;
  report.status = 'Duplicate';
  report.duplicateOf = duplicateParent._id as any;
  report.duplicateReviewStatus = 'confirmed_duplicate';
  const parentRid = duplicateParent.reportId || String(duplicateParent._id);
  const thisRid = report.reportId || String(report._id);
  const actorDisplay = req.user!.name || req.user!.username || 'BugChase Triage';
  const closureNotice = formatDuplicateClosureMarkdown({
    thisReportPublicId: thisRid,
    canonicalReportPublicId: parentRid,
    canonicalSubmittedAt: duplicateParent.createdAt,
    actorDisplayName: actorDisplay,
  });

  // If the local LLM produced a researcher-facing Discrepancy Report and the
  // triager hasn't pushed it yet, include it now. This is the webhook
  // attachment point requested in the duplicate-pipeline spec: the
  // researcher_communication only goes out once a human triager confirms.
  const aiAnalysis: any = (report as any).aiDuplicateAnalysis || {};
  const aiCommunication = String(aiAnalysis?.researcherCommunication || '').trim();
  const shouldPostAi =
    aiCommunication.length > 0 && !aiAnalysis?.communicationPosted;

  const fullClosureMessage = shouldPostAi
    ? `${closureNotice}\n\n---\n\n**AI Discrepancy Report**\n${aiCommunication}`
    : closureNotice;

  report.comments.push({
    sender: req.user!.id as any,
    content: duplicateClosureTimelineSummary(),
    type: 'status_change',
    metadata: {
      oldStatus,
      newStatus: 'Duplicate',
      duplicateOf: String(duplicateParent._id),
      duplicateOfReportId: parentRid,
      reason: fullClosureMessage,
      aiConfidenceScore: aiAnalysis?.confidenceScore,
      aiIsDuplicate: aiAnalysis?.isDuplicate,
    },
    createdAt: new Date(),
  } as any);

  if (shouldPostAi) {
    (report as any).aiDuplicateAnalysis = {
      ...aiAnalysis,
      communicationPosted: true,
    };
  }

  await applyResearcherReputationOnStatusTransition(report, oldStatus, 'Duplicate', 'mark_duplicate');

  await report.save();

  res.status(200).json({
    status: 'success',
    data: {
      report,
      duplicateOf: {
        _id: duplicateParent._id,
        reportId: parentRid,
        title: duplicateParent.title,
      },
    },
  });

  (async () => {
    try {
      await report.populate('researcherId', 'name email');
      const researcher = report.researcherId as any;
      if (researcher?.email) {
        await sendEmail(
          researcher.email,
          `Duplicate resolution`,
          reportEmailTemplate({
            recipientName: researcher.name || 'Researcher',
            recipientRole: 'researcher',
            actorName: req.user!.name || req.user!.username || 'Triager',
            actorRole: 'triager',
            actionType: 'status_change',
            reportTitle: report.title,
            reportId: thisRid,
            severity: report.severity,
            oldStatus,
            previousStatus: oldStatus,
            canonicalReportId: parentRid,
            newStatus: 'Duplicate',
            message: fullClosureMessage,
            messageSectionLabel: 'Duplicate resolution',
            suppressVulnerabilitySummary: true,
            link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`,
          })
        );
      }
    } catch (e) {
      console.error('Failed to send duplicate notification email:', e);
    }
  })();
});

export const clearDuplicateReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!['triager', 'admin'].includes(req.user!.role)) {
    return next(new AppError('Only triagers/admin can clear duplicate review', 403));
  }

  const { id } = req.params;
  const report = await Report.findById(id);
  if (!report) return next(new AppError('Report not found', 404));

  if (report.duplicateReviewStatus !== 'pending') {
    return next(new AppError('This report does not have a pending duplicate review.', 400));
  }

  report.duplicateReviewStatus = 'cleared';
  report.comments.push({
    sender: req.user!.id as any,
    content:
      'Triager reviewed AI-suggested duplicate candidates and confirmed this report is **not** a duplicate. Promote / resolve actions are now allowed.',
    type: 'comment',
    createdAt: new Date(),
  } as any);

  await report.save();

  res.status(200).json({
    status: 'success',
    data: { report },
  });
});

export const reindexAllReports = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!['triager', 'admin'].includes(req.user!.role)) {
    return next(new AppError('Only triagers/admin can trigger re-indexing', 403));
  }

  // Atlas Search keeps the duplicate_detection_index continuously in sync with
  // the reports collection — there is nothing for the application server to
  // backfill. The endpoint is kept so existing admin UIs do not 404.
  const total = await Report.estimatedDocumentCount();

  return res.status(200).json({
    status: 'success',
    message:
      'Atlas Search continuously syncs the duplicate_detection_index. No backfill is required.',
    totalReports: total,
    indexed: total,
  });
});
