import mongoose from 'mongoose';

export interface ILoginEvent extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  ip: string;
  userAgent: string;
  uaHash: string;
  browserSummary: string;
  success: boolean;
  createdAt: Date;
}

const loginEventSchema = new mongoose.Schema<ILoginEvent>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    uaHash: { type: String, default: '', index: true },
    browserSummary: { type: String, default: '' },
    success: { type: Boolean, default: true },
  },
  { timestamps: true },
);

loginEventSchema.index({ userId: 1, createdAt: -1 });

const LoginEvent = mongoose.model<ILoginEvent>('LoginEvent', loginEventSchema);
export default LoginEvent;
