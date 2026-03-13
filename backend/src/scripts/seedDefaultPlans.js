import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import { Plan } from '../models/Plan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const defaultPlans = [
  {
    name: 'trial',
    displayName: 'Trial Plan',
    description: '30-day free trial with full features',
    durations: [
      { days: 30, price: 0, currency: 'INR' },
    ],
    seatPrice: 0,
    limits: {
      maxSeats: 3,
      maxDocumentsPerMonth: 50,
      maxCustomers: 100,
      maxSuppliers: 50,
      maxItems: 200,
      maxPdfExportsPerMonth: 50,
    },
    entitlements: {
      documentsEnabled: ['invoice', 'quotation', 'order', 'challan', 'purchase', 'proforma'],
      pdfTemplatesEnabled: ['minimal', 'classic'],
      gstinLookupEnabled: true,
      customFieldsEnabled: true,
      advancedChargesEnabled: false,
      csvExportEnabled: true,
      whatsappEnabled: false,
      smsEnabled: false,
      emailEnabled: true,
    },
    isActive: true,
  },
  {
    name: 'basic',
    displayName: 'Basic Plan',
    description: 'Perfect for small businesses and startups',
    durations: [
      { days: 30, price: 499, currency: 'INR' },
      { days: 90, price: 1299, currency: 'INR' },
      { days: 365, price: 4999, currency: 'INR' },
    ],
    seatPrice: 100,
    limits: {
      maxSeats: 5,
      maxDocumentsPerMonth: 200,
      maxCustomers: 500,
      maxSuppliers: 200,
      maxItems: 1000,
      maxPdfExportsPerMonth: 200,
    },
    entitlements: {
      documentsEnabled: ['invoice', 'quotation', 'order', 'challan', 'purchase', 'proforma'],
      pdfTemplatesEnabled: ['minimal', 'classic', 'modern'],
      gstinLookupEnabled: true,
      customFieldsEnabled: true,
      advancedChargesEnabled: true,
      csvExportEnabled: true,
      whatsappEnabled: false,
      smsEnabled: true,
      emailEnabled: true,
    },
    isActive: true,
  },
  {
    name: 'professional',
    displayName: 'Professional Plan',
    description: 'For growing businesses with advanced needs',
    durations: [
      { days: 30, price: 999, currency: 'INR' },
      { days: 90, price: 2699, currency: 'INR' },
      { days: 365, price: 9999, currency: 'INR' },
    ],
    seatPrice: 150,
    limits: {
      maxSeats: 15,
      maxDocumentsPerMonth: -1,
      maxCustomers: -1,
      maxSuppliers: -1,
      maxItems: -1,
      maxPdfExportsPerMonth: -1,
    },
    entitlements: {
      documentsEnabled: ['invoice', 'quotation', 'order', 'challan', 'purchase', 'proforma'],
      pdfTemplatesEnabled: ['minimal', 'classic', 'modern', 'professional'],
      gstinLookupEnabled: true,
      customFieldsEnabled: true,
      advancedChargesEnabled: true,
      csvExportEnabled: true,
      whatsappEnabled: true,
      smsEnabled: true,
      emailEnabled: true,
    },
    isActive: true,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise Plan',
    description: 'Unlimited access for large organizations',
    durations: [
      { days: 30, price: 2499, currency: 'INR' },
      { days: 90, price: 6999, currency: 'INR' },
      { days: 365, price: 24999, currency: 'INR' },
    ],
    seatPrice: 200,
    limits: {
      maxSeats: -1,
      maxDocumentsPerMonth: -1,
      maxCustomers: -1,
      maxSuppliers: -1,
      maxItems: -1,
      maxPdfExportsPerMonth: -1,
    },
    entitlements: {
      documentsEnabled: ['invoice', 'quotation', 'order', 'challan', 'purchase', 'proforma'],
      pdfTemplatesEnabled: ['minimal', 'classic', 'modern', 'professional'],
      gstinLookupEnabled: true,
      customFieldsEnabled: true,
      advancedChargesEnabled: true,
      csvExportEnabled: true,
      whatsappEnabled: true,
      smsEnabled: true,
      emailEnabled: true,
    },
    isActive: true,
  },
];

async function seedPlans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const planData of defaultPlans) {
      const existing = await Plan.findOne({ name: planData.name });
      if (existing) {
        console.log(`Plan "${planData.name}" already exists, skipping...`);
        continue;
      }

      const plan = await Plan.create(planData);
      console.log(`✓ Created plan: ${plan.displayName} (${plan.name})`);
    }

    console.log('\n✅ Default plans seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
}

seedPlans();
