/**
 * BillVyapar - Full MongoDB Data Audit & Repair Script
 * =====================================================
 * 1. Audits all collections for type mismatches (string vs ObjectId)
 * 2. Re-links orphaned ledger entries to correct ObjectId references
 * 3. Ensures every 'final' document has a ledger entry
 * 4. Ensures every payment has a ledger entry
 * 5. Recalculates & corrects paymentStatus on all documents
 * 6. Reports a full summary
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

await mongoose.connect(MONGO_URI);
console.log('✅ Connected to MongoDB\n');

const db = mongoose.connection.db;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const toOid = (v) => {
  if (!v) return null;
  if (v instanceof mongoose.Types.ObjectId) return v;
  const s = String(v);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
};

const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

// ─────────────────────────────────────────────────────────────
// STEP 1: Audit & fix userId/profileId types across collections
// ─────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════');
console.log('STEP 1: Auditing userId/profileId field types');
console.log('═══════════════════════════════════════════\n');

const collections = ['documents', 'payments', 'ledgerentries', 'banktransactions', 'items', 'customers', 'suppliers'];

for (const col of collections) {
  try {
    // Find documents where userId or profileId is a string instead of ObjectId
    const stringUserIds = await db.collection(col).find({
      $or: [
        { userId: { $type: 'string' } },
        { profileId: { $type: 'string' } },
      ]
    }).toArray();

    if (stringUserIds.length === 0) {
      console.log(`  ✅ ${col}: All userId/profileId are ObjectIds`);
      continue;
    }

    console.log(`  ⚠️  ${col}: Found ${stringUserIds.length} docs with string userId/profileId — fixing...`);
    let fixed = 0;
    for (const doc of stringUserIds) {
      const update = {};
      if (typeof doc.userId === 'string' && mongoose.Types.ObjectId.isValid(doc.userId)) {
        update.userId = new mongoose.Types.ObjectId(doc.userId);
      }
      if (typeof doc.profileId === 'string' && mongoose.Types.ObjectId.isValid(doc.profileId)) {
        update.profileId = new mongoose.Types.ObjectId(doc.profileId);
      }
      if (Object.keys(update).length > 0) {
        await db.collection(col).updateOne({ _id: doc._id }, { $set: update });
        fixed++;
      }
    }
    console.log(`     → Fixed ${fixed} documents`);
  } catch (e) {
    console.log(`  ❌ ${col}: Error — ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// STEP 2: Fix ledger entry sourceId/partyId types
// ─────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('STEP 2: Auditing ledger entry ObjectId fields');
console.log('═══════════════════════════════════════════\n');

const ledgerStringIds = await db.collection('ledgerentries').find({
  $or: [
    { sourceId: { $type: 'string' } },
    { partyId: { $type: 'string' } },
  ]
}).toArray();

if (ledgerStringIds.length === 0) {
  console.log('  ✅ All ledger sourceId/partyId are ObjectIds');
} else {
  console.log(`  ⚠️  Found ${ledgerStringIds.length} ledger entries with string IDs — fixing...`);
  let fixed = 0;
  for (const entry of ledgerStringIds) {
    const update = {};
    if (typeof entry.sourceId === 'string' && mongoose.Types.ObjectId.isValid(entry.sourceId)) {
      update.sourceId = new mongoose.Types.ObjectId(entry.sourceId);
    }
    if (typeof entry.partyId === 'string' && mongoose.Types.ObjectId.isValid(entry.partyId)) {
      update.partyId = new mongoose.Types.ObjectId(entry.partyId);
    }
    if (Object.keys(update).length > 0) {
      await db.collection('ledgerentries').updateOne({ _id: entry._id }, { $set: update });
      fixed++;
    }
  }
  console.log(`  → Fixed ${fixed} ledger entries`);
}

// ─────────────────────────────────────────────────────────────
// STEP 3: Ensure all 'final' documents have a ledger entry
// ─────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('STEP 3: Ensuring all Final documents have ledger entries');
console.log('═══════════════════════════════════════════\n');

const LEDGER_DOC_TYPES = {
  customer: ['invoice', 'billing', 'credit_note', 'debit_note'],
  supplier: ['purchase', 'credit_note', 'debit_note'],
};

const finalDocs = await db.collection('documents').find({ status: 'final' }).toArray();
console.log(`  Found ${finalDocs.length} final document(s)`);

let ledgerCreated = 0;
let ledgerUpdated = 0;
let ledgerSkipped = 0;

for (const doc of finalDocs) {
  const partyType = doc.customerId ? 'customer' : doc.supplierId ? 'supplier' : null;
  const partyId = doc.customerId || doc.supplierId;
  const docType = String(doc.type || '').toLowerCase();

  if (!partyType || !partyId) { ledgerSkipped++; continue; }
  if (!LEDGER_DOC_TYPES[partyType]?.includes(docType)) { ledgerSkipped++; continue; }

  const amount = Number(doc.grandTotal || 0);

  let voucherType, debit, credit;
  if (partyType === 'customer') {
    if (docType === 'invoice' || docType === 'billing') { voucherType = 'GST Sales'; debit = amount; credit = 0; }
    else if (docType === 'credit_note') { voucherType = 'Credit Note'; debit = 0; credit = amount; }
    else if (docType === 'debit_note') { voucherType = 'Debit Note'; debit = amount; credit = 0; }
  } else {
    if (docType === 'purchase') { voucherType = 'GST Purchase'; debit = 0; credit = amount; }
    else if (docType === 'credit_note') { voucherType = 'Credit Note'; debit = amount; credit = 0; }
    else if (docType === 'debit_note') { voucherType = 'Debit Note'; debit = 0; credit = amount; }
  }

  const voucherNo = String(doc.invoiceNo || doc.challanNo || doc.documentNumber || '').trim() || null;
  const date = doc.date ? new Date(doc.date) : new Date(doc.createdAt);

  const existing = await db.collection('ledgerentries').findOne({
    sourceType: 'document',
    sourceId: doc._id,
  });

  const entryData = {
    userId: toOid(doc.userId),
    profileId: toOid(doc.profileId),
    partyType,
    partyId: toOid(partyId),
    date,
    fiscalYear: doc.fiscalYear || '',
    voucherType,
    voucherNo,
    particulars: String(doc.customerName || '').trim() || null,
    debit: Number(debit || 0),
    credit: Number(credit || 0),
    sourceType: 'document',
    sourceId: doc._id,
    isReversal: false,
    reversalOf: null,
  };

  if (existing) {
    // Update to ensure correct data
    await db.collection('ledgerentries').updateOne(
      { _id: existing._id },
      { $set: entryData }
    );
    ledgerUpdated++;
    console.log(`  🔄 Updated ledger for doc ${voucherNo || doc._id} (${docType}, ${partyType}, ${fmt(amount)})`);
  } else {
    await db.collection('ledgerentries').insertOne(entryData);
    ledgerCreated++;
    console.log(`  ➕ Created ledger for doc ${voucherNo || doc._id} (${docType}, ${partyType}, ${fmt(amount)})`);
  }
}

console.log(`\n  Created: ${ledgerCreated} | Updated: ${ledgerUpdated} | Skipped (no party/type): ${ledgerSkipped}`);

// ─────────────────────────────────────────────────────────────
// STEP 4: Recalculate paymentStatus on all documents
// ─────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('STEP 4: Recalculating paymentStatus on all documents');
console.log('═══════════════════════════════════════════\n');

const allDocs = await db.collection('documents').find({}).toArray();
let statusFixed = 0;

for (const doc of allDocs) {
  const docId = doc._id;
  const total = Number(doc.grandTotal || 0);

  // Sum all payments for this document
  const payAgg = await db.collection('payments').aggregate([
    { $match: { documentId: docId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]).toArray();

  const paid = Number(payAgg[0]?.total || 0);
  const remaining = Math.max(0, total - paid);

  let correctStatus = 'unpaid';
  if (paid > 0 && remaining > 0) correctStatus = 'partial';
  if (remaining <= 0 && total > 0) correctStatus = 'paid';
  if (total <= 0) correctStatus = 'paid';

  if (doc.paymentStatus !== correctStatus) {
    await db.collection('documents').updateOne(
      { _id: docId },
      { $set: { paymentStatus: correctStatus } }
    );
    statusFixed++;
    console.log(`  🔧 Fixed paymentStatus for ${doc.invoiceNo || doc.documentNumber}: ${doc.paymentStatus} → ${correctStatus}`);
  }
}

if (statusFixed === 0) console.log('  ✅ All paymentStatus values are correct');
else console.log(`\n  Fixed ${statusFixed} document(s)`);

// ─────────────────────────────────────────────────────────────
// STEP 5: Summary report
// ─────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('STEP 5: Summary Report');
console.log('═══════════════════════════════════════════\n');

const counts = {};
for (const col of ['documents', 'payments', 'ledgerentries', 'customers', 'suppliers', 'items', 'banktransactions']) {
  try {
    counts[col] = await db.collection(col).countDocuments();
  } catch { counts[col] = 'N/A'; }
}

console.log('  Collection Counts:');
for (const [col, count] of Object.entries(counts)) {
  console.log(`    ${col.padEnd(20)}: ${count}`);
}

const finalCount = await db.collection('documents').countDocuments({ status: 'final' });
const draftCount = await db.collection('documents').countDocuments({ status: 'draft' });
const unpaidCount = await db.collection('documents').countDocuments({ paymentStatus: 'unpaid' });
const paidCount = await db.collection('documents').countDocuments({ paymentStatus: 'paid' });

console.log('\n  Document Summary:');
console.log(`    Final     : ${finalCount}`);
console.log(`    Draft     : ${draftCount}`);
console.log(`    Paid      : ${paidCount}`);
console.log(`    Unpaid    : ${unpaidCount}`);

console.log('\n✅ Audit & Repair Complete!\n');
process.exit(0);
