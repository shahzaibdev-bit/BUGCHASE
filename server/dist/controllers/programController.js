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
exports.getPublicProgramById = exports.getPublicPrograms = void 0;
const Program_1 = __importDefault(require("../models/Program"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const programModerationService_1 = require("../services/programModerationService");
exports.getPublicPrograms = (0, catchAsync_1.default)(async (req, res, next) => {
    await (0, programModerationService_1.releaseExpiredProgramBans)();
    // 1. Fetch only ACTIVE programs (and not private unless we handle invites later)
    // For now, public researcher view should only show 'Active' and public programs
    // If we want researchers to see private programs they are invited to, that requires more logic.
    // Assuming 'isPrivate: false' means public.
    const programs = await Program_1.default.find({
        status: 'Active',
        isPrivate: false
    })
        .select('title companyName type description rewards bountyRange createdAt companyId') // Ensure companyId is selected so it can be populated
        .populate('companyId', 'avatar') // Populate avatar from the User model
        .sort({ createdAt: -1 });
    res.status(200).json({
        status: 'success',
        results: programs.length,
        data: programs
    });
});
exports.getPublicProgramById = (0, catchAsync_1.default)(async (req, res, next) => {
    await (0, programModerationService_1.releaseExpiredProgramBans)();
    const program = await Program_1.default.findOne({
        _id: req.params.id,
        status: 'Active'
        // We might allow private if the user has access, but for now strict public
    }).populate('companyId', 'name email avatar companyName website industry city domainVerified verifiedAssets');
    if (!program) {
        return next(new AppError_1.default('Program not found or not active', 404));
    }
    // Checking if private and user not invited (Placeholder logic)
    if (program.isPrivate) {
        // Check invitation logic here in future
    }
    // Fetch reports for this program to build Hall of Fame
    const Report = (await Promise.resolve().then(() => __importStar(require('../models/Report')))).default;
    const reports = await Report.find({ programId: program._id })
        .populate('researcherId', 'username name avatar reputationScore')
        .select('researcherId status');
    // Filter to unique researchers
    const uniqueResearchers = new Map();
    reports.forEach((report) => {
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
        .sort((a, b) => (b.reputationScore || 0) - (a.reputationScore || 0));
    res.status(200).json({
        status: 'success',
        data: {
            program,
            hallOfFame
        }
    });
});
