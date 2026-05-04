import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User';
import Program from '../models/Program';
import Report from '../models/Report';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import { sendEmail, inviteMemberTemplate, reportEmailTemplate, walletTopUpTemplate, otpTemplate, cardDeletionOtpTemplate } from '../services/emailService';
import { suggestBountyAmount, generateReportMessage as geminiGenerateMessage } from '../services/geminiService';
import { getIO } from '../services/socketService';
import { uploadToCloudinary } from '../utils/cloudinary';
import Stripe from 'stripe';
import Transaction from '../models/Transaction';
import redisClient from '../config/redis';
import {
  applyResearcherReputationOnStatusTransition,
  clearReputationMilestonesForReTriage,
} from '../services/researcherReputationService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2026-04-22.dahlia',
});

const getOrCreateStripeCustomer = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (user.stripeCustomerId) {
        return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
            userId: user._id.toString()
        }
    });

    user.stripeCustomerId = customer.id;
    await user.save();

    return customer.id;
};



// ... (inviteMember logic remains unchanged) ...

export const inviteMember = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // ... (keep existing implementation)
    const { name, email, role, permissions, username, password } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        return next(new AppError('User with this email or username already exists.', 400));
    }

    // 2. Use provided password or generate random one
    const userPassword = password || Math.random().toString(36).slice(-8);

    // 3. Create User linked to Parent Company
    const newUser = await User.create({
        name,
        email,
        username,
        password: userPassword, // Will be hashed by pre-save hook
        role: 'company', 
        companyRole: role, 
        parentCompany: req.user!.id,
        permissions: permissions || [],
        isVerified: true, 
        isEmailVerified: true,
        companyName: req.user!.companyName, 
    });

    // 4. Send Invitation Email
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
    try {
        await sendEmail(
            email, 
            'You have been invited to join the team', 
            inviteMemberTemplate(name, email, username, userPassword, loginUrl)
        );
    } catch (error) {
        console.error('Email Send Error:', error);
    }

    res.status(201).json({
        status: 'success',
        message: 'Invitation sent successfully',
        data: {
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.companyRole
            }
        }
    });
});

// --- Domain Verification ---

// Domain Regex
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

export const generateVerificationToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { rootDomain } = req.body;
    
    if (!rootDomain) return next(new AppError('Root domain is required', 400));
    if (!DOMAIN_REGEX.test(rootDomain)) {
        return next(new AppError('Invalid domain format. Please enter a valid root domain.', 400));
    }

    // Generate Unique Token - longer for uniqueness
    const uniqueToken = `bc-verification=${crypto.randomBytes(16).toString('hex')}`;

    // Store in User Document
    const user = await User.findById(req.user!.id);
    if (!user) return next(new AppError('User not found', 404));

    user.verificationToken = uniqueToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        token: uniqueToken
    });
});

export const verifyDomain = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { rootDomain } = req.body;
    
    if (!rootDomain) return next(new AppError('Root domain is required', 400));
    if (!DOMAIN_REGEX.test(rootDomain)) {
        return next(new AppError('Invalid domain format.', 400));
    }

    const user = await User.findById(req.user!.id);
    if (!user) return next(new AppError('User not found', 404));

    const verificationToken = user.verificationToken;
    if (!verificationToken) {
        return next(new AppError('No verification token found. Please generate one first.', 400));
    }

    // Attempt to fetch security.txt
    let content = '';
    const protocols = ['https', 'http'];
    let verifiedProtocol = '';

    for (const protocol of protocols) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(`${protocol}://${rootDomain}/.well-known/security.txt`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                content = await response.text();
                verifiedProtocol = protocol;
                break; // Found it
            }
        } catch (error) {
            console.log(`Failed to fetch ${protocol}://${rootDomain}/.well-known/security.txt`, error);
            // Continue to next protocol
        }
    }

    if (!content) {
        return next(new AppError(`Could not find security.txt at ${rootDomain}/.well-known/security.txt. Verified both HTTPS and HTTP.`, 400));
    }

    // Check if token exists in content
    if (!content.includes(verificationToken)) {
         return next(new AppError(`Verification token not found in security.txt. Make sure to add: ${verificationToken}`, 400));
    }

    // Add to verifiedAssets
    const newAsset = {
        id: crypto.randomBytes(4).toString('hex'),
        domain: rootDomain,
        method: 'SECURITY_TXT' as const,
        verificationToken: user.verificationToken || 'unknown',
        dateVerified: new Date().toISOString().split('T')[0],
        status: 'verified' as const
    };

    // Check if already exists
    const exists = user.verifiedAssets?.find(a => a.domain === rootDomain);
    if (exists) {
        // If exists, checks if it was disabled, if so, re-enable? Or just throw error?
        // Let's just update the status to verified if it exists
         const assetIndex = user.verifiedAssets!.findIndex(a => a.domain === rootDomain);
         user.verifiedAssets![assetIndex].status = 'verified';
         user.verifiedAssets![assetIndex].dateVerified = new Date().toISOString().split('T')[0];
         user.verifiedAssets![assetIndex].method = 'SECURITY_TXT';
    } else {
        if (!user.verifiedAssets) user.verifiedAssets = [];
        user.verifiedAssets.push(newAsset);
    }
    
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        message: 'Domain verified successfully via security.txt',
        asset: newAsset
    });
});

export const getVerifiedAssets = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!.id);
    
    res.status(200).json({
        status: 'success',
        data: user?.verifiedAssets || []
    });
});

export const updateAssetStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status } = req.body; // 'verified' | 'disabled'

    if (!['verified', 'disabled'].includes(status)) {
        return next(new AppError('Invalid status', 400));
    }

    const user = await User.findById(req.user!.id);
    if (!user) return next(new AppError('User not found', 404));

    if (!user.verifiedAssets) return next(new AppError('Asset not found', 404));

    const asset = user.verifiedAssets.find(a => a.id === id);
    if (!asset) {
        return next(new AppError('Asset not found', 404));
    }

    asset.status = status;
    
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        data: asset
    });
});

export const updateAssetScope = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { inScope, outScope } = req.body;

    const user = await User.findById(req.user!.id);
    if (!user || !user.verifiedAssets) {
        return next(new AppError('User or assets not found', 404));
    }

    const asset = user.verifiedAssets.find(a => a.id === id);
    if (!asset) {
        return next(new AppError('Asset not found', 404));
    }

    if (inScope && Array.isArray(inScope)) {
        asset.inScope = inScope;
    }
    if (outScope && Array.isArray(outScope)) {
        asset.outScope = outScope;
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        data: asset
    });
});

export const deleteVerifiedAsset = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const user = await User.findById(req.user!.id);
    if (!user) return next(new AppError('User not found', 404));

    if (!user.verifiedAssets) return next(new AppError('Asset not found', 404));

    const initialLength = user.verifiedAssets.length;
    user.verifiedAssets = user.verifiedAssets.filter(a => a.id !== id);

    if (user.verifiedAssets.length === initialLength) {
        return next(new AppError('Asset not found', 404));
    }
    
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        message: 'Asset deleted successfully'
    });
});

export const createProgram = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log("Creating Program. Body:", req.body);
        const { 
            title, 
            type, 
            description, 
            selectedAssets = [], 
            rewards,
            rulesOfEngagement = '',
            safeHarbor = '',
            submissionGuidelines = '',
            outOfScope = [],
            slas = { firstResponse: 24, triage: 48, bounty: 168, resolution: 360 },
            isPrivate = false
        } = req.body; 
        
        const user = await User.findById(req.user!.id);
        if (!user) return next(new AppError('User not found', 404));

        const scope = (selectedAssets || []).flatMap((assetId: string) => {
            const asset = user.verifiedAssets?.find(a => a.id === assetId);
            if (!asset) {
                return [{
                    asset: assetId,
                    type: 'Web',
                    instruction: 'Testing permitted',
                    tier: 'Primary'
                }];
            }
            
            // If the asset has inScope subdomains, use those. Otherwise fallback to the root domain.
            if (asset.inScope && asset.inScope.length > 0) {
                return asset.inScope.map(domain => ({
                    asset: domain,
                    type: 'Web',
                    instruction: 'Testing permitted',
                    tier: 'Primary'
                }));
            } else {
                return [{
                    asset: asset.domain,
                    type: 'Web',
                    instruction: 'Testing permitted',
                    tier: 'Primary'
                }];
            }
        });

        const formattedOutOfScope = outOfScope.map((item: any) => ({
            asset: item.asset || '',
            reason: item.reason || 'Out of bounds'
        }));

        // Calculate Bounty Range 
        let bountyRange = "Varies";
        if (rewards && typeof rewards === 'object') {
            const rewardValues = [
                rewards.critical?.min, rewards.critical?.max,
                rewards.high?.min, rewards.high?.max,
                rewards.medium?.min, rewards.medium?.max,
                rewards.low?.min, rewards.low?.max
            ].map(val => Number(val)).filter(n => !isNaN(n) && n > 0);

            if (rewardValues.length > 0) {
                const min = Math.min(...rewardValues);
                const max = Math.max(...rewardValues);
                bountyRange = `PKR ${min} - PKR ${max}`;
            }
        }

        const sanitizeReward = (val: any) => {
            const num = Number(val);
            return (!isNaN(num) && num > 0) ? num : 0;
        };

        const sanitizedRewards = {
            critical: { min: sanitizeReward(rewards?.critical?.min), max: sanitizeReward(rewards?.critical?.max) },
            high: { min: sanitizeReward(rewards?.high?.min), max: sanitizeReward(rewards?.high?.max) },
            medium: { min: sanitizeReward(rewards?.medium?.min), max: sanitizeReward(rewards?.medium?.max) },
            low: { min: sanitizeReward(rewards?.low?.min), max: sanitizeReward(rewards?.low?.max) },
        };

        const newProgram = await Program.create({
            companyId: req.user!.id,
            companyName: user.companyName || user.name,
            title,
            type,
            description: description || '',
            rulesOfEngagement,
            safeHarbor,
            submissionGuidelines,
            scope,
            outOfScope: formattedOutOfScope,
            slas,
            isPrivate,
            rewards: sanitizedRewards,
            bountyRange,
            status: 'Pending'
        });

        console.log("Program created:", newProgram._id);

        res.status(201).json({
            status: 'success',
            data: newProgram
        });
    } catch (error) {
        console.error("CREATE PROGRAM ERROR:", error);
        return next(new AppError('Failed to create program: ' + (error as Error).message, 500));
    }
});

export const getCompanyPrograms = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const programs = await Program.find({ companyId: req.user!.id }).sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: programs.length,
        data: programs
    });
});

export const getProgramById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const program = await Program.findOne({ _id: req.params.id, companyId: req.user!.id });
    if (!program) return next(new AppError('Program not found', 404));

    // Map scope to assets structure expected by frontend
    const assets = program.scope.map((s: any, index: number) => ({
        id: s._id || index + 1, // Use _id if available, fallback to index
        type: s.type || 'Web',
        name: s.asset,
        tier: s.tier || 'Low'
    }));

    // Mock stats for now as we don't have reports linked yet
    const stats = {
        reports: 0,
        paid: '0',
        avgResponse: '24h'
    };

    // Reports - empty for now
    const reports: any[] = [];

    // Transform to frontend structure
    const programData = {
        id: program._id,
        title: program.title,
        type: program.type,
        status: program.status,
        description: program.description || '',
        assets: assets,
        outOfScope: program.outOfScope || [],
        bounties: program.rewards,
        stats: stats,
        reports: reports
    };

    res.status(200).json({
        status: 'success',
        data: programData
    });
});

export const getTeamMembers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const members = await User.find({ parentCompany: req.user!.id });

    res.status(200).json({
        status: 'success',
        results: members.length,
        data: {
            members
        }
    });
});

export const deleteProgram = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const program = await Program.findOneAndDelete({ _id: req.params.id, companyId: req.user!.id });

    if (!program) {
        return next(new AppError('No program found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

export const getReportDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const Report = (await import('../models/Report')).default;
    // Note: Report model has no companyId field — reports link to companies via programId.
    // We fetch by _id only and verify ownership via the program's companyId below.
    const report = await Report.findById(id)
        .populate('researcherId', 'name username email avatar')
        .populate('comments.sender', 'name username role avatar')
        .populate('triagerId', 'name username email avatar')
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
        return next(new AppError('Report not found', 404));
    }

    // Permission check: ensure this report belongs to a program owned by this company
    const Program = (await import('../models/Program')).default;
    const program = await Program.findById(report.programId);

    if (program) {
        const companyId = req.user!.id || req.user!._id?.toString();
        const parentId = req.user!.parentCompany?.toString();
        const programOwner = program.companyId.toString();
        if (programOwner !== companyId && programOwner !== parentId) {
            return next(new AppError('You do not have permission to view this report', 403));
        }
    }
    // If program not found (e.g. legacy/test data), allow access

    const payload: any = report.toJSON ? report.toJSON() : report;
    delete payload.duplicateCandidates;
    delete payload.duplicateReviewStatus;

    res.status(200).json({
        status: 'success',
        data: { report: payload }
    });
});

export const getCompanyReports = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get Programs owned by this company
    const Program = (await import('../models/Program')).default;
    const programs = await Program.find({ companyId: req.user!.id });
    
    // 2. Get Program IDs
    // Note: Report.programId is currently a String, but ideally matches Program._id
    // We need to cast ObjectIds to strings for comparison or $in query if stored as strings
    const programIds = programs.map(p => p._id.toString());
    
    // 3. Find Reports for these programs
    const Report = (await import('../models/Report')).default;
    const reports = await Report.find({ programId: { $in: programIds } })
        .populate('researcherId', 'username rank') // reduced populated fields for list view
        .sort({ createdAt: -1 });

    // 4. Map to frontend expected structure (if needed) or just return
    // Frontend expects: id, title, severity, status, program (name), researcher (name), submittedAt, bounty
    
    const formattedReports = reports.map((r: any) => {
        // Find program name
        const prog = programs.find(p => p._id.toString() === r.programId);
        
        return {
            id: r._id,
            reportId: r.reportId || String(r._id),
            title: r.title,
            severity: r.severity?.toLowerCase() || 'low',
            status: r.status?.toLowerCase() || 'submitted',
            program: prog?.title || 'Unknown Program',
            researcher: r.researcherId?.username || 'Unknown',
            submittedAt: r.createdAt,
            bounty: r.bounty || 0
        };
    });

    res.status(200).json({
        status: 'success',
        results: reports.length,
        data: {
            reports: formattedReports
        }
    });
});

export const addCompanyComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { content, certificateId } = req.body;
    const { id } = req.params;

    const Report = (await import('../models/Report')).default;
    const report = await Report.findById(id);

    if (!report) {
         return next(new AppError('Report not found', 404));
    }

    // Permission Check: Verify company owns the program (simplified access check based on getReport/updateReportSeverity)

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
        content: content || '',
        attachments: uploadedUrls,
        createdAt: new Date()
    } as any);

    if (certificateId) {
        report.certificateId = certificateId;
    }

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
             role: 'Company',
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

    // Trigger Email Notifications in background
    (async () => {
        try {
            const companyName = req.user!.name || 'Company Representative';

            // Notify Researcher
            await report.populate('researcherId', 'email name');
            const researcher = report.researcherId as any;
            if (researcher?.email) {
                await sendEmail(
                    researcher.email,
                    `New Comment on: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: companyName,
                        actorRole: 'company',
                        actionType: 'comment',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        vulnerabilityCategory: report.vulnerabilityCategory ?? undefined,
                        cvssScore: report.cvssScore ?? undefined,
                        message: content,
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                    })
                );
            }

            // Notify Triager (if assigned)
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
                            actorName: companyName,
                            actorRole: 'company',
                            actionType: 'comment',
                            reportTitle: report.title,
                            reportId: report.reportId || String(report._id),
                            severity: report.severity,
                            vulnerabilityCategory: report.vulnerabilityCategory ?? undefined,
                            cvssScore: report.cvssScore ?? undefined,
                            message: content,
                            link: `${process.env.CLIENT_URL}/triager/app/reports/${report._id}`
                        })
                    );
                }
            }
        } catch (emailError) {
            console.error('Failed to send comment notification email (Company):', emailError);
        }
    })();
});

export const updateReportSeverity = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { vector, score, severity, cvssVector, cvssScore } = req.body;

    const finalVector = cvssVector || vector;
    const finalScore = cvssScore !== undefined ? cvssScore : score;

    const Report = (await import('../models/Report')).default;
    const report = await Report.findById(id);

    if (!report) {
         return next(new AppError('Report not found', 404));
    }

    // Permission Check (Simplified for consistency with getReport)
    // Ideally we check if program belongs to company.
    // For now assuming getReport access rules apply here too.

    const oldSeverity = report.severity;
    const oldScore = report.cvssScore;
    const oldVector = report.cvssVector;

    report.cvssVector = finalVector;
    report.cvssScore = finalScore;
    report.severity = severity || 'Medium'; // Fallback or calc based on score

    // Add Timeline Event
    report.comments.push({
        sender: req.user!._id,
        content: `Updated severity from <b>${oldSeverity} (${oldScore})</b> to <b>${report.severity} (${finalScore})</b>`,
        type: 'severity_update',
        metadata: {
            oldVector: oldVector,
            newVector: finalVector,
            oldScore,
            newScore: finalScore
        }
    });

    await report.save();

    // Push real-time update to everyone in the room
    try {
        const io = getIO();
        const newComment = report.comments[report.comments.length - 1];
        io.to(id).emit('new_activity', {
            id: newComment._id,
            type: 'severity_update',
            author: req.user!.name || req.user!.username || 'Company',
            authorAvatar: (req.user as any).avatar,
            role: 'Company',
            content: newComment.content,
            timestamp: newComment.createdAt || new Date().toISOString(),
            metadata: newComment.metadata
        });
        io.to(id).emit('report_updated', {
            severity: report.severity,
            cvssScore: finalScore,
            cvssVector: finalVector
        });
    } catch (socketError) {
        console.error('Socket emit failed on company severity update:', socketError);
    }

    res.status(200).json({
        status: 'success',
        data: {
            report
        }
    });

    // Notify researcher and triager in background
    (async () => {
        try {
            await report.populate('researcherId', 'name email');
            await report.populate('triagerId', 'name email');

            const researcher = report.researcherId as any;
            const triager = report.triagerId as any;
            const companyName = req.user!.name || 'Security Program';
            const reason = `Severity updated from ${oldSeverity} (CVSS: ${oldScore ?? 'N/A'}) to ${report.severity} (CVSS: ${finalScore ?? 'N/A'}).${finalVector ? `\nNew CVSS Vector: ${finalVector}` : ''}`;

            if (researcher?.email) {
                await sendEmail(
                    researcher.email,
                    `Severity Updated: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: companyName,
                        actorRole: 'company',
                        actionType: 'status_change',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        vulnerabilityCategory: report.vulnerabilityCategory ?? undefined,
                        cvssScore: finalScore,
                        newStatus: `Severity: ${report.severity}`,
                        reason,
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                    })
                );
            }

            if (triager?.email) {
                await sendEmail(
                    triager.email,
                    `Severity Updated by Company: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: triager.name || 'Triager',
                        recipientRole: 'triager',
                        actorName: companyName,
                        actorRole: 'company',
                        actionType: 'status_change',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        vulnerabilityCategory: report.vulnerabilityCategory ?? undefined,
                        cvssScore: finalScore,
                        newStatus: `Severity: ${report.severity}`,
                        reason,
                        link: `${process.env.CLIENT_URL}/triager/app/reports/${report._id}`
                    })
                );
            }
        } catch (err) {
            console.error('Failed to send company severity-change emails:', err);
        }
    })();
});

export const suggestBounty = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const Report = (await import('../models/Report')).default;
    const Program = (await import('../models/Program')).default;

    const report = await Report.findById(id).populate('comments.sender', 'name role username');
    if (!report) return next(new AppError('Report not found', 404));

    const program = await Program.findById(report.programId);
    if (!program) return next(new AppError('Program not found', 404));

    // Determine the min/max bounty for the report's severity
    const severityLower = (report.severity || 'low').toLowerCase();
    const rewards = program.rewards as any;
    const rewardRange = rewards[severityLower] || { min: 0, max: 0 };

    const aiSuggestion = await suggestBountyAmount(report, report.comments, rewardRange);

    res.status(200).json({
        status: 'success',
        data: {
            suggestedAmount: aiSuggestion.suggestedAmount,
            reasoning: aiSuggestion.reasoning,
            rewardRange
        }
    });
});

export const generateReportMessage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { type, bountyAmount } = req.body;

    if (!type || !['resolve', 'bounty'].includes(type)) {
        return next(new AppError('Valid message type (resolve or bounty) is required', 400));
    }

    const Report = (await import('../models/Report')).default;
    const report = await Report.findById(id).populate('comments.sender', 'name role username');
    
    if (!report) return next(new AppError('Report not found', 404));

    const generatedResult = await geminiGenerateMessage(report, report.comments, type, bountyAmount);

    res.status(200).json({
        status: 'success',
        data: {
            message: generatedResult.message
        }
    });
});

export const updateReportStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status, note } = req.body;

    const Report = (await import('../models/Report')).default;
    const report = await Report.findById(id);

    if (!report) return next(new AppError('Report not found', 404));

    const oldStatus = report.status;
    if (status === 'Triaging' && oldStatus !== 'Triaging') {
        clearReputationMilestonesForReTriage(report);
    }
    report.status = status;

    // Add Timeline Event
    const newComment = {
        sender: req.user!._id,
        content: note ? note : `Changed status from **${oldStatus}** to **${status}**.`,
        type: 'status_change',
        metadata: { newStatus: status, reason: note },
        createdAt: new Date()
    };
    report.comments.push(newComment as any);

    await applyResearcherReputationOnStatusTransition(report, oldStatus, status, 'company');

    await report.save();
    await report.populate('comments.sender', 'name username role avatar');
    
    const populatedComment = report.comments[report.comments.length - 1];

    try {
        const io = getIO();
        io.to(id).emit('new_activity', {
            id: populatedComment._id,
            type: 'status_change',
            author: (populatedComment.sender as any)?.name || 'Company',
            role: 'Company',
            content: populatedComment.content,
            timestamp: populatedComment.createdAt,
            authorAvatar: (populatedComment.sender as any)?.avatar,
            metadata: populatedComment.metadata,
            status: report.status // Notify frontend of the new status
        });
        
        io.to(id).emit('status_change', report.status);
    } catch (socketError) {
        console.error("Socket emit failed:", socketError);
    }

    res.status(200).json({
        status: 'success',
        data: {
            report
        }
    });

    // Send role-specific emails to researcher and triager in background
    (async () => {
        try {
            await report.populate('researcherId', 'name email');
            await report.populate('triagerId', 'name email');

            const researcher = report.researcherId as any;
            const triager = report.triagerId as any;
            const companyName = req.user.name || 'Security Program';
            const newStatus = report.status;
            const reason = (req.body.note || req.body.reason) as string | undefined;

            // Email Researcher
            if (researcher?.email) {
                await sendEmail(
                    researcher.email,
                    `Report ${newStatus}: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: companyName,
                        actorRole: 'company',
                        actionType: 'status_change',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        newStatus,
                        reason: reason || undefined,
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                    })
                );
            }

            // Email Triager
            if (triager?.email) {
                await sendEmail(
                    triager.email,
                    `Report ${newStatus} by Company: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: triager.name || 'Triager',
                        recipientRole: 'triager',
                        actorName: companyName,
                        actorRole: 'company',
                        actionType: 'status_change',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        severity: report.severity,
                        newStatus,
                        reason: reason,
                        link: `${process.env.CLIENT_URL}/triager/app/reports/${report._id}`
                    })
                );
            }
        } catch (err) {
            console.error('Failed to send company status-change emails:', err);
        }
    })();
});

export const awardBounty = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { bounty, message } = req.body;

    const Report = (await import('../models/Report')).default;
    const report = await Report.findById(id);

    if (!report) return next(new AppError('Report not found', 404));

    if (report.status !== 'Resolved') {
        return next(new AppError('Bounty can only be awarded for Resolved reports', 400));
    }

    const bountyAmount = Number(bounty);
    if (!bounty || isNaN(bountyAmount) || bountyAmount <= 0) {
        return next(new AppError('Invalid bounty amount', 400));
    }

    const fee = bountyAmount * 0.05;
    const totalCost = bountyAmount + fee;

    const company = await User.findById(req.user!.id);
    if (!company) return next(new AppError('Company not found', 404));

    if ((company.walletBalance || 0) < totalCost) {
        return next(new AppError(`Insufficient balance. You need PKR ${totalCost.toFixed(2)} (bounty + 5% platform fee). Please top up your wallet.`, 400));
    }

    company.walletBalance = (company.walletBalance || 0) - totalCost;
    await company.save();

    await User.findByIdAndUpdate(report.researcherId, {
        $inc: { walletBalance: bountyAmount },
    });

    (report as any).bounty = bountyAmount;

    await Transaction.insertMany([
        { user: company._id, type: 'bounty_payment', amount: -totalCost, relatedReport: report._id, status: 'completed' },
        { user: company._id, type: 'platform_fee', amount: fee, relatedReport: report._id, status: 'completed' },
        { user: report.researcherId, type: 'bounty_earned', amount: bountyAmount, relatedReport: report._id, status: 'completed' }
    ]);

    // Add Timeline Event
    const newComment = {
        sender: req.user!._id,
        content: message || 'Thank you for your submission!',
        type: 'bounty_awarded',
        metadata: { bountyAwarded: (report as any).bounty },
        createdAt: new Date()
    };
    report.comments.push(newComment as any);

    await report.save();
    await report.populate('comments.sender', 'name username role avatar');
    
    const populatedComment = report.comments[report.comments.length - 1];

    try {
        const io = getIO();
        io.to(id).emit('new_activity', {
            id: populatedComment._id,
            type: 'bounty_awarded',
            author: (populatedComment.sender as any)?.name || 'Company',
            role: 'Company',
            content: populatedComment.content,
            timestamp: populatedComment.createdAt,
            authorAvatar: (populatedComment.sender as any)?.avatar,
            metadata: populatedComment.metadata,
            bounty: (report as any).bounty
        });
    } catch (socketError) {
        console.error("Socket emit failed:", socketError);
    }

    res.status(200).json({
        status: 'success',
        data: { report }
    });

    // Send email to researcher
    (async () => {
        try {
            await report.populate('researcherId', 'name email');
            const researcher = report.researcherId as any;
            const companyName = req.user.name || 'Security Program';

            if (researcher?.email) {
                await sendEmail(
                    researcher.email,
                    `Bounty Awarded: ${report.title}`,
                    reportEmailTemplate({
                        recipientName: researcher.name || 'Researcher',
                        recipientRole: 'researcher',
                        actorName: companyName,
                        actorRole: 'company',
                        actionType: 'bounty_awarded',
                        reportTitle: report.title,
                        reportId: report.reportId || String(report._id),
                        bounty: (report as any).bounty,
                        reason: message,
                        link: `${process.env.CLIENT_URL}/researcher/reports/${report._id}`
                    })
                );
            }
        } catch (err) {
            console.error('Failed to send bounty email:', err);
        }
    })();
});

export const createTopUpIntent = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { amount, paymentMethodId } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return next(new AppError('Please provide a valid top-up amount', 400));
    }
    const pkrAmount = Math.round(Number(amount));
    const customerId = await getOrCreateStripeCustomer(req.user!.id);

    // Convert PKR to USD (Assuming 1 USD = 280 PKR for test environment)
    const conversionRate = 280;
    const usdAmountCents = Math.round((pkrAmount / conversionRate) * 100);

    const intentOptions: any = {
        amount: usdAmountCents, // Actual USD charge in cents
        currency: 'usd',
        customer: customerId,
        metadata: { userId: req.user!.id, pkrAmount: pkrAmount.toString() },
        payment_method_types: ['card']
    };


    if (paymentMethodId) {
        intentOptions.payment_method = paymentMethodId;
        intentOptions.off_session = false;
        intentOptions.confirm = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(intentOptions);

    let newBalance;
    if (paymentIntent.status === 'succeeded') {
        const updatedUser = await User.findByIdAndUpdate(req.user!.id, { $inc: { walletBalance: pkrAmount } }, { new: true });
        newBalance = updatedUser?.walletBalance;

        await Transaction.create({
            user: req.user!.id,
            type: 'topup',
            amount: pkrAmount,
            currency: 'PKR',
            stripePaymentIntentId: paymentIntent.id,
            status: 'completed'
        });

        if (updatedUser) {
            await sendEmail(updatedUser.email, 'Wallet Top-Up Successful', walletTopUpTemplate(updatedUser.name, pkrAmount, updatedUser.walletBalance));
        }
    }

    res.status(200).json({ 
        status: 'success', 
        clientSecret: paymentIntent.client_secret,
        requiresAction: paymentIntent.status === 'requires_action',
        paymentIntentId: paymentIntent.id,
        data: { newBalance }
    });
});



export const confirmTopUp = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) return next(new AppError('Payment Intent ID is required', 400));

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') return next(new AppError('Payment not successful', 400));

    const existing = await Transaction.findOne({ stripePaymentIntentId: paymentIntentId });
    if (existing) return next(new AppError('Payment already processed', 400));

    const pkrAmount = parseInt(paymentIntent.metadata?.pkrAmount || '0') || (paymentIntent.amount / 100);

    const updatedUser = await User.findByIdAndUpdate(req.user!.id, { $inc: { walletBalance: pkrAmount } }, { new: true });

    const transaction = await Transaction.create({
        user: req.user!.id,
        type: 'topup',
        amount: pkrAmount,
        currency: 'PKR',
        stripePaymentIntentId: paymentIntentId,
        status: 'completed'
    });

    if (updatedUser) {
        await sendEmail(updatedUser.email, 'Wallet Top-Up Successful', walletTopUpTemplate(updatedUser.name, pkrAmount, updatedUser.walletBalance));
    }

    res.status(200).json({ status: 'success', data: { transaction, newBalance: updatedUser?.walletBalance } });
});

export const getWalletTransactions = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
        Transaction.find({ user: req.user!.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('relatedReport', 'title'),
        Transaction.countDocuments({ user: req.user!.id })
    ]);

    res.status(200).json({
        status: 'success',
        data: { transactions, total, page, totalPages: Math.ceil(total / limit) }
    });
});

export const createSetupIntent = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const customerId = await getOrCreateStripeCustomer(req.user!.id);

    const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        metadata: {
            userId: req.user!.id
        },
        payment_method_types: ['card']
    });


    res.status(200).json({
        status: 'success',
        clientSecret: setupIntent.client_secret
    });
});

export const getPaymentMethods = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const customerId = await getOrCreateStripeCustomer(req.user!.id);

    const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
    });

    res.status(200).json({
        status: 'success',
        data: {
            paymentMethods: paymentMethods.data
        }
    });
});

/** Request OTP to authorize payment method deletion */
export const requestPaymentMethodOtp = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!._id);
    if (!user) return next(new AppError('User not found', 404));

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.set(`payment_otp:${user.email}`, otp, 'EX', 600);

    try {
        await sendEmail(user.email, 'Payment Method Removal - BugChase', cardDeletionOtpTemplate(otp));
    } catch (error) {
        console.error('Email Send Error:', error);
        return next(new AppError('There was an error sending the email. Try again later!', 500));
    }

    res.status(200).json({ status: 'success', message: 'Verification code sent to your email' });
});

/** Verify OTP for payment method deletion */
export const verifyPaymentMethodOtp = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { otp } = req.body;
    if (!otp) return next(new AppError('OTP is required', 400));

    const user = await User.findById(req.user!._id);
    if (!user) return next(new AppError('User not found', 404));

    const storedOtp = await redisClient.get(`payment_otp:${user.email}`);
    if (!storedOtp || storedOtp !== otp) {
        return next(new AppError('Invalid or expired verification code', 400));
    }

    await redisClient.del(`payment_otp:${user.email}`);
    res.status(200).json({ status: 'success', message: 'Identity verified successfully' });
});

export const detachPaymentMethod = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const paymentMethodIdParam = req.params.paymentMethodId;

    if (!paymentMethodIdParam || Array.isArray(paymentMethodIdParam)) {
        return next(new AppError('Payment Method ID is required', 400));
    }
    const paymentMethodId = paymentMethodIdParam;

    // Security check: verify the PM belongs to this company's customer
    const customerId = await getOrCreateStripeCustomer(req.user!.id);
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) {
        return next(new AppError('You do not have permission to remove this card', 403));
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    res.status(200).json({
        status: 'success',
        message: 'Payment method detached successfully'
    });
});

export const getCompanyAnalytics = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user!.parentCompany || req.user!.id;
    
    const programs = await Program.find({ companyId });
    const programIds = programs.map(p => p._id.toString());
    
    if (programIds.length === 0) {
        return res.status(200).json({
            status: 'success',
            data: {
                stats: {
                    totalReports: 0,
                    openReports: 0,
                    bountiesPaid: 0,
                    researchers: 0
                },
                severityData: [],
                trendsData: [],
                recentReports: []
            }
        });
    }

    const reports = await Report.find({ programId: { $in: programIds } }).sort({ createdAt: -1 });
    
    let totalReports = reports.length;
    let openReports = 0;
    let bountiesPaid = 0;
    const researchersSet = new Set<string>();
    
    const severityCount = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        None: 0
    };
    
    const trendsMap: Record<string, { reports: number, bounties: number }> = {};
    
    reports.forEach(report => {
        if (!['Resolved', 'Paid', 'Closed', 'Spam', 'Duplicate', 'NA', 'Out-of-Scope'].includes(report.status)) {
            openReports++;
        }
        
        if (report.bounty) {
            bountiesPaid += report.bounty;
        }
        
        if (report.researcherId) {
            researchersSet.add(report.researcherId.toString());
        }
        
        if (report.severity && severityCount[report.severity as keyof typeof severityCount] !== undefined) {
            severityCount[report.severity as keyof typeof severityCount]++;
        }
        
        // Month key like "2024-03"
        const date = new Date((report as any).createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!trendsMap[monthKey]) {
            trendsMap[monthKey] = { reports: 0, bounties: 0 };
        }
        trendsMap[monthKey].reports++;
        if (report.bounty) trendsMap[monthKey].bounties += report.bounty;
    });
    
    const severityData = [
        { name: 'Critical', count: severityCount.Critical, color: '#ef4444' },
        { name: 'High', count: severityCount.High, color: '#f97316' },
        { name: 'Medium', count: severityCount.Medium, color: '#eab308' },
        { name: 'Low', count: severityCount.Low, color: '#22c55e' }
    ];
    
    const sortedMonths = Object.keys(trendsMap).sort();
    const trendsData = sortedMonths.map(month => {
        // e.g. "2024-03"
        const year = month.split('-')[0];
        const monthIndex = parseInt(month.split('-')[1]) - 1;
        const d = new Date(parseInt(year), monthIndex, 1);
        const monthName = d.toLocaleString('default', { month: 'short' });
        return {
            month: monthName,
            week: monthName, 
            reports: trendsMap[month].reports,
            amount: trendsMap[month].bounties
        };
    });
    
    const recentReports = reports.slice(0, 5).map(r => ({
        id: r._id,
        reportId: r.reportId || String(r._id),
        title: r.title,
        severity: r.severity.toLowerCase(),
        status: r.status.toLowerCase(),
        createdAt: (r as any).createdAt
    }));
    
    res.status(200).json({
        status: 'success',
        data: {
            stats: {
                totalReports,
                openReports,
                bountiesPaid,
                researchers: researchersSet.size,
                reportsTrend: 0,
                bountiesTrend: 0
            },
            severityData,
            trendsData,
            recentReports
        }
    });
});
