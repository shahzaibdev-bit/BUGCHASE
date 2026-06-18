import mongoose, { Document, Model } from 'mongoose';

export type TriagerInviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface ITriagerReassignmentInvite extends Document {
  token: string;
  dispute: mongoose.Types.ObjectId;
  disputePublicId: string;
  report: mongoose.Types.ObjectId;
  reportPublicId?: string;
  invitedTriager: mongoose.Types.ObjectId;
  invitedTriagerName: string;
  invitedTriagerEmail: string;
  previousTriager?: mongoose.Types.ObjectId;
  previousTriagerName?: string;
  invitedBy: mongoose.Types.ObjectId;
  invitedByName: string;
  status: TriagerInviteStatus;
  expiresAt: Date;
  respondedAt?: Date;
  matchSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const triagerReassignmentInviteSchema = new mongoose.Schema<ITriagerReassignmentInvite>(
  {
    token: { type: String, unique: true, index: true, required: true },
    dispute: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispute', required: true, index: true },
    disputePublicId: { type: String, required: true },
    report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true, index: true },
    reportPublicId: String,
    invitedTriager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invitedTriagerName: { type: String, required: true },
    invitedTriagerEmail: { type: String, required: true },
    previousTriager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    previousTriagerName: String,
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invitedByName: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: Date,
    matchSummary: String,
  },
  { collection: 'triager_reassignment_invites', timestamps: true },
);

const TriagerReassignmentInvite: Model<ITriagerReassignmentInvite> =
  (mongoose.models.TriagerReassignmentInvite as Model<ITriagerReassignmentInvite>) ||
  mongoose.model<ITriagerReassignmentInvite>('TriagerReassignmentInvite', triagerReassignmentInviteSchema);

export default TriagerReassignmentInvite;
