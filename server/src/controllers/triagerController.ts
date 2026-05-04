import { Request, Response, NextFunction } from 'express';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';
import fs from 'fs';
import path from 'path';
import { uploadToCloudinary } from '../utils/cloudinary';
import Report from '../models/Report';
import User from '../models/User';
import Program from '../models/Program';
import Notification from '../models/Notification';
import { sendEmail, reportEmailTemplate } from '../services/emailService';
import { generateReportSummary } from '../services/geminiService';
import { getIO } from '../services/socketService';
import {
  runInitialDuplicateScanForNewReport,
  pruneDuplicateCandidatesNotOlderThanSelf,
} from '../services/duplicateDetectionService';
import { isReopenToTriaging, formatReopenForTriageMarkdown } from '../utils/reopenTriageNotice';
import {
  applyResearcherReputationOnStatusTransition,
  clearReputationMilestonesForReTriage,
} from '../services/researcherReputationService';

const duplicateReviewBlocksPromoteOrResolve = (report: any, nextStatus: string) => {
  if (
    report.duplicateReviewStatus === 'pending' &&
    Array.isArray(report.duplicateCandidates) &&
    report.duplicateCandidates.length > 0 &&
    (nextStatus === 'Triaged' || nextStatus === 'Resolved')
  ) {
    return new AppError(
      'This report has possible duplicates from automatic screening. Use the duplicate comparison to mark it as a duplicate or confirm it is not a duplicate before promoting or resolving.',
      400
    );
  }
  return null;
};

// Dashboard Stats
export const getDashboardStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const triagerId = req.user.id;

    // 1. My Active Queue
    const activeQueueCount = await Report.countDocuments({ 
        triagerId: triagerId,
        status: { $in: ['Triaging', 'Under Review', 'Needs Info'] }
    });

    // 2. Global Unassigned Pool (Submitted status, no triager)
    const globalPoolCount = await Report.countDocuments({
        status: 'Submitted',
        triagerId: { $exists: false }
    });

    // 3. Avg Resolution (Mock for now or agg query)
    const avgResolution = "4h 12m";

    res.status(200).json({
        status: 'success',
        data: {
            activeQueue: activeQueueCount,
            globalPool: globalPoolCount,
            avgResolution
        }
    });
});

// Get Triager Profile Stats & Achievements
export const getTriagerProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const triagerId = req.user.id;

    // 1. Stats
    const reportsReviewed = await Report.countDocuments({
        triagerId: triagerId,
        status: { $ne: 'Submitted' } 
    });

    // Mock/Simple Stats for now
    const avgResponse = reportsReviewed > 0 ? "2h 15m" : "N/A"; 
    const consensusScore = reportsReviewed > 0 ? 98.5 : 0;

    // 2. Fetch User specific fields (Achievements & Preferences)
    const user = await User.findById(triagerId).select('achievements expertise severityPreferences maxConcurrentReports isAvailable');

    res.status(200).json({
        status: 'success',
        data: {
            stats: {
                reportsReviewed,
                avgResponse,
                consensusScore
            },
            achievements: user?.achievements || [],
            preferences: {
                expertise: user?.expertise || [],
                severityPreferences: user?.severityPreferences || [],
                maxConcurrentReports: user?.maxConcurrentReports || 10,
                isAvailable: user?.isAvailable ?? true
            }
        }
    });
});

// Update Triager Preferences
export const updateTriagerPreferences = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { expertise, severityPreferences, maxConcurrentReports, isAvailable } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));

    if (expertise) user.expertise = expertise;
    if (severityPreferences) user.severityPreferences = severityPreferences;
    if (maxConcurrentReports !== undefined) user.maxConcurrentReports = maxConcurrentReports;
    if (isAvailable !== undefined) user.isAvailable = isAvailable;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        message: 'Preferences updated successfully',
        data: {
             preferences: {
                expertise: user.expertise,
                severityPreferences: user.severityPreferences,
                maxConcurrentReports: user.maxConcurrentReports,
                isAvailable: user.isAvailable
            }
        }
    });
});

// Get My Active Queue
export const getMyQueue = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const triagerId = req.user.id;
    
    // Fetch reports assigned to me
    // Populate program name if needed, but Report schema has programId string. 
    // Ideally populate Program title if possible or if stored in Report. 
    // Assuming programId is a string ID referencing Program model.
    // Let's check schema: programId: { type: String, required: true }
    // If it's an ObjectId or string ID, we can try to look it up.
    
    // Populating 'researcherId' to get name if needed, but for list view usually title/severity/program is key.
    const reports = await Report.find({
        triagerId: triagerId,
        status: { $in: ['Triaging', 'Under Review', 'Needs Info'] }
    }).sort('-updatedAt');

    // Enrich with Program Name if programId is just ID (Assuming mock or real ID)
    // For now returning as is, frontend might need program name.
    
    res.status(200).json({
        status: 'success',
        results: reports.length,
        data: {
            reports
        }
    });
});

// Get Assigned Reports (For Assigned Page)
export const getAssignedReports = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const triagerId = req.user.id;
    // console.log("DEBUG: getAssignedReports called by user:", triagerId);

    // Fetch reports assigned to me
    const reports = await Report.find({
        triagerId: triagerId
    })
    .populate('researcherId', 'username name avatar') // Get researcher details
    .sort('-updatedAt'); // Sort by recent activity

    // console.log("DEBUG: Found reports count:", reports.length);

    res.status(200).json({
        status: 'success',
        results: reports.length,
        data: {
            reports
        }
    });
});

// Get Standard Queue / Global Pool
export const getGlobalPool = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { expertise } = req.query;
    
    const query: any = {
        status: 'Submitted',
        triagerId: { $exists: false }
    };

    // Filter by expertise (category) if provided and not 'all'
    // Assuming 'vulnerabilityCategory' maps somewhat to expertise or we filter by assets/program type.
    // For simplicity, returning all submitted reports for now. 
    // If expertise passed, we might filter by category if we had mapping.

    const reports = await Report.find(query).sort('createdAt');

    res.status(200).json({
        status: 'success',
        results: reports.length,
        data: {
            reports
        }
    });
});

// Claim a Report
export const claimReport = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const triagerId = req.user.id;
    const triagerName = req.user.username || req.user.name;

    const report = await Report.findById(id).populate('researcherId', 'username name');

    if (!report) {
        return next(new AppError('Report not found', 404));
    }

    if (report.triagerId && report.triagerId.toString() !== triagerId) {
        return next(new AppError('Report already claimed by another triager', 400));
    }

    // --- NEW: Concurrency Enforcements ---
    const triagerRecord = await User.findById(triagerId).select('maxConcurrentReports');
    if (triagerRecord) {
        const activeCount = await Report.countDocuments({
            triagerId: triagerId,
            status: { $in: ['Triaging', 'Under Review', 'Needs Info'] }
        });
        const currentMax = triagerRecord.maxConcurrentReports || 10;
        
        if (activeCount >= currentMax) {
            return next(new AppError(`You have reached your maximum concurrent reports limit (${currentMax}). Please resolve active reports before claiming new ones.`, 400));
        }
    }
    // ------------------------------------

    if (report.status === 'Submitted') {
        const researcherName = (report.researcherId as any)?.username || (report.researcherId as any)?.name || 'Researcher';
        
        const welcomeMessage = `Hi @${researcherName},

Thank you for your submission. I hope this message finds you well.

I am reviewing your report and will get back to you shortly with an update.

Best regards,
@${triagerName}`;

        report.comments.push({
            sender: triagerId as any,
            content: welcomeMessage,
            type: 'assignment',
            createdAt: new Date()
        });
    }

    report.triagerId = triagerId as any;
    report.status = 'Triaging';
    report.triagerNote = 'Report claimed for triage.';

    await report.save();

    try {
        const dupStatus = String(report.duplicateReviewStatus || 'not_applicable');
        const hasCandidates = Array.isArray(report.duplicateCandidates) && report.duplicateCandidates.length > 0;
        if (!['cleared', 'confirmed_duplicate'].includes(dupStatus) && !hasCandidates) {
            const { candidates, reviewStatus } = await runInitialDuplicateScanForNewReport(report);
            report.duplicateLastScannedAt = new Date();
            if (candidates.length > 0) {
                report.duplicateCandidates = candidates as any;
                report.duplicateReviewStatus = reviewStatus;
            }
            await report.save();
        }
    } catch (dupErr) {
        console.error('[claimReport] duplicate scan:', dupErr);
    }

    try {
        const io = getIO();
        const newAssignmentComment = report.comments[report.comments.length - 1];
        
        io.to(id).emit('new_activity', {
            id: newAssignmentComment._id,
            type: 'assignment',
            author: triagerName,
            role: 'Triager',
            content: newAssignmentComment.content,
            timestamp: newAssignmentComment.createdAt,
            // authorAvatar: ... we don't populate sender here immediately in claimReport
        });
    } catch (socketError) {
        console.error("Socket emit failed on claim:", socketError);
    }

    res.status(200).json({
        status: 'success',
        message: 'Report claimed successfully',
        data: {
            report
        }
    });

    // Send Email to Researcher in background
    (async () => {
        const researcherEmail = (report.researcherId as any)?.email;
        const researcherName = (report.researcherId as any)?.name || 'Researcher';
        if (researcherEmail) {
            try {
                await sendEmail(
                    researcherEmail,
                    `Your report is being reviewed: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcherName,
                        recipientRole: 'researcher',
                        actorName: triagerName,
                        actorRole: 'triager',
                        actionType: 'claimed',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        newStatus: 'Triaging',
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                    })
                );
            } catch (error) {
                console.error('Failed to send assignment email:', error);
            }
        }
    })();
});

// Get Report Details
export const getReportDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const loadPopulated = () =>
        Report.findById(id)
            .populate('researcherId', 'username name email avatar')
            .populate('comments.sender', 'username name role avatar')
            .populate({
                path: 'programId',
                model: 'Program',
                select: 'title companyName type bountyRange description rewards rulesOfEngagement safeHarbor submissionGuidelines scope',
                populate: {
                    path: 'companyId',
                    model: 'User',
                    select: 'name avatar'
                }
            });

    let report = await loadPopulated();

    if (!report) {
        return next(new AppError('Report not found', 404));
    }

    if (['triager', 'admin'].includes(req.user!.role) && pruneDuplicateCandidatesNotOlderThanSelf(report)) {
        await report.save();
        report = await loadPopulated();
        if (!report) {
            return next(new AppError('Report not found', 404));
        }
    }

    const role = req.user!.role;
    const dupStatus = String(report.duplicateReviewStatus || 'not_applicable');
    const hasCandidates = Array.isArray(report.duplicateCandidates) && report.duplicateCandidates.length > 0;
    const lastScanMs = report.duplicateLastScannedAt
        ? new Date(report.duplicateLastScannedAt).getTime()
        : 0;
    const staleMs = Number(process.env.DUPLICATE_AUTOSCAN_COOLDOWN_MS || 120000);

    const tryAutoScan =
        ['triager', 'admin'].includes(role) &&
        report.status !== 'Duplicate' &&
        !['cleared', 'confirmed_duplicate'].includes(dupStatus) &&
        !hasCandidates &&
        (Date.now() - lastScanMs > staleMs || !report.duplicateLastScannedAt);

    if (tryAutoScan) {
        try {
            const { candidates, reviewStatus } = await runInitialDuplicateScanForNewReport(report);
            report.duplicateLastScannedAt = new Date();
            if (candidates.length > 0) {
                report.duplicateCandidates = candidates as any;
                report.duplicateReviewStatus = reviewStatus;
            }
            await report.save();
            report = await loadPopulated();
            if (!report) {
                return next(new AppError('Report not found', 404));
            }
        } catch (e) {
            console.error('[getReportDetails] auto duplicate scan:', e);
        }
    }

    res.status(200).json({
        status: 'success',
        data: {
            report
        }
    });
});

// Post Comment / Activity
export const postComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { content } = req.body;
    
    const report = await Report.findById(id);
    if (!report) return next(new AppError('Report not found', 404));

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
        sender: req.user.id,
        content,
        attachments: uploadedUrls,
        createdAt: new Date()
    });

    await report.save();

    await report.populate('comments.sender', 'name username role avatar');
    const newComment = report.comments[report.comments.length - 1];

    try {
        const io = getIO();
        io.to(id).emit('new_activity', {
            id: newComment._id,
            type: 'comment',
            author: req.user!.role !== 'company' ? (req.user!.username || req.user!.name || 'Unknown User') : (req.user!.name || 'Unknown Company'),
            authorName: req.user!.name,
            authorUsername: req.user!.username,
            role: 'Triager',
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
        data: {
            report
        }
    });

    // Populate to get researcher details for email in background
    (async () => {
        try {
            await report.populate('researcherId', 'name email avatar');
            const researcher = report.researcherId as any;

            if (researcher?.email) {
                const senderName = req.user.name || req.user.username || 'Triager';
                await sendEmail(
                    researcher.email,
                    `New Comment on: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: senderName,
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
        } catch (error) {
            console.error('Failed to send comment email:', error);
        }
    })();
});

/** While the report is in these states, triagers use normal status changes — triager-only notice is for other states. */
const ACTIVE_TRIAGE_STATUSES_FOR_NOTICE = new Set(['Submitted', 'Triaging', 'Under Review', 'Needs Info']);

/**
 * When the report is not in active triage (anything other than Submitted / Triaging / Under Review / Needs Info):
 * post a triager notice on the thread and email the researcher (same pattern as chat comments).
 */
export const postTriagerIssueReportToResearcher = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const details = String((req.body as { details?: string })?.details ?? '').trim();
    if (!details) {
        return next(new AppError('Please enter a message to send to the researcher.', 400));
    }

    const report = await Report.findById(id);
    if (!report) return next(new AppError('Report not found', 404));

    if (ACTIVE_TRIAGE_STATUSES_FOR_NOTICE.has(String(report.status))) {
        return next(
            new AppError(
                'Triager notices are only available once the report has left active triage (not Submitted, Triaging, Under Review, or Needs Info).',
                403
            )
        );
    }

    const senderName = req.user!.name || req.user!.username || 'Triager';
    const reportLabel = report.reportId || String(report._id);
    const threadContent = [
        '**Triager notice**',
        '',
        `Regarding report **${reportLabel}** (status: **${report.status}**):`,
        '',
        details,
    ].join('\n');

    report.comments.push({
        sender: req.user!.id as any,
        content: threadContent,
        type: 'comment',
        createdAt: new Date(),
    } as any);

    await report.save();
    await report.populate('comments.sender', 'name username role avatar');
    const newComment = report.comments[report.comments.length - 1];

    try {
        const io = getIO();
        io.to(id).emit('new_activity', {
            id: newComment._id,
            type: 'comment',
            author:
                req.user!.role !== 'company'
                    ? (req.user!.username || req.user!.name || 'Unknown User')
                    : (req.user!.name || 'Unknown Company'),
            authorName: req.user!.name,
            authorUsername: req.user!.username,
            role: 'Triager',
            content: newComment.content,
            attachments: newComment.attachments || [],
            timestamp: newComment.createdAt,
            authorAvatar: req.user!.avatar,
            metadata: {},
        });
    } catch (socketError) {
        console.error('Socket emit failed (triager notice):', socketError);
    }

    res.status(200).json({
        status: 'success',
        data: {
            report,
        },
    });

    (async () => {
        try {
            await report.populate('researcherId', 'name email avatar');
            const researcher = report.researcherId as any;
            if (researcher?.email) {
                await sendEmail(
                    researcher.email,
                    `Message from triage: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: senderName,
                        actorRole: 'triager',
                        actionType: 'comment',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        message: threadContent,
                        messageSectionLabel: 'Triager notice',
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`,
                    })
                );
            }
        } catch (e) {
            console.error('Failed to send triager notice email:', e);
        }
    })();
});

// Update Report Details (Severity, Vectors) - "Calculator"
export const updateReportSeverity = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { severity, cvssVector, cvssScore, impact } = req.body;

    const report = await Report.findById(id);

    if (!report) {
        return next(new AppError('Report not found', 404));
    }

    report.severity = severity;
    report.cvssVector = cvssVector;
    report.cvssScore = cvssScore;
    report.impact = impact;

    // Add system comment
    report.comments.push({
        sender: req.user.id,
        content: `Updated severity to ${severity} (${cvssScore}).`,
        type: 'severity_update',
        metadata: { severity, cvssScore, cvssVector },
        createdAt: new Date()
    });

    await report.save();

    try {
        const io = getIO();
        const newSystemComment = report.comments[report.comments.length - 1];
        
        io.to(id).emit('new_activity', {
            id: newSystemComment._id,
            type: 'status_change', // Treat as status change for timeline UI display logic
            author: 'System',
            role: 'System',
            content: newSystemComment.content,
            timestamp: newSystemComment.createdAt
        });
        
        // Also emit report_updated event so the UI can update the actual severity badges
        io.to(id).emit('report_updated', {
             severity,
             cvssScore,
             cvssVector,
             impact
        });
    } catch (socketError) {
        console.error("Socket emit failed on severity update:", socketError);
    }

    res.status(200).json({
        status: 'success',
        data: {
            report
        }
    });

    // Notify Researcher in background
    (async () => {
        try {
            await report.populate('researcherId', 'name email avatar');
            const researcher = report.researcherId as any;
            if (researcher?.email) {
                const senderName = req.user.name || req.user.username || 'Triager';
                await sendEmail(
                    researcher.email,
                    `Severity Updated: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: senderName,
                        actorRole: 'triager',
                        actionType: 'status_change',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity,
                        newStatus: `Severity updated to ${severity}`,
                        reason: `CVSS Score: ${cvssScore} | Vector: ${cvssVector}`,
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                    })
                );
            }
        } catch (error) {
            console.error('Failed to send severity email:', error);
        }
    })();
});

// Submit Triage Decision
export const submitDecision = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status, note, bountyAmount } = req.body;

    // Populate researcherId with explicit fields (including email) at query time
    const report = await Report.findById(id)
        .populate('researcherId', 'name email username avatar');

    if (!report) {
        return next(new AppError('Report not found', 404));
    }

    const dupErr = duplicateReviewBlocksPromoteOrResolve(report, status);
    if (dupErr) return next(dupErr);

    const oldStatus = report.status; // capture BEFORE overwriting

    report.status = status;
    if (note && status === 'Triaged') report.triagerNote = note;

    report.comments.push({
        sender: req.user.id,
        content: `Changed status to ${status}`,
        type: 'status_change',
        metadata: { 
            oldStatus,
            newStatus: status,
            reason: note 
        },
        createdAt: new Date()
    });

    const repActor = req.user.role === 'admin' ? 'admin' : 'triager';
    await applyResearcherReputationOnStatusTransition(report, oldStatus, status, repActor);

    await report.save();

    try {
        const io = getIO();
        const newSystemComment = report.comments[report.comments.length - 1];
        
        io.to(id).emit('new_activity', {
            id: newSystemComment._id,
            type: 'status_change', 
            author: req.user.username || req.user.name || 'Unknown Triager',
            authorAvatar: req.user.avatar,
            role: 'Triager',
            content: newSystemComment.content,
            timestamp: newSystemComment.createdAt,
            metadata: newSystemComment.metadata
        });
        
        io.to(id).emit('status_updated', { status });
    } catch (socketError) {
        console.error("Socket emit failed on submit decision:", socketError);
    }

    res.status(200).json({
        status: 'success',
        data: { report }
    });

    // Send Email notifications in background (non-blocking)
    (async () => {
        const researcher = report.researcherId as any;
        console.log('[EMAIL DEBUG] researcher email:', researcher?.email, '| status:', status);

        // In-App Notification — separate try-catch so it doesn't block email
        try {
            const recipientId = researcher?._id || researcher;
            await Notification.create({
                recipient: recipientId,
                title: `Report Status Updated: ${report.title}`,
                message: `Your report has been marked as ${status}.`,
                type: 'report_status',
                link: `/researcher/reports/${report._id}`
            });
        } catch (notifErr) {
            console.error('[EMAIL DEBUG] Notification.create failed:', notifErr);
        }

        // Email Researcher — own try-catch
        try {
            if (researcher?.email) {
                const senderName = req.user.name || req.user.username || 'Triager';
                console.log('[EMAIL DEBUG] Sending researcher email to:', researcher.email);
                const html = reportEmailTemplate({
                    recipientName: researcher.name || 'Researcher',
                    recipientRole: 'researcher',
                    actorName: senderName,
                    actorRole: 'triager',
                    actionType: status === 'Triaged' ? 'promoted' : 'status_change',
                    reportTitle: report.title,
                    reportId: report.reportId || String(report._id),
                    severity: report.severity,
                    oldStatus,
                    newStatus: status,
                    reason: note || undefined,
                    link: `${process.env.CLIENT_URL || 'http://localhost:3000'}/researcher/reports/${report._id}`
                });
                await sendEmail(
                    researcher.email,
                    `Report ${status === 'Triaged' ? 'Promoted' : 'Status Updated'}: ${report.title}`,
                    html
                );
                console.log('[EMAIL DEBUG] Researcher email sent successfully');
            } else {
                console.warn('[EMAIL DEBUG] No researcher email found — skipping');
            }
        } catch (researcherEmailErr) {
            console.error('[EMAIL DEBUG] Researcher email failed:', researcherEmailErr);
        }

        // Email Company when Triaged — own try-catch
        if (status === 'Triaged') {
            try {
                const prog = await Program.findById(report.programId).populate('companyId', 'name email');
                const company = prog?.companyId as any;
                console.log('[EMAIL DEBUG] Company email:', company?.email);
                if (company?.email) {
                    const html = reportEmailTemplate({
                        recipientName: company.name || 'Security Team',
                        recipientRole: 'company',
                        actorName: req.user.name || 'BugChase Triage',
                        actorRole: 'triager',
                        actionType: 'promoted',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        newStatus: 'Triaged',
                        link: `${process.env.CLIENT_URL || 'http://localhost:3000'}/company/reports/${report._id}`
                    });
                    await sendEmail(
                        company.email,
                        `New Report Forwarded to Your Program: ${report.title}`,
                        html
                    );
                    console.log('[EMAIL DEBUG] Company email sent successfully');
                }
            } catch (companyEmailErr) {
                console.error('[EMAIL DEBUG] Company email failed:', companyEmailErr);
            }
        }
    })();

});



// Update Report Status
export const updateReportStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status, note } = req.body;

    // Populate researcherId at query time so email has the address
    const report = await Report.findById(id).populate('researcherId', 'name email username');
    if (!report) return next(new AppError('Report not found', 404));

    const dupErr = duplicateReviewBlocksPromoteOrResolve(report, status);
    if (dupErr) return next(dupErr);

    const oldStatus = report.status; // capture BEFORE overwriting

    const actorDisplay = req.user.name || req.user.username || 'BugChase Triage';
    const reportPublicId = report.reportId || String(report._id);

    const reopening = isReopenToTriaging(String(oldStatus), String(status));
    const reopenBody = reopening
        ? formatReopenForTriageMarkdown({
              reportPublicId,
              previousStatus: String(oldStatus),
              actorDisplayName: actorDisplay,
              optionalTriagerNote: typeof note === 'string' ? note : '',
          })
        : '';

    if (reopening) {
        clearReputationMilestonesForReTriage(report);
    }

    // Persist changes
    report.status = status;

    report.comments.push({
        sender: req.user.id,
        content: reopening
            ? `Report reopened for triage (previously **${oldStatus}**).`
            : `Changed status to ${status}`,
        type: 'status_change',
        metadata: {
            oldStatus,
            newStatus: status,
            reason: reopening ? reopenBody : note || '',
        },
        createdAt: new Date(),
    });

    const repActor = req.user.role === 'admin' ? 'admin' : 'triager';
    await applyResearcherReputationOnStatusTransition(report, oldStatus, status, repActor);

    await report.save();

    try {
        const io = getIO();
        const newSystemComment = report.comments[report.comments.length - 1];
        
        io.to(id).emit('new_activity', {
            id: newSystemComment._id,
            type: 'status_change', 
            author: req.user.username || req.user.name || 'Unknown Triager',
            authorAvatar: req.user.avatar,
            role: 'Triager',
            content: newSystemComment.content,
            timestamp: newSystemComment.createdAt,
            metadata: newSystemComment.metadata
        });
        
        io.to(id).emit('status_updated', {
             status
        });
    } catch (socketError) {
        console.error("Socket emit failed on status update:", socketError);
    }

    res.status(200).json({
        status: 'success',
        data: { report }
    });

    // Send Email notifications in background
    (async () => {
        try {
            const researcher = report.researcherId as any;
            if (researcher?.email) {
                const senderName = req.user.name || req.user.username || 'Triager';
                const emailReopen = isReopenToTriaging(String(oldStatus), String(status));
                const reopenMarkdown = emailReopen
                    ? formatReopenForTriageMarkdown({
                          reportPublicId,
                          previousStatus: String(oldStatus),
                          actorDisplayName: senderName,
                          optionalTriagerNote: typeof note === 'string' ? note : '',
                      })
                    : '';
                await sendEmail(
                    researcher.email,
                    emailReopen ? `Report reopened for triage` : `Status Updated: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: senderName,
                        actorRole: 'triager',
                        actionType: 'status_change',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        oldStatus,
                        previousStatus: emailReopen ? String(oldStatus) : undefined,
                        newStatus: status,
                        reason: emailReopen ? reopenMarkdown : note || undefined,
                        reasonSectionLabel: emailReopen ? 'Reopen summary' : undefined,
                        suppressVulnerabilitySummary: emailReopen,
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`,
                    })
                );
            }

            // If promoted to Triaged — also notify the Company
            if (status === 'Triaged') {
                const prog = await Program.findById(report.programId).populate('companyId', 'name email');
                const company = (prog?.companyId) as any;
                if (company?.email) {
                    await sendEmail(
                        company.email,
                        `Report Promoted to Your Program: ${report.title}`,
                        reportEmailTemplate({
                            recipientName: company.name || 'Security Team',
                            recipientRole: 'company',
                            actorName: req.user.name || 'BugChase Triage',
                            actorRole: 'triager',
                            actionType: 'promoted',
                            reportTitle: report.title,
                            reportId: report.reportId || String(report._id),
                            severity: report.severity,
                            newStatus: 'Triaged',
                            link: `${process.env.CLIENT_URL}/company/reports/${report._id}`
                        })
                    );
                }
            }
        } catch (error) {
            console.error('Failed to send status email:', error);
        }
    })();
});


// Reopen Report
export const reopenReport = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const report = await Report.findById(id).populate('researcherId', 'name email username');
    if (!report) return next(new AppError('Report not found', 404));

    const oldStatus = report.status;
    const actorDisplay = req.user.name || req.user.username || 'BugChase Triage';
    const reportPublicId = report.reportId || String(report._id);

    const reopenBody = formatReopenForTriageMarkdown({
        reportPublicId,
        previousStatus: String(oldStatus),
        actorDisplayName: actorDisplay,
        optionalTriagerNote: '',
    });

    clearReputationMilestonesForReTriage(report);
    report.status = 'Triaging';

    report.comments.push({
        sender: req.user.id,
        content: `Report reopened for triage (previously **${oldStatus}**).`,
        type: 'status_change',
        metadata: {
            oldStatus,
            newStatus: 'Triaging',
            reason: reopenBody,
        },
        createdAt: new Date(),
    } as any);

    const repActor = req.user.role === 'admin' ? 'admin' : 'triager';
    await applyResearcherReputationOnStatusTransition(report, oldStatus, 'Triaging', repActor);

    await report.save();
    await report.populate('comments.sender', 'name username role avatar');

    try {
        const io = getIO();
        const newComment = report.comments[report.comments.length - 1];
        io.to(id).emit('new_activity', {
            id: newComment._id,
            type: 'status_change',
            author: req.user.username || req.user.name || 'Unknown Triager',
            authorAvatar: req.user.avatar,
            role: 'Triager',
            content: newComment.content,
            timestamp: newComment.createdAt,
            metadata: newComment.metadata,
        });
        io.to(id).emit('status_updated', { status: 'Triaging' });
    } catch (socketError) {
        console.error('Socket emit failed on reopen:', socketError);
    }

    res.status(200).json({
        status: 'success',
        message: 'Report reopened successfully',
        data: { report },
    });

    (async () => {
        try {
            const researcher = report.researcherId as any;
            if (researcher?.email) {
                const senderName = req.user.name || req.user.username || 'Triager';
                await sendEmail(
                    researcher.email,
                    `Report reopened for triage`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: senderName,
                        actorRole: 'triager',
                        actionType: 'status_change',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        oldStatus,
                        previousStatus: String(oldStatus),
                        newStatus: 'Triaging',
                        reason: reopenBody,
                        reasonSectionLabel: 'Reopen summary',
                        suppressVulnerabilitySummary: true,
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`,
                    })
                );
            }
        } catch (e) {
            console.error('Failed to send reopen email:', e);
        }
    })();
});

// Update Validation Flags
export const updateReportValidation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { isReproduced, isValidAsset } = req.body;

    const report = await Report.findById(id);
    if (!report) return next(new AppError('Report not found', 404));

    if (isReproduced !== undefined) report.isReproduced = isReproduced;
    if (isValidAsset !== undefined) report.isValidAsset = isValidAsset;

    await report.save();

    res.status(200).json({
        status: 'success',
        data: { report }
    });
});

// Generate AI Summary for Report
export const generateSummary = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const report = await Report.findById(id)
        .populate('comments.sender', 'username name role');

    if (!report) {
         return next(new AppError('Report not found', 404));
    }

    const summaryData = await generateReportSummary(report, report.comments);

    res.status(200).json({
        status: 'success',
        data: {
            summary: summaryData
        }
    });
});