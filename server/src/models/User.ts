import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password?: string;
  role: 'researcher' | 'company' | 'triager' | 'admin';
  isVerified: boolean;
  isEmailVerified: boolean;
  avatar: string;
  reputationScore: number;
  trustScore: number;
  walletBalance: number;
  country?: string;
  bio?: string;
  bioUpdated?: boolean;
  skills: string[];
  linkedAccounts: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
  companyName?: string;
  domainVerified: boolean;
  escrowBalance: number;
  industry?: string;
  website?: string;
  city?: string;

    expertise?: string[];
    severityPreferences?: string[];
    maxConcurrentReports?: number;
    isAvailable?: boolean;
    // Team Management
    parentCompany?: mongoose.Types.ObjectId;
    companyRole?: 'admin' | 'manager' | 'viewer' | 'custom';
    permissions?: string[];
    isPrivate: boolean; // Keeping existing
    
    // Domain Verification
    verificationToken?: string;
    verifiedAssets: {
        id: string;
        domain: string;
        method: 'DNS_TXT' | 'SECURITY_TXT'; 
        verificationToken: string; // Added as per request
        dateVerified: string; // ISO Date
        status: 'verified' | 'disabled';
    }[];
    achievements?: {
        title: string;
        sub: string;
        date: Date;
        desc: string;
        icon: string;
    }[];

  status: 'Active' | 'Suspended' | 'Banned';
  statusReason?: string;
  correctPassword(candidatePassword: string, userPassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>({
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
  trustScore: { type: Number, default: 0 },
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
    type: mongoose.Schema.Types.ObjectId,
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
        }
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
}, {
  timestamps: true,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password as string, 12);
  next();
});

userSchema.methods.correctPassword = async function (candidatePassword: string, userPassword: string) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model<IUser>('User', userSchema);
export default User;
