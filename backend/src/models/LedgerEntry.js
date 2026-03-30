import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: false, index: true, default: null },

    partyType: { type: String, enum: ['customer', 'supplier'], required: true, index: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    date: { type: Date, required: true, index: true },
    fiscalYear: { type: String, index: true, default: null }, // e.g. "2024-25"

    voucherType: { type: String, required: true },
    voucherNo: { type: String, default: null },
    particulars: { type: String, default: null },

    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },

    sourceType: { type: String, enum: ['document', 'payment', 'manual_journal'], required: true, index: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    isReversal: { type: Boolean, default: false },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerEntry', default: null },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ userId: 1, profileId: 1, partyType: 1, partyId: 1, date: 1, createdAt: 1 });
ledgerEntrySchema.index({ userId: 1, profileId: 1, sourceType: 1, sourceId: 1 }, { unique: true });

export const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
