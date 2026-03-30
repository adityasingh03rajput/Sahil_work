import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: true, index: true },

    name: { type: String, required: true },
    ownerName: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    logoDataUrl: { type: String, default: null },
    logoUrl: { type: String, default: null },
    billingAddress: { type: String, default: null },
    shippingAddress: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    postalCode: { type: String, default: null },
    billingCity: { type: String, default: null },
    billingState: { type: String, default: null },
    billingPostalCode: { type: String, default: null },
    shippingCity: { type: String, default: null },
    shippingState: { type: String, default: null },
    shippingPostalCode: { type: String, default: null },
    gstin: { type: String, default: null },
    pan: { type: String, default: null },

    openingBalance: { type: Number, default: 0 },
    openingBalanceType: { type: String, enum: ['dr', 'cr'], default: 'dr' },
  },
  { timestamps: true }
);

// Compound index — all queries filter on (userId, profileId)
customerSchema.index({ userId: 1, profileId: 1, createdAt: 1 });
customerSchema.index({ userId: 1, profileId: 1, name: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
