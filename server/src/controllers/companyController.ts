import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User';
import Program from '../models/Program';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import { sendEmail, inviteMemberTemplate } from '../services/emailService';

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

    // MOCK: In real world, verify DNS TXT record here.
    // We use the token ALREADY stored in the user profile to verify.
    // For now, we assume success.

    // Add to verifiedAssets WITH the token used for verification
    const newAsset = {
        id: crypto.randomBytes(4).toString('hex'),
        domain: rootDomain,
        method: 'DNS_TXT' as const,
        verificationToken: user.verificationToken || 'unknown', // Save the token
        dateVerified: new Date().toISOString().split('T')[0],
        status: 'verified' as const
    };

    // Check if already exists
    const exists = user.verifiedAssets?.find(a => a.domain === rootDomain);
    if (exists) {
        return next(new AppError('Domain already verified', 400));
    }

    if (!user.verifiedAssets) user.verifiedAssets = [];
    user.verifiedAssets.push(newAsset);
    
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        message: 'Domain verified successfully',
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
        const { title, type, description, selectedAssets = [], rewards } = req.body; 
        
        const user = await User.findById(req.user!.id);
        if (!user) return next(new AppError('User not found', 404));

        const scope = (selectedAssets || []).map((assetId: string) => {
            const asset = user.verifiedAssets?.find(a => a.id === assetId);
            return {
                asset: asset ? asset.domain : assetId,
                type: 'Web/API',
                instruction: 'Testing permitted'
            };
        });

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
                bountyRange = `$${min} - $${max}`;
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
            scope,
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
