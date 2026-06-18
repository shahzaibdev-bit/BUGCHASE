export interface SupportUser {
  _id: string;
  name: string;
  username?: string;
  email: string;
  role: string;
  avatar?: string;
  status?: string;
  expertise?: string[];
  country?: string;
  bio?: string;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  linkedAccounts?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

export interface LoginHistoryItem {
  id: string;
  ip: string;
  browserSummary: string;
  createdAt: string;
  isCurrent?: boolean;
}

export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected';
export type DisputePriority = 'low' | 'medium' | 'high' | 'critical';
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
  raisedBy?: string;
  raisedByName: string;
  raisedByEmail?: string;
  raisedByRole: string;
  reportRef?: string;
  reportLabel?: string;
  awaitingReplyFrom?: 'raiser' | 'support';
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

export interface SupportReportUser {
  _id?: string;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string;
  role?: string;
}

export interface SupportReportComment {
  _id?: string;
  sender?: SupportReportUser | string;
  content: string;
  type?: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SupportProgram {
  _id?: string;
  title?: string;
  companyName?: string;
  type?: string;
  bountyRange?: string;
  companyId?: SupportReportUser | string;
}

export interface SupportReport {
  _id: string;
  reportId?: string;
  title: string;
  description: string;
  impact?: string;
  pocSteps?: string;
  severity: string;
  status: string;
  vulnerabilityCategory?: string;
  vulnerableEndpoint?: string;
  assets?: string[];
  researcherId?: SupportReportUser | string;
  triagerId?: SupportReportUser | string;
  programId?: SupportProgram | string;
  comments: SupportReportComment[];
  createdAt?: string;
  aiTriage?: { status?: string };
  aiDuplicateAnalysis?: { status?: string };
}

export interface DisputeStats {
  total: number;
  open: number;
  inReview: number;
  resolved: number;
  rejected: number;
}
