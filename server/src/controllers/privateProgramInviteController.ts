import { Request, Response, NextFunction } from 'express';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import Program from '../models/Program';
import PrivateProgramInvite from '../models/PrivateProgramInvite';
import User from '../models/User';
import {
  createPrivateProgramInvite,
  expireStalePrivateInvite,
  getProgramThirtyDayValidReportCount,
  normalizePrivateInviteSettings,
  scoreEligibleResearchersForProgram,
  runAutoInviteScalingForAllPrograms,
} from '../services/privateProgramInviteService';

const resolveOptionalUser = async (req: Request) => {
  let token: string | undefined;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) return null;
  try {
    const decoded: any = await (promisify(jwt.verify) as any)(token, process.env.JWT_SECRET);
    return User.findById(decoded.id);
  } catch {
    return null;
  }
};

export const updatePrivateProgramSettings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const companyId = req.user!.parentCompany || req.user!.id;
  const program = await Program.findOne({ _id: req.params.id, companyId });
  if (!program) return next(new AppError('Program not found', 404));
  if (!program.isPrivate) return next(new AppError('Only private programs support invite settings', 400));

  program.privateInviteSettings = normalizePrivateInviteSettings({
    ...((program.privateInviteSettings as any)?.toObject?.() || program.privateInviteSettings || {}),
    ...req.body,
  });
  await program.save();

  const actualReports = await getProgramThirtyDayValidReportCount(program._id, program.privateInviteSettings.lookbackDays);

  res.status(200).json({
    status: 'success',
    data: {
      privateInviteSettings: program.privateInviteSettings,
      metrics: {
        actualReportsLast30Days: actualReports,
        targetMonthlyReports: program.privateInviteSettings.targetMonthlyReports,
        deficit: Math.max(0, program.privateInviteSettings.targetMonthlyReports - actualReports),
      },
    },
  });
});

export const getPrivateProgramInviteStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const companyId = req.user!.parentCompany || req.user!.id;
  const program = await Program.findOne({ _id: req.params.id, companyId });
  if (!program) return next(new AppError('Program not found', 404));
  if (!program.isPrivate) return next(new AppError('Not a private program', 400));

  const settings = normalizePrivateInviteSettings(program.privateInviteSettings);
  const [actualReports, inviteCounts] = await Promise.all([
    getProgramThirtyDayValidReportCount(program._id, settings.lookbackDays),
    PrivateProgramInvite.aggregate([
      { $match: { programId: program._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const counts: Record<string, number> = {};
  for (const row of inviteCounts) counts[row._id] = row.count;

  res.status(200).json({
    status: 'success',
    data: {
      privateInviteSettings: settings,
      actualReportsLast30Days: actualReports,
      targetMonthlyReports: settings.targetMonthlyReports,
      deficit: Math.max(0, settings.targetMonthlyReports - actualReports),
      invitesNeededToday: Math.max(0, settings.targetMonthlyReports - actualReports) * settings.inviteToReportMultiplier,
      inviteCounts: counts,
    },
  });
});

export const listMyPrivateProgramInvites = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const researcherId = req.user!._id;
  const raw = await PrivateProgramInvite.find({ researcherId }).sort({ createdAt: -1 });
  for (const invite of raw) await expireStalePrivateInvite(invite);

  const invites = await PrivateProgramInvite.find({ researcherId })
    .sort({ createdAt: -1 })
    .populate('programId', 'title companyName type bountyRange description status isPrivate scope rewards')
    .populate('companyId', 'name companyName avatar')
    .lean();

  res.status(200).json({ status: 'success', data: invites });
});

export const getPrivateProgramInviteByToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.params;
  const invite = await PrivateProgramInvite.findOne({ token })
    .populate('programId')
    .populate('companyId', 'name companyName avatar website industry city domainVerified verifiedAssets createdAt')
    .populate('researcherId', 'name username email');

  if (!invite) return next(new AppError('Invite not found', 404));
  await expireStalePrivateInvite(invite);

  const programDoc = invite.programId as any;
  const companyDoc = invite.companyId as any;

  const program = programDoc
    ? {
        _id: programDoc._id,
        title: programDoc.title,
        companyName: programDoc.companyName,
        type: programDoc.type,
        status: programDoc.status,
        isPrivate: programDoc.isPrivate,
        description: programDoc.description || '',
        rulesOfEngagement: programDoc.rulesOfEngagement || '',
        safeHarbor: programDoc.safeHarbor || '',
        submissionGuidelines: programDoc.submissionGuidelines || '',
        bountyRange: programDoc.bountyRange || '',
        scope: programDoc.scope || [],
        outOfScope: programDoc.outOfScope || [],
        slas: programDoc.slas || {},
        rewards: programDoc.rewards || {},
        assetTags: programDoc.privateInviteSettings?.assetTags || [],
        createdAt: programDoc.createdAt,
      }
    : null;

  const verifiedDomains = (companyDoc?.verifiedAssets || [])
    .filter((a: any) => a?.status === 'verified')
    .map((a: any) => a.domain)
    .filter(Boolean);

  const company = companyDoc
    ? {
        _id: companyDoc._id,
        name: companyDoc.name,
        companyName: companyDoc.companyName || companyDoc.name,
        avatar: companyDoc.avatar,
        website: companyDoc.website || '',
        industry: companyDoc.industry || '',
        city: companyDoc.city || '',
        domainVerified: companyDoc.domainVerified || verifiedDomains.length > 0,
        verifiedDomains,
        memberSince: companyDoc.createdAt,
      }
    : null;

  const viewer = req.user || (await resolveOptionalUser(req));
  const researcherId = invite.researcherId?._id?.toString?.() || invite.researcherId?.toString?.();
  const viewerId = viewer?._id?.toString?.() || (viewer as any)?.id;
  const isInvitee = Boolean(viewerId && researcherId && viewerId === researcherId);
  const expired = invite.status === 'revoked' || (invite.expiresAt && new Date(invite.expiresAt) < new Date());
  const canRespond = isInvitee && invite.status === 'invited' && !expired;

  res.status(200).json({
    status: 'success',
    data: {
      invite: {
        _id: invite._id,
        status: invite.status,
        source: invite.source,
        invitedAt: invite.invitedAt,
        expiresAt: invite.expiresAt,
        respondedAt: invite.respondedAt,
        scoreSnapshot: invite.scoreSnapshot || {},
      },
      program,
      company,
      expired,
      canRespond,
      isInvitee,
    },
  });
});

export const acceptPrivateProgramInvite = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.params;
  const invite = await PrivateProgramInvite.findOne({ token });
  if (!invite) return next(new AppError('Invite not found', 404));
  if (invite.researcherId.toString() !== req.user!._id.toString()) {
    return next(new AppError('You are not the invited researcher', 403));
  }
  await expireStalePrivateInvite(invite);
  if (invite.status !== 'invited') return next(new AppError(`Invite is ${invite.status}`, 400));
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return next(new AppError('Invite has expired', 400));
  }

  invite.status = 'accepted';
  invite.respondedAt = new Date();
  await invite.save();

  res.status(200).json({ status: 'success', data: invite });
});

export const declinePrivateProgramInvite = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.params;
  const invite = await PrivateProgramInvite.findOne({ token });
  if (!invite) return next(new AppError('Invite not found', 404));
  if (invite.researcherId.toString() !== req.user!._id.toString()) {
    return next(new AppError('You are not the invited researcher', 403));
  }
  if (!['invited', 'accepted'].includes(invite.status)) {
    return next(new AppError(`Invite is ${invite.status}`, 400));
  }

  invite.status = 'declined';
  invite.respondedAt = new Date();
  await invite.save();

  res.status(200).json({ status: 'success', data: invite });
});

export const runPrivateInviteCron = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const provided = bearer || req.headers['x-cron-secret'] || req.query.secret;
  if (!secret || provided !== secret) {
    return next(new AppError('Unauthorized cron invocation', 401));
  }
  const results = await runAutoInviteScalingForAllPrograms();
  res.status(200).json({ status: 'success', data: results });
});
