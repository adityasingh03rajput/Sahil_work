export type PdfTemplateId = 'classic' | 'modern' | 'minimal';

export type DocumentItem = {
  name: string;
  hsnSac?: string | null;
  description?: string | null;
  sku?: string | null;
  servicePeriod?: string | null;
  quantity: number;
  unit?: string | null;
  rate: number;
  currency?: string;
  discount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total: number;
};

export type DocumentDto = {
  id: string;
  documentNumber: string;
  type: string;

  customerId?: string | null;
  supplierId?: string | null;

  referenceDocumentId?: string | null;
  referenceDocumentNumber?: string | null;

  customerName?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  date?: string | null;
  dueDate?: string | null;

  orderNumber?: string | null;
  revisionNumber?: string | null;
  referenceNo?: string | null;
  purchaseOrderNo?: string | null;
  poDate?: string | null;

  invoiceNo?: string | null;
  challanNo?: string | null;
  ewayBillNo?: string | null;
  ewayBillDate?: string | null;
  ewayBillValidUpto?: string | null;
  ewayBillVehicleNo?: string | null;
  ewayBillTransporterName?: string | null;
  ewayBillTransporterDocNo?: string | null;
  ewayBillDistanceKm?: number | null;
  transport?: string | null;
  transportId?: string | null;
  placeOfSupply?: string | null;

  customerContactPerson?: string | null;
  customerMobile?: string | null;
  customerEmail?: string | null;
  customerStateCode?: string | null;

  deliveryAddress?: string | null;
  deliveryMethod?: string | null;
  expectedDeliveryDate?: string | null;

  departureFromAddress?: string | null;
  departureFromCity?: string | null;
  departureFromState?: string | null;
  departureFromPostalCode?: string | null;

  departureToAddress?: string | null;
  departureToCity?: string | null;
  departureToState?: string | null;
  departureToPostalCode?: string | null;

  bankName?: string | null;
  bankBranch?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  upiId?: string | null;
  upiQrText?: string | null;

  items: DocumentItem[];

  transportCharges?: number;
  additionalCharges?: number;
  packingHandlingCharges?: number;
  tcs?: number;
  roundOff?: number;

  notes?: string | null;
  internalNotes?: string | null;
  termsConditions?: string | null;

  paymentTerms?: string | null;
  creditPeriod?: string | null;
  lateFeeTerms?: string | null;
  warrantyReturnCancellationPolicies?: string | null;

  paymentStatus?: string;
  paymentMode?: string | null;
  status?: string;

  currency?: string;

  itemsTotal?: number;
  subtotal?: number;
  grandTotal?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;

  partyLogoDataUrl?: string | null;

  customFields?: Array<{ label?: string | null; value?: string | null }>;
};

export type BusinessProfileDto = {
  id: string;
  businessName: string;
  ownerName: string;
  gstin?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
};

export type PdfTemplateProps = {
  doc: DocumentDto;
  profile: BusinessProfileDto;
};
