import { Request, Response, NextFunction } from 'express';
import Dispute from '../models/Dispute';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';

const generateDisputeId = () => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DSP-${rand}`;
};

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

  if (!subject || !description) {
    return next(new AppError('Subject and description are required', 400));
  }

  const dispute = await Dispute.create({
    disputeId: generateDisputeId(),
    subject: String(subject).trim(),
    description: String(description).trim(),
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
        content: String(description).trim(),
        createdAt: new Date(),
      },
    ],
  });

  res.status(201).json({ status: 'success', data: { dispute } });
});
