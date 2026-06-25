import { Request, Response, NextFunction } from 'express';
import Program from '../models/Program';
import PrivateProgramInvite from '../models/PrivateProgramInvite';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import { releaseExpiredProgramBans } from '../services/programModerationService';

const getRequestUserId = (req: Request) =>
    (req.user as any)?._id?.toString?.() || req.user?.id;

const BLOCKED_PROGRAM_STATUSES = new Set(['Banned', 'Rejected']);

export const getPublicPrograms = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await releaseExpiredProgramBans();

    const programs = await Program.find({
        status: 'Active',
        isPrivate: false,
    })
        .select('title companyName type description rewards bountyRange createdAt companyId isPrivate')
        .populate('companyId', 'avatar')
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: 'success',
        results: programs.length,
        data: programs
    });
});

export const getPublicProgramById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await releaseExpiredProgramBans();

    const program = await Program.findOne({
        _id: req.params.id,
    }).populate(
        'companyId',
        'name email avatar companyName website industry city domainVerified verifiedAssets'
    );

    if (!program) {
        return next(new AppError('Program not found', 404));
    }

    if (BLOCKED_PROGRAM_STATUSES.has(program.status)) {
        return next(new AppError('Program not found or not active', 404));
    }

    const userId = getRequestUserId(req);

    if (program.isPrivate) {
        if (!userId) {
            return next(new AppError('This private program requires an invitation', 403));
        }
        const invite = await PrivateProgramInvite.findOne({
            programId: program._id,
            researcherId: userId,
            status: 'accepted',
        }).select('_id');
        if (!invite) {
            return next(new AppError('You are not invited to this private program', 403));
        }
    } else if (program.status !== 'Active') {
        return next(new AppError('Program not found or not active', 404));
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
