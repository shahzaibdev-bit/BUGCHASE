"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.updateMe = exports.updateKYCStatus = exports.getPublicProfile = void 0;
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
exports.getPublicProfile = (0, catchAsync_1.default)(async (req, res, next) => {
    const { username } = req.params;
    // Use case-insensitive regex to find the user
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
            nickname: user.username // Ensure frontend compatibility if it expects nickname
        },
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
    if (!req.file) {
        return next(new AppError_1.default('Please upload a file', 400));
    }
    // Security: Validate file content via magic bytes (prevents extension spoofing)
    if (!isImage(req.file.buffer)) {
        return next(new AppError_1.default('Invalid file type. Only JPEG and PNG are allowed.', 400));
    }
    const result = await (0, cloudinary_1.uploadToCloudinary)(req.file.buffer);
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
