"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicProgramById = exports.getPublicPrograms = void 0;
const Program_1 = __importDefault(require("../models/Program"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
exports.getPublicPrograms = (0, catchAsync_1.default)(async (req, res, next) => {
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
    const program = await Program_1.default.findOne({
        _id: req.params.id,
        status: 'Active'
        // We might allow private if the user has access, but for now strict public
    });
    if (!program) {
        return next(new AppError_1.default('Program not found or not active', 404));
    }
    // Checking if private and user not invited (Placeholder logic)
    if (program.isPrivate) {
        // Check invitation logic here in future
    }
    res.status(200).json({
        status: 'success',
        data: program
    });
});
