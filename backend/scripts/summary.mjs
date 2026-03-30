import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const cols = ['documents','payments','ledgerentries','customers','suppliers','items','banktransactions'];
console.log('Collection Counts:');
for(const c of cols){
  const n = await db.collection(c).countDocuments();
  console.log('  ' + c.padEnd(22) + ':', n);
}
const fin = await db.collection('documents').countDocuments({status:'final'});
const dra = await db.collection('documents').countDocuments({status:'draft'});
const paid = await db.collection('documents').countDocuments({paymentStatus:'paid'});
const unpaid = await db.collection('documents').countDocuments({paymentStatus:'unpaid'});
const partial = await db.collection('documents').countDocuments({paymentStatus:'partial'});
const ledgerOrphans = await db.collection('ledgerentries').countDocuments({sourceType:'document'});
const payLedger = await db.collection('ledgerentries').countDocuments({sourceType:'payment'});
console.log('\nDocument Summary:');
console.log('  Final     :', fin);
console.log('  Draft     :', dra);
console.log('  Paid      :', paid);
console.log('  Unpaid    :', unpaid);
console.log('  Partial   :', partial);
console.log('\nLedger Breakdown:');
console.log('  From documents :', ledgerOrphans);
console.log('  From payments  :', payLedger);
process.exit(0);
