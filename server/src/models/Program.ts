import mongoose from 'mongoose';

const programSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  companyName: String,
  bountyRange: String,
  type: {
    type: String,
    enum: ['BBP', 'VDP'],
    required: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Active', 'Suspended', 'Rejected', 'Banned'],
    default: 'Draft',
  },
  suspensionReason: String,
  /** Optional HTML from admin moderation dialog (personal notes). */
  moderationCommentHtml: {
    type: String,
    default: '',
  },
  /** When set and in the past, releaseExpiredProgramBans() restores Active. Null = permanent ban until manual reactivation. */
  bannedUntil: {
    type: Date,
    default: null,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  description: String,
  rulesOfEngagement: {
    type: String,
    default: ''
  },
  safeHarbor: {
    type: String,
    default: ''
  },
  submissionGuidelines: {
    type: String,
    default: ''
  },
  scope: [{
    asset: { type: String },
    type: { type: String }, // Explicit definition to allow 'type' field
    instruction: { type: String },
    tier: { type: String }
  }],
  outOfScope: [{
    asset: String,
    reason: String,
  }],
  slas: {
    firstResponse: { type: Number, default: 24 }, // hours
    triage: { type: Number, default: 48 }, // hours
    bounty: { type: Number, default: 168 }, // hours (7 days)
    resolution: { type: Number, default: 360 } // hours (15 days)
  },
  rewards: {
    critical: { 
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 }
    },
    high: { 
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 }
    },
    medium: { 
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 }
    },
    low: { 
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 }
    },
  },
}, {
  timestamps: true,
});

const Program = mongoose.model('Program', programSchema);
export default Program;
