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
  reportId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  vulnerableEndpoint: { type: String, trim: true },
  /** Submission wizard: Web | API | Contract — improves public profile analytics when set. */
  assetType: { type: String, trim: true },
  description: { type: String, required: true },
  pocSteps: { type: String, required: true },
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low', 'None'],
    required: true,
  },
  /** Severity as originally submitted by the researcher. Never overwritten by AI/triagers. */
  researcherSeverity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low', 'None'],
  },
  vulnerabilityCategory: { type: String }, // e.g. RCE, XSS
  cvssVector: String,
  cvssScore: Number,
  impact: { type: String }, 
  assets: [String], // Asset URLs involved

  /** AI CVSS triage outcome (populated by cvss_engine FastAPI service). */
  aiTriage: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
      default: 'skipped',
    },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low', 'None'],
    },
    cvssVector: String,
    cvssScore: Number,
    reasoning: String,
    severityChanged: { type: Boolean, default: false },
    error: String,
    processedAt: Date,
    modelKey: String,
    modelLabel: String,
  },
  
  status: {
    type: String,
    enum: ['Submitted', 'Triaging', 'Triaged', 'Pending_Fix', 'Resolved', 'Paid', 'Spam', 'Duplicate', 'NA', 'Needs Info', 'Out-of-Scope', 'Under Review', 'Closed', 'In Dispute'],
    default: 'Submitted',
  },
  /** Snapshot of status before a linked support dispute moved the report to In Dispute. */
  statusBeforeDispute: { type: String },
  bounty: {
    type: Number,
    default: 0
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    default: null,
  },

  /** Candidate duplicates returned by the Atlas Search metadata filter. */
  duplicateCandidates: [{
    reportMongoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    similarityScore: { type: Number, required: true },
    candidateReportId: { type: String },
    candidateTitle: { type: String },
    candidateSubmittedAt: { type: Date },
    detectedAt: { type: Date, default: Date.now },
    /** Which $search pass produced the candidate: strict, fallback, or LLM-promoted. */
    source: {
      type: String,
      enum: ['strict', 'fallback', 'llm'],
      default: 'strict',
    },
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

  /**
   * Output of the local LLM deep-reasoning step. Surfaced to triagers in the
   * dashboard so they can see the AI's duplicate verdict and the canned
   * researcher communication (which is only posted/emailed once the human
   * triager confirms the duplicate).
   */
  aiDuplicateAnalysis: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'no_candidates', 'skipped'],
      default: 'pending',
    },
    isDuplicate: { type: Boolean, default: false },
    confidenceScore: { type: Number, default: 0 },
    primaryDuplicateId: { type: String, default: null },
    reasoning: String,
    researcherCommunication: String,
    error: String,
    processedAt: Date,
    /** Set to true after a triager confirms the duplicate; gates posting. */
    communicationPosted: { type: Boolean, default: false },
  },
  
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
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
      },
      content: { type: String, required: true },
      type: { 
          type: String, 
          enum: ['comment', 'status_change', 'severity_update', 'assignment', 'bounty_awarded', 'promoted', 'ai_triage'], 
          default: 'comment' 
      },
      attachments: [String], // Array of Cloudinary URLs
      metadata: { type: mongoose.Schema.Types.Mixed }, // Flexible for reason, oldStatus, newStatus
      createdAt: { type: Date, default: Date.now }
  }],

  // Triage Info
  triagerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  /** Previous / collaborating triagers who retain read access after reassignment. */
  triagerParticipants: [{
    triagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['primary', 'collaborator'], default: 'collaborator' },
    addedAt: { type: Date, default: Date.now },
  }],
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

const Report = mongoose.model('Report', reportSchema);
export default Report;
