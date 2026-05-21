"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCoverPhoto = exports.uploadAvatar = exports.updateMe = exports.submitKyc = exports.updateKYCStatus = exports.removePayoutMethod = exports.verifyPayoutMethodOtp = exports.requestPayoutMethodOtp = exports.requestPayout = exports.getPayoutMethods = exports.setupPayoutMethod = exports.clearLegacyNotifications = exports.markNotificationRead = exports.getMyNotifications = exports.getWalletData = exports.getMe = exports.getResearcherLeaderboard = exports.getPublicProfile = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const axios_1 = __importDefault(require("axios"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const cloudinary_1 = require("../utils/cloudinary");
const profileCompletionReputation_1 = require("../utils/profileCompletionReputation");
/** Percentile rank (0–100) of `value` within `population` (inclusive). */
function percentileRank(value, population) {
    if (!population.length)
        return null;
    const sorted = [...population].sort((a, b) => a - b);
    const below = sorted.filter((x) => x < value).length;
    const equal = sorted.filter((x) => x === value).length;
    return Math.round(((below + 0.5 * equal) / sorted.length) * 100);
}
const SEVERITY_BANDS = [
    { band: 'Critical', severity: 'Critical' },
    { band: 'High', severity: 'High' },
    { band: 'Medium', severity: 'Medium' },
    { band: 'Low', severity: 'Low' },
];
/** Public profile: reports past initial triage (valid / in-scope pipeline). */
const PUBLIC_ACCEPTED_REPORT_STATUSES = [
    'Triaged',
    'Pending_Fix',
    'Under Review',
    'Resolved',
    'Paid',
    'Closed',
];
/** Strip leading "Title:" prefix sometimes stored in report titles (public display only). */
function displayPublicReportTitle(raw) {
    const t = String(raw || '').trim();
    if (!t)
        return 'Untitled';
    const stripped = t.replace(/^\s*title\s*:\s*/i, '').trim();
    return stripped || 'Untitled';
}
exports.getPublicProfile = (0, catchAsync_1.default)(async (req, res, next) => {
    const raw = req.params.username?.trim();
    if (!raw) {
        return next(new AppError_1.default('Profile not found', 404));
    }
    const safeUsername = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const normalizeHandle = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    let user = await User_1.default.findOne({
        username: { $regex: new RegExp(`^${safeUsername}$`, 'i') },
    }).select('username name bio bioUpdated avatar coverPhoto hireable showPayouts country city socialLinks reputationScore linkedAccounts createdAt skills achievements isPrivate isVerified status');
    // Fallback: tolerate dash/underscore/space variations in public URLs (e.g. ch-shahzaib vs ch_shahzaib).
    if (!user) {
        const normalizedRaw = normalizeHandle(raw);
        if (normalizedRaw) {
            const candidates = await User_1.default.find({
                username: { $exists: true, $ne: null },
            }).select('username name bio bioUpdated avatar coverPhoto hireable showPayouts country city socialLinks reputationScore linkedAccounts createdAt skills achievements isPrivate isVerified status');
            user =
                candidates.find((u) => normalizeHandle(u.username) === normalizedRaw || normalizeHandle(u.name) === normalizedRaw) || null;
        }
    }
    if (!user) {
        return next(new AppError_1.default('Profile not found', 404));
    }
    const ReportModel = (await Promise.resolve().then(() => __importStar(require('../models/Report')))).default;
    const rid = user._id instanceof mongoose_1.default.Types.ObjectId ? user._id : new mongoose_1.default.Types.ObjectId(String(user._id));
    const [agg] = await ReportModel.aggregate([
        { $match: { researcherId: rid } },
        {
            $facet: {
                summary: [
                    {
                        $group: {
                            _id: null,
                            submitted: { $sum: 1 },
                            bountyEarned: {
                                $sum: {
                                    $cond: [{ $in: ['$status', ['Resolved', 'Paid']] }, { $ifNull: ['$bounty', 0] }, 0],
                                },
                            },
                            totalPayouts: {
                                $sum: {
                                    $cond: [{ $eq: ['$status', 'Paid'] }, { $ifNull: ['$bounty', 0] }, 0],
                                },
                            },
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
    const summary = agg?.summary?.[0];
    const submitted = summary?.submitted ?? 0;
    const resolvedOrPaid = summary?.resolvedOrPaid ?? 0;
    const resolutionRatePercent = submitted > 0 ? Math.round((resolvedOrPaid / submitted) * 100) : null;
    const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'None'];
    const bySeverity = (agg?.bySeverity || [])
        .filter((x) => x._id)
        .map((x) => ({ severity: x._id, count: x.count }))
        .sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));
    const researcherObjectIds = await ReportModel.distinct('researcherId', {
        researcherId: { $ne: null },
    });
    const ridStr = String(rid);
    const severityPercentiles = await Promise.all(SEVERITY_BANDS.map(async ({ band, severity }) => {
        const perResearcher = await ReportModel.aggregate([
            { $match: { severity, researcherId: { $ne: null } } },
            { $group: { _id: '$researcherId', c: { $sum: 1 } } },
        ]);
        const countMap = new Map(perResearcher.map((row) => [String(row._id), row.c]));
        const population = researcherObjectIds.map((oid) => countMap.get(String(oid)) ?? 0);
        const userCount = countMap.get(ridStr) ?? 0;
        const p = percentileRank(userCount, population);
        return { band, severity, count: userCount, percentile: p };
    }));
    const byTargetTypeRaw = await ReportModel.aggregate([
        { $match: { researcherId: rid } },
        {
            $addFields: {
                targetBucket: {
                    $let: {
                        vars: {
                            at: { $toLower: { $ifNull: ['$assetType', ''] } },
                            hay: {
                                $toLower: {
                                    $concat: [
                                        { $ifNull: ['$vulnerableEndpoint', ''] },
                                        ' ',
                                        { $ifNull: [{ $arrayElemAt: ['$assets', 0] }, ''] },
                                    ],
                                },
                            },
                        },
                        in: {
                            $switch: {
                                branches: [
                                    {
                                        case: { $in: ['$$at', ['api']] },
                                        then: 'API / services',
                                    },
                                    {
                                        case: { $eq: ['$$at', 'contract'] },
                                        then: 'Smart contract',
                                    },
                                    {
                                        case: { $eq: ['$$at', 'web'] },
                                        then: 'Web application',
                                    },
                                    {
                                        case: {
                                            $regexMatch: {
                                                input: '$$hay',
                                                regex: 'graphql|/api/|/v1/|/v2/|swagger|rpc|openapi|rest\\\\.json',
                                                options: 'i',
                                            },
                                        },
                                        then: 'API / services',
                                    },
                                    {
                                        case: {
                                            $regexMatch: {
                                                input: '$$hay',
                                                regex: '\\.apk|\\.ipa|\\bandroid\\b|\\bios\\b|\\bmobile\\b',
                                                options: 'i',
                                            },
                                        },
                                        then: 'Mobile',
                                    },
                                ],
                                default: 'Web application',
                            },
                        },
                    },
                },
            },
        },
        { $group: { _id: '$targetBucket', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
    const byTargetType = byTargetTypeRaw.map((row) => ({
        name: row._id || 'Unknown',
        count: row.count,
    }));
    const hallRows = await ReportModel.aggregate([
        {
            $match: {
                researcherId: rid,
            },
        },
        {
            $addFields: {
                progOid: {
                    $convert: {
                        input: '$programId',
                        to: 'objectId',
                        onError: null,
                        onNull: null,
                    },
                },
            },
        },
        { $match: { progOid: { $ne: null } } },
        {
            $lookup: {
                from: 'programs',
                localField: 'progOid',
                foreignField: '_id',
                as: 'p',
            },
        },
        {
            $addFields: {
                companyOid: { $arrayElemAt: ['$p.companyId', 0] },
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'companyOid',
                foreignField: '_id',
                as: 'c',
            },
        },
        {
            $group: {
                _id: '$companyOid',
                reportCount: { $sum: 1 },
                companyName: {
                    $first: {
                        $ifNull: [
                            { $arrayElemAt: ['$c.companyName', 0] },
                            {
                                $ifNull: [
                                    { $arrayElemAt: ['$p.companyName', 0] },
                                    { $arrayElemAt: ['$c.name', 0] },
                                ],
                            },
                        ],
                    },
                },
                companyAvatar: { $first: { $arrayElemAt: ['$c.avatar', 0] } },
                triageLikeCount: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['Triaged', 'Pending_Fix', 'Resolved', 'Paid', 'Under Review']] }, 1, 0],
                    },
                },
                duplicateCount: { $sum: { $cond: [{ $eq: ['$status', 'Duplicate'] }, 1, 0] } },
                naCount: { $sum: { $cond: [{ $eq: ['$status', 'NA'] }, 1, 0] } },
                spamCount: { $sum: { $cond: [{ $eq: ['$status', 'Spam'] }, 1, 0] } },
                resolvedCritical: {
                    $sum: {
                        $cond: [{ $and: [{ $eq: ['$status', 'Resolved'] }, { $eq: ['$severity', 'Critical'] }] }, 1, 0],
                    },
                },
                resolvedHigh: {
                    $sum: {
                        $cond: [{ $and: [{ $eq: ['$status', 'Resolved'] }, { $eq: ['$severity', 'High'] }] }, 1, 0],
                    },
                },
                resolvedMedium: {
                    $sum: {
                        $cond: [{ $and: [{ $eq: ['$status', 'Resolved'] }, { $eq: ['$severity', 'Medium'] }] }, 1, 0],
                    },
                },
                resolvedLow: {
                    $sum: {
                        $cond: [{ $and: [{ $eq: ['$status', 'Resolved'] }, { $eq: ['$severity', 'Low'] }] }, 1, 0],
                    },
                },
            },
        },
        { $sort: { reportCount: -1 } },
        { $limit: 48 },
    ]);
    const hallOfFamePrograms = hallRows.map((row) => {
        const label = (row.companyName && String(row.companyName).trim()) ||
            'Company';
        const reputationPoints = row.triageLikeCount * 2 +
            row.duplicateCount * 2 +
            row.naCount * -5 +
            row.spamCount * -10 +
            row.resolvedCritical * 50 +
            row.resolvedHigh * 30 +
            row.resolvedMedium * 20 +
            row.resolvedLow * 5;
        return {
            label,
            reportCount: row.reportCount,
            reputationPoints,
            companyAvatar: row.companyAvatar || '',
        };
    });
    const acceptedReportsAgg = await ReportModel.aggregate([
        {
            $match: {
                researcherId: rid,
                status: { $in: [...PUBLIC_ACCEPTED_REPORT_STATUSES] },
            },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 150 },
        {
            $addFields: {
                progOid: {
                    $convert: { input: '$programId', to: 'objectId', onError: null, onNull: null },
                },
            },
        },
        {
            $lookup: {
                from: 'programs',
                localField: 'progOid',
                foreignField: '_id',
                as: 'p',
            },
        },
        {
            $addFields: {
                prog0: { $arrayElemAt: ['$p', 0] },
            },
        },
        {
            $addFields: {
                companyOid: '$prog0.companyId',
                programCompanyFromProg: '$prog0.companyName',
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'companyOid',
                foreignField: '_id',
                as: 'compUser',
            },
        },
        {
            $project: {
                title: { $ifNull: ['$title', ''] },
                severity: { $ifNull: ['$severity', 'None'] },
                createdAt: 1,
                programCompanyFromProg: 1,
                companyUserCompanyName: { $arrayElemAt: ['$compUser.companyName', 0] },
                companyUserName: { $arrayElemAt: ['$compUser.name', 0] },
            },
        },
    ]);
    const acceptedReports = acceptedReportsAgg.map((r) => {
        const submittedTo = (r.programCompanyFromProg && String(r.programCompanyFromProg).trim()) ||
            (r.companyUserCompanyName && String(r.companyUserCompanyName).trim()) ||
            (r.companyUserName && String(r.companyUserName).trim()) ||
            'Company';
        return {
            title: displayPublicReportTitle(String(r.title || '')).slice(0, 300),
            severity: String(r.severity || 'None'),
            submittedTo,
            submittedAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
        };
    });
    const plain = user.toObject();
    delete plain.email;
    delete plain.password;
    delete plain.walletBalance;
    const profileCompletionScore = (0, profileCompletionReputation_1.getProfileCompletionReputationScore)(plain);
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
                bountyEarned: Number(summary?.bountyEarned ?? 0),
                totalPayouts: Number(summary?.totalPayouts ?? 0),
                severityPercentiles,
                byTargetType,
                hallOfFamePrograms,
                acceptedReports,
            },
        },
    });
});
exports.getResearcherLeaderboard = (0, catchAsync_1.default)(async (req, res, next) => {
    const ReportModel = (await Promise.resolve().then(() => __importStar(require('../models/Report')))).default;
    const [researchers, paidReportStats] = await Promise.all([
        User_1.default.find({ role: 'researcher', status: 'Active' })
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
    const statsByResearcher = new Map();
    paidReportStats.forEach((row) => {
        statsByResearcher.set(String(row._id), {
            paidReports: Number(row.paidReports || 0),
            totalBounties: Number(row.totalBounties || 0)
        });
    });
    const ranked = researchers
        .map((researcher) => {
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
        if (b.reputation !== a.reputation)
            return b.reputation - a.reputation;
        if (b.bounties !== a.bounties)
            return b.bounties - a.bounties;
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
const Transaction_1 = __importDefault(require("../models/Transaction"));
const emailService_1 = require("../services/emailService");
const redis_1 = __importDefault(require("../config/redis"));
const stripeClient_1 = require("../utils/stripeClient");
/** Return the current authenticated user's own profile */
exports.getMe = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = await User_1.default.findById(req.user._id).select('-password');
    if (!user)
        return next(new AppError_1.default('User not found', 404));
    res.status(200).json({ status: 'success', data: { user } });
});
/** Return researcher's wallet balance + bounty transaction history */
exports.getWalletData = (0, catchAsync_1.default)(async (req, res, next) => {
    // Get fresh wallet balance
    const user = await User_1.default.findById(req.user._id).select('walletBalance reputationScore');
    if (!user)
        return next(new AppError_1.default('User not found', 404));
    // Fetch resolved reports for this researcher as transactions
    const ReportModel = (await Promise.resolve().then(() => __importStar(require('../models/Report')))).default;
    const resolvedReports = await ReportModel.find({
        researcherId: req.user._id,
        status: 'Resolved',
        bounty: { $gt: 0 }
    })
        .select('title bounty updatedAt severity _id')
        .sort({ updatedAt: -1 })
        .limit(50);
    const bountyTransactions = resolvedReports.map((r) => ({
        id: `BNT-${String(r._id).slice(-6).toUpperCase()}`,
        date: new Date(r.updatedAt).toLocaleString(),
        desc: `Security Reward: ${r.title}`,
        amount: `+${r.bounty.toLocaleString()}`,
        status: 'CLEARED',
        timestamp: new Date(r.updatedAt).getTime(),
        reportId: r.reportId || r._id
    }));
    // Fetch real withdrawal transactions
    const withdrawalRecords = await Transaction_1.default.find({
        user: req.user._id,
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
/** In-app notifications for the logged-in user (newest first). */
exports.getMyNotifications = (0, catchAsync_1.default)(async (req, res, _next) => {
    const docs = await Notification_1.default.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(300)
        .lean();
    const normalizeNotificationTitle = (title) => String(title || '')
        .toLowerCase()
        .replace(/\s*-\s*bugchase\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    // Prefer rich email-backed notifications over legacy/plain duplicates.
    // Duplicate heuristic: normalized title and close timestamps.
    const richByTitle = new Map();
    for (const d of docs) {
        if (d?.html && String(d.html).trim()) {
            const key = normalizeNotificationTitle(String(d.title || ''));
            const t = d.createdAt ? new Date(d.createdAt).getTime() : 0;
            if (!richByTitle.has(key))
                richByTitle.set(key, []);
            richByTitle.get(key).push(t);
        }
    }
    const filtered = docs.filter((d) => {
        const hasHtml = !!String(d?.html || '').trim();
        if (hasHtml)
            return true;
        const key = normalizeNotificationTitle(String(d.title || ''));
        const richTimes = richByTitle.get(key);
        if (!richTimes || richTimes.length === 0)
            return true;
        const t = d.createdAt ? new Date(d.createdAt).getTime() : 0;
        // If a rich copy exists within +/- 5 minutes, hide this plain duplicate.
        return !richTimes.some((rt) => Math.abs(rt - t) <= 5 * 60 * 1000);
    });
    const items = filtered.slice(0, 100).map((d) => ({
        id: String(d._id),
        title: d.title,
        message: d.message,
        html: d.html || '',
        channel: d.channel || 'in_app',
        type: d.type,
        read: Boolean(d.read),
        createdAt: d.createdAt,
        link: d.link || null,
    }));
    res.status(200).json({
        status: 'success',
        data: { items },
    });
});
exports.markNotificationRead = (0, catchAsync_1.default)(async (req, res, next) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        return next(new AppError_1.default('Invalid notification id', 400));
    }
    const notif = await Notification_1.default.findOneAndUpdate({ _id: id, recipient: req.user._id }, { read: true }, { new: true }).lean();
    if (!notif) {
        return next(new AppError_1.default('Notification not found', 404));
    }
    res.status(200).json({
        status: 'success',
        data: { id: String(notif._id), read: true },
    });
});
/** Remove old/plain notifications so feed only keeps rich email-backed records. */
exports.clearLegacyNotifications = (0, catchAsync_1.default)(async (req, res, _next) => {
    const result = await Notification_1.default.deleteMany({
        recipient: req.user._id,
        $or: [
            { channel: { $ne: 'email' } },
            { html: { $exists: false } },
            { html: '' },
            { html: null },
        ],
    });
    res.status(200).json({
        status: 'success',
        data: { deletedCount: result.deletedCount || 0 },
    });
});
/** Setup Payout Method via Stripe SetupIntent */
exports.setupPayoutMethod = (0, catchAsync_1.default)(async (req, res, next) => {
    const stripe = (0, stripeClient_1.getStripeClient)();
    const user = await User_1.default.findById(req.user._id);
    if (!user)
        return next(new AppError_1.default('User not found', 404));
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
exports.getPayoutMethods = (0, catchAsync_1.default)(async (req, res, next) => {
    const stripe = (0, stripeClient_1.getStripeClient)();
    const user = await User_1.default.findById(req.user._id);
    if (!user)
        return next(new AppError_1.default('User not found', 404));
    if (!user.stripeCustomerId) {
        return res.status(200).json({ status: 'success', data: { methods: [] } });
    }
    const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card'
    });
    const formattedMethods = paymentMethods.data.map((pm) => ({
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
exports.requestPayout = (0, catchAsync_1.default)(async (req, res, next) => {
    const stripe = (0, stripeClient_1.getStripeClient)();
    const { amount, paymentMethodId } = req.body;
    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
        return next(new AppError_1.default('Invalid withdrawal amount', 400));
    }
    const user = await User_1.default.findById(req.user._id);
    if (!user)
        return next(new AppError_1.default('User not found', 404));
    if (user.payoutHold) {
        return next(new AppError_1.default('Withdrawals are currently on hold by admin review', 403));
    }
    if ((user.walletBalance || 0) < withdrawAmount) {
        return next(new AppError_1.default('Insufficient wallet balance', 400));
    }
    if (!paymentMethodId || !user.stripeCustomerId) {
        return next(new AppError_1.default('Valid payment method required', 400));
    }
    // Verify payment method belongs to user
    try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.customer !== user.stripeCustomerId) {
            return next(new AppError_1.default('Payment method does not belong to you', 403));
        }
    }
    catch (e) {
        return next(new AppError_1.default('Invalid payment method', 400));
    }
    // Deduct balance securely
    const updatedUser = await User_1.default.findOneAndUpdate({ _id: user._id, walletBalance: { $gte: withdrawAmount } }, { $inc: { walletBalance: -withdrawAmount } }, { new: true });
    if (!updatedUser) {
        return next(new AppError_1.default('Transaction failed due to insufficient funds or concurrent update', 400));
    }
    // Create withdrawal transaction
    await Transaction_1.default.create({
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
        await (0, emailService_1.sendEmail)(updatedUser.email, 'BugChase Wallet Withdrawal Processed', (0, emailService_1.payoutSuccessTemplate)(updatedUser.name, withdrawAmount, updatedUser.walletBalance || 0, 'Card ending in ' + paymentMethodId.slice(-4)));
    }
    catch (err) {
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
exports.requestPayoutMethodOtp = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = await User_1.default.findById(req.user._id);
    if (!user)
        return next(new AppError_1.default('User not found', 404));
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Store in Redis with 10 min expiry
    await redis_1.default.set(`payout_otp:${user.email}`, otp, 'EX', 600);
    // Send Email
    try {
        await (0, emailService_1.sendEmail)(user.email, 'Payment Method Removal - BugChase', (0, emailService_1.cardDeletionOtpTemplate)(otp));
    }
    catch (error) {
        console.error('Email Send Error:', error);
        return next(new AppError_1.default('There was an error sending the email. Try again later!', 500));
    }
    res.status(200).json({
        status: 'success',
        message: 'Verification code sent to your email'
    });
});
/** Verify OTP to unlock payment method details */
exports.verifyPayoutMethodOtp = (0, catchAsync_1.default)(async (req, res, next) => {
    const { otp } = req.body;
    if (!otp)
        return next(new AppError_1.default('OTP is required', 400));
    const user = await User_1.default.findById(req.user._id);
    if (!user)
        return next(new AppError_1.default('User not found', 404));
    const storedOtp = await redis_1.default.get(`payout_otp:${user.email}`);
    if (!storedOtp || storedOtp !== otp) {
        return next(new AppError_1.default('Invalid or expired verification code', 400));
    }
    // Clear OTP upon success
    await redis_1.default.del(`payout_otp:${user.email}`);
    res.status(200).json({
        status: 'success',
        message: 'Identity verified successfully'
    });
});
/** Remove a payment method from Stripe */
exports.removePayoutMethod = (0, catchAsync_1.default)(async (req, res, next) => {
    const stripe = (0, stripeClient_1.getStripeClient)();
    const idParam = req.params.id;
    if (!idParam || Array.isArray(idParam))
        return next(new AppError_1.default('Payment method ID is required', 400));
    const paymentMethodId = idParam;
    const user = await User_1.default.findById(req.user._id);
    if (!user || !user.stripeCustomerId)
        return next(new AppError_1.default('User or customer not found', 404));
    try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.customer !== user.stripeCustomerId) {
            return next(new AppError_1.default('You do not have permission to remove this card', 403));
        }
        await stripe.paymentMethods.detach(paymentMethodId);
    }
    catch (error) {
        return next(new AppError_1.default(error.message || 'Failed to remove payment method', 400));
    }
    res.status(200).json({
        status: 'success',
        message: 'Payment method removed successfully'
    });
});
exports.updateKYCStatus = (0, catchAsync_1.default)(async (req, res, next) => {
    const { verified, confidence } = req.body;
    if (!verified) {
        return next(new AppError_1.default('Verification failed status cannot be processed here.', 400));
    }
    const user = await User_1.default.findById(req.user.id);
    if (!user)
        return next(new AppError_1.default('User not found', 404));
    const wasVerified = user.isVerified;
    user.isVerified = true;
    if (!wasVerified) {
        user.reputationScore = (user.reputationScore || 0) + 80;
    }
    else {
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
/**
 * KYC submission pipeline.
 *
 *   client  ──files──▶  Express  ──upload──▶  Cloudinary (BugChase/kyc/<userId>)
 *                          │
 *                          └──URLs──▶ kyc_engine (Python OCR + DeepFace)
 *                          │
 *                          └──verdict──▶ User.isVerified / kycInfo
 *
 * Note: the Python KYC engine no longer touches local disk — it only ever
 * receives Cloudinary URLs and processes them through tmp files.
 */
exports.submitKyc = (0, catchAsync_1.default)(async (req, res, next) => {
    const files = req.files;
    const idCard = files?.idCard?.[0];
    const liveFace = files?.liveFace?.[0];
    if (!idCard || !liveFace) {
        return next(new AppError_1.default('Both CNIC image and live face capture are required.', 400));
    }
    const user = await User_1.default.findById(req.user.id);
    if (!user)
        return next(new AppError_1.default('User not found', 404));
    const folder = `BugChase/kyc/${user._id}`;
    const stamp = Date.now();
    let idCardAsset = null;
    let liveFaceAsset = null;
    try {
        [idCardAsset, liveFaceAsset] = await Promise.all([
            (0, cloudinary_1.uploadToCloudinary)(idCard, {
                folder,
                publicId: `cnic_${stamp}`,
                resourceType: 'image',
                tags: ['kyc', 'cnic', `user:${user._id}`],
                overwrite: true,
            }),
            (0, cloudinary_1.uploadToCloudinary)(liveFace, {
                folder,
                publicId: `live_${stamp}`,
                resourceType: 'image',
                tags: ['kyc', 'live-face', `user:${user._id}`],
                overwrite: true,
            }),
        ]);
    }
    catch (err) {
        console.error('[kyc] Cloudinary upload failed:', err);
        return next(new AppError_1.default('Could not upload KYC documents. Please try again.', 502));
    }
    // KYC engine base URL. In production this points at the Hugging Face Space:
    //   https://chshahzaib123-bugchase-kyc-engine.hf.space
    // For local development the fallback is the local FastAPI on port 8000.
    const kycEngineUrl = (process.env.KYC_ENGINE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const kycTimeoutMs = Number(process.env.KYC_ENGINE_TIMEOUT_MS || 120000);
    const kycPayload = {
        id_card_url: idCardAsset.url,
        live_face_url: liveFaceAsset.url,
        researcher_id: user._id.toString(),
    };
    // Hugging Face Spaces sleep when idle and can take 30-90s to wake. We allow
    // a long per-attempt timeout, and on a transient cold-start error we retry
    // once after a short delay before giving up.
    const isTransientEngineError = (err) => {
        const status = err?.response?.status;
        const code = err?.code;
        if (code === 'ECONNABORTED' || code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
            return true;
        }
        if (typeof status === 'number' && (status === 503 || status === 504 || status === 408 || status === 502)) {
            return true;
        }
        return false;
    };
    let pythonData = {};
    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const response = await axios_1.default.post(`${kycEngineUrl}/verify-kyc-urls`, kycPayload, {
                timeout: kycTimeoutMs,
                headers: { 'Content-Type': 'application/json' },
                // Treat only 2xx as success; everything else flows into catch.
                validateStatus: (s) => s >= 200 && s < 300,
            });
            pythonData = response.data || {};
            lastErr = null;
            break;
        }
        catch (err) {
            lastErr = err;
            const transient = isTransientEngineError(err);
            console.error(`[kyc] engine call attempt ${attempt} failed${transient ? ' (transient)' : ''}:`, err?.response?.status || err?.code || '', err?.response?.data || err?.message);
            if (attempt === 1 && transient) {
                // Give the HF Space a moment to finish waking up.
                await new Promise((r) => setTimeout(r, 4000));
                continue;
            }
            break;
        }
    }
    if (lastErr) {
        // Don't keep orphaned uploads if we couldn't even reach the engine.
        await Promise.all([
            (0, cloudinary_1.deleteFromCloudinary)(idCardAsset.public_id),
            (0, cloudinary_1.deleteFromCloudinary)(liveFaceAsset.public_id),
        ]);
        const isTimeout = lastErr?.code === 'ECONNABORTED' || lastErr?.code === 'ETIMEDOUT';
        const msg = isTimeout
            ? 'Verification engine is starting up. Please try again in a few seconds.'
            : 'Verification engine is unreachable. Try again shortly.';
        return next(new AppError_1.default(msg, 503));
    }
    const success = Boolean(pythonData.success);
    const confidence = typeof pythonData.confidence === 'number' ? pythonData.confidence : 0;
    const verdict = success ? 'VERIFIED' : 'MATCH FAILED';
    // Persist Cloudinary references either way so admins can audit failed attempts.
    user.kycInfo = {
        idCardUrl: idCardAsset.url,
        idCardPublicId: idCardAsset.public_id,
        liveFaceUrl: liveFaceAsset.url,
        liveFacePublicId: liveFaceAsset.public_id,
        verifiedAt: success ? new Date() : user.kycInfo?.verifiedAt,
        confidence,
        verdict,
    };
    if (success) {
        const wasVerified = user.isVerified;
        user.isVerified = true;
        user.reputationScore = (user.reputationScore || 0) + (wasVerified ? 5 : 80);
        if (!user.skills.includes('Identity Verified')) {
            user.skills.push('Identity Verified');
        }
    }
    await user.save({ validateBeforeSave: false });
    if (!success) {
        return res.status(200).json({
            status: 'fail',
            success: false,
            message: pythonData.message || 'Face verification failed.',
            verdict,
            confidence,
        });
    }
    res.status(200).json({
        status: 'success',
        success: true,
        message: 'KYC verified successfully.',
        verdict,
        confidence,
        data: {
            isVerified: user.isVerified,
            reputationScore: user.reputationScore,
            kycInfo: {
                idCardUrl: user.kycInfo?.idCardUrl,
                liveFaceUrl: user.kycInfo?.liveFaceUrl,
                verifiedAt: user.kycInfo?.verifiedAt,
                confidence: user.kycInfo?.confidence,
                verdict: user.kycInfo?.verdict,
            },
        },
    });
});
const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el))
            newObj[el] = obj[el];
    });
    return newObj;
};
// ... existing code ...
exports.updateMe = (0, catchAsync_1.default)(async (req, res, next) => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError_1.default('This route is not for password updates. Please use /updateMyPassword.', 400));
    }
    // 2) Filtered out unwanted field names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'companyName', 'industry', 'website', 'city', 'country', 'bio', 'linkedAccounts', 'username');
    // Sync companyName with name for company users so it applies globally (e.g. on comments)
    if (req.user && req.user.role === 'company' && filteredBody.companyName) {
        filteredBody.name = filteredBody.companyName;
    }
    // 3) Update user document
    const updatedUser = await User_1.default.findByIdAndUpdate(req.user.id, filteredBody, {
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
const isImage = (buffer) => {
    if (!buffer || buffer.length < 4)
        return false;
    // Check for JPEG (FF D8 FF)
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF)
        return true;
    // Check for PNG (89 50 4E 47)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47)
        return true;
    return false;
};
exports.uploadAvatar = (0, catchAsync_1.default)(async (req, res, next) => {
    if (!req.file)
        return next(new AppError_1.default('Please upload an image', 400));
    const result = await (0, cloudinary_1.uploadToCloudinary)(req.file);
    const updatedUser = await User_1.default.findByIdAndUpdate(req.user.id, { avatar: result.url }, {
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
exports.uploadCoverPhoto = (0, catchAsync_1.default)(async (req, res, next) => {
    if (!req.file)
        return next(new AppError_1.default('Please upload an image', 400));
    const result = await (0, cloudinary_1.uploadToCloudinary)(req.file);
    const updatedUser = await User_1.default.findByIdAndUpdate(req.user.id, { coverPhoto: result.url }, {
        new: true,
        runValidators: false
    });
    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
            url: result.url
        }
    });
});
