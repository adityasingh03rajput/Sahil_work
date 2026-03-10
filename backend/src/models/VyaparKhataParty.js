import mongoose from 'mongoose';

const vyaparKhataPartySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessProfile',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    default: null,
  },
  type: {
    type: String,
    enum: ['customer', 'supplier'],
    required: true,
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
  openingBalanceType: {
    type: String,
    enum: ['dr', 'cr'],
    default: 'dr',
  },
}, {
  timestamps: true,
});

vyaparKhataPartySchema.index({ userId: 1, profileId: 1, name: 1 });
vyaparKhataPartySchema.index({ userId: 1, profileId: 1, type: 1 });

export const VyaparKhataParty = mongoose.model('VyaparKhataParty', vyaparKhataPartySchema);
