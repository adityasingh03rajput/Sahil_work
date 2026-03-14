import mongoose from 'mongoose';

const tenantPaymentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    licenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantLicense', default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paidAt: { type: Date, default: null },
    mode: { type: String, default: null },
    reference: { type: String, default: null },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

export const TenantPayment = mongoose.model('TenantPayment', tenantPaymentSchema);
