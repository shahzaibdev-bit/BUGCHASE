import { Request, Response, NextFunction } from 'express';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';
import Notification from '../models/Notification';
import User from '../models/User';
import { sendEmail, broadcastTemplate, inviteMemberTemplate, programSuspendedTemplate, userStatusChangedTemplate } from '../services/emailService';

export const createTriager = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, tempPassword, expertise, technicalInterviewPassed, identityVerified } = req.body;

    // 1. Basic validation
    if (!name || !email || !tempPassword) {
        return next(new AppError('Please provide name, email and temporary password', 400));
    }

    if (!technicalInterviewPassed || !identityVerified) {
        return next(new AppError('Triager must pass technical interview and identity verification', 400));
    }

    // 2. Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(new AppError('Email already in use', 400));
    }

    // 3. Create User with 'triager' role
    // Make sure to parse expertise if it comes as string, though frontend sends array
    const newTriager = await User.create({
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
    const emailHtml = inviteMemberTemplate(newTriager.name, newTriager.email, newTriager.username, tempPassword, loginUrl, newTriager.expertise);
    
    try {
        await sendEmail(newTriager.email, 'Welcome to BugChase Triager Team', emailHtml);
    } catch (error) {
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

export const getTriagers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const triagers = await User.find({ role: 'triager' }).select('name email expertise status lastActive avatar role _id');
    
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

export const broadcastAnnouncement = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;

    if (!message) {
        return next(new AppError('Message is required', 400));
    }

    // 1. Get all users (id and email)
    const users = await User.find({}, '_id email');

    if (!users.length) {
        return next(new AppError('No users found to broadcast to', 404));
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
            emailPromises.push(
                sendEmail(user.email, 'Platform Announcement - BugChase', broadcastTemplate(message))
                .then(() => console.log(`Email sent to ${user.email}`))
                .catch(err => console.error(`Failed to email ${user.email}:`, err.message))
            );
        }
    }

    // 3. Bulk insert notifications
    await Notification.insertMany(notifications);

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

export const getAllUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const users = await User.find({ role: { $ne: 'admin' } });

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
});

export const updateUserStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['Active', 'Suspended', 'Banned'].includes(status)) {
        return next(new AppError('Invalid status', 400));
    }

    const updateData: any = { status };
    // Only save reason if suspended or banned
    if ((status === 'Suspended' || status === 'Banned') && reason) {
        updateData.statusReason = reason;
    } else if (status === 'Active') {
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
    const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }

    // Notifications & Email
    const notifTitle = `Account ${status}`;
    let notifMsg = `Your account has been set to ${status}.`;
    
    if ((status === 'Suspended' || status === 'Banned') && reason) {
        notifMsg += ` Reason: ${reason}`;
        
        // Send Email
        if (user.email) {
             const emailHtml = userStatusChangedTemplate(user.name, status, reason);
             try {
                 await sendEmail(user.email, `URGENT: Account ${status} - BugChase`, emailHtml);
             } catch (error) {
                 console.error(`Failed to send ${status} email to user`, error);
             }
        }
    }

    await Notification.create({
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

import Program from '../models/Program';

export const getAllPrograms = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Fetch all programs and populate company details (name, avatar, etc. from User model if needed, 
    // but Program has companyName string. Ideally link to User for more details)
    
    // Assuming Program has companyId ref to User
    const programs = await Program.find().populate('companyId', 'name avatar').sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: programs.length,
        data: {
            programs
        }
    });
});

export const updateProgramStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['Active', 'Pending', 'Suspended', 'Rejected'].includes(status)) {
        return next(new AppError('Invalid status', 400));
    }

    const updateData: any = { status };
    if (status === 'Suspended' && reason) {
        updateData.suspensionReason = reason;
    }

    // Populate companyId to get the email
    const program = await Program.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('companyId');

    if (!program) {
        return next(new AppError('No program found with that ID', 404));
    }

    if (program.companyId) {
        // Safe check for company fields since Populate returns User document or ID
        const company = program.companyId as any; 
        
        const notifTitle = `Program ${status}`;
        let notifMsg = `Your program "${program.title}" has been ${status.toLowerCase()} by admin.`;
        
        if (status === 'Suspended' && reason) {
            notifMsg += ` Reason: ${reason}`;
            
            // Send Email Notification
            if (company.email) {
                const emailHtml = programSuspendedTemplate(program.title, reason);
                try {
                    await sendEmail(company.email, `URGENT: Program Suspended - ${program.title}`, emailHtml);
                } catch (error) {
                    console.error('Failed to send suspension email:', error);
                }
            }
        }
        
        await Notification.create({
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
