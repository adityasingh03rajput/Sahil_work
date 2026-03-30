import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected');

const docs = await mongoose.connection.db.collection('documents')
  .find({ status: 'final' })
  .toArray();

let updated = 0;
for (const doc of docs) {
  const voucherNo = doc.invoiceNo || doc.challanNo || doc.documentNumber || null;
  if (!voucherNo) continue;
  const result = await mongoose.connection.db.collection('ledgerentries').updateMany(
    { sourceType: 'document', sourceId: doc._id },
    { $set: { voucherNo } }
  );
  if (result.modifiedCount > 0) {
    console.log(`Updated doc ${doc._id}: voucherNo = ${voucherNo}`);
    updated++;
  }
}

console.log(`Done. Updated ${updated} entries.`);
process.exit(0);
