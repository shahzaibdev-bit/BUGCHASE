export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected';
export type DisputePriority = 'low' | 'medium' | 'high' | 'critical';
export type DisputeAwaitingReply = 'raiser' | 'support';
export type DisputeCategory =
  | 'severity'
  | 'payout'
  | 'duplicate'
  | 'scope'
  | 'conduct'
  | 'other';

export interface DisputeMessage {
  _id?: string;
  senderId?: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

export interface Dispute {
  _id: string;
  disputeId: string;
  subject: string;
  description: string;
  category: DisputeCategory;
  status: DisputeStatus;
  priority: DisputePriority;
  awaitingReplyFrom?: DisputeAwaitingReply;
  canReply?: boolean;
  raisedBy?: string;
  raisedByName: string;
  raisedByEmail?: string;
  raisedByRole: string;
  reportRef?: string;
  reportLabel?: string;
  assignedTo?: string;
  assignedToName?: string;
  messages: DisputeMessage[];
  resolution?: {
    outcome?: string;
    note?: string;
    resolvedByName?: string;
    resolvedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}
