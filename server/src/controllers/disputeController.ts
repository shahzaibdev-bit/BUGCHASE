import { Request, Response, NextFunction } from 'express';
import Dispute from '../models/Dispute';
import Report from '../models/Report';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import { sendEmail, disputeReceivedTemplate } from '../services/emailService';
import { getIO } from '../services/socketService';

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

/** GET /api/disputes — list with optional filters (support view). */
export const listDisputes = catchAsync(async (req: Request, res: Response) => {
  const { status, priority, search } = req.query as Record<string, string>;
  const query: any = {};

  if (status && VALID_STATUS.includes(status)) query.status = status;
  if (priority && VALID_PRIORITY.includes(priority)) query.priority = priority;
  if (search && search.trim()) {
    const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ subject: rx }, { disputeId: rx }, { raisedByName: rx }, { reportLabel: rx }];
  }

  const disputes = await Dispute.find(query).sort({ createdAt: -1 }).lean();

  res.status(200).json({
    status: 'success',
    results: disputes.length,
    data: { disputes },
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

/** POST /api/disputes/:id/messages — support reply on the dispute thread. */
export const addDisputeMessage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { content } = req.body;
    if (!content || !String(content).trim()) {
      return next(new AppError('Message content is required', 400));
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return next(new AppError('Dispute not found', 404));

    dispute.messages.push({
      senderId: req.user._id,
      senderName: req.user.name || 'Support',
      senderRole: req.user.role || 'support',
      content: String(content).trim(),
      createdAt: new Date(),
    });

    // First support touch moves an open dispute into review.
    if (dispute.status === 'open') dispute.status = 'in_review';

    await dispute.save();
    res.status(201).json({ status: 'success', data: { dispute } });
  }
);

/** PATCH /api/disputes/:id — update status / priority / assignment / resolution. */
export const updateDispute = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { status, priority, claim, resolutionOutcome, resolutionNote } = req.body;

  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) return next(new AppError('Dispute not found', 404));

  if (status) {
    if (!VALID_STATUS.includes(status)) return next(new AppError('Invalid status', 400));
    dispute.status = status;
  }
  if (priority) {
    if (!VALID_PRIORITY.includes(priority)) return next(new AppError('Invalid priority', 400));
    dispute.priority = priority;
  }
  if (claim) {
    dispute.assignedTo = req.user._id;
    dispute.assignedToName = req.user.name || 'Support';
    if (dispute.status === 'open') dispute.status = 'in_review';
  }

  if (status === 'resolved' || status === 'rejected') {
    dispute.resolution = {
      outcome: resolutionOutcome || (status === 'resolved' ? 'upheld' : 'rejected'),
      note: resolutionNote || dispute.resolution?.note,
      resolvedBy: req.user._id,
      resolvedByName: req.user.name || 'Support',
      resolvedAt: new Date(),
    };
  }

  await dispute.save();
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
    reportRef: reportRef || undefined,
    reportLabel: reportLabel || undefined,
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
  if (reportRef) {
    try {
      const report = await Report.findById(reportRef);
      if (report) {
        resolvedReportId = String(report._id);
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
      }
    } catch (threadErr) {
      console.error('Failed to post dispute into report thread:', threadErr);
    }
  }

  res.status(201).json({ status: 'success', data: { dispute } });

  // Confirmation email to the user who raised the issue (background, best-effort).
  (async () => {
    try {
      if (req.user.email) {
        const clientUrl = process.env.CLIENT_URL || '';
        const link = resolvedReportId
          ? `${clientUrl}/${req.user.role}/reports/${resolvedReportId}`
          : clientUrl;
        await sendEmail(
          req.user.email,
          `We've received your support request [${dispute.disputeId}]`,
          disputeReceivedTemplate({
            recipientName: req.user.name || req.user.username || 'there',
            disputeId: dispute.disputeId,
            subject: subjectClean,
            category: dispute.category,
            descriptionHtml: descriptionClean,
            reportLabel: reportLabel || undefined,
            link,
          }),
        );
      }
    } catch (mailErr) {
      console.error('Failed to send dispute confirmation email:', mailErr);
    }
  })();
});
