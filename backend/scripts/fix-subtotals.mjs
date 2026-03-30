/**
 * fix-subtotals.mjs
 *
 * AUDIT MIGRATION — N1
 *
 * Problem: Before the CA audit fix, `subtotal` was stored as the
 * tax-INCLUSIVE sum of item totals. This inflated the GSTR taxable
 * value reported. The new formula separates:
 *
 *   subtotal   = sum of (qty * rate * (1 - discount%)) per item + extra charges
 *              = PRE-TAX taxable base (correct for GSTR-1 reporting)
 *
 *   grandTotal = sum of item.total (tax-inclusive) + extra charges + roundOff
 *              = what the customer actually pays (unchanged)
 *
 * This script recomputes `subtotal` and `itemsTotal` for every document
 * that has line items, fixing the GSTR taxable value for all historical
 * data. grandTotal is NOT changed — only subtotal.
 *
 * Usage:
 *   node backend/scripts/fix-subtotals.mjs
 *
 * Safe to run multiple times (idempotent).
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGODB_URI is not set in environment');
  process.exit(1);
}

// ── Minimal inline schema (avoids circular dependency with model imports) ──────
const itemSchema = new mongoose.Schema({
  quantity: Number,
  rate: Number,
  discount: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  total: Number,
}, { _id: false });

const docSchema = new mongoose.Schema({
  type: String,
  status: String,
  items: [itemSchema],
  transportCharges: { type: Number, default: 0 },
  additionalCharges: { type: Number, default: 0 },
  packingHandlingCharges: { type: Number, default: 0 },
  tcs: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  subtotal: Number,
  itemsTotal: Number,
  grandTotal: Number,
  totalCgst: Number,
  totalSgst: Number,
  totalIgst: Number,
}, { strict: false, timestamps: true });

const DocModel = mongoose.model('Document', docSchema);

/**
 * Recompute subtotal from line items.
 * Returns { itemsTotal, subtotal, totalCgst, totalSgst, totalIgst }
 * grandTotal is left untouched.
 */
function recomputeSubtotal(doc) {
  const items = Array.isArray(doc.items) ? doc.items : [];
  const extras = parseFloat((
    Number(doc.transportCharges || 0) +
    Number(doc.additionalCharges || 0) +
    Number(doc.packingHandlingCharges || 0) +
    Number(doc.tcs || 0)
  ).toFixed(2));

  let taxableBase = 0, cgstSum = 0, sgstSum = 0, igstSum = 0;

  for (const it of items) {
    const qty = Number(it.quantity || 0);
    const rate = Number(it.rate || 0);
    const disc = Number(it.discount || 0);
    const taxable = parseFloat(((qty * rate) - (qty * rate * disc / 100)).toFixed(2));
    taxableBase += taxable;
    cgstSum += parseFloat(((taxable * Number(it.cgst || 0)) / 100).toFixed(2));
    sgstSum += parseFloat(((taxable * Number(it.sgst || 0)) / 100).toFixed(2));
    igstSum += parseFloat(((taxable * Number(it.igst || 0)) / 100).toFixed(2));
  }

  const itemsTaxableBase = parseFloat(taxableBase.toFixed(2));
  const subtotal = parseFloat((itemsTaxableBase + extras).toFixed(2));

  // itemsTotal stays as the tax-inclusive sum of item.total (used for grandTotal calc, not GSTR)
  const itemsTotal = parseFloat(items.reduce((s, it) => s + Number(it.total || 0), 0).toFixed(2));

  return {
    itemsTotal,
    subtotal,
    totalCgst: parseFloat(cgstSum.toFixed(2)),
    totalSgst: parseFloat(sgstSum.toFixed(2)),
    totalIgst: parseFloat(igstSum.toFixed(2)),
  };
}

async function run() {
  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅  Connected\n');

  const total = await DocModel.countDocuments({ items: { $exists: true, $not: { $size: 0 } } });
  console.log(`📄  Total documents with items: ${total}`);

  let updated = 0, skipped = 0, errors = 0;
  const BATCH = 200;
  let cursor = 0;

  while (cursor < total) {
    const docs = await DocModel.find(
      { items: { $exists: true, $not: { $size: 0 } } },
      'items type status transportCharges additionalCharges packingHandlingCharges tcs roundOff subtotal itemsTotal grandTotal totalCgst totalSgst totalIgst'
    ).skip(cursor).limit(BATCH).lean();

    if (!docs.length) break;

    const bulkOps = [];

    for (const doc of docs) {
      try {
        const computed = recomputeSubtotal(doc);

        // Skip if already correct (idempotent run)
        const alreadyCorrect =
          Math.abs((doc.subtotal || 0) - computed.subtotal) < 0.01 &&
          Math.abs((doc.totalCgst || 0) - computed.totalCgst) < 0.01 &&
          Math.abs((doc.totalSgst || 0) - computed.totalSgst) < 0.01 &&
          Math.abs((doc.totalIgst || 0) - computed.totalIgst) < 0.01;

        if (alreadyCorrect) {
          skipped++;
          continue;
        }

        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                subtotal: computed.subtotal,
                itemsTotal: computed.itemsTotal,
                totalCgst: computed.totalCgst,
                totalSgst: computed.totalSgst,
                totalIgst: computed.totalIgst,
                // grandTotal is NOT changed — customer-facing amount stays the same
              },
            },
          },
        });
      } catch (e) {
        console.error(`  ⚠️  Error on doc ${doc._id}: ${e.message}`);
        errors++;
      }
    }

    if (bulkOps.length) {
      const result = await DocModel.bulkWrite(bulkOps, { ordered: false });
      updated += result.modifiedCount || 0;
      process.stdout.write(`  ✔ batch ${Math.floor(cursor / BATCH) + 1}: ${result.modifiedCount} updated\n`);
    }

    cursor += BATCH;
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅  Done.`);
  console.log(`   Updated : ${updated}`);
  console.log(`   Skipped : ${skipped} (already correct)`);
  console.log(`   Errors  : ${errors}`);
  console.log('─────────────────────────────────\n');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});
