import mongoose from 'mongoose';

const bankTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: false, index: true, default: null },

    bankAccountId: { type: mongoose.Schema.Types.ObjectId, required: false, index: true, default: null },

    type: { type: String, enum: ['credit'], required: true, default: 'credit' },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    date: { type: String, required: true },

    description: { type: String, default: null },
  },
  { timestamps: true }
);

bankTransactionSchema.index({ userId: 1, profileId: 1, bankAccountId: 1, date: 1, createdAt: 1 });

export const BankTransaction = mongoose.model('BankTransaction', bankTransactionSchema);
