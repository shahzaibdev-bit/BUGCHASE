"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProgramStatus = exports.getAllPrograms = exports.updateUserStatus = exports.getAllUsers = exports.broadcastAnnouncement = exports.getTriagers = exports.createTriager = void 0;
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const Notification_1 = __importDefault(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = require("../services/emailService");
exports.createTriager = (0, catchAsync_1.default)(async (req, res, next) => {
    const { name, email, tempPassword, expertise, technicalInterviewPassed, identityVerified } = req.body;
    // 1. Basic validation
    if (!name || !email || !tempPassword) {
        return next(new AppError_1.default('Please provide name, email and temporary password', 400));
    }
    if (!technicalInterviewPassed || !identityVerified) {
        return next(new AppError_1.default('Triager must pass technical interview and identity verification', 400));
    }
    // 2. Check if user exists
    const existingUser = await User_1.default.findOne({ email });
    if (existingUser) {
        return next(new AppError_1.default('Email already in use', 400));
    }
    // 3. Create User with 'triager' role
    // Make sure to parse expertise if it comes as string, though frontend sends array
    const newTriager = await User_1.default.create({
        name,
        email,
        password: tempPassword,
        role: 'triager',
        username: email.split('@')[0] + Math.floor(Math.random() * 1000), // temp username
        expertise: expertise || [],
        isVerified: identityVerified, // Since admin verified them
        isEmailVerified: true // Admin created, so we trust it or they verify on first login? Let's say yes for now.
    });
    // 4. Send Invitation Email
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
    const emailHtml = (0, emailService_1.inviteMemberTemplate)(newTriager.name, newTriager.email, newTriager.username, tempPassword, loginUrl, newTriager.expertise);
    try {
        await (0, emailService_1.sendEmail)(newTriager.email, 'Welcome to BugChase Triager Team', emailHtml);
    }
    catch (error) {
        console.error('Failed to send triager invite email', error);
        // Don't fail the request, just log it. Admin can regenerate or tell them manually.
    }
    res.status(201).json({
        status: 'success',
        data: {
            user: newTriager
        }
    });
});
exports.getTriagers = (0, catchAsync_1.default)(async (req, res, next) => {
    const triagers = await User_1.default.find({ role: 'triager' }).select('name email expertise status lastActive avatar role _id');
    // We can compute "reportsProcessed" if we had a Report model linkage, 
    // for now we might mock it or return 0, or add it to schema later.
    // Let's send what we have.
    res.status(200).json({
        status: 'success',
        results: triagers.length,
        data: {
            triagers
        }
    });
});
exports.broadcastAnnouncement = (0, catchAsync_1.default)(async (req, res, next) => {
    const { message } = req.body;
    if (!message) {
        return next(new AppError_1.default('Message is required', 400));
    }
    // 1. Get all users (id and email)
    const users = await User_1.default.find({}, '_id email');
    if (!users.length) {
        return next(new AppError_1.default('No users found to broadcast to', 404));
    }
    // 2. Prepare notifications and send emails
    const notifications = [];
    const emailPromises = [];
    for (const user of users) {
        // Notification
        notifications.push({
            recipient: user._id,
            title: 'Platform Announcement',
            message: message,
            type: 'announcement',
            read: false
        });
        // Email
        if (user.email) {
            // Note: In production, use a queue like BullMQ or batching. 
            // For now, simple parallel promises.
            emailPromises.push((0, emailService_1.sendEmail)(user.email, 'Platform Announcement - BugChase', (0, emailService_1.broadcastTemplate)(message))
                .then(() => console.log(`Email sent to ${user.email}`))
                .catch(err => console.error(`Failed to email ${user.email}:`, err.message)));
        }
    }
    // 3. Bulk insert notifications
    await Notification_1.default.insertMany(notifications);
    // 4. Wait for emails (fail-safe: don't block response too long, or do? 
    // Usually, we respond first or process async. 
    // But user wants to KNOW it happened. Let's await for now for demo purposes.)
    // However, if SMTP is slow, this will time out. 
    // Let's await but suppress errors so it doesn't fail the request if one email fails.
    await Promise.allSettled(emailPromises);
    res.status(200).json({
        status: 'success',
        message: `Broadcast sent to ${users.length} users (Notification + Email).`
    });
});
exports.getAllUsers = (0, catchAsync_1.default)(async (req, res, next) => {
    const users = await User_1.default.find({ role: { $ne: 'admin' } });
    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
});
exports.updateUserStatus = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!['Active', 'Suspended', 'Banned'].includes(status)) {
        return next(new AppError_1.default('Invalid status', 400));
    }
    const updateData = { status };
    // Only save reason if suspended or banned
    if ((status === 'Suspended' || status === 'Banned') && reason) {
        updateData.statusReason = reason;
    }
    else if (status === 'Active') {
        // Clear reason if reactivated
        updateData.statusReason = undefined;
        // Note: MongoDB $unset would be cleaner, but Mongoose string undefined might not unset.
        // Let's rely on overwriting or leaving it. User didn't ask to clear it explicitly but it's good practice.
        // Actually, let's keep it simple: 
        // If Active, we don't necessarily need to clear it, but typically we do.
        // Let's use $unset if we were using raw mongo, but with mongoose findByIdAndUpdate, setting to null/undefined might work if schema allows.
        // For now, let's just update fields.
    }
    // Use $unset if Active? No, let's just update.
    const user = await User_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!user) {
        return next(new AppError_1.default('No user found with that ID', 404));
    }
    // Notifications & Email
    const notifTitle = `Account ${status}`;
    let notifMsg = `Your account has been set to ${status}.`;
    if ((status === 'Suspended' || status === 'Banned') && reason) {
        notifMsg += ` Reason: ${reason}`;
        // Send Email
        if (user.email) {
            const emailHtml = (0, emailService_1.userStatusChangedTemplate)(user.name, status, reason);
            try {
                await (0, emailService_1.sendEmail)(user.email, `URGENT: Account ${status} - BugChase`, emailHtml);
            }
            catch (error) {
                console.error(`Failed to send ${status} email to user`, error);
            }
        }
    }
    await Notification_1.default.create({
        recipient: user._id,
        title: notifTitle,
        message: notifMsg,
        type: 'system',
    });
    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});
const Program_1 = __importDefault(require("../models/Program"));
exports.getAllPrograms = (0, catchAsync_1.default)(async (req, res, next) => {
    // Fetch all programs and populate company details (name, avatar, etc. from User model if needed, 
    // but Program has companyName string. Ideally link to User for more details)
    // Assuming Program has companyId ref to User
    const programs = await Program_1.default.find().populate('companyId', 'name avatar').sort('-createdAt');
    res.status(200).json({
        status: 'success',
        results: programs.length,
        data: {
            programs
        }
    });
});
exports.updateProgramStatus = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!['Active', 'Pending', 'Suspended', 'Rejected'].includes(status)) {
        return next(new AppError_1.default('Invalid status', 400));
    }
    const updateData = { status };
    if (status === 'Suspended' && reason) {
        updateData.suspensionReason = reason;
    }
    // Populate companyId to get the email
    const program = await Program_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('companyId');
    if (!program) {
        return next(new AppError_1.default('No program found with that ID', 404));
    }
    if (program.companyId) {
        // Safe check for company fields since Populate returns User document or ID
        const company = program.companyId;
        const notifTitle = `Program ${status}`;
        let notifMsg = `Your program "${program.title}" has been ${status.toLowerCase()} by admin.`;
        if (status === 'Suspended' && reason) {
            notifMsg += ` Reason: ${reason}`;
            // Send Email Notification
            if (company.email) {
                const emailHtml = (0, emailService_1.programSuspendedTemplate)(program.title, reason);
                try {
                    await (0, emailService_1.sendEmail)(company.email, `URGENT: Program Suspended - ${program.title}`, emailHtml);
                }
                catch (error) {
                    console.error('Failed to send suspension email:', error);
                }
            }
        }
        await Notification_1.default.create({
            recipient: company._id,
            title: notifTitle,
            message: notifMsg,
            type: 'system',
        });
    }
    res.status(200).json({
        status: 'success',
        data: {
            program
        }
    });
});
