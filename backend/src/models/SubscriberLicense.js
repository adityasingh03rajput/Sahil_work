import mongoose from 'mongoose';

const tenantLicenseSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    licenseStartAt: { type: Date, required: true },
    licenseEndAt: { type: Date, required: true },
    graceEndAt: { type: Date, default: null },
    paymentState: { type: String, enum: ['paid', 'unpaid', 'grace'], default: 'paid' },
    maxSeats: { type: Number, default: 5 },
    maxSessions: { type: Number, default: 1 }, // override plan's maxSessions per license
    customEntitlements: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const TenantLicense = mongoose.model('TenantLicense', tenantLicenseSchema);
export const SubscriberLicense = TenantLicense; // alias
