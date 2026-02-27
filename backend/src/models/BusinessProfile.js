import mongoose from 'mongoose';

const businessProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    businessName: { type: String, required: true },
    ownerName: { type: String, required: true },
    gstin: { type: String, default: null },
    pan: { type: String, default: null },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    billingAddress: { type: String, default: null },
    shippingAddress: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    postalCode: { type: String, default: null },
    bankName: { type: String, default: null },
    bankBranch: { type: String, default: null },
    accountNumber: { type: String, default: null },
    ifscCode: { type: String, default: null },
    upiId: { type: String, default: null },
    customFields: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const BusinessProfile = mongoose.model('BusinessProfile', businessProfileSchema);
