"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportsByProgram = exports.addComment = exports.getReport = exports.getMyReports = exports.createReport = void 0;
const Report_1 = __importDefault(require("../models/Report"));
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const mongoose_1 = __importDefault(require("mongoose"));
const emailService_1 = require("../services/emailService");
const socketService_1 = require("../services/socketService");
const cloudinary_1 = require("../utils/cloudinary");
// Create a new report
exports.createReport = (0, catchAsync_1.default)(async (req, res, next) => {
    const { programId, title, vulnerabilityCategory, severity, cvssVector, cvssScore, target, // asset url
    assetType, vulnerabilityDetails, // mapped to description
    validationSteps, // mapped to pocSteps
    impact } = req.body;
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
        programId: programId || new mongoose_1.default.Types.ObjectId(), // For now, allow loose program ID if mock, but ideally required
        title,
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
                    reportId: String(newReport._id),
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
                            reportId: String(report._id),
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
                        reportId: String(report._id),
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
                            reportId: String(report._id),
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
                        reportId: String(report._id),
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
