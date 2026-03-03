import mongoose from 'mongoose';

const referralRedemptionSchema = new mongoose.Schema(
  {
    referrerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    referralCode: { type: String, required: true, index: true },

    purchasedPlan: { type: String, enum: ['monthly', 'yearly'], required: true },
    discountPercent: { type: Number, default: 10 },

    redeemedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

referralRedemptionSchema.index({ referrerUserId: 1, redeemedAt: -1 });

export const ReferralRedemption = mongoose.model('ReferralRedemption', referralRedemptionSchema);
