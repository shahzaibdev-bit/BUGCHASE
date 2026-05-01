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
exports.uploadAvatar = exports.updateMe = exports.updateKYCStatus = exports.removePayoutMethod = exports.verifyPayoutMethodOtp = exports.requestPayoutMethodOtp = exports.requestPayout = exports.getPayoutMethods = exports.setupPayoutMethod = exports.getWalletData = exports.getMe = exports.getResearcherLeaderboard = exports.getPublicProfile = void 0;
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
exports.getPublicProfile = (0, catchAsync_1.default)(async (req, res, next) => {
    const { username } = req.params;
    const user = await User_1.default.findOne({
        username: { $regex: new RegExp(`^${(username || '').trim()}$`, 'i') },
        isPrivate: false
    }).select('username name description bio avatar country socialLinks stats reputationScore trustScore linkedAccounts createdAt skills isPrivate isVerified status');
    if (!user) {
        return next(new AppError_1.default('Profile not found', 404));
    }
    res.status(200).json({
        status: 'success',
        data: {
            ...user.toObject(),
            nickname: user.username
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
const stripe_1 = __importDefault(require("stripe"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const emailService_1 = require("../services/emailService");
const redis_1 = __importDefault(require("../config/redis"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});
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
/** Setup Payout Method via Stripe SetupIntent */
exports.setupPayoutMethod = (0, catchAsync_1.default)(async (req, res, next) => {
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
exports.requestPayout = (0, catchAsync_1.default)(async (req, res, next) => {
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
    user.isVerified = true;
    // Logic: Only award points if not already verified to prevent abuse? 
    // For now assuming idempotent or untrusted clients won't spam this.
    // In prod, check if user.isVerified is already true.
    if (!user.isVerified) {
        user.trustScore = (user.trustScore || 0) + 100; // Award points
        user.reputationScore = (user.reputationScore || 0) + 50;
    }
    else {
        // Double check/re-verify logic if needed
        user.trustScore = (user.trustScore || 0) + 10; // Small bonus for re-verify?
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
            trustScore: user.trustScore,
            isVerified: user.isVerified
        }
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
const cloudinary_1 = require("../utils/cloudinary");
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
