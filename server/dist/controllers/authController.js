"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.updateMe = exports.getMe = exports.logout = exports.getLoginHistory = exports.disableTwoFactor = exports.enableTwoFactor = exports.setupTwoFactor = exports.completeLoginWithTwoFactor = exports.login = exports.verifyEmail = exports.signup = void 0;
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const redis_1 = __importDefault(require("../config/redis"));
const emailService_1 = require("../services/emailService");
const tokenService_1 = require("../services/tokenService");
const qrcode_1 = __importDefault(require("qrcode"));
const LoginEvent_1 = __importDefault(require("../models/LoginEvent"));
const loginAuditService_1 = require("../services/loginAuditService");
const requestMeta_1 = require("../utils/requestMeta");
const rateLimit_1 = require("../middlewares/rateLimit");
const profileCompletionReputation_1 = require("../utils/profileCompletionReputation");
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function generateTotpSecret(length = 32) {
    const bytes = crypto_1.default.randomBytes(length);
    let output = '';
    for (let i = 0; i < bytes.length; i += 1) {
        output += BASE32_ALPHABET[bytes[i] % BASE32_ALPHABET.length];
    }
    return output;
}
function decodeBase32(secret) {
    const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (const char of clean) {
        const value = BASE32_ALPHABET.indexOf(char);
        if (value === -1)
            continue;
        bits += value.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}
function generateTotpToken(secret, timeStep = Math.floor(Date.now() / 1000 / 30)) {
    const key = decodeBase32(secret);
    const counter = Buffer.alloc(8);
    counter.writeUInt32BE(Math.floor(timeStep / 0x100000000), 0);
    counter.writeUInt32BE(timeStep >>> 0, 4);
    const hmac = crypto_1.default.createHmac('sha1', key).update(counter).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    return String(code % 1000000).padStart(6, '0');
}
function verifyTotp(secret, token, window = 1) {
    const cleanToken = String(token || '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanToken))
        return false;
    const currentStep = Math.floor(Date.now() / 1000 / 30);
    for (let offset = -window; offset <= window; offset += 1) {
        const expected = generateTotpToken(secret, currentStep + offset);
        const expectedBuffer = Buffer.from(expected);
        const tokenBuffer = Buffer.from(cleanToken);
        if (expectedBuffer.length === tokenBuffer.length && crypto_1.default.timingSafeEqual(expectedBuffer, tokenBuffer)) {
            return true;
        }
    }
    return false;
}
/** Cookie + JWT + profile payload + login audit (new IP / browser email). */
async function issueSessionAndRespond(req, res, user) {
    const token = (0, tokenService_1.signToken)(user._id.toString());
    res.cookie('jwt', token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    delete userObj.twoFactorSecret;
    userObj.profileCompletionScore = (0, profileCompletionReputation_1.getProfileCompletionReputationScore)(userObj);
    await (0, rateLimit_1.resetRateLimit)(req, 'auth');
    const ip = (0, requestMeta_1.getClientIp)(req);
    const rawUa = req.get('user-agent') || '';
    void (0, loginAuditService_1.recordSuccessfulLoginAndNotify)({
        userId: user._id,
        email: user.email,
        name: user.name,
        ip,
        rawUa,
    }).then(() => (0, loginAuditService_1.pruneLoginEvents)(user._id).catch(() => { }));
    res.status(200).json({
        status: 'success',
        token,
        user: userObj,
    });
}
exports.signup = (0, catchAsync_1.default)(async (req, res, next) => {
    const { name, email, password, role } = req.body;
    const existingUser = await User_1.default.findOne({ email });
    if (existingUser) {
        return next(new AppError_1.default('Email already in use', 400));
    }
    const username = email.split('@')[0];
    // Create User but NOT verified
    await User_1.default.create({
        name,
        email,
        username,
        password,
        role: role || 'researcher',
        isVerified: false,
        isEmailVerified: false,
        // bio will default to "This researcher prefers..."
        bioUpdated: false
    });
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Store in Redis with 10 min expiry
    await redis_1.default.set(`otp:${email}`, otp, 'EX', 600);
    // Send Email
    try {
        await (0, emailService_1.sendEmail)(email, 'Verify your BugChase Account', (0, emailService_1.otpTemplate)(otp));
    }
    catch (error) {
        console.error('Email Send Error:', error);
        // If email fails, we should probably rollback user creation or just let them retry
        return next(new AppError_1.default('There was an error sending the email. Try again later!', 500));
    }
    // Reset Rate Limit on Successful Signup Attempt
    await (0, rateLimit_1.resetRateLimit)(req, 'auth');
    res.status(201).json({
        status: 'success',
        message: 'OTP sent to email',
    });
});
exports.verifyEmail = (0, catchAsync_1.default)(async (req, res, next) => {
    const { email, otp } = req.body;
    const storedOtp = await redis_1.default.get(`otp:${email}`);
    if (!storedOtp || storedOtp !== otp) {
        return next(new AppError_1.default('Invalid or expired OTP', 400));
    }
    const user = await User_1.default.findOne({ email });
    if (!user) {
        return next(new AppError_1.default('User not found', 404));
    }
    user.isEmailVerified = true;
    await user.save({ validateBeforeSave: false });
    // Clear OTP
    await redis_1.default.del(`otp:${email}`);
    await issueSessionAndRespond(req, res, user);
});
exports.login = (0, catchAsync_1.default)(async (req, res, next) => {
    const { email, password, totp } = req.body;
    console.log('Login attempt:', email, password ? '***' : 'MISSING');
    if (!email || !password) {
        return next(new AppError_1.default('Please provide email and password', 400));
    }
    const user = await User_1.default.findOne({
        $or: [{ email: email }, { username: email }],
    }).select('+password +twoFactorSecret');
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError_1.default('Incorrect email or password', 401));
    }
    if (!user.isEmailVerified) {
        return next(new AppError_1.default('Please verify your email first', 401));
    }
    if (user.twoFactorEnabled) {
        const code = totp != null && String(totp).trim() !== '' ? String(totp).replace(/\s/g, '') : '';
        if (!code) {
            const twoFactorToken = (0, tokenService_1.signTwoFactorLoginPendingToken)(user._id.toString());
            return res.status(200).json({
                status: 'success',
                requiresTwoFactor: true,
                twoFactorToken,
            });
        }
        if (!user.twoFactorSecret) {
            return next(new AppError_1.default('Two-factor authentication is misconfigured. Contact support.', 500));
        }
        if (!verifyTotp(user.twoFactorSecret, code)) {
            return next(new AppError_1.default('Invalid two-factor code', 401));
        }
    }
    await issueSessionAndRespond(req, res, user);
});
exports.completeLoginWithTwoFactor = (0, catchAsync_1.default)(async (req, res, next) => {
    const { twoFactorToken, totp } = req.body;
    if (!twoFactorToken || totp == null || String(totp).trim() === '') {
        return next(new AppError_1.default('Missing two-factor authentication fields', 400));
    }
    let userId;
    try {
        userId = (0, tokenService_1.verifyTwoFactorLoginPendingToken)(String(twoFactorToken)).id;
    }
    catch {
        return next(new AppError_1.default('Session expired. Please log in again with your password.', 401));
    }
    const user = await User_1.default.findById(userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return next(new AppError_1.default('Invalid session', 401));
    }
    const code = String(totp).replace(/\s/g, '');
    if (!verifyTotp(user.twoFactorSecret, code)) {
        return next(new AppError_1.default('Invalid two-factor code', 401));
    }
    await issueSessionAndRespond(req, res, user);
});
exports.setupTwoFactor = (0, catchAsync_1.default)(async (req, res, next) => {
    const userId = req.user._id.toString();
    const secret = generateTotpSecret();
    await redis_1.default.set(`2fa_setup:${userId}`, secret, 'EX', 600);
    const issuer = encodeURIComponent('BugChase');
    const label = encodeURIComponent(String(req.user.email || req.user.username || 'account'));
    const otpauth = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    const qrDataUrl = await qrcode_1.default.toDataURL(otpauth);
    res.status(200).json({
        status: 'success',
        data: { secret, qrDataUrl },
    });
});
exports.enableTwoFactor = (0, catchAsync_1.default)(async (req, res, next) => {
    const { totp } = req.body;
    const userId = req.user._id.toString();
    const secret = await redis_1.default.get(`2fa_setup:${userId}`);
    if (!secret) {
        return next(new AppError_1.default('Setup expired or not started. Open “Set up 2FA” again.', 400));
    }
    const code = String(totp || '').replace(/\s/g, '');
    if (!verifyTotp(secret, code)) {
        return next(new AppError_1.default('Invalid authenticator code', 400));
    }
    await User_1.default.findByIdAndUpdate(userId, { twoFactorEnabled: true, twoFactorSecret: secret });
    await redis_1.default.del(`2fa_setup:${userId}`);
    const updated = await User_1.default.findById(userId);
    const userObj = updated.toObject();
    delete userObj.password;
    userObj.profileCompletionScore = (0, profileCompletionReputation_1.getProfileCompletionReputationScore)(userObj);
    res.status(200).json({ status: 'success', user: userObj });
});
exports.disableTwoFactor = (0, catchAsync_1.default)(async (req, res, next) => {
    const { password, totp } = req.body;
    if (!password || totp == null || String(totp).trim() === '') {
        return next(new AppError_1.default('Password and authenticator code are required', 400));
    }
    const user = await User_1.default.findById(req.user._id).select('+password +twoFactorSecret');
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return next(new AppError_1.default('Two-factor authentication is not enabled', 400));
    }
    if (!(await user.correctPassword(password, user.password))) {
        return next(new AppError_1.default('Incorrect password', 401));
    }
    if (!verifyTotp(user.twoFactorSecret, String(totp).replace(/\s/g, ''))) {
        return next(new AppError_1.default('Invalid authenticator code', 401));
    }
    user.twoFactorEnabled = false;
    user.set('twoFactorSecret', undefined);
    await user.save({ validateBeforeSave: false });
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.twoFactorSecret;
    userObj.profileCompletionScore = (0, profileCompletionReputation_1.getProfileCompletionReputationScore)(userObj);
    res.status(200).json({ status: 'success', user: userObj });
});
exports.getLoginHistory = (0, catchAsync_1.default)(async (req, res) => {
    const items = await LoginEvent_1.default.find({
        userId: req.user._id,
        success: true,
    })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('ip browserSummary userAgent createdAt')
        .lean();
    const mapped = items.map((row, idx) => ({
        id: String(row._id),
        ip: row.ip || '—',
        browserSummary: row.browserSummary || 'Unknown',
        createdAt: row.createdAt,
        isCurrent: idx === 0,
    }));
    res.status(200).json({ status: 'success', data: { items: mapped } });
});
const logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.status(200).json({ status: 'success' });
};
exports.logout = logout;
const Report_1 = __importDefault(require("../models/Report"));
exports.getMe = (0, catchAsync_1.default)(async (req, res, next) => {
    // User is already attached to req by protect middleware
    const userObj = req.user.toObject ? req.user.toObject() : req.user;
    userObj.profileCompletionScore = (0, profileCompletionReputation_1.getProfileCompletionReputationScore)(userObj);
    // Inject Reports Count
    const reportsCount = await Report_1.default.countDocuments({ researcherId: req.user._id });
    userObj.reportsCount = reportsCount;
    res.status(200).json({
        status: 'success',
        user: userObj,
    });
});
const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach((el) => {
        if (allowedFields.includes(el))
            newObj[el] = obj[el];
    });
    return newObj;
};
const updateMe = async (req, res, next) => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError_1.default('This route is not for password updates. Please use /updateMyPassword.', 400));
    }
    // Check for Username Uniqueness (if username is being updated)
    if (req.body.username) {
        const existingUser = await User_1.default.findOne({
            username: { $regex: new RegExp(`^${req.body.username}$`, 'i') },
            _id: { $ne: req.user.id } // Exclude current user
        });
        if (existingUser) {
            return next(new AppError_1.default('Nickname already taken. Please choose another one.', 400));
        }
    }
    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'username', 'email', 'country', 'bio', 'linkedAccounts', 'skills', 'hireable', 'showPayouts', 'isPrivate', 'notifications');
    // Check if bio is being updated
    if (filteredBody.bio) {
        filteredBody.bioUpdated = true;
    }
    // 3) Update user document
    const updatedUser = await User_1.default.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true,
    });
    const userObj = updatedUser.toObject();
    userObj.profileCompletionScore = (0, profileCompletionReputation_1.getProfileCompletionReputationScore)(userObj);
    res.status(200).json({
        status: 'success',
        user: userObj,
    });
};
exports.updateMe = updateMe;
exports.updatePassword = (0, catchAsync_1.default)(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    // 1) Check if current and new passwords are provided
    if (!currentPassword || !newPassword) {
        return next(new AppError_1.default('Please provide both your current and new password.', 400));
    }
    // 2) Get user from Collection (getUser middleware only gives us user without password)
    const user = await User_1.default.findById(req.user.id).select('+password');
    if (!user) {
        return next(new AppError_1.default('User not found.', 404));
    }
    // 3) Check if current password is correct
    if (!(await user.correctPassword(currentPassword, user.password))) {
        return next(new AppError_1.default('Your current password is wrong.', 401));
    }
    // 4) Update Password
    user.password = newPassword;
    await user.save();
    // 5) Log user in again using new Token
    const token = (0, tokenService_1.signToken)(user._id.toString());
    // Set Token Cookie
    res.cookie('jwt', token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    // Reset Rate Limit (Optional, but good since they successfully authenticated again)
    await (0, rateLimit_1.resetRateLimit)(req, 'auth');
    res.status(200).json({
        status: 'success',
        token, // Send token to client just in case they need it immediately
        message: 'Password updated successfully!',
    });
});
