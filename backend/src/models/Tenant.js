import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    gstin: { type: String, default: null },
    status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active', index: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

export const Tenant = mongoose.model('Tenant', tenantSchema);
