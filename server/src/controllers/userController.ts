import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import { getProfileCompletionReputationScore } from '../utils/profileCompletionReputation';

export const getPublicProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const raw = (req.params.username as string | undefined)?.trim();
  if (!raw) {
    return next(new AppError('Profile not found', 404));
  }
  const safeUsername = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const user = await User.findOne({
    username: { $regex: new RegExp(`^${safeUsername}$`, 'i') },
    isPrivate: false,
  }).select(
    'username name bio bioUpdated avatar country city socialLinks reputationScore linkedAccounts createdAt skills achievements isPrivate isVerified status'
  );

  if (!user) {
    return next(new AppError('Profile not found', 404));
  }

  const ReportModel = (await import('../models/Report')).default;
  const rid = user._id instanceof mongoose.Types.ObjectId ? user._id : new mongoose.Types.ObjectId(String(user._id));

  const [agg] = await ReportModel.aggregate([
    { $match: { researcherId: rid } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              submitted: { $sum: 1 },
              resolvedOrPaid: {
                $sum: {
                  $cond: [{ $in: ['$status', ['Resolved', 'Paid']] }, 1, 0],
                },
              },
              paidOnly: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
              duplicate: { $sum: { $cond: [{ $eq: ['$status', 'Duplicate'] }, 1, 0] } },
              spam: { $sum: { $cond: [{ $eq: ['$status', 'Spam'] }, 1, 0] } },
              na: { $sum: { $cond: [{ $eq: ['$status', 'NA'] }, 1, 0] } },
              activeReports: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$status',
                        [
                          'Submitted',
                          'Triaging',
                          'Needs Info',
                          'Triaged',
                          'Under Review',
                          'Pending_Fix',
                        ],
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        bySeverity: [{ $group: { _id: '$severity', count: { $sum: 1 } } }],
      },
    },
  ]);

  const summary = agg?.summary?.[0] as
    | {
        submitted?: number;
        resolvedOrPaid?: number;
        paidOnly?: number;
        duplicate?: number;
        spam?: number;
        na?: number;
        activeReports?: number;
      }
    | undefined;

  const submitted = summary?.submitted ?? 0;
  const resolvedOrPaid = summary?.resolvedOrPaid ?? 0;
  const resolutionRatePercent =
    submitted > 0 ? Math.round((resolvedOrPaid / submitted) * 100) : null;

  const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'None'];
  const bySeverity = (agg?.bySeverity || [])
    .filter((x: { _id?: string | null }) => x._id)
    .map((x: { _id: string; count: number }) => ({ severity: x._id, count: x.count }))
    .sort(
      (a: { severity: string; count: number }, b: { severity: string; count: number }) =>
        severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
    );

  const plain = user.toObject() as any;
  delete plain.email;
  delete plain.password;
  delete plain.walletBalance;
  const profileCompletionScore = getProfileCompletionReputationScore(plain);

  res.status(200).json({
    status: 'success',
    data: {
      ...plain,
      nickname: user.username,
      reportsSubmitted: submitted,
      profileCompletionScore,
      reportStats: {
        submitted,
        resolvedOrPaid,
        paid: summary?.paidOnly ?? 0,
        duplicate: summary?.duplicate ?? 0,
        spam: summary?.spam ?? 0,
        na: summary?.na ?? 0,
        active: summary?.activeReports ?? 0,
        resolutionRatePercent,
        bySeverity,
      },
    },
  });
});

export const getResearcherLeaderboard = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const ReportModel = (await import('../models/Report')).default;

  const [researchers, paidReportStats] = await Promise.all([
    User.find({ role: 'researcher', status: 'Active' })
      .select('_id name username avatar country city reputationScore')
      .lean(),
    ReportModel.aggregate([
      {
        $match: {
          researcherId: { $ne: null },
          bounty: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$researcherId',
          paidReports: { $sum: 1 },
          totalBounties: { $sum: '$bounty' }
        }
      }
    ])
  ]);

  const statsByResearcher = new Map<string, { paidReports: number; totalBounties: number }>();
  paidReportStats.forEach((row: any) => {
    statsByResearcher.set(String(row._id), {
      paidReports: Number(row.paidReports || 0),
      totalBounties: Number(row.totalBounties || 0)
    });
  });

  const ranked = researchers
    .map((researcher: any) => {
      const stats = statsByResearcher.get(String(researcher._id)) || { paidReports: 0, totalBounties: 0 };
      return {
        userId: String(researcher._id),
        name: researcher.name || researcher.username || 'Researcher',
        username: researcher.username || '',
        reputation: Number(researcher.reputationScore || 0),
        bounties: stats.totalBounties,
        reportsSubmitted: stats.paidReports,
        country: researcher.country || 'Unknown',
        city: researcher.city || '',
        avatar: researcher.avatar || ''
      };
    })
    .sort((a, b) => {
      if (b.reputation !== a.reputation) return b.reputation - a.reputation;
      if (b.bounties !== a.bounties) return b.bounties - a.bounties;
      return b.reportsSubmitted - a.reportsSubmitted;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  res.status(200).json({
    status: 'success',
    results: ranked.length,
    data: {
      leaderboard: ranked
    }
  });
});

import Stripe from 'stripe';
import Transaction from '../models/Transaction';
import { sendEmail, payoutSuccessTemplate, otpTemplate, cardDeletionOtpTemplate } from '../services/emailService';
import redisClient from '../config/redis';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2023-10-16' as any,
});

/** Return the current authenticated user's own profile */
export const getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = await User.findById(req.user!._id).select('-password');
  if (!user) return next(new AppError('User not found', 404));
  res.status(200).json({ status: 'success', data: { user } });
});

/** Return researcher's wallet balance + bounty transaction history */
export const getWalletData = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // Get fresh wallet balance
  const user = await User.findById(req.user!._id).select('walletBalance reputationScore');
  if (!user) return next(new AppError('User not found', 404));

  // Fetch resolved reports for this researcher as transactions
  const ReportModel = (await import('../models/Report')).default;

  const resolvedReports = await ReportModel.find({
      researcherId: req.user!._id,
      status: 'Resolved',
      bounty: { $gt: 0 }
  })
  .select('title bounty updatedAt severity _id')
  .sort({ updatedAt: -1 })
  .limit(50);

  const bountyTransactions = resolvedReports.map((r: any) => ({
      id: `BNT-${String(r._id).slice(-6).toUpperCase()}`,
      date: new Date(r.updatedAt).toLocaleString(),
      desc: `Security Reward: ${r.title}`,
      amount: `+${r.bounty.toLocaleString()}`,
      status: 'CLEARED',
      timestamp: new Date(r.updatedAt).getTime(),
      reportId: r.reportId || r._id
  }));

  // Fetch real withdrawal transactions
  const withdrawalRecords = await Transaction.find({
      user: req.user!._id,
      type: 'withdrawal'
  }).sort({ createdAt: -1 }).limit(50);

  const withdrawalTransactions = withdrawalRecords.map(w => ({
      id: `WDR-${String(w._id).slice(-6).toUpperCase()}`,
      date: new Date(w.createdAt).toLocaleString(),
      desc: w.description || 'Wallet Withdrawal',
      amount: `-${w.amount.toLocaleString()}`,
      status: w.status === 'completed' ? 'CLEARED' : 'PENDING',
      timestamp: new Date(w.createdAt).getTime()
  }));

  // Merge and sort
  const transactions = [...bountyTransactions, ...withdrawalTransactions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

  res.status(200).json({
      status: 'success',
      data: {
          walletBalance: user.walletBalance,
          reputationScore: user.reputationScore,
          transactions
      }
  });
});

/** Setup Payout Method via Stripe SetupIntent */
export const setupPayoutMethod = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!._id);
    if (!user) return next(new AppError('User not found', 404));

    let customerId = user.stripeCustomerId;

    if (!customerId) {
        const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: { userId: user.id }
        });
        customerId = customer.id;
        user.stripeCustomerId = customerId;
        await user.save({ validateBeforeSave: false });
    }

    const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session'
    });

    res.status(200).json({
        status: 'success',
        clientSecret: setupIntent.client_secret
    });
});

/** List all attached payout methods for the user */
export const getPayoutMethods = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!._id);
    if (!user) return next(new AppError('User not found', 404));

    if (!user.stripeCustomerId) {
        return res.status(200).json({ status: 'success', data: { methods: [] } });
    }

    const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card'
    });

    const formattedMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: false
    }));

    res.status(200).json({
        status: 'success',
        data: { methods: formattedMethods }
    });
});

/** Request a withdrawal to a specific payment method */
export const requestPayout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { amount, paymentMethodId } = req.body;
    const withdrawAmount = Number(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
        return next(new AppError('Invalid withdrawal amount', 400));
    }

    const user = await User.findById(req.user!._id);
    if (!user) return next(new AppError('User not found', 404));

    if (user.payoutHold) {
        return next(new AppError('Withdrawals are currently on hold by admin review', 403));
    }

    if ((user.walletBalance || 0) < withdrawAmount) {
        return next(new AppError('Insufficient wallet balance', 400));
    }

    if (!paymentMethodId || !user.stripeCustomerId) {
        return next(new AppError('Valid payment method required', 400));
    }

    // Verify payment method belongs to user
    try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.customer !== user.stripeCustomerId) {
            return next(new AppError('Payment method does not belong to you', 403));
        }
    } catch (e) {
        return next(new AppError('Invalid payment method', 400));
    }

    // Deduct balance securely
    const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, walletBalance: { $gte: withdrawAmount } },
        { $inc: { walletBalance: -withdrawAmount } },
        { new: true }
    );

    if (!updatedUser) {
        return next(new AppError('Transaction failed due to insufficient funds or concurrent update', 400));
    }

    // Create withdrawal transaction
    await Transaction.create({
        user: updatedUser._id,
        type: 'withdrawal',
        amount: withdrawAmount,
        currency: 'PKR',
        status: 'completed', // Simulated success
        description: 'Withdrawal to connected card ending in ' + paymentMethodId.slice(-4),
        stripePaymentMethodId: paymentMethodId
    });

    // Send email notification
    try {
        await sendEmail(
            updatedUser.email, 
            'BugChase Wallet Withdrawal Processed', 
            payoutSuccessTemplate(updatedUser.name, withdrawAmount, updatedUser.walletBalance || 0, 'Card ending in ' + paymentMethodId.slice(-4))
        );
    } catch (err) {
        console.error('Failed to send withdrawal email:', err);
        // Do not fail the request if email fails, funds are already withdrawn
    }

    res.status(200).json({
        status: 'success',
        message: 'Withdrawal processed successfully',
        data: { newBalance: updatedUser.walletBalance }
    });
});

/** Request OTP to view/manage payment methods */
export const requestPayoutMethodOtp = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!._id);
    if (!user) return next(new AppError('User not found', 404));

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis with 10 min expiry
    await redisClient.set(`payout_otp:${user.email}`, otp, 'EX', 600);

    // Send Email
    try {
        await sendEmail(user.email, 'Payment Method Removal - BugChase', cardDeletionOtpTemplate(otp));
    } catch (error) {
        console.error('Email Send Error:', error);
        return next(new AppError('There was an error sending the email. Try again later!', 500));
    }

    res.status(200).json({
        status: 'success',
        message: 'Verification code sent to your email'
    });
});

/** Verify OTP to unlock payment method details */
export const verifyPayoutMethodOtp = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { otp } = req.body;
    if (!otp) return next(new AppError('OTP is required', 400));

    const user = await User.findById(req.user!._id);
    if (!user) return next(new AppError('User not found', 404));

    const storedOtp = await redisClient.get(`payout_otp:${user.email}`);

    if (!storedOtp || storedOtp !== otp) {
        return next(new AppError('Invalid or expired verification code', 400));
    }

    // Clear OTP upon success
    await redisClient.del(`payout_otp:${user.email}`);

    res.status(200).json({
        status: 'success',
        message: 'Identity verified successfully'
    });
});

/** Remove a payment method from Stripe */
export const removePayoutMethod = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const idParam = req.params.id;
    if (!idParam || Array.isArray(idParam)) return next(new AppError('Payment method ID is required', 400));
    const paymentMethodId = idParam;

    const user = await User.findById(req.user!._id);
    if (!user || !user.stripeCustomerId) return next(new AppError('User or customer not found', 404));

    try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.customer !== user.stripeCustomerId) {
            return next(new AppError('You do not have permission to remove this card', 403));
        }

        await stripe.paymentMethods.detach(paymentMethodId);
    } catch (error: any) {
        return next(new AppError(error.message || 'Failed to remove payment method', 400));
    }

    res.status(200).json({
        status: 'success',
        message: 'Payment method removed successfully'
    });
});


export const updateKYCStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { verified, confidence } = req.body;

    if (!verified) {
        return next(new AppError('Verification failed status cannot be processed here.', 400));
    }

    const user = await User.findById(req.user!.id);
    if (!user) return next(new AppError('User not found', 404));

    const wasVerified = user.isVerified;
    user.isVerified = true;

    if (!wasVerified) {
        user.reputationScore = (user.reputationScore || 0) + 80;
    } else {
        user.reputationScore = (user.reputationScore || 0) + 5;
    }
    
    // Add "Identity Verified" skill/badge if not present
    if (!user.skills.includes('Identity Verified')) {
        user.skills.push('Identity Verified');
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        message: 'KYC Verified Successfully',
        data: {
            reputationScore: user.reputationScore,
            isVerified: user.isVerified,
        }
    });
});

const filterObj = (obj: any, ...allowedFields: string[]) => {
    const newObj: any = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};

import { uploadToCloudinary } from '../utils/cloudinary';

// ... existing code ...

export const updateMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError('This route is not for password updates. Please use /updateMyPassword.', 400));
    }

    // 2) Filtered out unwanted field names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'companyName', 'industry', 'website', 'city', 'country', 'bio', 'linkedAccounts', 'username');

    // Sync companyName with name for company users so it applies globally (e.g. on comments)
    if (req.user && (req.user as any).role === 'company' && filteredBody.companyName) {
        filteredBody.name = filteredBody.companyName;
    }

    // 3) Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user!.id, filteredBody, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});

// Helper to check magic bytes
const isImage = (buffer: Buffer): boolean => {
    if (!buffer || buffer.length < 4) return false;
    
    // Check for JPEG (FF D8 FF)
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
    
    // Check for PNG (89 50 4E 47)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    
    return false;
};

export const uploadAvatar = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return next(new AppError('Please upload an image', 400));
    
    const result = await uploadToCloudinary(req.file);

    const updatedUser = await User.findByIdAndUpdate(req.user!.id, { avatar: result.url }, {
        new: true,
        runValidators: false // Skip validation for simple avatar update
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
            url: result.url
        }
    });
});

