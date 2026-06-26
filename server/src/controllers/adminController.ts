import { Request, Response, NextFunction } from 'express';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';
import Notification from '../models/Notification';
import User from '../models/User';
import { sendEmail, broadcastTemplate, inviteMemberTemplate, inviteSupportTemplate, programSuspendedTemplate, programBannedTemplate, userStatusChangedTemplate, adminProfileUpdateTemplate, reportEmailTemplate, adminDirectMessageTemplate } from '../services/emailService';
import { releaseExpiredProgramBans } from '../services/programModerationService';
import Program from '../models/Program';
import Transaction from '../models/Transaction';
import { getIO } from '../services/socketService';
import {
  applyResearcherReputationOnStatusTransition,
  clearReputationMilestonesForReTriage,
} from '../services/researcherReputationService';
import LoginEvent from '../models/LoginEvent';
import Dispute from '../models/Dispute';
import mongoose from 'mongoose';
import { getStripeClient } from '../utils/stripeClient';
import { getPlatformFinanceSettingsDoc } from '../models/PlatformFinanceSettings';

const TRIAGER_CLOSED_STATUSES = [
  'resolved',
  'paid',
  'closed',
  'spam',
  'duplicate',
  'out-of-scope',
  'na',
];

async function getLastActiveByUserIds(userIds: mongoose.Types.ObjectId[]) {
  if (!userIds.length) return new Map<string, Date>();
  const rows = await LoginEvent.aggregate([
    { $match: { userId: { $in: userIds }, success: true } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$userId', lastActive: { $first: '$createdAt' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.lastActive as Date]));
}

async function getTriagerReportsClosedCounts(userIds: mongoose.Types.ObjectId[]) {
  if (!userIds.length) return new Map<string, number>();
  const Report = (await import('../models/Report')).default;
  const rows = await Report.aggregate([
    { $match: { triagerId: { $in: userIds } } },
    { $addFields: { statusLower: { $toLower: '$status' } } },
    { $match: { statusLower: { $in: TRIAGER_CLOSED_STATUSES } } },
    { $group: { _id: '$triagerId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count as number]));
}

async function getSupportDisputesClosedCounts(userIds: mongoose.Types.ObjectId[]) {
  if (!userIds.length) return new Map<string, number>();
  const rows = await Dispute.aggregate([
    { $match: { 'resolution.resolvedBy': { $in: userIds } } },
    { $group: { _id: '$resolution.resolvedBy', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count as number]));
}

function mapStaffRosterRow(
  user: { _id: mongoose.Types.ObjectId; name: string; email: string; expertise?: string[]; status?: string; avatar?: string; role: string },
  lastActive: Date | undefined,
  closedCount: number,
  closedLabel: 'reportsClosed' | 'disputesClosed',
) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    expertise: user.expertise || [],
    status: user.status,
    avatar: user.avatar,
    role: user.role,
    lastActive: lastActive ? lastActive.toISOString() : null,
    reportsProcessed: closedCount,
    [closedLabel]: closedCount,
  };
}

const toDisplay = (v: any) => {
    if (v === undefined || v === null || v === '') return '-';
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
};

const notifyAdminChange = async (user: any, section: string, details: string, changes: Array<{ field: string; before: string; after: string }> = []) => {
    if (user.email) {
        try {
            await sendEmail(
                user.email,
                'Admin updated your BugChase profile',
                adminProfileUpdateTemplate(user.name, section, changes.length ? changes : [{ field: section, before: '-', after: details }])
            );
        } catch (error) {
            console.error('Failed to send admin change notification email', error);
        }
    }
};

export const createTriager = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, tempPassword, expertise, technicalInterviewPassed, identityVerified } = req.body;

    // 1. Basic validation
    if (!name || !email || !tempPassword) {
        return next(new AppError('Please provide name, email and temporary password', 400));
    }

    if (!technicalInterviewPassed || !identityVerified) {
        return next(new AppError('Triager must pass technical interview and identity verification', 400));
    }

    // 2. Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(new AppError('Email already in use', 400));
    }

    // 3. Create User with 'triager' role
    // Make sure to parse expertise if it comes as string, though frontend sends array
    const newTriager = await User.create({
        name,
        email,
        password: tempPassword,
        role: 'triager',
        username: email.split('@')[0] + Math.floor(Math.random() * 1000), // temp username
        expertise: expertise || [],
        isVerified: identityVerified, // Since admin verified them
        isEmailVerified: true // Admin created, so we trust it or they verify on first login? Let's say yes for now.
    });

    // 4. Send Invitation Email
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
    const emailHtml = inviteMemberTemplate(newTriager.name, newTriager.email, newTriager.username, tempPassword, loginUrl, newTriager.expertise);
    
    try {
        await sendEmail(newTriager.email, 'Welcome to BugChase Triager Team', emailHtml);
    } catch (error) {
        console.error('Failed to send triager invite email', error);
        // Don't fail the request, just log it. Admin can regenerate or tell them manually.
    }

    res.status(201).json({
        status: 'success',
        data: {
            user: newTriager
        }
    });
});

export const getTriagers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const triagers = await User.find({ role: 'triager' }).select('name email expertise status avatar role _id');
    const ids = triagers.map((t) => t._id);

    const [lastActiveMap, closedMap] = await Promise.all([
        getLastActiveByUserIds(ids),
        getTriagerReportsClosedCounts(ids),
    ]);

    const enriched = triagers.map((triager) =>
        mapStaffRosterRow(
            triager,
            lastActiveMap.get(String(triager._id)),
            closedMap.get(String(triager._id)) ?? 0,
            'reportsClosed',
        ),
    );

    res.status(200).json({
        status: 'success',
        results: enriched.length,
        data: {
            triagers: enriched,
        },
    });
});

export const createSupport = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, tempPassword, expertise, trainingCompleted, identityVerified } = req.body;

    // 1. Basic validation
    if (!name || !email || !tempPassword) {
        return next(new AppError('Please provide name, email and temporary password', 400));
    }

    if (!trainingCompleted || !identityVerified) {
        return next(new AppError('Support member must complete onboarding training and identity verification', 400));
    }

    // 2. Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(new AppError('Email already in use', 400));
    }

    // 3. Create User with 'support' role. We reuse the existing `expertise`
    // field to store the member's support specialization areas.
    const newSupport = await User.create({
        name,
        email,
        password: tempPassword,
        role: 'support',
        username: email.split('@')[0] + Math.floor(Math.random() * 1000), // temp username
        expertise: expertise || [],
        isVerified: identityVerified,
        isEmailVerified: true,
    });

    // 4. Send Invitation Email with login credentials
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
    const emailHtml = inviteSupportTemplate(
        newSupport.name,
        newSupport.email,
        newSupport.username,
        tempPassword,
        loginUrl,
        newSupport.expertise || [],
    );

    try {
        await sendEmail(newSupport.email, 'Welcome to the BugChase Support Team', emailHtml);
    } catch (error) {
        console.error('Failed to send support invite email', error);
        // Don't fail the request; admin can resend or share credentials manually.
    }

    res.status(201).json({
        status: 'success',
        data: {
            user: newSupport,
        },
    });
});

export const getSupport = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const support = await User.find({ role: 'support' }).select('name email expertise status avatar role _id');
    const ids = support.map((m) => m._id);

    const [lastActiveMap, closedMap] = await Promise.all([
        getLastActiveByUserIds(ids),
        getSupportDisputesClosedCounts(ids),
    ]);

    const enriched = support.map((member) =>
        mapStaffRosterRow(
            member,
            lastActiveMap.get(String(member._id)),
            closedMap.get(String(member._id)) ?? 0,
            'disputesClosed',
        ),
    );

    res.status(200).json({
        status: 'success',
        results: enriched.length,
        data: {
            support: enriched,
        },
    });
});

export const broadcastAnnouncement = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { message, audiences } = req.body;

    if (!message) {
        return next(new AppError('Message is required', 400));
    }

    const allowedAudiences = ['researcher', 'company', 'triager'] as const;
    const requestedAudiences = Array.isArray(audiences) ? audiences : [];

    if (!requestedAudiences.length) {
        return next(new AppError('There must be an audience to broadcast', 400));
    }

    const hasAll = requestedAudiences.includes('all');
    const selectedAudiences = hasAll
        ? [...allowedAudiences]
        : requestedAudiences.filter((aud: string) => allowedAudiences.includes(aud as any));

    if (!selectedAudiences.length) {
        return next(new AppError('There must be an audience to broadcast', 400));
    }

    // 1. Get audience-filtered users (id and email)
    const users = await User.find({ role: { $in: selectedAudiences } }, '_id email role');

    if (!users.length) {
        return next(new AppError('No users found for selected audience', 404));
    }

    // 2. Send rich email notifications; only fallback to plain in-app when email is missing.
    const fallbackNotifications = [];
    const emailPromises = [];

    for (const user of users) {
        if (user.email) {
            // Note: In production, use a queue like BullMQ or batching. 
            // For now, simple parallel promises.
            emailPromises.push(
                sendEmail(user.email, 'Platform Announcement - BugChase', broadcastTemplate(message))
                .then(() => console.log(`Email sent to ${user.email}`))
                .catch(err => console.error(`Failed to email ${user.email}:`, err.message))
            );
        } else {
            fallbackNotifications.push({
                recipient: user._id,
                title: 'Platform Announcement',
                message: message,
                type: 'announcement',
                read: false
            });
        }
    }

    // 3. Bulk insert fallback notifications only for users without email.
    if (fallbackNotifications.length > 0) {
        await Notification.insertMany(fallbackNotifications);
    }

    // 4. Wait for emails (fail-safe: don't block response too long, or do? 
    // Usually, we respond first or process async. 
    // But user wants to KNOW it happened. Let's await for now for demo purposes.)
    // However, if SMTP is slow, this will time out. 
    // Let's await but suppress errors so it doesn't fail the request if one email fails.
    await Promise.allSettled(emailPromises);

    res.status(200).json({
        status: 'success',
        message: `Broadcast sent to ${users.length} users (Notification + Email).`,
        data: {
            audiences: selectedAudiences,
            recipients: users.length
        }
    });
});

export const getDashboardAnalytics = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const [users, reports] = await Promise.all([
        User.find({ role: { $ne: 'admin' } })
            .select('name role createdAt walletBalance companyName')
            .sort({ createdAt: -1 }),
        (await import('../models/Report')).default.find({})
            .select('severity status bounty createdAt')
            .sort({ createdAt: -1 })
    ]);

    const totalResearchers = users.filter(u => u.role === 'researcher').length;
    const totalCompanies = users.filter(u => u.role === 'company').length;
    const totalTriagers = users.filter(u => u.role === 'triager').length;

    const severityCounts = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        None: 0
    };

    const statusCounts: Record<string, number> = {};
    let totalBountiesPaid = 0;

    reports.forEach((report: any) => {
        if (severityCounts[report.severity as keyof typeof severityCounts] !== undefined) {
            severityCounts[report.severity as keyof typeof severityCounts] += 1;
        }
        statusCounts[report.status] = (statusCounts[report.status] || 0) + 1;
        if (report.bounty && report.bounty > 0) {
            totalBountiesPaid += report.bounty;
        }
    });

    const lowBalanceCompanies = users
        .filter(u => u.role === 'company')
        .map((u: any) => ({
            id: u._id,
            name: u.companyName || u.name,
            balance: u.walletBalance || 0
        }))
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 5);

    const recentUsers = users.slice(0, 8).map((u: any) => ({
        id: u._id,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt
    }));

    const roleDistribution = [
        { name: 'Researchers', value: totalResearchers },
        { name: 'Companies', value: totalCompanies },
        { name: 'Triagers', value: totalTriagers }
    ];

    const severityDistribution = [
        { name: 'Critical', value: severityCounts.Critical },
        { name: 'High', value: severityCounts.High },
        { name: 'Medium', value: severityCounts.Medium },
        { name: 'Low', value: severityCounts.Low },
        { name: 'None', value: severityCounts.None }
    ];

    const reportStatusDistribution = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    res.status(200).json({
        status: 'success',
        data: {
            stats: {
                totalUsers: users.length,
                totalReports: reports.length,
                totalBountiesPaid,
                criticalVulns: severityCounts.Critical
            },
            charts: {
                roleDistribution,
                severityDistribution,
                reportStatusDistribution
            },
            lowBalanceCompanies,
            recentUsers
        }
    });
});

export const getFinanceAnalytics = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfSixMonthWindow = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const companies = await User.find({ role: 'company' })
        .select('_id name email companyName walletBalance walletTotalFunded status')
        .sort({ companyName: 1 });

    const companyIds = companies.map((company: any) => company._id);

    const [programs, recentTransactions, ytdTransactions, fundingTotals] = await Promise.all([
        Program.find({ companyId: { $in: companyIds } }).select('companyId status'),
        Transaction.find({
            user: { $in: companyIds },
            createdAt: { $gte: startOfSixMonthWindow }
        }).select('user type amount status createdAt'),
        Transaction.find({
            user: { $in: companyIds },
            createdAt: { $gte: startOfYear }
        }).select('type amount status'),
        Transaction.aggregate([
            {
                $match: {
                    user: { $in: companyIds },
                    type: { $in: ['topup', 'admin_credit'] },
                    status: 'completed',
                },
            },
            { $group: { _id: '$user', total: { $sum: '$amount' } } },
        ]),
    ]);

    const fundedFromTransactions = new Map<string, number>(
        fundingTotals.map((row: { _id: mongoose.Types.ObjectId; total: number }) => [
            String(row._id),
            Number(row.total || 0),
        ]),
    );

    const monthSeries = Array.from({ length: 6 }).map((_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        return {
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            month: date.toLocaleString('en-US', { month: 'short' }),
            revenue: 0,
            payouts: 0
        };
    });
    const monthMap = new Map(monthSeries.map((row) => [row.key, row]));

    const breakdownTotals: Record<string, number> = {
        topup: 0,
        admin_credit: 0,
        platform_fee: 0,
        bounty_payment: 0,
        withdrawal: 0
    };

    const pendingByCompany = new Map<string, number>(companyIds.map((id: any) => [String(id), 0]));

    for (const tx of recentTransactions as any[]) {
        const d = new Date(tx.createdAt);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthRow = monthMap.get(monthKey);
        if (!monthRow) continue;

        const amount = Number(tx.amount || 0);
        if (tx.status === 'completed') {
            if (tx.type === 'topup' || tx.type === 'admin_credit' || tx.type === 'platform_fee') {
                monthRow.revenue += Math.abs(amount);
            } else if (tx.type === 'bounty_payment' || tx.type === 'withdrawal') {
                monthRow.payouts += Math.abs(amount);
            }
        }

        if (tx.status === 'pending' && (tx.type === 'bounty_payment' || tx.type === 'withdrawal')) {
            const key = String(tx.user);
            pendingByCompany.set(key, (pendingByCompany.get(key) || 0) + Math.abs(amount));
        }
    }

    for (const tx of ytdTransactions as any[]) {
        if (tx.status !== 'completed') continue;
        const amount = Math.abs(Number(tx.amount || 0));
        if (Object.prototype.hasOwnProperty.call(breakdownTotals, tx.type)) {
            breakdownTotals[tx.type] += amount;
        }
    }

    const totalLiquidity = companies.reduce((sum: number, c: any) => sum + Number(c.walletBalance || 0), 0);
    const totalRevenueYtd = breakdownTotals.topup + breakdownTotals.admin_credit + breakdownTotals.platform_fee;
    const pendingPayouts = Array.from(pendingByCompany.values()).reduce((sum, value) => sum + value, 0);

    const currentMonthRevenue = monthSeries[5]?.revenue || 0;
    const previousMonthRevenue = monthSeries[4]?.revenue || 0;
    const monthlyGrowth =
        previousMonthRevenue > 0
            ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
            : currentMonthRevenue > 0
                ? 100
                : 0;

    const activeProgramCountByCompany = new Map<string, number>(companyIds.map((id: any) => [String(id), 0]));
    for (const program of programs as any[]) {
        const key = String(program.companyId);
        if ((program.status || '').toLowerCase() === 'active') {
            activeProgramCountByCompany.set(key, (activeProgramCountByCompany.get(key) || 0) + 1);
        }
    }

    const LOW_BALANCE_THRESHOLD = 100000;
    const companyAccounts = companies.map((company: any) => {
        const id = String(company._id);
        const trackedFunded = Number(company.walletTotalFunded || 0);
        const historicalFunded = fundedFromTransactions.get(id) || 0;
        return {
            id,
            name: company.companyName || company.name,
            email: company.email,
            status: company.status || 'Active',
            balance: Number(company.walletBalance || 0),
            totalFunded: Math.max(trackedFunded, historicalFunded),
            activePrograms: activeProgramCountByCompany.get(id) || 0,
            pendingPayouts: pendingByCompany.get(id) || 0,
        };
    });

    const lowBalanceCompanies = companyAccounts
        .filter((company) => company.balance < LOW_BALANCE_THRESHOLD)
        .slice(0, 12);

    const revenueBreakdown = [
        { name: 'Topups', value: breakdownTotals.topup },
        { name: 'Admin Credits', value: breakdownTotals.admin_credit },
        { name: 'Platform Fees', value: breakdownTotals.platform_fee },
        { name: 'Bounty Payouts', value: breakdownTotals.bounty_payment },
        { name: 'Withdrawals', value: breakdownTotals.withdrawal }
    ];

    res.status(200).json({
        status: 'success',
        data: {
            stats: {
                totalLiquidity,
                monthlyGrowth: Number(monthlyGrowth.toFixed(2)),
                pendingPayouts,
                totalRevenueYtd,
                totalPlatformFeesYtd: breakdownTotals.platform_fee,
                totalCompanyFundingYtd: breakdownTotals.topup + breakdownTotals.admin_credit,
            },
            charts: {
                monthlyRevenue: monthSeries,
                revenueBreakdown
            },
            companyAccounts,
            lowBalanceCompanies
        }
    });
});

/** POST /api/admin/finance/companies/:companyId/credit — manually add funds to a company wallet. */
export const creditCompanyWallet = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { companyId } = req.params;
    const amount = Number(req.body?.amount);
    const note = String(req.body?.note || '').trim();

    if (!amount || Number.isNaN(amount) || amount <= 0) {
        return next(new AppError('A positive credit amount is required', 400));
    }

    const company = await User.findOne({ _id: companyId, role: 'company' });
    if (!company) return next(new AppError('Company account not found', 404));

    const adminName = req.user?.name || 'Admin';
    const description =
        note || `Manual wallet credit by ${adminName}`;

    const updatedCompany = await User.findByIdAndUpdate(
        companyId,
        { $inc: { walletBalance: amount, walletTotalFunded: amount } },
        { new: true },
    ).select('name email companyName walletBalance walletTotalFunded status');

    const transaction = await Transaction.create({
        user: company._id,
        type: 'admin_credit',
        amount,
        currency: 'PKR',
        status: 'completed',
        description,
    });

    res.status(200).json({
        status: 'success',
        data: {
            company: {
                id: String(updatedCompany!._id),
                name: updatedCompany!.companyName || updatedCompany!.name,
                email: updatedCompany!.email,
                balance: updatedCompany!.walletBalance,
                totalFunded: updatedCompany!.walletTotalFunded,
                status: updatedCompany!.status,
            },
            transaction,
        },
    });
});

const getOrCreatePlatformStripeCustomer = async () => {
    const stripe = getStripeClient('2026-04-22.dahlia');
    const settings = await getPlatformFinanceSettingsDoc();

    if (settings.stripeCustomerId) {
        return { stripe, customerId: settings.stripeCustomerId, settings };
    }

    const customer = await stripe.customers.create({
        name: settings.accountLabel || 'BugChase Platform Treasury',
        metadata: { type: 'platform_treasury' },
    });

    settings.stripeCustomerId = customer.id;
    await settings.save();

    return { stripe, customerId: customer.id, settings };
};

const syncPlatformLinkFromStripe = async () => {
    const { stripe, customerId, settings } = await getOrCreatePlatformStripeCustomer();
    const paymentMethods = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
    const primary = paymentMethods.data[0];

    if (primary?.card) {
        settings.provider = 'stripe';
        settings.isLinked = true;
        settings.accountLast4 = primary.card.last4 || '';
        settings.accountHolder = settings.accountHolder || settings.accountLabel;
        await settings.save();
    } else if (!settings.bankName) {
        settings.isLinked = false;
        await settings.save();
    }

    return { settings, paymentMethods: paymentMethods.data };
};

/** GET /api/admin/finance/platform-settings */
export const getPlatformFinanceSettings = catchAsync(async (_req: Request, res: Response) => {
    const Transaction = (await import('../models/Transaction')).default;

    const { settings } = await syncPlatformLinkFromStripe();

    const feeAggregate = await Transaction.aggregate([
        { $match: { type: 'platform_fee', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const feesFromLedger = Number(feeAggregate[0]?.total || 0);
    const treasuryBalance = Math.max(Number(settings.treasuryBalance || 0), feesFromLedger);

    res.status(200).json({
        status: 'success',
        data: {
            settings: {
                accountLabel: settings.accountLabel,
                provider: settings.provider,
                accountLast4: settings.accountLast4 || '',
                platformFeePercent: settings.platformFeePercent,
                treasuryBalance,
                isLinked: settings.isLinked,
                notes: settings.notes || '',
                updatedAt: settings.updatedAt,
            },
        },
    });
});

/** PUT /api/admin/finance/platform-settings */
export const updatePlatformFinanceSettings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const PlatformFinanceSettings = (await import('../models/PlatformFinanceSettings')).default;
    const { notes, platformFeePercent } = req.body;

    const update: Record<string, unknown> = { updatedBy: req.user!._id };
    if (notes !== undefined) update.notes = String(notes).trim();

    if (platformFeePercent !== undefined) {
        const feePercent = Number(platformFeePercent);
        if (Number.isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
            return next(new AppError('Platform fee must be between 0 and 100', 400));
        }
        update.platformFeePercent = feePercent;
    }

    const settings = await PlatformFinanceSettings.findOneAndUpdate({}, update, { new: true, upsert: true });

    res.status(200).json({
        status: 'success',
        data: {
            settings: {
                accountLabel: settings!.accountLabel,
                provider: settings!.provider,
                accountLast4: settings!.accountLast4 || '',
                platformFeePercent: settings!.platformFeePercent,
                treasuryBalance: settings!.treasuryBalance,
                isLinked: settings!.isLinked,
                notes: settings!.notes || '',
                updatedAt: settings!.updatedAt,
            },
        },
    });
});

/** POST /api/admin/finance/platform/setup-intent */
export const createPlatformSetupIntent = catchAsync(async (_req: Request, res: Response) => {
    const { stripe, customerId } = await getOrCreatePlatformStripeCustomer();

    const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        metadata: { type: 'platform_treasury' },
        payment_method_types: ['card'],
    });

    res.status(200).json({
        status: 'success',
        clientSecret: setupIntent.client_secret,
    });
});

/** GET /api/admin/finance/platform/payment-methods */
export const getPlatformPaymentMethods = catchAsync(async (_req: Request, res: Response) => {
    const { paymentMethods } = await syncPlatformLinkFromStripe();

    res.status(200).json({
        status: 'success',
        data: {
            paymentMethods: paymentMethods.map((pm) => ({
                id: pm.id,
                brand: pm.card?.brand || 'card',
                last4: pm.card?.last4 || '????',
                expMonth: pm.card?.exp_month,
                expYear: pm.card?.exp_year,
            })),
        },
    });
});

/** DELETE /api/admin/finance/platform/payment-methods/:paymentMethodId */
export const detachPlatformPaymentMethod = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const paymentMethodId = String(req.params.paymentMethodId || '');
    if (!paymentMethodId) return next(new AppError('Payment method ID is required', 400));

    const { stripe, customerId } = await getOrCreatePlatformStripeCustomer();
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) {
        return next(new AppError('You do not have permission to remove this card', 403));
    }

    await stripe.paymentMethods.detach(paymentMethodId);
    await syncPlatformLinkFromStripe();

    res.status(200).json({
        status: 'success',
        message: 'Payment method removed successfully',
    });
});

/** GET /api/admin/finance/platform/transactions */
export const getPlatformTreasuryTransactions = catchAsync(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '25'), 10) || 25));
    const skip = (page - 1) * limit;
    const direction = String(req.query.direction || 'all');

    const match: Record<string, unknown> = { status: 'completed' };
    if (direction === 'in') {
        match.type = { $in: ['topup', 'admin_credit'] };
    } else if (direction === 'out') {
        match.type = 'bounty_payment';
    } else if (direction !== 'revenue') {
        match.type = { $in: ['topup', 'admin_credit', 'bounty_payment'] };
    }

    if (direction === 'revenue') {
        const [feeRows, total] = await Promise.all([
            Transaction.find({ type: 'platform_fee', status: 'completed' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'companyName name email')
                .populate({
                    path: 'relatedReport',
                    select: 'reportId title bounty',
                    populate: { path: 'researcherId', select: 'username name' },
                }),
            Transaction.countDocuments({ type: 'platform_fee', status: 'completed' }),
        ]);

        const revenue = feeRows.map((tx: any) => {
            const companyName = tx.user?.companyName || tx.user?.name || 'Unknown company';
            const bountyAmount = Number(tx.relatedReport?.bounty || 0);
            const feeAmount = Math.abs(Number(tx.amount || 0));
            const researcher =
                tx.relatedReport?.researcherId?.username ||
                tx.relatedReport?.researcherId?.name ||
                null;

            return {
                id: String(tx._id),
                date: tx.createdAt,
                company: companyName,
                reportId: tx.relatedReport?.reportId || null,
                bountyAmount,
                platformRevenue: feeAmount,
                researcherId: researcher,
                status: tx.status,
            };
        });

        return res.status(200).json({
            status: 'success',
            data: {
                revenue,
                total,
                page,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    }

    const [transactions, total] = await Promise.all([
        Transaction.find(match)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'companyName name email')
            .populate({
                path: 'relatedReport',
                select: 'reportId title bounty',
                populate: { path: 'researcherId', select: 'username name' },
            }),
        Transaction.countDocuments(match),
    ]);

    const formatted = transactions.map((tx: any) => {
        const isIncoming = tx.type === 'topup' || tx.type === 'admin_credit';
        const reportTitle = tx.relatedReport?.title;
        const companyName = tx.user?.companyName || tx.user?.name || 'Unknown company';
        const rawAmount = Math.abs(Number(tx.amount || 0));
        const researcher =
            tx.relatedReport?.researcherId?.username ||
            tx.relatedReport?.researcherId?.name ||
            null;

        let description = tx.description || '';
        if (!description) {
            if (tx.type === 'topup') description = 'Company wallet top-up';
            else if (tx.type === 'admin_credit') description = 'Admin wallet credit';
            else if (tx.type === 'bounty_payment') {
                const bounty = Number(tx.relatedReport?.bounty || 0);
                description = reportTitle
                    ? `Bounty payout — ${reportTitle}`
                    : `Bounty payout (PKR ${bounty.toLocaleString()})`;
            }
        }

        return {
            id: String(tx._id),
            date: tx.createdAt,
            type: tx.type,
            direction: isIncoming ? 'in' : 'out',
            amount: rawAmount,
            description,
            company: companyName,
            reportId: tx.relatedReport?.reportId || null,
            bountyAmount: tx.type === 'bounty_payment' ? Number(tx.relatedReport?.bounty || 0) : null,
            researcherId: researcher,
            status: tx.status,
        };
    });

    res.status(200).json({
        status: 'success',
        data: {
            transactions: formatted,
            total,
            page,
            totalPages: Math.ceil(total / limit) || 1,
        },
    });
});

/** GET /api/admin/finance/companies/:companyId */
export const getCompanyFinanceDetail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { companyId } = req.params;
    const Report = (await import('../models/Report')).default;
    const Program = (await import('../models/Program')).default;

    const company = await User.findOne({ _id: companyId, role: 'company' }).select(
        'name email companyName walletBalance walletTotalFunded status createdAt',
    );
    if (!company) return next(new AppError('Company not found', 404));

    const programs = await Program.find({ companyId: company._id }).select('_id title type status');
    const programIds = programs.map((p) => p._id.toString());

    const [fundingAgg, feeAgg, bountyReports] = await Promise.all([
        Transaction.aggregate([
            {
                $match: {
                    user: company._id,
                    type: { $in: ['topup', 'admin_credit'] },
                    status: 'completed',
                },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
            {
                $match: {
                    user: company._id,
                    type: 'platform_fee',
                    status: 'completed',
                },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Report.find({ programId: { $in: programIds }, bounty: { $gt: 0 } })
            .sort({ updatedAt: -1 })
            .limit(100)
            .select('reportId title bounty status severity createdAt updatedAt programId researcherId')
            .populate('researcherId', 'username name'),
    ]);

    const historicalFunded = Number(fundingAgg[0]?.total || 0);
    const platformRevenue = Number(feeAgg[0]?.total || 0);
    const totalBountiesPaid = bountyReports.reduce((sum, r) => sum + Number(r.bounty || 0), 0);

    const PlatformFinanceSettings = (await import('../models/PlatformFinanceSettings')).default;
    const settings = await PlatformFinanceSettings.findOne();
    const feeRate = (settings?.platformFeePercent ?? 5) / 100;

    const bountyPayments = bountyReports.map((report: any) => {
        const bounty = Number(report.bounty || 0);
        const fee = bounty * feeRate;
        const prog = programs.find((p) => p._id.toString() === String(report.programId));
        return {
            id: String(report._id),
            reportId: report.reportId || String(report._id),
            title: report.title,
            bounty: Number(report.bounty || 0),
            platformFee: fee,
            totalCharged: Number(report.bounty || 0) + fee,
            status: report.status,
            severity: report.severity,
            program: prog?.title || 'Unknown program',
            researcher:
                report.researcherId?.username || report.researcherId?.name || 'Unknown',
            paidAt: report.updatedAt || report.createdAt,
        };
    });

    res.status(200).json({
        status: 'success',
        data: {
            company: {
                id: String(company._id),
                name: company.companyName || company.name,
                email: company.email,
                status: company.status || 'Active',
                balance: Number(company.walletBalance || 0),
                totalFunded: Math.max(Number(company.walletTotalFunded || 0), historicalFunded),
                platformRevenue,
                totalBountiesPaid,
                activePrograms: programs.filter((p) => (p.status || '').toLowerCase() === 'active').length,
                memberSince: company.createdAt,
            },
            bountyPayments,
        },
    });
});

export const sendUserEmailByAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!subject) return next(new AppError('Email subject is required', 400));
    if (!message) return next(new AppError('Email message is required', 400));

    const user = await User.findById(id).select('name email');
    if (!user) return next(new AppError('No user found with that ID', 404));
    if (!user.email) return next(new AppError('User does not have an email address', 400));

    const html = adminDirectMessageTemplate(user.name || 'there', subject, message);

    await sendEmail(user.email, subject, html);

    res.status(200).json({
        status: 'success',
        message: 'Email sent successfully',
    });
});

export const getAllUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const users = await User.find({ role: { $ne: 'admin' } });

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
});

export const deleteUserByAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const user = await User.findById(id).select('_id role name email');
    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }

    const Report = (await import('../models/Report')).default;

    // Remove records directly tied to the user.
    await Promise.all([
        Notification.deleteMany({ recipient: user._id }),
        Transaction.deleteMany({ user: user._id }),
        Report.deleteMany({ $or: [{ researcherId: user._id }, { triagerId: user._id }] })
    ]);

    // If company is deleted, remove their programs + associated reports.
    if (user.role === 'company') {
        const programs = await Program.find({ companyId: user._id }).select('_id');
        const programIds = programs.map((p: any) => String(p._id));
        if (programIds.length) {
            await Report.deleteMany({ programId: { $in: programIds } });
        }
        await Program.deleteMany({ companyId: user._id });
        await User.deleteMany({ parentCompany: user._id });
    }

    await User.findByIdAndDelete(user._id);

    res.status(200).json({
        status: 'success',
        message: 'User deleted successfully'
    });
});

export const updateUserStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['Active', 'Suspended', 'Banned'].includes(status)) {
        return next(new AppError('Invalid status', 400));
    }

    const updateData: any = { status };
    // Only save reason if suspended or banned
    if ((status === 'Suspended' || status === 'Banned') && reason) {
        updateData.statusReason = reason;
    } else if (status === 'Active') {
        // Clear reason if reactivated
        updateData.statusReason = undefined; 
        // Note: MongoDB $unset would be cleaner, but Mongoose string undefined might not unset.
        // Let's rely on overwriting or leaving it. User didn't ask to clear it explicitly but it's good practice.
        // Actually, let's keep it simple: 
        // If Active, we don't necessarily need to clear it, but typically we do.
        // Let's use $unset if we were using raw mongo, but with mongoose findByIdAndUpdate, setting to null/undefined might work if schema allows.
        // For now, let's just update fields.
    }

    // Use $unset if Active? No, let's just update.
    const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }

    if ((status === 'Suspended' || status === 'Banned') && user.role === 'company') {
        await Program.updateMany({ companyId: user._id }, { status: 'Suspended', suspensionReason: `Company ${status.toLowerCase()} by admin` });
    }

    // Notifications & Email
    const notifTitle = `Account ${status}`;
    let notifMsg = `Your account has been set to ${status}.`;
    
    if (reason) {
        notifMsg += ` Reason: ${reason}`;
    }

    // Send managed-account email for suspend/ban/activate actions
    if (user.email) {
        const emailHtml = userStatusChangedTemplate(user.name, status, reason);
        const subject = status === 'Active' ? 'Account Reactivated - BugChase' : `URGENT: Account ${status} - BugChase`;
        try {
            await sendEmail(user.email, subject, emailHtml);
        } catch (error) {
            console.error(`Failed to send ${status} email to user`, error);
        }
    }

    await notifyAdminChange(user, 'Account Status', `Status changed to ${status}${reason ? ` (${reason})` : ''}`);

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

export const getUserDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const Report = (await import('../models/Report')).default;

    const user = await User.findById(id).select('-password');
    if (!user) return next(new AppError('No user found with that ID', 404));

    const programPopulateSelect = 'title type status companyName bountyRange createdAt description isPrivate companyId';

    const [submittedReportsRaw, triagedReportsRaw, programs, transactions] = await Promise.all([
        Report.find({ researcherId: id }).sort({ createdAt: -1 }).limit(200).select('title severity status bounty createdAt programId').populate('researcherId', 'username name').populate('programId', programPopulateSelect),
        Report.find({ triagerId: id }).sort({ createdAt: -1 }).limit(200).select('title severity status bounty createdAt programId').populate('researcherId', 'username name').populate('programId', programPopulateSelect),
        Program.find({ companyId: id }).sort({ createdAt: -1 }).select('title type status createdAt companyName bountyRange isPrivate'),
        Transaction.find({ user: id }).sort({ createdAt: -1 }).limit(100).select('type amount status description createdAt relatedReport')
    ]);

    const mapReportRow = (r: any) => {
        const prog = r.programId && typeof r.programId === 'object' ? r.programId : null;
        const programIdStr = prog?._id?.toString() || (r.programId && typeof r.programId !== 'object' ? String(r.programId) : '');
        return {
            id: r._id,
            reportId: r.reportId || String(r._id),
            title: r.title,
            severity: (r.severity || 'Low').toLowerCase(),
            status: (r.status || 'Submitted').toLowerCase(),
            submittedAt: r.createdAt,
            bounty: r.bounty || 0,
            programId: programIdStr || 'unknown',
            program: prog
                ? {
                      _id: prog._id,
                      title: prog.title,
                      type: prog.type,
                      status: prog.status,
                      companyName: prog.companyName,
                      bountyRange: prog.bountyRange,
                      createdAt: prog.createdAt,
                      description: prog.description,
                      isPrivate: prog.isPrivate,
                  }
                : null,
            researcher: r.researcherId?.username || r.researcherId?.name || 'Unknown',
        };
    };

    const submittedReports = submittedReportsRaw.map(mapReportRow);
    const triagedReports = triagedReportsRaw.map(mapReportRow);

    /** Terminal triage outcomes → history; everything else → active queue (status is lowercased in mapReportRow). */
    const triagerPastStatuses = new Set([
        'resolved',
        'paid',
        'closed',
        'spam',
        'duplicate',
        'out-of-scope',
        'na',
    ]);
    const triagerPastReports = triagedReports.filter((r) => triagerPastStatuses.has(r.status));
    const triagerActiveReports = triagedReports.filter((r) => !triagerPastStatuses.has(r.status));

    const walletTransactions = transactions.map((tx: any) => ({
        id: tx._id,
        date: new Date(tx.createdAt).toLocaleString(),
        desc: tx.description || tx.type,
        amount: `${tx.amount >= 0 ? '+' : ''}${Number(tx.amount).toLocaleString()}`,
        status: tx.status === 'completed' ? 'CLEARED' : tx.status.toUpperCase(),
        timestamp: new Date(tx.createdAt).getTime(),
        type: tx.type,
        rawAmount: tx.amount,
    }));

    res.status(200).json({
        status: 'success',
        data: {
            user,
            reports: {
                submitted: submittedReports,
                triaged: triagedReports,
                triagerActive: triagerActiveReports,
                triagerPast: triagerPastReports,
            },
            programs,
            wallet: {
                balance: user.walletBalance || 0,
                payoutHold: user.payoutHold || false,
                transactions: walletTransactions
            }
        }
    });
});

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const checkUsernameAvailability = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const username = String(req.query.username || '').trim();
    const excludeId = String(req.query.excludeId || '').trim();
    if (!username) {
        return next(new AppError('username query is required', 400));
    }

    const existing = await User.findOne({
        username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') },
        ...(excludeId ? { _id: { $ne: excludeId } } : {})
    }).select('_id');

    res.status(200).json({
        status: 'success',
        data: { available: !existing }
    });
});

export const updateUserDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const updates = req.body || {};
    const allowedFields = [
        'name', 'username', 'email', 'country', 'bio', 'companyName', 'industry', 'website', 'city',
        'isVerified', 'isEmailVerified', 'walletBalance', 'reputationScore', 'status',
        'statusReason', 'skills', 'expertise', 'verifiedAssets', 'payoutHold', 'isPrivate',
        'severityPreferences', 'maxConcurrentReports', 'isAvailable', 'linkedAccounts',
    ];

    const safeUpdates: Record<string, any> = {};
    allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
            safeUpdates[field] = updates[field];
        }
    });

    if (!Object.keys(safeUpdates).length) {
        return next(new AppError('No valid fields provided for update', 400));
    }

    const existingUser = await User.findById(id).select('-password');
    if (!existingUser) return next(new AppError('No user found with that ID', 404));

    if (safeUpdates.username) {
        const uname = String(safeUpdates.username).trim();
        const usernameExists = await User.findOne({
            _id: { $ne: id },
            username: { $regex: new RegExp(`^${escapeRegex(uname)}$`, 'i') }
        }).select('_id');
        if (usernameExists) {
            return next(new AppError('This username already exists in the system', 400));
        }
    }

    const user = await User.findByIdAndUpdate(id, safeUpdates, { new: true, runValidators: true }).select('-password');
    if (!user) return next(new AppError('No user found with that ID', 404));

    if ((safeUpdates.status === 'Suspended' || safeUpdates.status === 'Banned') && user.role === 'company') {
        await Program.updateMany({ companyId: user._id }, { status: 'Suspended', suspensionReason: `Company ${String(safeUpdates.status).toLowerCase()} by admin` });
    }

    const changeDetails = Object.keys(safeUpdates).map((field) => ({
        field,
        before: toDisplay((existingUser as any)[field]),
        after: toDisplay((user as any)[field])
    }));

    await notifyAdminChange(
        user,
        'Profile Details',
        `Updated fields: ${Object.keys(safeUpdates).join(', ')}`,
        changeDetails
    );

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

export const adjustUserPoints = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { reputationDelta = 0 } = req.body;

    const rep = Number(reputationDelta);
    if (Number.isNaN(rep)) {
        return next(new AppError('Invalid points delta', 400));
    }

    const user = await User.findByIdAndUpdate(
        id,
        { $inc: { reputationScore: rep } },
        { new: true }
    ).select('-password');

    if (!user) return next(new AppError('No user found with that ID', 404));

    await notifyAdminChange(
        user,
        'Points Adjustment',
        `Reputation ${rep >= 0 ? '+' : ''}${rep}`,
        [
            { field: 'reputationScore', before: 'Adjusted', after: `${rep >= 0 ? '+' : ''}${rep}` },
        ]
    );

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

export const setWalletHold = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { payoutHold } = req.body;

    if (typeof payoutHold !== 'boolean') {
        return next(new AppError('payoutHold must be a boolean', 400));
    }

    const user = await User.findByIdAndUpdate(id, { payoutHold }, { new: true }).select('-password');
    if (!user) return next(new AppError('No user found with that ID', 404));

    await notifyAdminChange(
        user,
        'Wallet Withdrawal Hold',
        payoutHold ? 'Withdrawals have been paused by admin' : 'Withdrawals have been resumed by admin',
        [{ field: 'payoutHold', before: payoutHold ? 'false' : 'true', after: String(payoutHold) }]
    );

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

export const getReportDetailsForAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const Report = (await import('../models/Report')).default;

    const report = await Report.findById(id)
        .populate('researcherId', 'name username email avatar reputationScore')
        .populate('triagerId', 'name username email avatar')
        .populate('comments.sender', 'name username role avatar')
        .populate('programId', 'title companyId');

    if (!report) return next(new AppError('Report not found', 404));

    res.status(200).json({
        status: 'success',
        data: { report }
    });
});

const notifyReportParticipants = async (
    report: any,
    actionType: 'comment' | 'status_change',
    message?: string,
    newStatus?: string,
    actorName: string = 'Admin',
    actorRole: 'admin' | 'company' | 'triager' | 'researcher' = 'admin'
) => {
    const recipients: Array<{ email?: string; name?: string; role: 'researcher' | 'triager' | 'company'; link: string }> = [];
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    const researcher = report.researcherId as any;
    if (researcher?.email) {
        recipients.push({ email: researcher.email, name: researcher.name, role: 'researcher', link: `${clientUrl}/researcher/reports/${report._id}` });
    }

    const triager = report.triagerId as any;
    if (triager?.email) {
        recipients.push({ email: triager.email, name: triager.name, role: 'triager', link: `${clientUrl}/triager/reports/${report._id}` });
    }

    const program = report.programId as any;
    if (program?.companyId) {
        const company = await User.findById(program.companyId).select('email name');
        if (company?.email) {
            recipients.push({ email: company.email, name: company.name, role: 'company', link: `${clientUrl}/company/reports/${report._id}` });
        }
    }

    await Promise.allSettled(
        recipients.map((r) =>
            sendEmail(
                r.email as string,
                actionType === 'comment' ? `New Comment on: ${report.title}` : `Report Status Updated: ${report.title}`,
                reportEmailTemplate({
                    recipientName: r.name || 'User',
                    recipientRole: r.role,
                    actorName,
                    actorRole,
                    actionType,
                    reportTitle: report.title,
                    reportId: report.reportId || String(report._id),
                    severity: report.severity,
                    newStatus,
                    message,
                    link: r.link
                })
            )
        )
    );
};

export const updateReportByAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const updates = req.body || {};
    const allowedFields = ['title', 'vulnerableEndpoint', 'description', 'impact', 'pocSteps', 'vulnerabilityCategory', 'vrtParent', 'vrtCategory', 'vrtVariant', 'severity', 'status', 'cvssScore', 'cvssVector', 'bounty'];
    const safeUpdates: Record<string, any> = {};

    allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
            safeUpdates[field] = updates[field];
        }
    });

    if (!Object.keys(safeUpdates).length) {
        return next(new AppError('No valid report fields provided', 400));
    }

    const Report = (await import('../models/Report')).default;
    const existing = await Report.findById(id)
        .populate('researcherId', 'name email username')
        .populate('triagerId', 'name email')
        .populate('programId', 'title companyId');
    if (!existing) return next(new AppError('Report not found', 404));

    const report = await Report.findByIdAndUpdate(id, safeUpdates, { new: true, runValidators: true })
        .populate('researcherId', 'name email username')
        .populate('triagerId', 'name email')
        .populate('programId', 'title companyId')
        .populate('comments.sender', 'name username role avatar');

    if (!report) return next(new AppError('Report not found', 404));

    const statusChanged = safeUpdates.status && safeUpdates.status !== existing.status;
    if (statusChanged) {
        report.comments.push({
            sender: req.user!._id,
            content: `Changed status from **${existing.status}** to **${safeUpdates.status}**.`,
            type: 'status_change',
            metadata: { oldStatus: existing.status, newStatus: safeUpdates.status, reason: req.body.reason || undefined },
            createdAt: new Date()
        });
        await report.save();
        await notifyReportParticipants(report, 'status_change', req.body.reason, safeUpdates.status);
    }

    const researcher = report.researcherId as any;
    if (researcher?._id) {
        await notifyAdminChange(researcher, 'Report Update', `Report "${report.title}" was updated by admin`);
    }

    res.status(200).json({
        status: 'success',
        data: { report }
    });
});

export const updateReportStatusByAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!status) return next(new AppError('Status is required', 400));

    const Report = (await import('../models/Report')).default;
    const report = await Report.findById(id)
        .populate('researcherId', 'name email username avatar')
        .populate('triagerId', 'name email username avatar')
        .populate('programId', 'title companyId')
        .populate('comments.sender', 'name username role avatar');
    if (!report) return next(new AppError('Report not found', 404));

    const oldStatus = report.status;
    if (status === 'Triaging' && oldStatus !== 'Triaging') {
        clearReputationMilestonesForReTriage(report);
    }
    report.status = status;
    report.comments.push({
        sender: req.user!._id,
        content: reason ? reason : `Changed status from **${oldStatus}** to **${status}**.`,
        type: 'status_change',
        metadata: { oldStatus, newStatus: status, reason: reason || undefined },
        createdAt: new Date()
    });
    await applyResearcherReputationOnStatusTransition(report, oldStatus, status, 'admin');
    await report.save();
    await report.populate('comments.sender', 'name username role avatar');

    const newComment = report.comments[report.comments.length - 1] as any;
    try {
        const io = getIO();
        io.to(id).emit('new_activity', {
            id: newComment._id,
            type: 'status_change',
            author: req.user!.name || req.user!.username || 'Admin',
            authorName: req.user!.name || 'Admin',
            authorUsername: req.user!.username || 'admin',
            role: 'Admin',
            content: newComment.content,
            timestamp: newComment.createdAt || new Date().toISOString(),
            authorAvatar: (req.user as any).avatar,
            metadata: newComment.metadata,
            status: report.status
        });
        io.to(id).emit('status_updated', { status: report.status });
    } catch (error) {
        console.error('Admin status socket emit failed:', error);
    }

    await notifyReportParticipants(
        report,
        'status_change',
        reason,
        status,
        req.user!.name || req.user!.username || 'Admin',
        'admin'
    );

    res.status(200).json({
        status: 'success',
        data: { report }
    });
});

export const updateReportSeverityByAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { cvssVector, cvssScore, severity } = req.body;

    const Report = (await import('../models/Report')).default;
    const report = await Report.findById(id).populate('comments.sender', 'name username role avatar');
    if (!report) return next(new AppError('Report not found', 404));

    const oldSeverity = report.severity;
    const oldScore = report.cvssScore;
    const oldVector = report.cvssVector;

    report.cvssVector = cvssVector;
    report.cvssScore = cvssScore;
    report.severity = severity || report.severity;
    report.comments.push({
        sender: req.user!._id,
        content: `Updated severity from <b>${oldSeverity} (${oldScore})</b> to <b>${report.severity} (${cvssScore})</b>`,
        type: 'severity_update',
        metadata: { oldVector, newVector: cvssVector, oldScore, newScore: cvssScore },
        createdAt: new Date()
    });
    await report.save();
    await report.populate('comments.sender', 'name username role avatar');

    const newComment = report.comments[report.comments.length - 1] as any;
    try {
        const io = getIO();
        io.to(id).emit('new_activity', {
            id: newComment._id,
            type: 'severity_update',
            author: req.user!.name || req.user!.username || 'Admin',
            authorName: req.user!.name || 'Admin',
            authorUsername: req.user!.username || 'admin',
            role: 'Admin',
            content: newComment.content,
            timestamp: newComment.createdAt || new Date().toISOString(),
            authorAvatar: (req.user as any).avatar,
            metadata: newComment.metadata
        });
        io.to(id).emit('report_updated', {
            severity: report.severity,
            cvssScore: report.cvssScore,
            cvssVector: report.cvssVector
        });
    } catch (error) {
        console.error('Admin severity socket emit failed:', error);
    }

    res.status(200).json({
        status: 'success',
        data: { report }
    });
});

export const addAdminComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !String(content).trim()) return next(new AppError('Comment content is required', 400));

    const Report = (await import('../models/Report')).default;
    const report = await Report.findById(id)
        .populate('researcherId', 'name email username')
        .populate('triagerId', 'name email')
        .populate('programId', 'title companyId');
    if (!report) return next(new AppError('Report not found', 404));

    report.comments.push({
        sender: req.user!._id,
        content,
        type: 'comment',
        createdAt: new Date()
    });
    await report.save();
    await report.populate('comments.sender', 'name username role avatar');

    const newComment = report.comments[report.comments.length - 1] as any;
    try {
        const io = getIO();
        io.to(id).emit('new_activity', {
            id: newComment._id,
            type: 'comment',
            author: req.user!.name || req.user!.username || 'Admin',
            authorName: req.user!.name || 'Admin',
            authorUsername: req.user!.username || 'admin',
            role: 'Admin',
            content: newComment.content,
            attachments: newComment.attachments || [],
            timestamp: newComment.createdAt || new Date().toISOString(),
            authorAvatar: (req.user as any).avatar
        });
    } catch (error) {
        console.error('Admin comment socket emit failed:', error);
    }

    await notifyReportParticipants(
        report,
        'comment',
        content,
        undefined,
        req.user!.name || req.user!.username || 'Admin',
        'admin'
    );

    res.status(200).json({
        status: 'success',
        data: { comments: report.comments }
    });
});

export const getAllPrograms = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Fetch all programs and populate company details (name, avatar, etc. from User model if needed, 
    // but Program has companyName string. Ideally link to User for more details)
    
    await releaseExpiredProgramBans();

    // Assuming Program has companyId ref to User
    const programs = await Program.find().populate('companyId', 'name avatar').sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: programs.length,
        data: {
            programs
        }
    });
});

const BAN_DURATION_MS: Record<string, number | null> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    permanent: null,
};

const stripHtmlModeration = (html: string) => {
    if (!html) return '';
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const buildModerationSummary = (preset: string, commentHtml?: string) => {
    const note = stripHtmlModeration(commentHtml || '');
    if (note) return `${preset}\n\nAdmin note: ${note}`;
    return preset;
};

export const updateProgramStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await releaseExpiredProgramBans();

    const { id } = req.params;
    const { status, reason, commentHtml, banDurationKey } = req.body;

    if (!['Active', 'Pending', 'Suspended', 'Rejected', 'Banned'].includes(status)) {
        return next(new AppError('Invalid status', 400));
    }

    const updateData: any = { status };

    if (status === 'Active') {
        updateData.bannedUntil = null;
        updateData.suspensionReason = null;
        updateData.moderationCommentHtml = null;
    } else if (status === 'Suspended') {
        if (!reason || typeof reason !== 'string' || !reason.trim()) {
            return next(new AppError('Reason is required to suspend a program', 400));
        }
        updateData.suspensionReason = buildModerationSummary(reason.trim(), commentHtml);
        updateData.moderationCommentHtml = typeof commentHtml === 'string' ? commentHtml : '';
        updateData.bannedUntil = null;
    } else if (status === 'Banned') {
        if (!reason || typeof reason !== 'string' || !reason.trim()) {
            return next(new AppError('Reason is required to ban a program', 400));
        }
        if (!banDurationKey || typeof banDurationKey !== 'string' || !Object.prototype.hasOwnProperty.call(BAN_DURATION_MS, banDurationKey)) {
            return next(new AppError('Valid ban duration is required', 400));
        }
        const ms = BAN_DURATION_MS[banDurationKey];
        updateData.suspensionReason = buildModerationSummary(reason.trim(), commentHtml);
        updateData.moderationCommentHtml = typeof commentHtml === 'string' ? commentHtml : '';
        updateData.bannedUntil = ms === null ? null : new Date(Date.now() + ms);
    }

    const program = await Program.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('companyId');

    if (!program) {
        return next(new AppError('No program found with that ID', 404));
    }

    if (program.companyId) {
        const company = program.companyId as any;

        const notifTitle = `Program ${status}`;
        let notifMsg = `Your program "${program.title}" has been ${status.toLowerCase()} by admin.`;

        if (status === 'Suspended') {
            notifMsg += ` Reason: ${program.suspensionReason || reason}`;
            if (company.email) {
                const emailHtml = programSuspendedTemplate(program.title, program.suspensionReason || reason);
                try {
                    await sendEmail(company.email, `URGENT: Program Suspended - ${program.title}`, emailHtml);
                } catch (error) {
                    console.error('Failed to send suspension email:', error);
                }
            }
        }

        if (status === 'Banned') {
            const expiryNote = program.bannedUntil
                ? `This ban will automatically lift on ${program.bannedUntil.toISOString()}.`
                : 'This ban has no automatic end date; an administrator must reactivate your program.';
            notifMsg += ` Reason: ${program.suspensionReason || reason}. ${expiryNote}`;
            if (company.email) {
                const emailHtml = programBannedTemplate(
                    program.title,
                    program.suspensionReason || reason,
                    expiryNote
                );
                try {
                    await sendEmail(company.email, `URGENT: Program Banned - ${program.title}`, emailHtml);
                } catch (error) {
                    console.error('Failed to send ban email:', error);
                }
            }
        }

        if (!company.email) {
            await Notification.create({
                recipient: company._id,
                title: notifTitle,
                message: notifMsg,
                type: 'system',
            });
        }
    }

    res.status(200).json({
        status: 'success',
        data: {
            program
        }
    });
});

export const getProgramDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    await releaseExpiredProgramBans();

    // 1. Fetch program and fully populate company details
    const program = await Program.findById(id).populate(
        'companyId',
        'name email avatar companyName website industry city domainVerified verifiedAssets'
    );

    if (!program) {
        return next(new AppError('No program found with that ID', 404));
    }

    // 2. Fetch reports for this program to build Hall of Fame
    // Specifically, find unique researchers who have submitted reports for this program.
    // For a more strict Hall of Fame, we might filter by status: 'resolved' or 'rewarded'.
    // For now, based on requirement "how many researchers have worked on this program", we'll get all valid submissions.
    const Report = (await import('../models/Report')).default;
    const reports = await Report.find({ programId: id })
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

    const programReportsRaw = await Report.find({ programId: id })
        .sort({ createdAt: -1 })
        .limit(100)
        .select('title severity status bounty createdAt researcherId')
        .populate('researcherId', 'username name');

    const programReports = programReportsRaw.map((r: any) => ({
        id: r._id,
        reportId: r.reportId || String(r._id),
        title: r.title,
        severity: (r.severity || 'Low').toLowerCase(),
        status: (r.status || 'Submitted').toLowerCase(),
        submittedAt: r.createdAt,
        bounty: r.bounty || 0,
        researcher: r.researcherId?.username || r.researcherId?.name || 'Unknown',
    }));

    res.status(200).json({
        status: 'success',
        data: {
            program,
            hallOfFame,
            programReports
        }
    });
});

export const updateProgramByAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const body = req.body || {};

    const allowed: Record<string, boolean> = {
        title: true,
        description: true,
        rulesOfEngagement: true,
        safeHarbor: true,
        submissionGuidelines: true,
        bountyRange: true,
        scope: true,
        outOfScope: true,
        rewards: true,
    };

    const updates: Record<string, any> = {};
    for (const key of Object.keys(allowed)) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            updates[key] = body[key];
        }
    }

    if (updates.scope !== undefined && !Array.isArray(updates.scope)) {
        return next(new AppError('scope must be an array', 400));
    }
    if (updates.outOfScope !== undefined && !Array.isArray(updates.outOfScope)) {
        return next(new AppError('outOfScope must be an array', 400));
    }
    if (updates.rewards !== undefined && (typeof updates.rewards !== 'object' || updates.rewards === null)) {
        return next(new AppError('rewards must be an object', 400));
    }

    if (!Object.keys(updates).length) {
        return next(new AppError('No valid fields to update', 400));
    }

    const existing = await Program.findById(id);
    if (!existing) {
        return next(new AppError('No program found with that ID', 404));
    }

    const isVdp = String(existing.type || '').toUpperCase() === 'VDP';
    if (isVdp && (updates.rewards !== undefined || updates.bountyRange !== undefined)) {
        return next(new AppError('VDP programs do not use bounty range or reward tiers', 400));
    }

    const program = await Program.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).populate(
        'companyId',
        'name email avatar companyName website industry city domainVerified verifiedAssets'
    );

    if (!program) {
        return next(new AppError('No program found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { program }
    });
});
