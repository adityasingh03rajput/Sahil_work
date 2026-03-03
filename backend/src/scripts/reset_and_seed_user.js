import 'dotenv/config';
import mongoose from 'mongoose';

import { User } from '../models/User.js';
import { BusinessProfile } from '../models/BusinessProfile.js';
import { Customer } from '../models/Customer.js';
import { Supplier } from '../models/Supplier.js';
import { Item } from '../models/Item.js';
import { Document } from '../models/Document.js';
import { Payment } from '../models/Payment.js';
import { Counter } from '../models/Counter.js';
import { Session } from '../models/Session.js';
import { Subscription } from '../models/Subscription.js';
import { PasswordResetOtp } from '../models/PasswordResetOtp.js';
import { LedgerEntry } from '../models/LedgerEntry.js';

import { createLedgerForPayment, upsertLedgerForDocument } from '../lib/ledger.js';

function arg(name) {
  const idx = process.argv.findIndex((a) => a === name);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return null;
  return v;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function toYmd(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomMoney(rng, min, max) {
  const v = rng() * (max - min) + min;
  return Math.round(v * 100) / 100;
}

async function countByModel(label, Model, filter) {
  const n = await Model.countDocuments(filter);
  return { label, n };
}

async function main() {
  const email = String(arg('--email') || 'adityarajsir162@gmail.com').toLowerCase();
  const confirm = hasFlag('--confirm');
  const profileIdArg = arg('--profileId');
  const profileNameArg = arg('--profileName');
  const wipeProfileData = hasFlag('--wipe-profile-data');
  const quick = hasFlag('--quick');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(mongoUri);

  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  const userId = user._id;

  const profiles = await BusinessProfile.find({ userId }).select({ _id: 1, businessName: 1, ownerName: 1, gstin: 1 }).lean();
  const profileIds = profiles.map((p) => p._id);

  if (!profileIdArg && !profileNameArg) {
    // eslint-disable-next-line no-console
    console.log('Available profiles for this user:');
    // eslint-disable-next-line no-console
    console.table(
      profiles.map((p) => ({
        profileId: String(p._id),
        businessName: p.businessName,
        ownerName: p.ownerName,
        gstin: p.gstin,
      }))
    );
    // eslint-disable-next-line no-console
    console.log('\nRe-run with --profileId <id> (recommended) or --profileName <businessName>.');
    await mongoose.disconnect();
    return;
  }

  const profile = profileIdArg
    ? await BusinessProfile.findOne({ _id: profileIdArg, userId })
    : await BusinessProfile.findOne({ userId, businessName: profileNameArg });

  if (!profile) {
    throw new Error('Target BusinessProfile not found for this user. Provide correct --profileId or --profileName.');
  }

  const base = { userId, profileId: profile._id };

  const counts = await Promise.all([
    countByModel('BusinessProfile', BusinessProfile, { userId }),
    countByModel('Customer', Customer, base),
    countByModel('Supplier', Supplier, base),
    countByModel('Item', Item, base),
    countByModel('Document', Document, base),
    countByModel('Payment', Payment, base),
    countByModel('LedgerEntry', LedgerEntry, base),
    countByModel('Counter', Counter, base),
    countByModel('Session', Session, base),
    countByModel('Subscription', Subscription, base),
    countByModel('PasswordResetOtp', PasswordResetOtp, { userId }),
  ]);

  // eslint-disable-next-line no-console
  console.log('Target:', {
    email,
    userId: String(userId),
    profileId: String(profile._id),
    businessName: profile.businessName,
    profiles: profileIds.map(String),
  });
  // eslint-disable-next-line no-console
  console.table(counts);

  if (!confirm) {
    // eslint-disable-next-line no-console
    console.log('\nDry run only. Re-run with --confirm to seed data into the selected BusinessProfile.');
    // eslint-disable-next-line no-console
    console.log(
      `Example: node src/scripts/reset_and_seed_user.js --email ${email} --profileId ${String(profile._id)} --confirm`
    );
    if (wipeProfileData) {
      // eslint-disable-next-line no-console
      console.log('Note: You passed --wipe-profile-data, but it will only apply with --confirm.');
    }
    await mongoose.disconnect();
    return;
  }

  // 1) OPTIONAL WIPE (only this profile's data)
  if (wipeProfileData) {
    await Promise.all([
      Customer.deleteMany(base),
      Supplier.deleteMany(base),
      Item.deleteMany(base),
      Document.deleteMany(base),
      Payment.deleteMany(base),
      LedgerEntry.deleteMany(base),
      Counter.deleteMany(base),
    ]);
  }

  const rng = mulberry32(162);

  // 3) ITEMS
  const itemNames = [
    'Weighbridge Service',
    'Load Cell',
    'Indicator',
    'Junction Box',
    'Weighing Platform',
    'Calibration Charges',
    'AMC - Annual Maintenance',
    'Installation Service',
    'Spare Cable',
    'Printer Roll',
  ];

  const items = [];
  const itemCount = quick ? 12 : 60;
  for (let i = 0; i < itemCount; i += 1) {
    const baseName = pick(rng, itemNames);
    const name = `${baseName}${i % 3 === 0 ? ' - Premium' : i % 3 === 1 ? ' - Standard' : ''}`.trim();
    const purchaseCost = randomMoney(rng, 200, 5000);
    const margin = randomMoney(rng, 0.15, 0.55);
    const sellingPrice = Math.round(purchaseCost * (1 + margin) * 100) / 100;

    // eslint-disable-next-line no-await-in-loop
    const it = await Item.create({
      userId,
      profileId: profile._id,
      name,
      unit: 'pcs',
      rate: sellingPrice,
      sellingPrice,
      purchaseCost,
      cgst: 9,
      sgst: 9,
      igst: 0,
    });
    items.push(it);
  }

  // 4) PARTIES
  const firstNames = ['Vertex', 'Shree', 'Om', 'Maa', 'Sai', 'Patel', 'Rathod', 'Arihant', 'Jain', 'Royal'];
  const lastNames = ['Industries', 'Traders', 'Enterprises', 'Solutions', 'Technologies', 'Steel', 'Hardware', 'Motors', 'Constructions', 'Agro'];

  const customers = [];
  const customerCount = quick ? 8 : 45;
  for (let i = 0; i < customerCount; i += 1) {
    const name = `${pick(rng, firstNames)} ${pick(rng, lastNames)}`;
    const openingBalance = randomMoney(rng, 0, 95000);
    const openingBalanceType = rng() < 0.85 ? 'dr' : 'cr';
    // eslint-disable-next-line no-await-in-loop
    const c = await Customer.create({
      userId,
      profileId: profile._id,
      name,
      email: `accounts+${i}@example.com`,
      phone: `+9199${String(10000000 + i).slice(-8)}`,
      billingAddress: `Address ${i}, Vadodara, Gujarat`,
      gstin: rng() < 0.4 ? `24AAAAA${String(1000 + i).slice(-4)}A1Z5` : null,
      openingBalance,
      openingBalanceType,
    });
    customers.push(c);
  }

  const suppliers = [];
  const supplierCount = quick ? 3 : 18;
  for (let i = 0; i < supplierCount; i += 1) {
    const name = `${pick(rng, firstNames)} ${pick(rng, lastNames)}`;
    const openingBalance = randomMoney(rng, 0, 120000);
    const openingBalanceType = rng() < 0.75 ? 'cr' : 'dr';
    // eslint-disable-next-line no-await-in-loop
    const s = await Supplier.create({
      userId,
      profileId: profile._id,
      name,
      email: `sales+${i}@supplier.com`,
      phone: `+9198${String(20000000 + i).slice(-8)}`,
      billingAddress: `Industrial Area ${i}, Ahmedabad, Gujarat`,
      gstin: rng() < 0.5 ? `24BBBBB${String(2000 + i).slice(-4)}B1Z5` : null,
      openingBalance,
      openingBalanceType,
      bankName: rng() < 0.5 ? 'HDFC Bank' : 'ICICI Bank',
      ifscCode: 'HDFC0000000',
      upiId: `supplier${i}@upi`,
    });
    suppliers.push(s);
  }

  // 5) DOCS + PAYMENTS (2024-03-01 to 2026-03-01)
  const start = quick ? addDays(new Date(), -75) : new Date('2024-03-01T00:00:00.000Z');
  const end = quick ? new Date() : new Date('2026-03-01T00:00:00.000Z');

  const docTypes = ['invoice', 'billing'];

  const makeItems = () => {
    const n = randomInt(rng, 1, 5);
    const picked = [];
    for (let j = 0; j < n; j += 1) {
      const it = pick(rng, items);
      const qty = randomInt(rng, 1, 5);
      const rate = Number(it.sellingPrice || it.rate || 0);
      const discount = rng() < 0.25 ? randomMoney(rng, 1, 10) : 0;
      const taxable = qty * rate * (1 - discount / 100);
      const cgst = 9;
      const sgst = 9;
      const igst = 0;
      const total = taxable + (taxable * (cgst + sgst + igst)) / 100;
      picked.push({
        name: it.name,
        hsnSac: '9983',
        description: '',
        sku: '',
        servicePeriod: '',
        quantity: qty,
        unit: 'pcs',
        rate,
        sellingPrice: rate,
        purchaseCost: Number(it.purchaseCost || 0),
        currency: 'INR',
        discount,
        cgst,
        sgst,
        igst,
        total,
      });
    }
    return picked;
  };

  const computeTotals = (docItems) => {
    const itemsTotal = docItems.reduce((s, it) => s + (Number(it.total) || 0), 0);
    const transportCharges = rng() < 0.2 ? randomMoney(rng, 50, 600) : 0;
    const additionalCharges = rng() < 0.15 ? randomMoney(rng, 100, 800) : 0;
    const packingHandlingCharges = rng() < 0.12 ? randomMoney(rng, 50, 400) : 0;
    const tcs = 0;
    const subtotal = itemsTotal + transportCharges + additionalCharges + packingHandlingCharges + tcs;
    const rounded = Math.round(subtotal);
    const roundOff = rng() < 0.7 ? Math.round((rounded - subtotal) * 100) / 100 : 0;
    const grandTotal = Math.round((subtotal + roundOff) * 100) / 100;

    const totalCgst = docItems.reduce((sum, it) => {
      const qty = Number(it.quantity || 0);
      const rate = Number(it.rate || 0);
      const disc = Number(it.discount || 0);
      const taxable = qty * rate * (1 - disc / 100);
      return sum + (taxable * Number(it.cgst || 0)) / 100;
    }, 0);

    const totalSgst = docItems.reduce((sum, it) => {
      const qty = Number(it.quantity || 0);
      const rate = Number(it.rate || 0);
      const disc = Number(it.discount || 0);
      const taxable = qty * rate * (1 - disc / 100);
      return sum + (taxable * Number(it.sgst || 0)) / 100;
    }, 0);

    const totalIgst = 0;

    return {
      transportCharges,
      additionalCharges,
      packingHandlingCharges,
      tcs,
      roundOff,
      itemsTotal,
      subtotal,
      grandTotal,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst,
    };
  };

  async function refreshPaymentStatus(docId) {
    const doc = await Document.findOne({ _id: docId, userId, profileId: profile._id });
    if (!doc) return;
    const pays = await Payment.find({ userId, profileId: profile._id, documentId: docId });
    const paid = pays.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const total = Number(doc.grandTotal || 0);
    const remaining = Math.max(0, total - paid);
    let status = 'unpaid';
    if (paid > 0 && remaining > 0) status = 'partial';
    if (remaining <= 0 && total > 0) status = 'paid';
    if (total <= 0) status = 'paid';
    doc.paymentStatus = status;
    await doc.save();
  }

  let cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    const month = cursor.getUTCMonth();
    const year = cursor.getUTCFullYear();

    const seasonal = month === 2 || month === 9 ? 1.3 : month === 5 ? 0.85 : 1.0;
    const invoicesThisMonth = quick
      ? clamp(Math.round(randomInt(rng, 2, 4) * seasonal), 1, 6)
      : clamp(Math.round(randomInt(rng, 6, 14) * seasonal), 4, 22);

    for (let i = 0; i < invoicesThisMonth; i += 1) {
      const day = randomInt(rng, 1, 26);
      const date = new Date(Date.UTC(year, month, day));

      const cust = pick(rng, customers);
      const docItems = makeItems();
      const totals = computeTotals(docItems);

      const dueDays = randomInt(rng, 7, 45);
      const dueDate = toYmd(addDays(date, dueDays));

      const docType = pick(rng, docTypes);

      // eslint-disable-next-line no-await-in-loop
      const doc = await Document.create({
        userId,
        profileId: profile._id,
        documentNumber: `${docType.toUpperCase()}-${String(year)}${String(month + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
        type: docType,
        status: 'final',
        version: 1,

        customerId: cust._id,
        supplierId: null,
        customerName: cust.name,
        customerAddress: cust.billingAddress || cust.address || null,
        customerGstin: cust.gstin || null,
        customerMobile: cust.phone || null,
        customerEmail: cust.email || null,

        date: toYmd(date),
        dueDate,

        items: docItems,
        notes: rng() < 0.3 ? 'Thank you for your business.' : null,
        termsConditions: rng() < 0.25 ? 'Payment due as per terms.' : null,
        paymentStatus: 'unpaid',

        currency: 'INR',
        ...totals,
      });

      // eslint-disable-next-line no-await-in-loop
      await upsertLedgerForDocument({ userId, profileId: profile._id, documentId: doc._id });

      // payments behavior
      const payRoll = rng();
      const total = Number(doc.grandTotal || 0);

      if (payRoll < 0.68) {
        // paid fully
        const payDate = addDays(date, randomInt(rng, 0, 25));
        // eslint-disable-next-line no-await-in-loop
        const payment = await Payment.create({
          userId,
          profileId: profile._id,
          documentId: doc._id,
          customerId: cust._id,
          supplierId: null,
          amount: total,
          currency: 'INR',
          date: toYmd(payDate),
          method: pick(rng, ['Cash', 'UPI', 'Bank']),
          reference: rng() < 0.6 ? `TXN${randomInt(rng, 100000, 999999)}` : null,
          notes: null,
        });
        // eslint-disable-next-line no-await-in-loop
        await createLedgerForPayment({ userId, profileId: profile._id, payment });
      } else if (payRoll < 0.88) {
        // partial payments
        const p1 = Math.round(total * randomMoney(rng, 0.2, 0.6) * 100) / 100;
        const p2 = Math.max(0, Math.round((total - p1) * randomMoney(rng, 0.2, 0.8) * 100) / 100);

        const payDate1 = addDays(date, randomInt(rng, 0, 20));
        const payDate2 = addDays(date, randomInt(rng, 15, 60));

        // eslint-disable-next-line no-await-in-loop
        const payment1 = await Payment.create({
          userId,
          profileId: profile._id,
          documentId: doc._id,
          customerId: cust._id,
          supplierId: null,
          amount: p1,
          currency: 'INR',
          date: toYmd(payDate1),
          method: pick(rng, ['Cash', 'UPI', 'Bank']),
          reference: rng() < 0.7 ? `TXN${randomInt(rng, 100000, 999999)}` : null,
          notes: 'Part payment',
        });
        // eslint-disable-next-line no-await-in-loop
        await createLedgerForPayment({ userId, profileId: profile._id, payment: payment1 });

        if (p2 > 0 && rng() < 0.75) {
          // eslint-disable-next-line no-await-in-loop
          const payment2 = await Payment.create({
            userId,
            profileId: profile._id,
            documentId: doc._id,
            customerId: cust._id,
            supplierId: null,
            amount: p2,
            currency: 'INR',
            date: toYmd(payDate2),
            method: pick(rng, ['UPI', 'Bank']),
            reference: rng() < 0.8 ? `TXN${randomInt(rng, 100000, 999999)}` : null,
            notes: 'Part payment',
          });
          // eslint-disable-next-line no-await-in-loop
          await createLedgerForPayment({ userId, profileId: profile._id, payment: payment2 });
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await refreshPaymentStatus(doc._id);
    }

    // Supplier purchases (2-8 / month)
    const purchasesThisMonth = quick ? clamp(randomInt(rng, 0, 2), 0, 3) : clamp(randomInt(rng, 2, 8), 0, 12);
    for (let i = 0; i < purchasesThisMonth; i += 1) {
      const day = randomInt(rng, 1, 26);
      const date = new Date(Date.UTC(year, month, day));
      const supp = pick(rng, suppliers);

      const n = randomInt(rng, 1, 4);
      const picked = [];
      for (let j = 0; j < n; j += 1) {
        const it = pick(rng, items);
        const qty = randomInt(rng, 1, 10);
        const rate = Number(it.purchaseCost || 0);
        const taxable = qty * rate;
        const cgst = 9;
        const sgst = 9;
        const total = taxable + (taxable * (cgst + sgst)) / 100;
        picked.push({
          name: it.name,
          hsnSac: '9983',
          description: '',
          sku: '',
          servicePeriod: '',
          quantity: qty,
          unit: 'pcs',
          rate,
          sellingPrice: Number(it.sellingPrice || it.rate || 0),
          purchaseCost: rate,
          currency: 'INR',
          discount: 0,
          cgst,
          sgst,
          igst: 0,
          total,
        });
      }

      const totals = computeTotals(picked);

      // eslint-disable-next-line no-await-in-loop
      const doc = await Document.create({
        userId,
        profileId: profile._id,
        documentNumber: `PURCHASE-${String(year)}${String(month + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
        type: 'purchase',
        status: 'final',
        version: 1,

        customerId: null,
        supplierId: supp._id,
        customerName: supp.name,
        customerAddress: supp.billingAddress || supp.address || null,
        customerGstin: supp.gstin || null,
        customerMobile: supp.phone || null,
        customerEmail: supp.email || null,

        date: toYmd(date),
        dueDate: toYmd(addDays(date, randomInt(rng, 10, 40))),

        items: picked,
        notes: rng() < 0.2 ? 'Purchase entry' : null,
        termsConditions: null,
        paymentStatus: 'unpaid',

        currency: 'INR',
        ...totals,
      });

      // eslint-disable-next-line no-await-in-loop
      await upsertLedgerForDocument({ userId, profileId: profile._id, documentId: doc._id });

      // Supplier payments sometimes
      if (rng() < 0.55) {
        const total = Number(doc.grandTotal || 0);
        const payDate = addDays(date, randomInt(rng, 0, 35));
        // eslint-disable-next-line no-await-in-loop
        const payment = await Payment.create({
          userId,
          profileId: profile._id,
          documentId: doc._id,
          customerId: null,
          supplierId: supp._id,
          amount: rng() < 0.75 ? total : Math.round(total * randomMoney(rng, 0.2, 0.8) * 100) / 100,
          currency: 'INR',
          date: toYmd(payDate),
          method: pick(rng, ['Cash', 'UPI', 'Bank']),
          reference: rng() < 0.65 ? `BILL${randomInt(rng, 100000, 999999)}` : null,
          notes: null,
        });
        // eslint-disable-next-line no-await-in-loop
        await createLedgerForPayment({ userId, profileId: profile._id, payment });
      }

      // eslint-disable-next-line no-await-in-loop
      await refreshPaymentStatus(doc._id);
    }

    cursor = new Date(Date.UTC(year, month + 1, 1));
  }

  // eslint-disable-next-line no-console
  console.log('Done. Seeded profile:', String(profile._id), { wipeProfileData });

  await mongoose.disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
