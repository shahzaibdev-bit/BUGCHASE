import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  researcherId: {
    type: mongoose.Schema.Types.ObjectId,
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
  bounty: {
    type: Number,
    default: 0
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
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
      },
      content: { type: String, required: true },
      type: { 
          type: String, 
          enum: ['comment', 'status_change', 'severity_update', 'assignment'], 
          default: 'comment' 
      },
      metadata: { type: mongoose.Schema.Types.Mixed }, // Flexible for reason, oldStatus, newStatus
      createdAt: { type: Date, default: Date.now }
  }],

  // Triage Info
  triagerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  triagerNote: String,
  isReproduced: { type: Boolean, default: false },
  isValidAsset: { type: Boolean, default: false },
}, {
  timestamps: true,
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
