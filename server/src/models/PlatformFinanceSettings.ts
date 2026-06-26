import mongoose from 'mongoose';

export interface IPlatformFinanceSettings extends mongoose.Document {
  accountLabel: string;
  provider: 'stripe' | 'bank' | 'manual';
  stripeAccountId?: string;
  bankName?: string;
  accountHolder?: string;
  accountLast4?: string;
  platformFeePercent: number;
  treasuryBalance: number;
  stripeCustomerId?: string;
  isLinked: boolean;
  notes?: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const platformFinanceSettingsSchema = new mongoose.Schema<IPlatformFinanceSettings>(
  {
    accountLabel: { type: String, default: 'BugChase Platform Treasury' },
    provider: { type: String, enum: ['stripe', 'bank', 'manual'], default: 'manual' },
    stripeAccountId: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
    accountLast4: { type: String, default: '' },
    platformFeePercent: { type: Number, default: 5, min: 0, max: 100 },
    treasuryBalance: { type: Number, default: 0 },
    stripeCustomerId: { type: String, default: '' },
    isLinked: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

const PlatformFinanceSettings = mongoose.model<IPlatformFinanceSettings>(
  'PlatformFinanceSettings',
  platformFinanceSettingsSchema,
);

export default PlatformFinanceSettings;

async function getPlatformFinanceSettingsDoc() {
  let doc = await PlatformFinanceSettings.findOne();
  if (!doc) {
    doc = await PlatformFinanceSettings.create({});
  }
  return doc;
}

export { getPlatformFinanceSettingsDoc };
