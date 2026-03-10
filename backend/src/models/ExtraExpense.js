import mongoose from 'mongoose';

const extraExpenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: false, index: true, default: null },

    date: { type: Date, required: true, index: true },

    category: { type: String, default: null },
    amount: { type: Number, required: true },
    method: { type: String, default: null },
    reference: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

extraExpenseSchema.index({ userId: 1, profileId: 1, date: -1, createdAt: -1 });

export const ExtraExpense = mongoose.model('ExtraExpense', extraExpenseSchema);
