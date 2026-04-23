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
    // Attachments (S3 URLs or local paths)
    attachments: [{
            name: String,
            url: String,
            type: String
        }],
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
                enum: ['comment', 'status_change', 'severity_update', 'assignment'],
                default: 'comment'
            },
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
}, {
    timestamps: true,
});
const Report = mongoose_1.default.model('Report', reportSchema);
exports.default = Report;
