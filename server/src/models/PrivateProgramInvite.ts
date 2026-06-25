import mongoose from 'mongoose';

const privateProgramInviteSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    researcherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'revoked'],
      default: 'invited',
    },
    source: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual',
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    scoreSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

privateProgramInviteSchema.index(
  { programId: 1, researcherId: 1 },
  { unique: true, name: 'uniq_program_researcher_invite' }
);

const PrivateProgramInvite = mongoose.model('PrivateProgramInvite', privateProgramInviteSchema);
export default PrivateProgramInvite;
