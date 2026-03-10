import mongoose from 'mongoose';

const manualJournalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: false, index: true, default: null },

    partyType: { type: String, enum: ['customer', 'supplier'], required: true, index: true },
    partyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    date: { type: Date, required: true, index: true },

    direction: { type: String, enum: ['gave', 'got'], required: true },
    amount: { type: Number, required: true, min: 0 },

    method: { type: String, default: null },
    reference: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

manualJournalSchema.index({ userId: 1, profileId: 1, partyType: 1, partyId: 1, date: -1, createdAt: -1 });

export const ManualJournal = mongoose.model('ManualJournal', manualJournalSchema);
