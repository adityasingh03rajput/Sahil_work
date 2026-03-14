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

    // Extra trial days granted by admin (added on top of base 7-day trial)
    trialExtensionDays: { type: Number, default: 0 },

    // Per-tenant numeric limits (-1 = unlimited)
    limits: {
      maxDocumentsPerMonth:   { type: Number, default: -1 },
      maxCustomers:           { type: Number, default: -1 },
      maxSuppliers:           { type: Number, default: -1 },
      maxItems:               { type: Number, default: -1 },
      maxProfiles:            { type: Number, default: -1 },
      maxSessions:            { type: Number, default: -1 },
      maxPdfExportsPerMonth:  { type: Number, default: -1 },
      maxPaymentsPerMonth:    { type: Number, default: -1 },
      maxBankTransactions:    { type: Number, default: -1 },
      maxExtraExpenses:       { type: Number, default: -1 },
      maxKhataEntries:        { type: Number, default: -1 },
      maxDocumentLineItems:   { type: Number, default: -1 },
    },

    // Per-tenant feature flags (true = enabled)
    features: {
      allowGstinLookup:   { type: Boolean, default: true },
      allowSmsReminders:  { type: Boolean, default: true },
      allowLogoUpload:    { type: Boolean, default: true },
      allowAnalytics:     { type: Boolean, default: true },
      allowKhata:         { type: Boolean, default: true },
      allowBankAccounts:  { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const Subscriber = mongoose.model('Subscriber', tenantSchema);
