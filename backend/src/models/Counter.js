import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: false, index: true, default: null },
    docType: { type: String, required: true },
    fiscalYear: { type: String, required: false, index: true, default: null }, // e.g. "2024-25"
    value: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Unique across user, profile, docType, and financial year (for auto-resets on April 1)
counterSchema.index({ userId: 1, profileId: 1, docType: 1, fiscalYear: 1 }, { unique: true });

export const Counter = mongoose.model('Counter', counterSchema);
