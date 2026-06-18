import mongoose, { Document, Model } from 'mongoose';

export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected';
export type DisputePriority = 'low' | 'medium' | 'high' | 'critical';
/** Who may send the next message in the dispute thread. */
export type DisputeAwaitingReply = 'raiser' | 'support';
export type DisputeCategory =
  | 'severity'
  | 'payout'
  | 'duplicate'
  | 'scope'
  | 'conduct'
  | 'other';

export interface IDisputeMessage {
  senderId?: mongoose.Types.ObjectId;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: Date;
}

export interface IDisputeEmailThreadSide {
  subject: string;
  rootMessageId: string;
  lastMessageId: string;
  recipientEmail?: string;
}

export interface IDisputeEmailThread {
  raiser?: IDisputeEmailThreadSide;
  support?: IDisputeEmailThreadSide;
}

export interface IDispute extends Document {
  disputeId: string;
  subject: string;
  description: string;
  category: DisputeCategory;
  status: DisputeStatus;
  priority: DisputePriority;
  /** When 'raiser', the ticket creator may reply; otherwise only support may post. */
  awaitingReplyFrom: DisputeAwaitingReply;

  // Who raised it (a company or researcher on the platform).
  raisedBy?: mongoose.Types.ObjectId;
  raisedByName: string;
  raisedByEmail?: string;
  raisedByRole: string;

  // Optional link to the report the dispute concerns.
  reportRef?: mongoose.Types.ObjectId;
  reportLabel?: string;

  // Support staff handling it.
  assignedTo?: mongoose.Types.ObjectId;
  assignedToName?: string;

  /** Tracks Message-IDs so Gmail/Outlook keep dispute emails in one thread. */
  emailThread?: IDisputeEmailThread;

  messages: IDisputeMessage[];

  resolution?: {
    outcome?: 'upheld' | 'rejected' | 'compromise' | 'withdrawn';
    note?: string;
    resolvedBy?: mongoose.Types.ObjectId;
    resolvedByName?: string;
    resolvedAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new mongoose.Schema<IDisputeMessage>(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const disputeSchema = new mongoose.Schema<IDispute>(
  {
    disputeId: { type: String, unique: true, index: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['severity', 'payout', 'duplicate', 'scope', 'conduct', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['open', 'in_review', 'resolved', 'rejected'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    awaitingReplyFrom: {
      type: String,
      enum: ['raiser', 'support'],
      default: 'support',
    },

    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    raisedByName: { type: String, required: true },
    raisedByEmail: String,
    raisedByRole: { type: String, default: 'researcher' },

    reportRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
    reportLabel: String,

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedToName: String,

    emailThread: {
      raiser: {
        subject: String,
        rootMessageId: String,
        lastMessageId: String,
      },
      support: {
        subject: String,
        rootMessageId: String,
        lastMessageId: String,
        recipientEmail: String,
      },
    },

    messages: [messageSchema],

    resolution: {
      outcome: { type: String, enum: ['upheld', 'rejected', 'compromise', 'withdrawn'] },
      note: String,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolvedByName: String,
      resolvedAt: Date,
    },
  },
  { collection: 'disputes', timestamps: true }
);

const Dispute: Model<IDispute> =
  (mongoose.models.Dispute as Model<IDispute>) ||
  mongoose.model<IDispute>('Dispute', disputeSchema);

export default Dispute;
