"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictTo = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const util_1 = require("util");
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
exports.protect = (0, catchAsync_1.default)(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        if (token === 'null' || token === 'undefined')
            token = undefined;
    }
    if (!token && req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    if (!token) {
        return next(new AppError_1.default('You are not logged in! Please log in to get access.', 401));
    }
    // Verify token
    let decoded;
    try {
        // @ts-ignore - promisify types are tricky with jwt.verify
        decoded = await (0, util_1.promisify)(jsonwebtoken_1.default.verify)(token, process.env.JWT_SECRET);
    }
    catch (err) {
        return next(new AppError_1.default('Invalid token. Please log in again.', 401));
    }
    // Check if user still exists
    const currentUser = await User_1.default.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError_1.default('The user belonging to this token does no longer exist.', 401));
    }
    // Grant Access
    req.user = currentUser;
    next();
});
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // role is in req.user from protect middleware
        if (!roles.includes(req.user.role)) {
            return next(new AppError_1.default('You do not have permission to perform this action', 403));
        }
        next();
    };
};
exports.restrictTo = restrictTo;
