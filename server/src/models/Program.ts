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
    enum: ['Draft', 'Pending', 'Active', 'Suspended', 'Rejected'],
    default: 'Draft',
  },
  suspensionReason: String,
  isPrivate: {
    type: Boolean,
    default: false,
  },
  description: String,
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
