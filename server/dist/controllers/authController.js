"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = exports.updateMe = exports.getMe = exports.logout = exports.login = exports.verifyEmail = exports.signup = void 0;
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const redis_1 = __importDefault(require("../config/redis"));
const emailService_1 = require("../services/emailService");
const tokenService_1 = require("../services/tokenService");
const rateLimit_1 = require("../middlewares/rateLimit");
// Helper to calculate reputation based on profile completeness
const calculateDynamicReputation = (user) => {
    let score = 0;
    // 1. Signup Bonus (Base) - 10 points
    score += 10;
    // 2. Username Set - 10 points
    if (user.username)
        score += 10;
    // 3. Bio Added (Must be updated from default) - 20 points
    if (user.bioUpdated && user.bio && user.bio.length > 0)
        score += 20;
    // 4. Country Set - 10 points
    if (user.country)
        score += 10;
    // 5. Social Links (20 points for at least one)
    let socialCount = 0;
    if (user.linkedAccounts?.github)
        socialCount++;
    if (user.linkedAccounts?.linkedin)
        socialCount++;
    if (user.linkedAccounts?.twitter)
        socialCount++;
    // score += Math.min(socialCount * 10, 20); // Old logic
    if (socialCount >= 1)
        score += 20; // New logic: All 20 points for just one link
    // 6. KYC Verified - 80 points
    if (user.isVerified)
        score += 80;
    return score;
};
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
    // Generate Token (Single Session Token)
    const token = (0, tokenService_1.signToken)(user._id.toString());
    // Set Token Cookie
    res.cookie('jwt', token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days (match with JWT_EXPIRES_IN if possible, covering simplified case)
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    // Remove password from output
    const userObj = user.toObject();
    delete userObj.password;
    // Inject Reputation
    userObj.reputationScore = (userObj.reputationScore || 0) + calculateDynamicReputation(userObj);
    // Reset Rate Limit on Success
    await (0, rateLimit_1.resetRateLimit)(req, 'auth');
    res.status(200).json({
        status: 'success',
        token,
        user: userObj,
    });
});
exports.login = (0, catchAsync_1.default)(async (req, res, next) => {
    const { email, password } = req.body;
    // Check if email & password exist
    console.log("Login attempt:", email, password ? "***" : "MISSING");
    if (!email || !password) {
        return next(new AppError_1.default('Please provide email and password', 400));
    }
    // Check if user exists && password is correct
    // Allow login with email or username
    const user = await User_1.default.findOne({
        $or: [{ email: email }, { username: email }]
    }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError_1.default('Incorrect email or password', 401));
    }
    if (!user.isEmailVerified) {
        return next(new AppError_1.default('Please verify your email first', 401));
    }
    // Generate Token
    const token = (0, tokenService_1.signToken)(user._id.toString());
    // Set Token Cookie
    res.cookie('jwt', token, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    const userObj = user.toObject();
    delete userObj.password;
    // Inject Reputation
    userObj.reputationScore = (userObj.reputationScore || 0) + calculateDynamicReputation(userObj);
    // Reset Rate Limit on Success
    await (0, rateLimit_1.resetRateLimit)(req, 'auth');
    res.status(200).json({
        status: 'success',
        token,
        user: userObj,
    });
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
    // Inject Reputation
    userObj.reputationScore = (userObj.reputationScore || 0) + calculateDynamicReputation(userObj);
    // Inject Reports Count
    const reportsCount = await Report_1.default.countDocuments({ researcher: req.user._id });
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
    userObj.reputationScore = (userObj.reputationScore || 0) + calculateDynamicReputation(userObj);
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
