"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const userSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name!'],
    },
    username: {
        type: String,
        unique: true,
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false,
    },
    role: {
        type: String,
        enum: ['researcher', 'company', 'triager', 'admin'],
        default: 'researcher',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    avatar: {
        type: String,
        default: 'default.jpg',
    },
    // Researcher Specific
    reputationScore: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    country: String,
    bio: {
        type: String,
        default: "This researcher prefers to let their bugs speak for themselves."
    },
    bioUpdated: { type: Boolean, default: false },
    skills: [String],
    linkedAccounts: {
        github: String,
        linkedin: String,
        twitter: String,
    },
    // Company Specific
    companyName: String,
    domainVerified: { type: Boolean, default: false },
    escrowBalance: { type: Number, default: 0 },
    industry: String,
    website: String,
    city: String,
    // Triager Specific
    expertise: [String],
    severityPreferences: [String],
    maxConcurrentReports: { type: Number, default: 10 },
    isAvailable: { type: Boolean, default: true },
    // Team Management
    parentCompany: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
    },
    companyRole: {
        type: String,
        enum: ['admin', 'manager', 'viewer', 'custom'],
    },
    permissions: [String],
    isPrivate: {
        type: Boolean,
        default: false
    },
    // Domain Verification
    verificationToken: String,
    verifiedAssets: [{
            id: String,
            domain: String,
            method: {
                type: String,
                enum: ['DNS_TXT', 'SECURITY_TXT'],
            },
            verificationToken: String, // Added
            dateVerified: String,
            status: {
                type: String,
                enum: ['verified', 'disabled'],
                default: 'verified'
            },
            inScope: [String],
            outScope: [String]
        }],
    achievements: [{
            title: String,
            sub: String,
            date: Date,
            desc: String,
            icon: String // store icon name e.g. 'Clock'
        }],
    status: {
        type: String,
        enum: ['Active', 'Suspended', 'Banned'],
        default: 'Active',
    },
    statusReason: String,
    stripeCustomerId: String,
    payoutHold: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    this.password = await bcrypt_1.default.hash(this.password, 12);
    next();
});
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt_1.default.compare(candidatePassword, userPassword);
};
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
