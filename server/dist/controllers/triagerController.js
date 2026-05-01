"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSummary = exports.updateReportValidation = exports.reopenReport = exports.updateReportStatus = exports.submitDecision = exports.updateReportSeverity = exports.postComment = exports.getReportDetails = exports.claimReport = exports.getGlobalPool = exports.getAssignedReports = exports.getMyQueue = exports.updateTriagerPreferences = exports.getTriagerProfile = exports.getDashboardStats = void 0;
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const cloudinary_1 = require("../utils/cloudinary");
const Report_1 = __importDefault(require("../models/Report"));
const User_1 = __importDefault(require("../models/User"));
const Program_1 = __importDefault(require("../models/Program"));
const Notification_1 = __importDefault(require("../models/Notification"));
const emailService_1 = require("../services/emailService");
const geminiService_1 = require("../services/geminiService");
const socketService_1 = require("../services/socketService");
// Dashboard Stats
exports.getDashboardStats = (0, catchAsync_1.default)(async (req, res, next) => {
    const triagerId = req.user.id;
    // 1. My Active Queue
    const activeQueueCount = await Report_1.default.countDocuments({
        triagerId: triagerId,
        status: { $in: ['Triaging', 'Under Review', 'Needs Info'] }
    });
    // 2. Global Unassigned Pool (Submitted status, no triager)
    const globalPoolCount = await Report_1.default.countDocuments({
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
exports.getTriagerProfile = (0, catchAsync_1.default)(async (req, res, next) => {
    const triagerId = req.user.id;
    // 1. Stats
    const reportsReviewed = await Report_1.default.countDocuments({
        triagerId: triagerId,
        status: { $ne: 'Submitted' }
    });
    // Mock/Simple Stats for now
    const avgResponse = reportsReviewed > 0 ? "2h 15m" : "N/A";
    const consensusScore = reportsReviewed > 0 ? 98.5 : 0;
    // 2. Fetch User specific fields (Achievements & Preferences)
    const user = await User_1.default.findById(triagerId).select('achievements expertise severityPreferences maxConcurrentReports isAvailable');
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
exports.updateTriagerPreferences = (0, catchAsync_1.default)(async (req, res, next) => {
    const { expertise, severityPreferences, maxConcurrentReports, isAvailable } = req.body;
    const user = await User_1.default.findById(req.user.id);
    if (!user)
        return next(new AppError_1.default('User not found', 404));
    if (expertise)
        user.expertise = expertise;
    if (severityPreferences)
        user.severityPreferences = severityPreferences;
    if (maxConcurrentReports !== undefined)
        user.maxConcurrentReports = maxConcurrentReports;
    if (isAvailable !== undefined)
        user.isAvailable = isAvailable;
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
exports.getMyQueue = (0, catchAsync_1.default)(async (req, res, next) => {
    const triagerId = req.user.id;
    // Fetch reports assigned to me
    // Populate program name if needed, but Report schema has programId string. 
    // Ideally populate Program title if possible or if stored in Report. 
    // Assuming programId is a string ID referencing Program model.
    // Let's check schema: programId: { type: String, required: true }
    // If it's an ObjectId or string ID, we can try to look it up.
    // Populating 'researcherId' to get name if needed, but for list view usually title/severity/program is key.
    const reports = await Report_1.default.find({
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
exports.getAssignedReports = (0, catchAsync_1.default)(async (req, res, next) => {
    const triagerId = req.user.id;
    // console.log("DEBUG: getAssignedReports called by user:", triagerId);
    // Fetch reports assigned to me
    const reports = await Report_1.default.find({
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
exports.getGlobalPool = (0, catchAsync_1.default)(async (req, res, next) => {
    const { expertise } = req.query;
    const query = {
        status: 'Submitted',
        triagerId: { $exists: false }
    };
    // Filter by expertise (category) if provided and not 'all'
    // Assuming 'vulnerabilityCategory' maps somewhat to expertise or we filter by assets/program type.
    // For simplicity, returning all submitted reports for now. 
    // If expertise passed, we might filter by category if we had mapping.
    const reports = await Report_1.default.find(query).sort('createdAt');
    res.status(200).json({
        status: 'success',
        results: reports.length,
        data: {
            reports
        }
    });
});
// Claim a Report
exports.claimReport = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const triagerId = req.user.id;
    const triagerName = req.user.username || req.user.name;
    const report = await Report_1.default.findById(id).populate('researcherId', 'username name');
    if (!report) {
        return next(new AppError_1.default('Report not found', 404));
    }
    if (report.triagerId && report.triagerId.toString() !== triagerId) {
        return next(new AppError_1.default('Report already claimed by another triager', 400));
    }
    // --- NEW: Concurrency Enforcements ---
    const triagerRecord = await User_1.default.findById(triagerId).select('maxConcurrentReports');
    if (triagerRecord) {
        const activeCount = await Report_1.default.countDocuments({
            triagerId: triagerId,
            status: { $in: ['Triaging', 'Under Review', 'Needs Info'] }
        });
        const currentMax = triagerRecord.maxConcurrentReports || 10;
        if (activeCount >= currentMax) {
            return next(new AppError_1.default(`You have reached your maximum concurrent reports limit (${currentMax}). Please resolve active reports before claiming new ones.`, 400));
        }
    }
    // ------------------------------------
    if (report.status === 'Submitted') {
        const researcherName = report.researcherId?.username || report.researcherId?.name || 'Researcher';
        const welcomeMessage = `Hi @${researcherName},

Thank you for your submission. I hope this message finds you well.

I am reviewing your report and will get back to you shortly with an update.

Best regards,
@${triagerName}`;
        report.comments.push({
            sender: triagerId,
            content: welcomeMessage,
            type: 'assignment',
            createdAt: new Date()
        });
    }
    report.triagerId = triagerId;
    report.status = 'Triaging';
    report.triagerNote = 'Report claimed for triage.';
    await report.save();
    try {
        const io = (0, socketService_1.getIO)();
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
    }
    catch (socketError) {
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
        const researcherEmail = report.researcherId?.email;
        const researcherName = report.researcherId?.name || 'Researcher';
        if (researcherEmail) {
            try {
                await (0, emailService_1.sendEmail)(researcherEmail, `Your report is being reviewed: ${report.title}`, (0, emailService_1.reportEmailTemplate)({
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
                }));
            }
            catch (error) {
                console.error('Failed to send assignment email:', error);
            }
        }
    })();
});
// Get Report Details
exports.getReportDetails = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const report = await Report_1.default.findById(id)
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
    if (!report) {
        return next(new AppError_1.default('Report not found', 404));
    }
    res.status(200).json({
        status: 'success',
        data: {
            report
        }
    });
});
// Post Comment / Activity
exports.postComment = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const { content } = req.body;
    const report = await Report_1.default.findById(id);
    if (!report)
        return next(new AppError_1.default('Report not found', 404));
    // Process uploaded files if any
    const uploadedUrls = [];
    if (req.files && Array.isArray(req.files)) {
        const uploadPromises = req.files.map((file) => {
            return (0, cloudinary_1.uploadToCloudinary)(file);
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
        const io = (0, socketService_1.getIO)();
        io.to(id).emit('new_activity', {
            id: newComment._id,
            type: 'comment',
            author: req.user.role !== 'company' ? (req.user.username || req.user.name || 'Unknown User') : (req.user.name || 'Unknown Company'),
            authorName: req.user.name,
            authorUsername: req.user.username,
            role: 'Triager',
            content: newComment.content,
            attachments: newComment.attachments,
            timestamp: newComment.createdAt,
            authorAvatar: req.user.avatar
        });
    }
    catch (socketError) {
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
            const researcher = report.researcherId;
            if (researcher?.email) {
                const senderName = req.user.name || req.user.username || 'Triager';
                await (0, emailService_1.sendEmail)(researcher.email, `New Comment on: ${report.title}`, (0, emailService_1.reportEmailTemplate)({
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
                }));
            }
        }
        catch (error) {
            console.error('Failed to send comment email:', error);
        }
    })();
});
// Update Report Details (Severity, Vectors) - "Calculator"
exports.updateReportSeverity = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const { severity, cvssVector, cvssScore, impact } = req.body;
    const report = await Report_1.default.findById(id);
    if (!report) {
        return next(new AppError_1.default('Report not found', 404));
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
        const io = (0, socketService_1.getIO)();
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
    }
    catch (socketError) {
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
            const researcher = report.researcherId;
            if (researcher?.email) {
                const senderName = req.user.name || req.user.username || 'Triager';
                await (0, emailService_1.sendEmail)(researcher.email, `Severity Updated: ${report.title}`, (0, emailService_1.reportEmailTemplate)({
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
                }));
            }
        }
        catch (error) {
            console.error('Failed to send severity email:', error);
        }
    })();
});
// Submit Triage Decision
exports.submitDecision = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const { status, note, bountyAmount } = req.body;
    // Populate researcherId with explicit fields (including email) at query time
    const report = await Report_1.default.findById(id)
        .populate('researcherId', 'name email username avatar');
    if (!report) {
        return next(new AppError_1.default('Report not found', 404));
    }
    const oldStatus = report.status; // capture BEFORE overwriting
    report.status = status;
    if (note && status === 'Triaged')
        report.triagerNote = note;
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
    await report.save();
    try {
        const io = (0, socketService_1.getIO)();
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
    }
    catch (socketError) {
        console.error("Socket emit failed on submit decision:", socketError);
    }
    res.status(200).json({
        status: 'success',
        data: { report }
    });
    // Send Email notifications in background (non-blocking)
    (async () => {
        const researcher = report.researcherId;
        console.log('[EMAIL DEBUG] researcher email:', researcher?.email, '| status:', status);
        // In-App Notification — separate try-catch so it doesn't block email
        try {
            const recipientId = researcher?._id || researcher;
            await Notification_1.default.create({
                recipient: recipientId,
                title: `Report Status Updated: ${report.title}`,
                message: `Your report has been marked as ${status}.`,
                type: 'report_status',
                link: `/researcher/reports/${report._id}`
            });
        }
        catch (notifErr) {
            console.error('[EMAIL DEBUG] Notification.create failed:', notifErr);
        }
        // Email Researcher — own try-catch
        try {
            if (researcher?.email) {
                const senderName = req.user.name || req.user.username || 'Triager';
                console.log('[EMAIL DEBUG] Sending researcher email to:', researcher.email);
                const html = (0, emailService_1.reportEmailTemplate)({
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
                await (0, emailService_1.sendEmail)(researcher.email, `Report ${status === 'Triaged' ? 'Promoted' : 'Status Updated'}: ${report.title}`, html);
                console.log('[EMAIL DEBUG] Researcher email sent successfully');
            }
            else {
                console.warn('[EMAIL DEBUG] No researcher email found — skipping');
            }
        }
        catch (researcherEmailErr) {
            console.error('[EMAIL DEBUG] Researcher email failed:', researcherEmailErr);
        }
        // Email Company when Triaged — own try-catch
        if (status === 'Triaged') {
            try {
                const prog = await Program_1.default.findById(report.programId).populate('companyId', 'name email');
                const company = prog?.companyId;
                console.log('[EMAIL DEBUG] Company email:', company?.email);
                if (company?.email) {
                    const html = (0, emailService_1.reportEmailTemplate)({
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
                    await (0, emailService_1.sendEmail)(company.email, `New Report Forwarded to Your Program: ${report.title}`, html);
                    console.log('[EMAIL DEBUG] Company email sent successfully');
                }
            }
            catch (companyEmailErr) {
                console.error('[EMAIL DEBUG] Company email failed:', companyEmailErr);
            }
        }
    })();
});
// Update Report Status
exports.updateReportStatus = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const { status, note } = req.body;
    // Populate researcherId at query time so email has the address
    const report = await Report_1.default.findById(id).populate('researcherId', 'name email username');
    if (!report)
        return next(new AppError_1.default('Report not found', 404));
    const oldStatus = report.status; // capture BEFORE overwriting
    // Persist changes
    report.status = status;
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
    await report.save();
    try {
        const io = (0, socketService_1.getIO)();
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
    }
    catch (socketError) {
        console.error("Socket emit failed on status update:", socketError);
    }
    res.status(200).json({
        status: 'success',
        data: { report }
    });
    // Send Email notifications in background
    (async () => {
        try {
            const researcher = report.researcherId;
            if (researcher?.email) {
                const senderName = req.user.name || req.user.username || 'Triager';
                await (0, emailService_1.sendEmail)(researcher.email, `Status Updated: ${report.title}`, (0, emailService_1.reportEmailTemplate)({
                    recipientName: researcher.name || 'Researcher',
                    recipientRole: 'researcher',
                    actorName: senderName,
                    actorRole: 'triager',
                    actionType: 'status_change',
                    reportTitle: report.title,
                    reportId: report.reportId || String(report._id),
                    severity: report.severity,
                    oldStatus,
                    newStatus: status,
                    reason: note || undefined,
                    link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                }));
            }
            // If promoted to Triaged — also notify the Company
            if (status === 'Triaged') {
                const prog = await Program_1.default.findById(report.programId).populate('companyId', 'name email');
                const company = (prog?.companyId);
                if (company?.email) {
                    await (0, emailService_1.sendEmail)(company.email, `Report Promoted to Your Program: ${report.title}`, (0, emailService_1.reportEmailTemplate)({
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
                    }));
                }
            }
        }
        catch (error) {
            console.error('Failed to send status email:', error);
        }
    })();
});
// Reopen Report
exports.reopenReport = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const report = await Report_1.default.findById(id);
    if (!report)
        return next(new AppError_1.default('Report not found', 404));
    // Logic: Set status to Triaging, add comment
    report.status = 'Triaging';
    report.comments.push({
        sender: req.user.id,
        content: `Report has been reopened.`,
        createdAt: new Date()
    });
    await report.save();
    res.status(200).json({
        status: 'success',
        message: 'Report reopened successfully',
        data: { report }
    });
});
// Update Validation Flags
exports.updateReportValidation = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const { isReproduced, isValidAsset } = req.body;
    const report = await Report_1.default.findById(id);
    if (!report)
        return next(new AppError_1.default('Report not found', 404));
    if (isReproduced !== undefined)
        report.isReproduced = isReproduced;
    if (isValidAsset !== undefined)
        report.isValidAsset = isValidAsset;
    await report.save();
    res.status(200).json({
        status: 'success',
        data: { report }
    });
});
// Generate AI Summary for Report
exports.generateSummary = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const report = await Report_1.default.findById(id)
        .populate('comments.sender', 'username name role');
    if (!report) {
        return next(new AppError_1.default('Report not found', 404));
    }
    const summaryData = await (0, geminiService_1.generateReportSummary)(report, report.comments);
    res.status(200).json({
        status: 'success',
        data: {
            summary: summaryData
        }
    });
});
