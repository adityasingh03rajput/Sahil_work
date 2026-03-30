/**
 * dedup-payment-ledger.mjs
 *
 * AUDIT MIGRATION — R2
 *
 * Problem: Before the CA audit fix, createLedgerForPayment used
 * LedgerEntry.create() every time it was called. If a document was
 * saved multiple times (status changes, field edits), multiple
 * ledger entries were created for the same payment — inflating
 * balances in party statements.
 *
 * This script:
 *   1. Finds all LedgerEntry records with sourceType: 'payment'
 *   2. Groups by sourceId (payment._id)
 *   3. Keeps the LATEST entry per group (highest updatedAt)
 *   4. Deletes all older duplicates
 *
 * Usage:
 *   node backend/scripts/dedup-payment-ledger.mjs
 *
 * Safe to run multiple times (idempotent — second run finds 0 duplicates).
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGODB_URI is not set in environment');
  process.exit(1);
}

async function run() {
  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅  Connected\n');

  const db = mongoose.connection.db;
  const col = db.collection('ledgerentries');

  // Find all sourceIds that appear more than once
  const dupeAgg = await col.aggregate([
    { $match: { sourceType: 'payment', sourceId: { $exists: true, $ne: null } } },
    { $group: { _id: '$sourceId', count: { $sum: 1 }, ids: { $push: '$_id' }, dates: { $push: '$updatedAt' } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  console.log(`🔍  Found ${dupeAgg.length} payment sourceIds with duplicate ledger entries`);

  if (!dupeAgg.length) {
    console.log('✅  No duplicates found — database is clean.\n');
    await mongoose.disconnect();
    return;
  }

  let totalDeleted = 0;

  for (const group of dupeAgg) {
    // Fetch full entries for this group sorted by updatedAt desc
    const entries = await col
      .find({ sourceType: 'payment', sourceId: group._id })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();

    if (entries.length <= 1) continue;

    // Keep the first (most recent), delete the rest
    const keepId = entries[0]._id;
    const toDelete = entries.slice(1).map(e => e._id);

    const result = await col.deleteMany({ _id: { $in: toDelete } });
    totalDeleted += result.deletedCount || 0;

    if (result.deletedCount > 0) {
      console.log(`  🗑  sourceId ${group._id}: kept ${keepId}, deleted ${result.deletedCount} duplicate(s)`);
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅  Done. Deleted ${totalDeleted} duplicate payment ledger entries.`);
  console.log('─────────────────────────────────\n');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});
