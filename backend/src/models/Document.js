import mongoose from 'mongoose';

const documentItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    hsnSac: { type: String, default: null },
    description: { type: String, default: null },
    sku: { type: String, default: null },
    servicePeriod: { type: String, default: null },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: null },
    rate: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: null },
    purchaseCost: { type: Number, default: null },
    currency: { type: String, default: 'INR' },
    discount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const customFieldSchema = new mongoose.Schema(
  {
    label: { type: String, default: null },
    value: { type: String, default: null },
  },
  { _id: false }
);

const reminderLogSchema = new mongoose.Schema(
  {
    sentAt: { type: Date, default: Date.now },
    channel: { type: String, default: null },
    to: { type: String, default: null },
    message: { type: String, default: null },
    status: { type: String, default: 'sent' },
    error: { type: String, default: null },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: false, index: true, default: null },

    documentNumber: { type: String, required: true, index: true },
    type: { type: String, required: true },

    referenceDocumentId: { type: String, default: null },
    referenceDocumentNumber: { type: String, default: null },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false, index: true, default: null },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: false, index: true, default: null },

    customerName: { type: String, default: null },
    customerAddress: { type: String, default: null },
    customerGstin: { type: String, default: null },
    validFrom: { type: String, default: null },
    validTo: { type: String, default: null },
    // Legacy fields for backward compatibility
    date: { type: String, default: null },
    dueDate: { type: String, default: null },

    orderNumber: { type: String, default: null },
    revisionNumber: { type: String, default: null },
    referenceNo: { type: String, default: null },
    purchaseOrderNo: { type: String, default: null },
    poDate: { type: String, default: null },

    invoiceNo: { type: String, default: null },
    challanNo: { type: String, default: null },
    ewayBillNo: { type: String, default: null },
    ewayBillDate: { type: String, default: null },
    ewayBillValidUpto: { type: String, default: null },
    ewayBillVehicleNo: { type: String, default: null },
    ewayBillTransporterName: { type: String, default: null },
    ewayBillTransporterDocNo: { type: String, default: null },
    ewayBillDistanceKm: { type: Number, default: 0 },
    transport: { type: String, default: null },
    transportId: { type: String, default: null },
    placeOfSupply: { type: String, default: null },

    customerContactPerson: { type: String, default: null },
    customerMobile: { type: String, default: null },
    customerEmail: { type: String, default: null },
    customerStateCode: { type: String, default: null },

    deliveryAddress: { type: String, default: null },
    deliveryMethod: { type: String, default: null },
    expectedDeliveryDate: { type: String, default: null },

    departureFromAddress: { type: String, default: null },
    departureFromCity: { type: String, default: null },
    departureFromState: { type: String, default: null },
    departureFromPostalCode: { type: String, default: null },

    departureToAddress: { type: String, default: null },
    departureToCity: { type: String, default: null },
    departureToState: { type: String, default: null },
    departureToPostalCode: { type: String, default: null },

    bankAccountId: { type: mongoose.Schema.Types.ObjectId, default: null },
    bankName: { type: String, default: null },
    bankBranch: { type: String, default: null },
    bankAccountNumber: { type: String, default: null },
    bankIfsc: { type: String, default: null },
    upiId: { type: String, default: null },
    upiQrText: { type: String, default: null },

    items: { type: [documentItemSchema], default: [] },

    transportCharges: { type: Number, default: 0 },
    additionalCharges: { type: Number, default: 0 },
    packingHandlingCharges: { type: Number, default: 0 },
    tcs: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },

    notes: { type: String, default: null },
    internalNotes: { type: String, default: null },
    termsConditions: { type: String, default: null },

    paymentTerms: { type: String, default: null },
    creditPeriod: { type: String, default: null },
    lateFeeTerms: { type: String, default: null },
    warrantyReturnCancellationPolicies: { type: String, default: null },

    paymentStatus: { type: String, default: 'unpaid' },
    paymentMode: { type: String, default: null },
    status: { type: String, default: 'draft' },

    currency: { type: String, default: 'INR' },

    itemsTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },

    version: { type: Number, required: true, default: 1 },

    convertedFrom: { type: String, default: null },

    lastReminderSentAt: { type: Date, default: null },
    reminderLogs: { type: [reminderLogSchema], default: [] },

    customFields: { type: [customFieldSchema], default: [] },
  },
  { timestamps: true }
);

export const Document = mongoose.model('Document', documentSchema);
