import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: true, index: true },

    name: { type: String, required: true },
    hsnSac: { type: String, default: null },
    unit: { type: String, required: true },
    rate: { type: Number, required: true },
    sellingPrice: { type: Number, default: null },
    purchaseCost: { type: Number, default: null },
    discount: { type: Number, default: 0 },
    cgst: { type: Number, required: true },
    sgst: { type: Number, required: true },
    igst: { type: Number, required: true },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

// Compound index — all queries filter on (userId, profileId)
itemSchema.index({ userId: 1, profileId: 1, createdAt: 1 });
itemSchema.index({ userId: 1, profileId: 1, name: 1 });

export const Item = mongoose.model('Item', itemSchema);
