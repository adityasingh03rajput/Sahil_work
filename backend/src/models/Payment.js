import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: false, index: true, default: null },

    // Optional linkage
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: false, index: true, default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false, index: true, default: null },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: false, index: true, default: null },

    bankAccountId: { type: mongoose.Schema.Types.ObjectId, required: false, index: true, default: null },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    date: { type: String, required: true },

    method: { type: String, default: null },
    reference: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

// All list queries filter on (userId, profileId) — single-field indexes are wasteful
paymentSchema.index({ userId: 1, profileId: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, profileId: 1, documentId: 1 });
paymentSchema.index({ userId: 1, profileId: 1, customerId: 1, date: -1 });
paymentSchema.index({ userId: 1, profileId: 1, bankAccountId: 1, date: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
