"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reindexAllReports = exports.markReportAsDuplicate = exports.checkReportDuplicates = exports.getReportsByProgram = exports.addComment = exports.getReport = exports.getMyReports = exports.createReport = void 0;
const Report_1 = __importDefault(require("../models/Report"));
const User_1 = __importDefault(require("../models/User"));
const Program_1 = __importDefault(require("../models/Program"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const emailService_1 = require("../services/emailService");
const socketService_1 = require("../services/socketService");
const cloudinary_1 = require("../utils/cloudinary");
const duplicateDetectionService_1 = require("../services/duplicateDetectionService");
const randomAlphaNum = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let out = '';
    for (let i = 0; i < length; i += 1) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
};
const toInitials = (value, maxLen) => {
    const words = String(value || '')
        .replace(/[^A-Za-z0-9\s]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    let raw = '';
    if (words.length >= 2)
        raw = words.map((w) => w[0]).join('');
    else if (words.length === 1)
        raw = words[0];
    const compact = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const padded = (compact || 'X').padEnd(maxLen, 'X');
    return padded.slice(0, maxLen);
};
const generateUniqueReportId = async (companyName, programTitle) => {
    const companyInitials = toInitials(companyName, 2);
    const programInitials = toInitials(programTitle, 3);
    for (let attempt = 0; attempt < 25; attempt += 1) {
        const candidate = `${companyInitials}-${programInitials}-${randomAlphaNum(6)}`;
        const exists = await Report_1.default.findOne({ reportId: candidate }).select('_id').lean();
        if (!exists)
            return candidate;
    }
    throw new AppError_1.default('Unable to generate unique report ID. Please retry.', 500);
};
// Create a new report
exports.createReport = (0, catchAsync_1.default)(async (req, res, next) => {
    const { programId, title, vulnerabilityCategory, severity, cvssVector, cvssScore, target, // asset url
    assetType, vulnerableEndpoint, vulnerabilityDetails, // mapped to description
    validationSteps, // mapped to pocSteps
    impact } = req.body;
    if (!programId) {
        return next(new AppError_1.default('Program ID is required', 400));
    }
    const program = await Program_1.default.findById(programId).select('title companyName');
    if (!program) {
        return next(new AppError_1.default('Program not found', 404));
    }
    const generatedReportId = await generateUniqueReportId(program.companyName || 'BC', program.title || 'PRG');
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
    // Basic validation mapping
    const reportData = {
        researcherId: req.user.id,
        programId,
        reportId: generatedReportId,
        title,
        vulnerableEndpoint,
        vulnerabilityCategory,
        severity,
        cvssVector,
        cvssScore,
        description: vulnerabilityDetails,
        pocSteps: validationSteps,
        impact,
        assets: target ? [target, ...uploadedUrls] : uploadedUrls, // Use target as primary asset, append Cloudinary URLs
        status: 'Submitted'
    };
    const newReport = await Report_1.default.create(reportData);
    // Index report at submission-time (before response) so duplicate checks are immediately useful.
    // If indexing fails, rollback the created report to keep DB and vector index consistent.
    try {
        await (0, duplicateDetectionService_1.embedAndStoreReportVectorWithRetry)(newReport, 2);
    }
    catch (error) {
        const msg = (0, duplicateDetectionService_1.isAiServiceUnavailable)(error) ? 'AI service unavailable during indexing' : 'Failed to index report vector';
        console.error(msg, error?.message || error);
        await Report_1.default.findByIdAndDelete(newReport._id);
        if ((0, duplicateDetectionService_1.isAiServiceUnavailable)(error)) {
            return next(new AppError_1.default('Unable to submit report right now: duplicate detection service is unavailable. Please retry shortly.', 503));
        }
        return next(new AppError_1.default('Unable to submit report because indexing failed. Please retry.', 500));
    }
    res.status(201).json({
        status: 'success',
        data: newReport
    });
    // Send submission confirmation to researcher in background
    (async () => {
        try {
            const researcher = await User_1.default.findById(req.user.id).select('name email');
            if (researcher?.email) {
                await (0, emailService_1.sendEmail)(researcher.email, `Report Received: ${title}`, (0, emailService_1.reportEmailTemplate)({
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
                }));
            }
        }
        catch (e) {
            console.error('Failed to send submission confirmation email:', e);
        }
    })();
});
// Get reports for logged-in researcher
exports.getMyReports = (0, catchAsync_1.default)(async (req, res, next) => {
    const reports = await Report_1.default.find({ researcherId: req.user.id })
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
    res.status(200).json({
        status: 'success',
        results: reports.length,
        data: reports
    });
});
// Get single report details
exports.getReport = (0, catchAsync_1.default)(async (req, res, next) => {
    const report = await Report_1.default.findById(req.params.id)
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
        return next(new AppError_1.default('Report not found', 404));
    }
    // Authorization check: Only Author or Triager/Admin can view
    if (report.researcherId._id.toString() !== req.user.id &&
        req.user.role !== 'admin' &&
        req.user.role !== 'triager') {
        return next(new AppError_1.default('You do not have permission to view this report', 403));
    }
    res.status(200).json({
        status: 'success',
        data: report
    });
});
// Add a comment
exports.addComment = (0, catchAsync_1.default)(async (req, res, next) => {
    const { content } = req.body;
    const report = await Report_1.default.findById(req.params.id);
    if (!report) {
        return next(new AppError_1.default('Report not found', 404));
    }
    // Auth check
    if (report.researcherId.toString() !== req.user.id &&
        req.user.role !== 'admin' &&
        req.user.role !== 'triager') {
        return next(new AppError_1.default('You do not have permission to comment on this report', 403));
    }
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
    // Re-populate to return the new comment with user info
    await report.populate('comments.sender', 'username name nickname role avatar');
    const newComment = report.comments[report.comments.length - 1];
    try {
        const io = (0, socketService_1.getIO)();
        // Determine role based on sender
        let roleLabel = 'System';
        if (req.user.role === 'researcher')
            roleLabel = 'Researcher';
        else if (req.user.role === 'triager')
            roleLabel = 'Triager';
        else if (req.user.role === 'admin')
            roleLabel = 'Admin';
        io.to(req.params.id).emit('new_activity', {
            id: newComment._id,
            type: 'comment',
            author: req.user.role !== 'company' ? (req.user.username || req.user.name || 'Unknown User') : (req.user.name || 'Unknown Company'),
            authorName: req.user.name,
            authorUsername: req.user.username,
            role: roleLabel,
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
        data: report.comments
    });
    // Trigger Email Notification in background
    (async () => {
        try {
            const senderId = req.user.id;
            const senderRole = req.user.role;
            const isResearcher = report.researcherId.toString() === senderId;
            const isCompany = senderRole === 'company';
            if (isResearcher) {
                // Researcher commented → notify triager
                if (report.triagerId) {
                    await report.populate('triagerId', 'email name');
                    const triager = report.triagerId;
                    if (triager?.email) {
                        await (0, emailService_1.sendEmail)(triager.email, `New Comment on: ${report.title}`, (0, emailService_1.reportEmailTemplate)({
                            recipientName: triager.name || 'Triager',
                            recipientRole: 'triager',
                            actorName: req.user.name || req.user.username || 'Researcher',
                            actorRole: 'researcher',
                            actionType: 'comment',
                            reportTitle: report.title,
                            reportId: report.reportId || String(report._id),
                            severity: report.severity,
                            message: content,
                            link: `${process.env.CLIENT_URL}/triager/app/reports/${report._id}`
                        }));
                    }
                }
            }
            else if (isCompany) {
                // Company commented → notify BOTH researcher and triager
                await report.populate('researcherId', 'email name');
                const researcher = report.researcherId;
                if (researcher?.email) {
                    await (0, emailService_1.sendEmail)(researcher.email, `New Comment on: ${report.title}`, (0, emailService_1.reportEmailTemplate)({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: req.user.name || 'Company',
                        actorRole: 'company',
                        actionType: 'comment',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        message: content,
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                    }));
                }
                if (report.triagerId) {
                    await report.populate('triagerId', 'email name');
                    const triager = report.triagerId;
                    if (triager?.email) {
                        await (0, emailService_1.sendEmail)(triager.email, `New Comment on: ${report.title}`, (0, emailService_1.reportEmailTemplate)({
                            recipientName: triager.name || 'Triager',
                            recipientRole: 'triager',
                            actorName: req.user.name || 'Company',
                            actorRole: 'company',
                            actionType: 'comment',
                            reportTitle: report.title,
                            reportId: report.reportId || String(report._id),
                            severity: report.severity,
                            message: content,
                            link: `${process.env.CLIENT_URL}/triager/app/reports/${report._id}`
                        }));
                    }
                }
            }
            else {
                // Triager/Admin commented → notify researcher
                await report.populate('researcherId', 'email name');
                const researcher = report.researcherId;
                if (researcher?.email) {
                    await (0, emailService_1.sendEmail)(researcher.email, `New Comment on: ${report.title}`, (0, emailService_1.reportEmailTemplate)({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: req.user.name || req.user.username || 'Triager',
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
        }
        catch (emailError) {
            console.error('Failed to send comment notification email:', emailError);
        }
    })();
});
// Get reports by program ID (for leaderboard)
exports.getReportsByProgram = (0, catchAsync_1.default)(async (req, res, next) => {
    const { programId } = req.params;
    const reports = await Report_1.default.find({ programId })
        .populate('researcherId', 'username name nickname avatar')
        .select('researcherId status severity'); // Select fields needed for count/leaderboard
    res.status(200).json({
        status: 'success',
        results: reports.length,
        data: reports
    });
});
exports.checkReportDuplicates = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const report = await Report_1.default.findById(id)
        .populate('researcherId', 'username name')
        .populate('programId', 'title companyName');
    if (!report)
        return next(new AppError_1.default('Report not found', 404));
    if (!['triager', 'admin'].includes(req.user.role)) {
        return next(new AppError_1.default('Only triagers/admin can run duplicate check', 403));
    }
    try {
        // Self-heal: ensure this report has an embedding before searching duplicates.
        await (0, duplicateDetectionService_1.embedAndStoreReportVectorWithRetry)(report, 1);
        const matches = await (0, duplicateDetectionService_1.searchDuplicateReportVectors)(report);
        const formatted = matches.map((m) => ({
            reportMongoId: m.report_id,
            score: Number(m.score || 0),
            similarityPercent: Math.round(Number(m.score || 0) * 100),
            confidence: Number(m.score || 0) > 0.85 ? 'HIGH_CONFIDENCE' : Number(m.score || 0) >= 0.7 ? 'POTENTIAL' : 'LOW',
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
    }
    catch (error) {
        if ((0, duplicateDetectionService_1.isAiServiceUnavailable)(error)) {
            return next(new AppError_1.default('AI Service Unavailable. Please try again shortly.', 503));
        }
        return next(new AppError_1.default(error?.response?.data?.detail || 'Failed to run duplicate detection', 500));
    }
});
exports.markReportAsDuplicate = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const { duplicateOf, reason } = req.body || {};
    if (!['triager', 'admin'].includes(req.user.role)) {
        return next(new AppError_1.default('Only triagers/admin can mark duplicates', 403));
    }
    if (!duplicateOf)
        return next(new AppError_1.default('duplicateOf is required', 400));
    if (String(duplicateOf) === String(id))
        return next(new AppError_1.default('A report cannot be duplicate of itself', 400));
    const [report, duplicateParent] = await Promise.all([
        Report_1.default.findById(id),
        Report_1.default.findById(duplicateOf).select('_id reportId title'),
    ]);
    if (!report)
        return next(new AppError_1.default('Report not found', 404));
    if (!duplicateParent)
        return next(new AppError_1.default('Reference duplicate report not found', 404));
    const oldStatus = report.status;
    report.status = 'Duplicate';
    report.duplicateOf = duplicateParent._id;
    report.comments.push({
        sender: req.user.id,
        content: reason || `Marked as duplicate of ${duplicateParent.reportId || duplicateParent._id}`,
        type: 'status_change',
        metadata: {
            oldStatus,
            newStatus: 'Duplicate',
            duplicateOf: String(duplicateParent._id),
            duplicateOfReportId: duplicateParent.reportId || String(duplicateParent._id),
            reason: reason || '',
        },
        createdAt: new Date(),
    });
    await report.save();
    res.status(200).json({
        status: 'success',
        data: {
            report,
            duplicateOf: {
                _id: duplicateParent._id,
                reportId: duplicateParent.reportId || String(duplicateParent._id),
                title: duplicateParent.title,
            },
        },
    });
});
exports.reindexAllReports = (0, catchAsync_1.default)(async (req, res, next) => {
    if (!['triager', 'admin'].includes(req.user.role)) {
        return next(new AppError_1.default('Only triagers/admin can trigger re-indexing', 403));
    }
    const reports = await Report_1.default.find({}).select('title vulnerabilityCategory vulnerableEndpoint description pocSteps impact severity reportId status').lean();
    if (!reports.length) {
        return res.status(200).json({ status: 'success', message: 'No reports found to index.', indexed: 0 });
    }
    const items = reports.map((r) => ({
        report_id: String(r._id),
        text: (0, duplicateDetectionService_1.buildEmbeddingText)(r),
        metadata: {
            reportId: r.reportId,
            title: r.title,
            status: r.status,
            severity: r.severity,
            vulnerabilityCategory: r.vulnerabilityCategory,
        },
    })).filter((item) => item.text.trim().length > 0);
    try {
        const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
        const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
        const response = await axios.post(`${AI_SERVICE_URL}/bulk-index`, { reports: items }, { timeout: 60000 });
        return res.status(200).json({
            status: 'success',
            message: `Successfully indexed ${response.data?.indexed ?? items.length} reports.`,
            indexed: response.data?.indexed ?? items.length,
        });
    }
    catch (error) {
        if ((0, duplicateDetectionService_1.isAiServiceUnavailable)(error)) {
            return next(new AppError_1.default('AI Service Unavailable. Please try again shortly.', 503));
        }
        return next(new AppError_1.default(error?.response?.data?.detail || 'Failed to re-index reports', 500));
    }
});
