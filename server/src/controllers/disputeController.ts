import { Request, Response, NextFunction } from 'express';
import Dispute from '../models/Dispute';
import Report from '../models/Report';
import User from '../models/User';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import { sendEmail, disputeReceivedTemplate, disputeMessageTemplate, disputeClosedTemplate, generateEmailMessageId } from '../services/emailService';
import { getIO } from '../services/socketService';
import {
  markLinkedReportInDispute,
  restoreLinkedReportAfterDispute,
  resolveReportByRef,
  REPORT_IN_DISPUTE_STATUS,
  ACTIVE_DISPUTE_STATUSES,
} from '../services/disputeReportLinkService';

const generateDisputeId = () => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DSP-${rand}`;
};

/** Collapse the rich-text issue description into readable plain text for thread comments. */
const stripHtml = (value: string): string =>
  String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();

const VALID_STATUS = ['open', 'in_review', 'resolved', 'rejected'];
const VALID_PRIORITY = ['low', 'medium', 'high', 'critical'];

const isClosed = (status: string) => status === 'resolved' || status === 'rejected';

const isSupportRole = (role?: string) => role === 'support' || role === 'admin';

const raiserTicketLink = (dispute: { _id: any; raisedByRole?: string }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const role = dispute.raisedByRole || 'researcher';
  return `${clientUrl}/${role}/support/${dispute._id}`;
};

const supportTicketLink = (dispute: { _id: any }) => {
  const base = process.env.SUPPORT_CLIENT_URL || 'http://localhost:3101';
  return `${base}/disputes/${dispute._id}`;
};

const disputeThreadSubject = (disputeId: string, subject: string) => `[${disputeId}] ${subject}`;

type ThreadAudience = 'raiser' | 'support';

/** Send a dispute email in the same Gmail/Outlook thread as prior messages to that recipient. */
const sendThreadedDisputeEmail = async (opts: {
  disputeId: string;
  disputeSubject: string;
  disputeMongoId: any;
  to: string;
  html: string;
  audience: ThreadAudience;
  emailThread?: {
    raiser?: { subject: string; rootMessageId: string; lastMessageId: string };
    support?: {
      subject: string;
      rootMessageId: string;
      lastMessageId: string;
      recipientEmail?: string;
    };
  };
}) => {
  const baseSubject = disputeThreadSubject(opts.disputeId, opts.disputeSubject);

  const threadRoot = opts.emailThread || {};
  let side = threadRoot[opts.audience];

  // New support assignee → start a fresh thread for that agent.
  if (opts.audience === 'support') {
    const supportSide = side as { recipientEmail?: string } | undefined;
    if (
      supportSide?.recipientEmail &&
      supportSide.recipientEmail.toLowerCase() !== opts.to.toLowerCase()
    ) {
      side = undefined;
    }
  }

  const messageId = generateEmailMessageId(`dispute.${opts.disputeId}.${opts.audience}`);

  let subject = baseSubject;
  let inReplyTo: string | undefined;
  let references: string[] | undefined;

  if (side?.lastMessageId) {
    subject = `Re: ${baseSubject}`;
    inReplyTo = side.lastMessageId;
    references = [side.rootMessageId, side.lastMessageId].filter(Boolean);
  }

  await sendEmail(opts.to, subject, opts.html, {
    messageId,
    inReplyTo,
    references,
  });

  const updatedSide = {
    subject: baseSubject,
    rootMessageId: side?.rootMessageId || messageId,
    lastMessageId: messageId,
    ...(opts.audience === 'support' ? { recipientEmail: opts.to.toLowerCase() } : {}),
  };

  await Dispute.findByIdAndUpdate(opts.disputeMongoId, {
    emailThread: {
      ...threadRoot,
      [opts.audience]: updatedSide,
    },
  });
};

const buildClaimAnnouncement = (agentName: string, disputeId: string) =>
  `${agentName} from the BugChase support team has claimed ticket ${disputeId} and will handle further processing. ` +
  `You will be notified here and by email when we need additional information from you.`;

/** Best-effort email when a new dispute thread message is posted (same email thread per recipient). */
const notifyDisputeMessage = async (
  dispute: any,
  content: string,
  sender: { name?: string; role?: string },
  options?: { actionLabel?: string },
) => {
  const senderRole = sender.role || 'support';
  const plainPreview = stripHtml(content).slice(0, 500);
  const messageHtml = plainPreview.replace(/\n/g, '<br/>');
  const emailThread = dispute.emailThread || {};

  try {
    if (isSupportRole(senderRole)) {
      if (!dispute.raisedByEmail) return;
      await sendThreadedDisputeEmail({
        disputeId: dispute.disputeId,
        disputeSubject: dispute.subject,
        disputeMongoId: dispute._id,
        to: dispute.raisedByEmail,
        audience: 'raiser',
        emailThread,
        html: disputeMessageTemplate({
          recipientName: dispute.raisedByName || 'there',
          disputeId: dispute.disputeId,
          subject: dispute.subject,
          senderName: sender.name || 'Support',
          senderRole: 'Support',
          messageHtml,
          link: raiserTicketLink(dispute),
          actionLabel: options?.actionLabel || 'New message from support',
        }),
      });
      return;
    }

    if (dispute.assignedTo) {
      const agent = await User.findById(dispute.assignedTo).select('email name');
      if (agent?.email) {
        await sendThreadedDisputeEmail({
          disputeId: dispute.disputeId,
          disputeSubject: dispute.subject,
          disputeMongoId: dispute._id,
          to: agent.email,
          audience: 'support',
          emailThread,
          html: disputeMessageTemplate({
            recipientName: agent.name || dispute.assignedToName || 'Support',
            disputeId: dispute.disputeId,
            subject: dispute.subject,
            senderName: sender.name || dispute.raisedByName || 'User',
            senderRole: dispute.raisedByRole || 'user',
            messageHtml,
            link: supportTicketLink(dispute),
            actionLabel: 'New reply from ticket creator',
          }),
        });
      } else {
        console.warn(
          `Dispute ${dispute.disputeId}: assigned agent has no email (assignedTo=${dispute.assignedTo})`,
        );
      }
    } else if (!isSupportRole(senderRole)) {
      console.warn(`Dispute ${dispute.disputeId}: user replied but no support agent is assigned`);
    }
  } catch (err) {
    console.error('Failed to send dispute message email:', err);
  }
};

/** Email the ticket raiser when support resolves or rejects (same thread as prior messages). */
const notifyDisputeClosed = async (
  dispute: any,
  opts: { status: 'resolved' | 'rejected'; agentName: string; resolutionNote?: string },
) => {
  if (!dispute.raisedByEmail) return;

  try {
    await sendThreadedDisputeEmail({
      disputeId: dispute.disputeId,
      disputeSubject: dispute.subject,
      disputeMongoId: dispute._id,
      to: dispute.raisedByEmail,
      audience: 'raiser',
      emailThread: dispute.emailThread || {},
      html: disputeClosedTemplate({
        recipientName: dispute.raisedByName || 'there',
        disputeId: dispute.disputeId,
        subject: dispute.subject,
        status: opts.status,
        agentName: opts.agentName,
        resolutionNote: opts.resolutionNote,
        link: raiserTicketLink(dispute),
      }),
    });
  } catch (err) {
    console.error(`Failed to send dispute ${opts.status} email:`, err);
  }
};

const serializeDisputeForRaiser = (dispute: any) => {
  const doc = dispute.toJSON ? dispute.toJSON() : dispute;
  const awaiting = doc.awaitingReplyFrom || 'support';
  const canReply = !isClosed(doc.status) && awaiting === 'raiser';
  return { ...doc, awaitingReplyFrom: awaiting, canReply };
};

/** GET /api/disputes/mine — tickets raised by the current user. */
export const listMyDisputes = catchAsync(async (req: Request, res: Response) => {
  const disputes = await Dispute.find({ raisedBy: req.user._id })
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json({
    status: 'success',
    results: disputes.length,
    data: {
      disputes: disputes.map((d) => ({
        ...d,
        awaitingReplyFrom: d.awaitingReplyFrom || 'support',
        canReply: !isClosed(d.status) && (d.awaitingReplyFrom || 'support') === 'raiser',
      })),
    },
  });
});

/** GET /api/disputes/mine/active-for-report/:reportRef — open ticket by this user for a report. */
export const getActiveDisputeForReport = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const linkedReport = await resolveReportByRef(String(req.params.reportRef));
    if (!linkedReport) {
      return res.status(200).json({
        status: 'success',
        data: { activeDispute: null, canOpenNew: true },
      });
    }

    const activeDispute = await Dispute.findOne({
      reportRef: linkedReport._id,
      raisedBy: req.user._id,
      status: { $in: [...ACTIVE_DISPUTE_STATUSES] },
    })
      .select('_id disputeId status subject createdAt')
      .lean();

    res.status(200).json({
      status: 'success',
      data: {
        activeDispute: activeDispute || null,
        canOpenNew: !activeDispute,
      },
    });
  },
);

/** GET /api/disputes/mine/:id — single ticket for the raiser. */
export const getMyDispute = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const dispute = await Dispute.findOne({
    _id: req.params.id,
    raisedBy: req.user._id,
  }).lean();

  if (!dispute) return next(new AppError('Support ticket not found', 404));

  res.status(200).json({
    status: 'success',
    data: {
      dispute: {
        ...dispute,
        awaitingReplyFrom: dispute.awaitingReplyFrom || 'support',
        canReply:
          !isClosed(dispute.status) && (dispute.awaitingReplyFrom || 'support') === 'raiser',
      },
    },
  });
});

/** POST /api/disputes/mine/:id/messages — raiser reply (only when chat is open). */
export const replyToMyDispute = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { content } = req.body;
    if (!content || !String(content).trim()) {
      return next(new AppError('Message content is required', 400));
    }

    const dispute = await Dispute.findOne({
      _id: req.params.id,
      raisedBy: req.user._id,
    });

    if (!dispute) return next(new AppError('Support ticket not found', 404));
    if (isClosed(dispute.status)) {
      return next(new AppError('This ticket is closed', 400));
    }
    if ((dispute.awaitingReplyFrom || 'support') !== 'raiser') {
      return next(
        new AppError(
          'You can reply after the support team sends you a message. Please wait for their response.',
          403,
        ),
      );
    }

    if (!dispute.assignedTo) {
      return next(
        new AppError(
          'A support agent must claim this ticket before you can reply. Please wait for support to pick it up.',
          403,
        ),
      );
    }

    dispute.messages.push({
      senderId: req.user._id,
      senderName: req.user.name || req.user.username || 'User',
      senderRole: req.user.role,
      content: String(content).trim(),
      createdAt: new Date(),
    });

    // User replied — lock the chat for them until support responds again.
    dispute.awaitingReplyFrom = 'support';
    if (dispute.status === 'open') dispute.status = 'in_review';

    await dispute.save();

    res.status(201).json({
      status: 'success',
      data: { dispute: serializeDisputeForRaiser(dispute) },
    });

    // Notify the support agent who claimed this ticket (same threaded email).
    const fresh = await Dispute.findById(dispute._id);
    if (fresh?.assignedTo) {
      await notifyDisputeMessage(fresh, String(content).trim(), {
        name: req.user.name || req.user.username,
        role: req.user.role,
      });
    }
  },
);

/** GET /api/disputes — list with optional filters (support view). */
export const listDisputes = catchAsync(async (req: Request, res: Response) => {
  const { status, priority, search, queue } = req.query as Record<string, string>;
  const query: any = {};
  const agentId = req.user!._id;

  if (status && VALID_STATUS.includes(status)) query.status = status;
  if (priority && VALID_PRIORITY.includes(priority)) query.priority = priority;
  if (search && search.trim()) {
    const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ subject: rx }, { disputeId: rx }, { raisedByName: rx }, { reportLabel: rx }];
  }

  if (queue === 'working') {
    query.assignedTo = agentId;
    query.status = { $in: ['open', 'in_review'] };
  } else if (queue === 'worked') {
    query.$and = [
      {
        $or: [
          { 'resolution.resolvedBy': agentId },
          {
            status: { $in: ['resolved', 'rejected'] },
            messages: { $elemMatch: { senderId: agentId } },
          },
        ],
      },
      {
        $nor: [{ assignedTo: agentId, status: { $in: ['open', 'in_review'] } }],
      },
    ];
  } else if (queue === 'available') {
    query.status = 'open';
    query.$or = [{ assignedTo: { $exists: false } }, { assignedTo: null }];
  }

  const disputes = await Dispute.find(query).sort({ updatedAt: -1 }).lean();

  res.status(200).json({
    status: 'success',
    results: disputes.length,
    data: { disputes },
  });
});

/** GET /api/disputes/stats/me — personal queue counts for the signed-in agent. */
export const getMyDisputeStats = catchAsync(async (req: Request, res: Response) => {
  const agentId = req.user!._id;

  const [working, worked, awaitingReply, available] = await Promise.all([
    Dispute.countDocuments({
      assignedTo: agentId,
      status: { $in: ['open', 'in_review'] },
    }),
    Dispute.countDocuments({
      $and: [
        {
          $or: [
            { 'resolution.resolvedBy': agentId },
            {
              status: { $in: ['resolved', 'rejected'] },
              messages: { $elemMatch: { senderId: agentId } },
            },
          ],
        },
        {
          $nor: [{ assignedTo: agentId, status: { $in: ['open', 'in_review'] } }],
        },
      ],
    }),
    Dispute.countDocuments({
      assignedTo: agentId,
      status: { $in: ['open', 'in_review'] },
      awaitingReplyFrom: 'support',
    }),
    Dispute.countDocuments({
      status: 'open',
      $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }],
    }),
  ]);

  res.status(200).json({
    status: 'success',
    data: { working, worked, awaitingReply, available },
  });
});

/** GET /api/disputes/stats — counts for dashboard cards. */
export const getDisputeStats = catchAsync(async (_req: Request, res: Response) => {
  const [total, open, inReview, resolved, rejected] = await Promise.all([
    Dispute.countDocuments({}),
    Dispute.countDocuments({ status: 'open' }),
    Dispute.countDocuments({ status: 'in_review' }),
    Dispute.countDocuments({ status: 'resolved' }),
    Dispute.countDocuments({ status: 'rejected' }),
  ]);

  res.status(200).json({
    status: 'success',
    data: { total, open, inReview, resolved, rejected },
  });
});

/** GET /api/disputes/:id */
export const getDispute = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const dispute = await Dispute.findById(req.params.id).lean();
  if (!dispute) return next(new AppError('Dispute not found', 404));
  res.status(200).json({ status: 'success', data: { dispute } });
});

/** GET /api/disputes/reports/:reportId — read-only report context for support staff. */
export const getLinkedReportForSupport = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const report = await Report.findById(req.params.reportId)
      .populate('researcherId', 'name username email avatar role')
      .populate('triagerId', 'name username email avatar role')
      .populate({
        path: 'programId',
        model: 'Program',
        select:
          'title companyId companyName type bountyRange description rewards rulesOfEngagement safeHarbor submissionGuidelines scope',
        populate: {
          path: 'companyId',
          model: 'User',
          select: 'avatar name',
        },
      })
      .populate('comments.sender', 'name username role avatar')
      .lean();

    if (!report) return next(new AppError('Report not found', 404));

    res.status(200).json({ status: 'success', data: { report } });
  },
);

/** POST /api/disputes/:id/messages — support reply on the dispute thread. */
export const addDisputeMessage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { content } = req.body;
    if (!content || !String(content).trim()) {
      return next(new AppError('Message content is required', 400));
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return next(new AppError('Dispute not found', 404));
    if (isClosed(dispute.status)) {
      return next(new AppError('This ticket is closed', 400));
    }

    const assignedToId = dispute.assignedTo ? dispute.assignedTo.toString() : null;
    const isAdmin = req.user.role === 'admin';

    // Must be the claimed agent (or admin) before replying — no auto-claim.
    if (!assignedToId && !isAdmin) {
      return next(new AppError('You must claim this dispute before replying.', 403));
    }
    if (assignedToId && assignedToId !== req.user._id.toString() && !isAdmin) {
      return next(
        new AppError(
          `This dispute is being handled by ${dispute.assignedToName || 'another support member'}.`,
          403,
        ),
      );
    }

    dispute.messages.push({
      senderId: req.user._id,
      senderName: req.user.name || 'Support',
      senderRole: req.user.role || 'support',
      content: String(content).trim(),
      createdAt: new Date(),
    });

    // Support replied — open the chat so the ticket creator can respond.
    dispute.awaitingReplyFrom = 'raiser';

    // First support touch moves an open dispute into review.
    if (dispute.status === 'open') dispute.status = 'in_review';

    await dispute.save();
    res.status(201).json({ status: 'success', data: { dispute } });

    await notifyDisputeMessage(dispute, String(content).trim(), {
      name: req.user.name || 'Support',
      role: req.user.role || 'support',
    });
  },
);

/** PATCH /api/disputes/:id — update status / priority / assignment / resolution. */
export const updateDispute = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { status, priority, claim, release, resolutionOutcome, resolutionNote } = req.body;
  const isAdmin = req.user.role === 'admin';

  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) return next(new AppError('Dispute not found', 404));

  const assignedToId = dispute.assignedTo ? dispute.assignedTo.toString() : null;
  const isOwner = !!assignedToId && assignedToId === req.user._id.toString();
  const claimedByOther = !!assignedToId && !isOwner;

  // --- CLAIM (lock) ---
  // A dispute can only be claimed when it is unassigned or already owned by the
  // requester. Admins may take over. The actual claim is an atomic
  // compare-and-set so two support members cannot claim the same dispute.
  if (claim) {
    const beforeAssignee = assignedToId;
    const agentName = req.user.name || req.user.username || 'Support';

    if (claimedByOther && !isAdmin) {
      return next(
        new AppError(`Dispute already claimed by ${dispute.assignedToName || 'another support member'}`, 409),
      );
    }

    const filter: any = { _id: req.params.id };
    if (!isAdmin) {
      filter.$or = [
        { assignedTo: { $exists: false } },
        { assignedTo: null },
        { assignedTo: req.user._id },
      ];
    }

    const claimed = await Dispute.findOneAndUpdate(
      filter,
      { $set: { assignedTo: req.user._id, assignedToName: agentName } },
      { new: true },
    );

    if (!claimed) {
      const existing = await Dispute.findById(req.params.id).select('assignedToName').lean();
      if (!existing) return next(new AppError('Dispute not found', 404));
      return next(
        new AppError(`Dispute already claimed by ${existing.assignedToName || 'another support member'}`, 409),
      );
    }

    const afterAssignee = claimed.assignedTo?.toString() || null;
    const assignmentChanged = beforeAssignee !== afterAssignee;
    let claimText: string | null = null;

    if (assignmentChanged) {
      claimText = buildClaimAnnouncement(agentName, claimed.disputeId);
      claimed.messages.push({
        senderId: req.user._id,
        senderName: agentName,
        senderRole: req.user.role || 'support',
        content: claimText,
        createdAt: new Date(),
      } as any);
    }

    if (claimed.status === 'open') {
      claimed.status = 'in_review';
    }

    await claimed.save();

    if (claimText) {
      await notifyDisputeMessage(
        claimed,
        claimText,
        { name: agentName, role: req.user.role || 'support' },
        { actionLabel: 'A support agent has claimed your ticket' },
      );
    }

    return res.status(200).json({ status: 'success', data: { dispute: claimed } });
  }

  // --- RELEASE (unclaim) ---
  if (release) {
    if (claimedByOther && !isAdmin) {
      return next(new AppError('You can only release a dispute assigned to you', 403));
    }
    dispute.assignedTo = undefined;
    dispute.assignedToName = undefined;
    await dispute.save();
    return res.status(200).json({ status: 'success', data: { dispute } });
  }

  // --- LOCK: must claim before any other action (admins exempt) ---
  if (!claim && !release && !isAdmin) {
    if (!assignedToId) {
      return next(new AppError('You must claim this dispute before taking action.', 403));
    }
    if (claimedByOther) {
      return next(
        new AppError(
          `This dispute is being handled by ${dispute.assignedToName || 'another support member'}.`,
          403,
        ),
      );
    }
  }

  if (status) {
    if (!VALID_STATUS.includes(status)) return next(new AppError('Invalid status', 400));
    dispute.status = status;
  }
  if (priority) {
    if (!VALID_PRIORITY.includes(priority)) return next(new AppError('Invalid priority', 400));
    dispute.priority = priority;
  }

  if (status === 'resolved' || status === 'rejected') {
    dispute.resolution = {
      outcome: resolutionOutcome || (status === 'resolved' ? 'upheld' : 'rejected'),
      note: resolutionNote || dispute.resolution?.note,
      resolvedBy: req.user._id,
      resolvedByName: req.user.name || 'Support',
      resolvedAt: new Date(),
    };
    dispute.awaitingReplyFrom = 'support';
  }

  await dispute.save();

  if (status === 'in_review' && dispute.reportRef) {
    const linked = await Report.findById(dispute.reportRef);
    if (linked && linked.status !== REPORT_IN_DISPUTE_STATUS) {
      await markLinkedReportInDispute(linked, req.user, dispute.disputeId);
    }
  }

  if ((status === 'resolved' || status === 'rejected') && dispute.reportRef) {
    await restoreLinkedReportAfterDispute(dispute.reportRef, req.user, dispute.disputeId);
  }

  if (status === 'resolved' || status === 'rejected') {
    await notifyDisputeClosed(dispute, {
      status,
      agentName: req.user.name || req.user.username || 'Support',
      resolutionNote: dispute.resolution?.note,
    });
  }

  res.status(200).json({ status: 'success', data: { dispute } });
});

/**
 * POST /api/disputes — raise a new dispute. Open to any authenticated platform
 * user (company / researcher). Support/admin may also file one on a user's
 * behalf.
 */
export const createDispute = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { subject, description, category, priority, reportRef, reportLabel } = req.body;

  if (!subject || !String(subject).trim() || !description || !String(description).trim()) {
    return next(new AppError('Subject and description are required', 400));
  }

  const subjectClean = String(subject).trim();
  const descriptionClean = String(description).trim();

  const linkedReport = reportRef ? await resolveReportByRef(String(reportRef)) : null;

  if (linkedReport && !isSupportRole(req.user.role)) {
    const existingOpen = await Dispute.findOne({
      reportRef: linkedReport._id,
      raisedBy: req.user._id,
      status: { $in: [...ACTIVE_DISPUTE_STATUSES] },
    }).select('disputeId status');

    if (existingOpen) {
      return next(
        new AppError(
          `You already have an open support ticket (${existingOpen.disputeId}) for this report. Please wait until it is resolved before opening another.`,
          409,
        ),
      );
    }
  }

  const dispute = await Dispute.create({
    disputeId: generateDisputeId(),
    subject: subjectClean,
    description: descriptionClean,
    category: category || 'other',
    priority: VALID_PRIORITY.includes(priority) ? priority : 'medium',
    status: 'open',
    raisedBy: req.user._id,
    raisedByName: req.user.name || 'Unknown',
    raisedByEmail: req.user.email,
    raisedByRole: req.user.role,
    reportRef: linkedReport?._id || undefined,
    reportLabel: reportLabel || undefined,
    awaitingReplyFrom: 'support',
    messages: [
      {
        senderId: req.user._id,
        senderName: req.user.name || 'Unknown',
        senderRole: req.user.role,
        content: descriptionClean,
        createdAt: new Date(),
      },
    ],
  });

  // If the issue concerns a specific report, post it into that report's thread
  // so every participant (researcher / triager / company) can see it. Best-effort:
  // a thread failure must never block the dispute from being created.
  let resolvedReportId: string | undefined;
  if (linkedReport) {
    try {
      const report = linkedReport;
      resolvedReportId = String(report._id);
      await markLinkedReportInDispute(report, req.user, dispute.disputeId);

      const plain = stripHtml(descriptionClean);
        const header = `Support issue raised by ${req.user.name || req.user.username || 'a user'} (${req.user.role}) — ${subjectClean}`;
        const commentContent = `${header}\n\n${plain}\n\n[Support reference: ${dispute.disputeId}]`;

        report.comments.push({
          sender: req.user._id,
          content: commentContent,
          attachments: [],
          metadata: {
            kind: 'support_dispute',
            disputeId: dispute.disputeId,
            issueType: subjectClean,
            category: dispute.category,
          },
          createdAt: new Date(),
        } as any);

        await report.save();

        try {
          const io = getIO();
          const roleLabel =
            req.user.role === 'researcher'
              ? 'Researcher'
              : req.user.role === 'triager'
                ? 'Triager'
                : req.user.role === 'company'
                  ? 'Company'
                  : req.user.role === 'admin'
                    ? 'Admin'
                    : 'System';
          const newComment = report.comments[report.comments.length - 1] as any;
          io.to(resolvedReportId).emit('new_activity', {
            id: newComment._id,
            type: 'comment',
            author:
              req.user.role !== 'company'
                ? req.user.username || req.user.name || 'Unknown User'
                : req.user.name || 'Unknown Company',
            authorName: req.user.name,
            authorUsername: req.user.username,
            role: roleLabel,
            content: newComment.content,
            attachments: [],
            timestamp: newComment.createdAt,
            authorAvatar: req.user.avatar,
            metadata: newComment.metadata,
          });
        } catch (socketError) {
          console.error('Dispute thread socket emit failed:', socketError);
        }
    } catch (threadErr) {
      console.error('Failed to post dispute into report thread:', threadErr);
    }
  }

  res.status(201).json({ status: 'success', data: { dispute } });

  // Confirmation email — starts the raiser email thread (all later updates use Re: same subject).
  (async () => {
    try {
      if (req.user.email) {
        const clientUrl = process.env.CLIENT_URL || '';
        const link = `${clientUrl}/${req.user.role}/support/${dispute._id}`;
        await sendThreadedDisputeEmail({
          disputeId: dispute.disputeId,
          disputeSubject: subjectClean,
          disputeMongoId: dispute._id,
          to: req.user.email,
          audience: 'raiser',
          emailThread: {},
          html: disputeReceivedTemplate({
            recipientName: req.user.name || req.user.username || 'there',
            disputeId: dispute.disputeId,
            subject: subjectClean,
            category: dispute.category,
            descriptionHtml: descriptionClean,
            reportLabel: reportLabel || undefined,
            link,
          }),
        });
      }
    } catch (mailErr) {
      console.error('Failed to send dispute confirmation email:', mailErr);
    }
  })();
});
