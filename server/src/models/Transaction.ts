import mongoose, { Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: 'topup' | 'bounty_payment' | 'bounty_earned' | 'platform_fee' | 'withdrawal';
  amount: number;
  currency: string;
  stripePaymentIntentId?: string;
  stripePaymentMethodId?: string;
  relatedReport?: mongoose.Types.ObjectId;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new mongoose.Schema<ITransaction>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['topup', 'bounty_payment', 'bounty_earned', 'platform_fee', 'withdrawal'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'PKR',
  },
  stripePaymentIntentId: {
    type: String,
  },
  stripePaymentMethodId: {
    type: String,
  },
  description: {
    type: String,
  },
  relatedReport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  },
}, {
  timestamps: true,
});

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
export default Transaction;
