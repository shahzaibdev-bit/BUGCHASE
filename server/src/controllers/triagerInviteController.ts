import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Dispute from '../models/Dispute';
import Report from '../models/Report';
import User from '../models/User';
import TriagerReassignmentInvite from '../models/TriagerReassignmentInvite';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import {
  findEligibleTriagerCandidates,
  generateInviteToken,
  searchTriagerCandidates,
  INVITE_TTL_MS,
} from '../services/triagerMatchingService';
import { restoreLinkedReportAfterDispute } from '../services/disputeReportLinkService';
import {
  sendEmail,
  triagerReassignmentInviteTemplate,
  triagerReassignmentAcceptedResearcherTemplate,
  triagerReassignmentAcceptedSupportTemplate,
} from '../services/emailService';
import { getIO } from '../services/socketService';

const resolveOptionalUser = async (req: Request) => {
  let token: string | undefined;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    if (token === 'null' || token === 'undefined') token = undefined;
  }
  if (!token && req.cookies?.jwt) token = req.cookies.jwt;
  if (!token) return null;
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super-secret-key-too-long-to-guess',
    ) as { id: string };
    return User.findById(decoded.id);
  } catch {
    return null;
  }
};

const isDisputeClosed = (status: string) => status === 'resolved' || status === 'rejected';

const expireStaleInvite = async (invite: any) => {
  if (invite.status === 'pending' && new Date(invite.expiresAt).getTime() < Date.now()) {
    invite.status = 'expired';
    invite.respondedAt = new Date();
    await invite.save();
  }
  return invite;
};

const getPendingInviteForDispute = async (disputeId: any) => {
  const invite = await TriagerReassignmentInvite.findOne({
    dispute: disputeId,
    status: 'pending',
  }).sort({ createdAt: -1 });
  if (!invite) return null;
  return expireStaleInvite(invite);
};

const assertSupportCanAssign = async (dispute: any, req: Request) => {
  if (!dispute.reportRef) {
    throw new AppError('This dispute is not linked to a report.', 400);
  }
  if (isDisputeClosed(dispute.status)) {
    throw new AppError('Cannot assign triagers on a closed dispute.', 400);
  }

  const assignedToId = dispute.assignedTo ? dispute.assignedTo.toString() : null;
  const isAdmin = req.user.role === 'admin';
  const isOwner = assignedToId && assignedToId === req.user._id.toString();
  if (!isAdmin && !isOwner) {
    throw new AppError('You must claim this dispute before assigning a triager.', 403);
  }

  const pending = await getPendingInviteForDispute(dispute._id);
  if (pending && pending.status === 'pending') {
    throw new AppError(
      'A triager invite is already pending. Wait for accept/decline or expiry before sending another.',
      409,
    );
  }
};

/** GET /api/disputes/:id/triager-candidates */
export const getTriagerCandidatesForDispute = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return next(new AppError('Dispute not found', 404));
    if (!dispute.reportRef) return next(new AppError('No linked report on this dispute.', 400));

    const report = await Report.findById(dispute.reportRef).populate('triagerId', 'name username');
    if (!report) return next(new AppError('Linked report not found', 404));

    const exclude = [report.triagerId?.toString()].filter(Boolean) as string[];
    const { assetKey, candidates, ineligible } = await searchTriagerCandidates(report, {
      excludeTriagerIds: exclude,
    });
    const pendingInvite = await getPendingInviteForDispute(dispute._id);
    const currentTriager = report.triagerId as any;

    res.status(200).json({
      status: 'success',
      data: {
        assetKey,
        candidates,
        ineligible,
        pendingInvite: pendingInvite?.status === 'pending' ? pendingInvite : null,
        canAssign: !pendingInvite || pendingInvite.status !== 'pending',
        currentTriagerId: report.triagerId ? String(report.triagerId) : null,
        currentTriagerName: currentTriager?.name || currentTriager?.username || null,
      },
    });
  },
);

/** POST /api/disputes/:id/triager-invites */
export const sendTriagerReassignmentInvite = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { triagerId } = req.body;
    if (!triagerId) return next(new AppError('triagerId is required', 400));

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return next(new AppError('Dispute not found', 404));

    await assertSupportCanAssign(dispute, req);

    const report = await Report.findById(dispute.reportRef).populate('triagerId', 'name email');
    if (!report) return next(new AppError('Linked report not found', 404));

    const triager = await User.findById(triagerId).select(
      'name username email expertise role status isAvailable maxConcurrentReports',
    );
    if (!triager || triager.role !== 'triager') {
      return next(new AppError('Invalid triager selected', 400));
    }

    const exclude = [report.triagerId?.toString()].filter(Boolean) as string[];
    const eligible = await findEligibleTriagerCandidates(report, { excludeTriagerIds: exclude });
    const match = eligible.find((c) => c._id === String(triager._id));
    if (!match) {
      return next(new AppError('Selected triager does not match expertise/capacity requirements.', 400));
    }

    const previousTriager = report.triagerId as any;
    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = await TriagerReassignmentInvite.create({
      token,
      dispute: dispute._id,
      disputePublicId: dispute.disputeId,
      report: report._id,
      reportPublicId: report.reportId,
      invitedTriager: triager._id,
      invitedTriagerName: triager.name || triager.username || 'Triager',
      invitedTriagerEmail: triager.email,
      previousTriager: previousTriager?._id,
      previousTriagerName: previousTriager?.name,
      invitedBy: req.user._id,
      invitedByName: req.user.name || 'Support',
      status: 'pending',
      expiresAt,
      matchSummary: match.matchSummary,
    });

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const inviteUrl = `${clientUrl}/triager/reassignment-invite/${token}`;

    try {
      await sendEmail(
        triager.email,
        `[BugChase] Triager reassignment invite — ${report.reportId || report.title}`,
        triagerReassignmentInviteTemplate({
          triagerName: triager.name || triager.username || 'Triager',
          reportId: report.reportId || String(report._id),
          reportTitle: report.title,
          disputeId: dispute.disputeId,
          disputeSubject: dispute.subject,
          matchSummary: match.matchSummary,
          expiresAt,
          inviteUrl,
          previousTriagerName: previousTriager?.name,
        }),
      );
    } catch (err) {
      console.error('Failed to send triager invite email:', err);
    }

    dispute.messages.push({
      senderId: req.user._id,
      senderName: req.user.name || 'Support',
      senderRole: req.user.role || 'support',
      content: `Triager reassignment invite sent to **${triager.name || triager.username}**. They have 48 hours to accept or decline.`,
      createdAt: new Date(),
    } as any);
    await dispute.save();

    res.status(201).json({
      status: 'success',
      data: { invite },
    });
  },
);

/** GET /api/triager/reassignment-invites — pending dispute reassignment invites for logged-in triager */
export const listMyTriagerReassignmentInvites = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const triagerId = req.user._id;

    const rawInvites = await TriagerReassignmentInvite.find({
      invitedTriager: triagerId,
      status: 'pending',
    }).sort({ createdAt: -1 });

    for (const invite of rawInvites) {
      await expireStaleInvite(invite);
    }

    const pending = await TriagerReassignmentInvite.find({
      invitedTriager: triagerId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();

    const invites = await Promise.all(
      pending.map(async (invite) => {
        const [report, dispute] = await Promise.all([
          Report.findById(invite.report)
            .select('title severity status reportId assetType description')
            .lean(),
          Dispute.findById(invite.dispute).select('subject disputeId status description').lean(),
        ]);
        return {
          ...invite,
          report: report
            ? {
                _id: report._id,
                reportId: report.reportId,
                title: report.title,
                severity: report.severity,
                status: report.status,
                assetType: report.assetType,
                description: report.description,
              }
            : null,
          dispute: dispute
            ? {
                _id: dispute._id,
                disputeId: dispute.disputeId,
                subject: dispute.subject,
                status: dispute.status,
              }
            : null,
        };
      }),
    );

    res.status(200).json({
      status: 'success',
      results: invites.length,
      data: { invites },
    });
  },
);

/** GET /api/triager/reassignment-invites/:token */
export const getTriagerReassignmentInviteByToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const invite = await TriagerReassignmentInvite.findOne({ token: req.params.token });
    if (!invite) return next(new AppError('Invite not found', 404));

    await expireStaleInvite(invite);

    const [dispute, report] = await Promise.all([
      Dispute.findById(invite.dispute).lean(),
      Report.findById(invite.report)
        .populate('researcherId', 'name username avatar')
        .populate('triagerId', 'name username avatar')
        .populate('comments.sender', 'name username role avatar')
        .populate({
          path: 'programId',
          model: 'Program',
          select: 'title companyName type bountyRange description rewards rulesOfEngagement safeHarbor',
          populate: { path: 'companyId', model: 'User', select: 'name avatar' },
        })
        .lean(),
    ]);

    if (!dispute || !report) return next(new AppError('Invite context not found', 404));

    const expired =
      invite.status === 'expired' || new Date(invite.expiresAt).getTime() < Date.now();
    const viewer = req.user || (await resolveOptionalUser(req));
    const canRespond =
      !expired &&
      invite.status === 'pending' &&
      viewer &&
      String(viewer._id) === String(invite.invitedTriager);

    res.status(200).json({
      status: 'success',
      data: {
        invite,
        dispute,
        report,
        expired,
        canRespond,
        isInvitee: viewer && String(viewer._id) === String(invite.invitedTriager),
      },
    });
  },
);

const finalizeInviteAcceptance = async (
  invite: any,
  triagerUser: { _id: any; name?: string; username?: string },
) => {
  const report = await Report.findById(invite.report).populate('researcherId', 'username name');
  const dispute = await Dispute.findById(invite.dispute);
  if (!report || !dispute) throw new AppError('Invite context not found', 404);

  const previousId = report.triagerId ? report.triagerId.toString() : null;
  const newId = invite.invitedTriager.toString();
  const researcher = report.researcherId as any;
  const researcherHandle = researcher?.username || researcher?.name || 'Researcher';
  const triagerHandle = triagerUser.username || triagerUser.name || invite.invitedTriagerName;

  if (previousId && previousId !== newId) {
    const already = (report.triagerParticipants || []).some(
      (p: any) => String(p.triagerId) === previousId,
    );
    if (!already) {
      report.triagerParticipants = report.triagerParticipants || [];
      report.triagerParticipants.push({
        triagerId: report.triagerId,
        role: 'collaborator',
        addedAt: new Date(),
      } as any);
    }
  }

  report.triagerId = invite.invitedTriager;
  report.triagerNote = 'Reassigned via support dispute resolution.';

  const assignmentLines = [
    `Hi @${researcherHandle},`,
    '',
    `BugChase Support has resolved dispute **${dispute.disputeId}** — *${dispute.subject}*.`,
    '',
    `**${invite.invitedTriagerName}** accepted the reassignment invite and is now the **primary triager** on report **${report.reportId || report._id}** (*${report.title}*).`,
    '',
    '**What changed**',
    `- **Primary triager:** ${invite.invitedTriagerName}${invite.previousTriagerName ? ` (replacing ${invite.previousTriagerName})` : ''}`,
    invite.previousTriagerName
      ? `- **Previous triager:** ${invite.previousTriagerName} — retains read-only collaborator access`
      : null,
    `- **Report status:** Triaging (active review resumed)`,
    `- **Severity:** ${report.severity || '—'}`,
    report.assetType ? `- **Asset focus:** ${report.assetType}` : null,
    `- **Support ticket:** ${dispute.disputeId} marked resolved`,
    '',
    `@${triagerHandle} will continue triage on this report and follow up in this thread.`,
    '',
    '— BugChase Support',
  ]
    .filter(Boolean)
    .join('\n');

  report.comments.push({
    sender: triagerUser._id,
    content: assignmentLines,
    type: 'assignment',
    metadata: {
      kind: 'triager_reassignment',
      systemAction: true,
      previousTriagerId: previousId,
      previousTriagerName: invite.previousTriagerName,
      newTriagerId: newId,
      newTriagerName: invite.invitedTriagerName,
      disputeId: dispute.disputeId,
      disputeSubject: dispute.subject,
      newStatus: 'Triaging',
    },
    createdAt: new Date(),
  } as any);

  await report.save();

  invite.status = 'accepted';
  invite.respondedAt = new Date();
  await invite.save();

  const resolutionNote =
    `Triager reassignment completed. **${invite.invitedTriagerName}** is now assigned to report ` +
    `${report.reportId || report._id}.` +
    (invite.previousTriagerName
      ? ` Previous triager **${invite.previousTriagerName}** retains read access.`
      : '');

  dispute.status = 'resolved';
  dispute.awaitingReplyFrom = 'support';
  dispute.resolution = {
    outcome: 'upheld',
    note: resolutionNote,
    resolvedBy: invite.invitedBy,
    resolvedByName: invite.invitedByName || 'Support',
    resolvedAt: new Date(),
  };
  dispute.messages.push({
    senderId: triagerUser._id,
    senderName: invite.invitedTriagerName,
    senderRole: 'triager',
    content: [
      `**${invite.invitedTriagerName}** accepted the reassignment invite.`,
      '',
      `Report **${report.reportId || report._id}** (*${report.title}*) is now under **Triaging** with ${invite.invitedTriagerName} as primary triager.`,
      invite.previousTriagerName
        ? `${invite.previousTriagerName} remains a collaborator with read access.`
        : '',
      '',
      'This ticket is resolved.',
    ]
      .filter(Boolean)
      .join('\n'),
    createdAt: new Date(),
  } as any);
  await dispute.save();

  await restoreLinkedReportAfterDispute(
    report._id,
    { _id: invite.invitedBy, name: invite.invitedByName || 'Support', role: 'support' },
    dispute.disputeId,
    { statusOverride: 'Triaging' },
  );

  const refreshedReport = await Report.findById(report._id);

  try {
    const io = getIO();
    io.to(String(report._id)).emit('status_updated', { status: refreshedReport?.status || 'Triaging' });
  } catch {
    /* ignore */
  }

  return { report: refreshedReport || report, dispute, invite };
};

/** POST /api/triager/reassignment-invites/:token/accept */
export const acceptTriagerReassignmentInvite = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const invite = await TriagerReassignmentInvite.findOne({ token: req.params.token });
    if (!invite) return next(new AppError('Invite not found', 404));
    await expireStaleInvite(invite);

    if (invite.status === 'expired' || new Date(invite.expiresAt).getTime() < Date.now()) {
      return next(new AppError('This invite link has expired.', 410));
    }
    if (invite.status !== 'pending') {
      return next(new AppError(`Invite already ${invite.status}.`, 400));
    }
    if (String(req.user._id) !== String(invite.invitedTriager)) {
      return next(new AppError('You must sign in as the invited triager to accept.', 403));
    }

    const { report, dispute, invite: updated } = await finalizeInviteAcceptance(invite, req.user);

    const reportDoc = await Report.findById(report._id).populate('researcherId', 'name email');
    const researcher = reportDoc?.researcherId as any;
    const supportAgent = await User.findById(invite.invitedBy).select('email name');

    try {
      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
      const reportPublicId = report.reportId || String(report._id);

      if (researcher?.email) {
        await sendEmail(
          researcher.email,
          `[BugChase] New triager assigned — ${reportPublicId}`,
          triagerReassignmentAcceptedResearcherTemplate({
            researcherName: researcher.name || researcher.username || 'there',
            reportId: reportPublicId,
            reportTitle: report.title,
            reportSeverity: report.severity,
            assetType: report.assetType || undefined,
            triagerName: invite.invitedTriagerName,
            previousTriagerName: invite.previousTriagerName,
            disputeId: dispute.disputeId,
            disputeSubject: dispute.subject,
            reportUrl: `${clientUrl}/researcher/reports/${report._id}`,
          }),
        );
      }
      if (supportAgent?.email) {
        await sendEmail(
          supportAgent.email,
          `[BugChase] Triager accepted — ${dispute.disputeId}`,
          triagerReassignmentAcceptedSupportTemplate({
            agentName: supportAgent.name || 'Support',
            triagerName: invite.invitedTriagerName,
            previousTriagerName: invite.previousTriagerName,
            disputeId: dispute.disputeId,
            disputeSubject: dispute.subject,
            reportId: reportPublicId,
            reportTitle: report.title,
            reportUrl: `${clientUrl}/triager/reports/${report._id}`,
            disputeUrl: `${process.env.SUPPORT_CLIENT_URL || 'http://localhost:3101'}/disputes/${dispute._id}`,
          }),
        );
      }
    } catch (err) {
      console.error('Accept invite notification emails failed:', err);
    }

    res.status(200).json({
      status: 'success',
      data: { invite: updated, dispute, reportId: report._id },
    });
  },
);

/** POST /api/triager/reassignment-invites/:token/decline */
export const declineTriagerReassignmentInvite = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const invite = await TriagerReassignmentInvite.findOne({ token: req.params.token });
    if (!invite) return next(new AppError('Invite not found', 404));
    await expireStaleInvite(invite);

    if (invite.status === 'expired' || new Date(invite.expiresAt).getTime() < Date.now()) {
      return next(new AppError('This invite link has expired.', 410));
    }
    if (invite.status !== 'pending') {
      return next(new AppError(`Invite already ${invite.status}.`, 400));
    }
    if (String(req.user._id) !== String(invite.invitedTriager)) {
      return next(new AppError('You must sign in as the invited triager to decline.', 403));
    }

    invite.status = 'declined';
    invite.respondedAt = new Date();
    await invite.save();

    const dispute = await Dispute.findById(invite.dispute);
    if (dispute) {
      dispute.messages.push({
        senderId: req.user._id,
        senderName: invite.invitedTriagerName,
        senderRole: 'triager',
        content: `${invite.invitedTriagerName} declined the triager reassignment invite.`,
        createdAt: new Date(),
      } as any);
      await dispute.save();
    }

    res.status(200).json({ status: 'success', data: { invite } });
  },
);
