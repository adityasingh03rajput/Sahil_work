import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: false, index: true, default: null },

    name: { type: String, required: true },
    email: { type: String, default: null },
    phone: { type: String, default: null },
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
  },
  { timestamps: true }
);

export const Customer = mongoose.model('Customer', customerSchema);
