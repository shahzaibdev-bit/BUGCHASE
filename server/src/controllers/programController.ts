import { Request, Response, NextFunction } from 'express';
import Program from '../models/Program';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';

export const getPublicPrograms = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Fetch only ACTIVE programs (and not private unless we handle invites later)
    // For now, public researcher view should only show 'Active' and public programs
    // If we want researchers to see private programs they are invited to, that requires more logic.
    // Assuming 'isPrivate: false' means public.

    const programs = await Program.find({ 
        status: 'Active',
        isPrivate: false 
    })
    .select('title companyName type description rewards bountyRange createdAt companyId') // Ensure companyId is selected so it can be populated
    .populate('companyId', 'avatar') // Populate avatar from the User model
    .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: programs.length,
        data: programs
    });
});

export const getPublicProgramById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const program = await Program.findOne({ 
        _id: req.params.id,
        status: 'Active' 
        // We might allow private if the user has access, but for now strict public
    }).populate(
        'companyId',
        'name email avatar companyName website industry city domainVerified verifiedAssets'
    );

    if (!program) {
        return next(new AppError('Program not found or not active', 404));
    }

    // Checking if private and user not invited (Placeholder logic)
    if (program.isPrivate) {
        // Check invitation logic here in future
    }

    // Fetch reports for this program to build Hall of Fame
    const Report = (await import('../models/Report')).default;
    const reports = await Report.find({ programId: program._id })
        .populate('researcherId', 'username name avatar reputationScore')
        .select('researcherId status');

    // Filter to unique researchers
    const uniqueResearchers = new Map();
    reports.forEach((report: any) => {
        if (report.researcherId && !uniqueResearchers.has(report.researcherId._id.toString())) {
            uniqueResearchers.set(report.researcherId._id.toString(), {
                _id: report.researcherId._id,
                username: report.researcherId.username || report.researcherId.name,
                avatar: report.researcherId.avatar,
                reputationScore: report.researcherId.reputationScore
            });
        }
    });

    const hallOfFame = Array.from(uniqueResearchers.values())
        .sort((a: any, b: any) => (b.reputationScore || 0) - (a.reputationScore || 0));

    res.status(200).json({
        status: 'success',
        data: {
            program,
            hallOfFame
        }
    });
});
