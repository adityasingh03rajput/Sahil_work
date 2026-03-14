/**
 * backfillSubscribers.js
 *
 * One-time script: creates Subscriber records for any user who has an
 * activated LicenseKey but no existing Subscriber record.
 *
 * Run: node backend/src/scripts/backfillSubscribers.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const userSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const licenseKeySchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const subscriberSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

const User       = mongoose.models.User       || mongoose.model('User',       userSchema,       'users');
const LicenseKey = mongoose.models.LicenseKey || mongoose.model('LicenseKey', licenseKeySchema, 'licensekeys');
const Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema, 'subscribers');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected');

  const now = new Date();

  // Find all license keys that have been activated
  const activatedKeys = await LicenseKey.find({
    activatedByUserId: { $ne: null },
    status: { $in: ['active', 'expired'] },
  }).lean();

  console.log(`Found ${activatedKeys.length} activated license key(s)`);

  let created = 0;
  let skipped = 0;
  let statusUpdated = 0;

  for (const lk of activatedKeys) {
    const userId = lk.activatedByUserId;
    const existing = await Subscriber.findOne({ ownerUserId: userId }).lean();

    if (existing) {
      // Sync status: if license is expired and subscriber is still 'active', fix it
      const licenseActive = lk.status === 'active' && new Date(lk.expiresAt) > now;
      const expectedStatus = licenseActive ? 'active' : 'expired';
      if (existing.status !== expectedStatus && existing.status !== 'suspended') {
        await Subscriber.updateOne({ _id: existing._id }, { $set: { status: expectedStatus } });
        console.log(`  ↻ Synced status for ${existing.email}: ${existing.status} → ${expectedStatus}`);
        statusUpdated++;
      } else {
        skipped++;
      }
      continue;
    }

    const user = await User.findById(userId).lean();
    if (!user) { skipped++; continue; }

    const licenseActive = lk.status === 'active' && new Date(lk.expiresAt) > now;

    await Subscriber.create({
      ownerUserId: userId,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      phone: user.phone || '',
      gstin: null,
      status: licenseActive ? 'active' : 'expired',
      notes: 'Backfilled from license key activation',
    });

    console.log(`  ✅ Created subscriber for ${user.email} (license ${lk.key}, status: ${licenseActive ? 'active' : 'expired'})`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Status synced: ${statusUpdated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
