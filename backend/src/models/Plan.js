import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: { type: String, default: null },
    durations: [
      {
        days: { type: Number, required: true },
        price: { type: Number, required: true },
        currency: { type: String, default: 'INR' },
      }
    ],
    seatPrice: { type: Number, default: 0 },
    limits: {
      maxSeats: { type: Number, default: 5 },
      maxDocumentsPerMonth: { type: Number, default: -1 },
      maxCustomers: { type: Number, default: -1 },
      maxSuppliers: { type: Number, default: -1 },
      maxItems: { type: Number, default: -1 },
      maxPdfExportsPerMonth: { type: Number, default: -1 },
    },
    entitlements: {
      documentsEnabled: { type: [String], default: ['invoice', 'quotation', 'order', 'challan', 'purchase', 'proforma'] },
      pdfTemplatesEnabled: { type: [String], default: ['minimal', 'classic', 'modern', 'professional'] },
      gstinLookupEnabled: { type: Boolean, default: true },
      customFieldsEnabled: { type: Boolean, default: true },
      advancedChargesEnabled: { type: Boolean, default: true },
      csvExportEnabled: { type: Boolean, default: true },
      whatsappEnabled: { type: Boolean, default: false },
      smsEnabled: { type: Boolean, default: false },
      emailEnabled: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Plan = mongoose.model('Plan', planSchema);
