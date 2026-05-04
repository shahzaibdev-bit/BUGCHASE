"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const reportSchema = new mongoose_1.default.Schema({
    researcherId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    programId: {
        type: String, // Changed to String to support mock program IDs (e.g. "1")
        required: true,
    },
    title: { type: String, required: true },
    reportId: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    vulnerableEndpoint: { type: String, trim: true },
    description: { type: String, required: true },
    pocSteps: { type: String, required: true },
    severity: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low', 'None'],
        required: true,
    },
    vulnerabilityCategory: { type: String }, // e.g. RCE, XSS
    cvssVector: String,
    cvssScore: Number,
    impact: { type: String },
    assets: [String], // Asset URLs involved
    status: {
        type: String,
        enum: ['Submitted', 'Triaging', 'Triaged', 'Pending_Fix', 'Resolved', 'Paid', 'Spam', 'Duplicate', 'NA', 'Needs Info', 'Out-of-Scope', 'Under Review', 'Closed'],
        default: 'Submitted',
    },
    bounty: {
        type: Number,
        default: 0
    },
    duplicateOf: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Report',
        default: null,
    },
    /** AI duplicate candidates (triager/admin only in API responses). */
    duplicateCandidates: [{
            reportMongoId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Report', required: true },
            similarityScore: { type: Number, required: true },
            candidateReportId: { type: String },
            candidateTitle: { type: String },
            candidateSubmittedAt: { type: Date },
            detectedAt: { type: Date, default: Date.now },
        }],
    /**
     * not_applicable — no candidates at submit time
     * pending — triager must confirm duplicate or dismiss before promote/resolve
     * cleared — triager dismissed candidates
     * confirmed_duplicate — marked duplicate of another report
     */
    duplicateReviewStatus: {
        type: String,
        enum: ['not_applicable', 'pending', 'cleared', 'confirmed_duplicate'],
        default: 'not_applicable',
    },
    /** Throttles automatic re-scans when triager opens details (no candidates yet). */
    duplicateLastScannedAt: { type: Date },
    // Attachments (S3 URLs or local paths)
    attachments: [{
            name: String,
            url: String,
            type: String
        }],
    // Certificates
    certificateId: {
        type: String,
        unique: true,
        sparse: true
    },
    // Comments System
    comments: [{
            sender: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            content: { type: String, required: true },
            type: {
                type: String,
                enum: ['comment', 'status_change', 'severity_update', 'assignment', 'bounty_awarded', 'promoted'],
                default: 'comment'
            },
            attachments: [String], // Array of Cloudinary URLs
            metadata: { type: mongoose_1.default.Schema.Types.Mixed }, // Flexible for reason, oldStatus, newStatus
            createdAt: { type: Date, default: Date.now }
        }],
    // Triage Info
    triagerId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
    },
    triagerNote: String,
    isReproduced: { type: Boolean, default: false },
    isValidAsset: { type: Boolean, default: false },
    /** One-time researcher reputation awards/penalties per report (see researcherReputationService). */
    reputationSnapshot: {
        triagePromoteAwarded: { type: Boolean, default: false },
        companyResolvedAwarded: { type: Boolean, default: false },
        duplicateAwarded: { type: Boolean, default: false },
        naPenaltyAwarded: { type: Boolean, default: false },
        spamPenaltyAwarded: { type: Boolean, default: false },
    },
}, {
    timestamps: true,
});
const Report = mongoose_1.default.model('Report', reportSchema);
exports.default = Report;
