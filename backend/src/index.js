import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';

import { authRouter } from './routes/auth.js';
import { profilesRouter } from './routes/profiles.js';
import { documentsRouter } from './routes/documents.js';
import { customersRouter } from './routes/customers.js';
import { suppliersRouter } from './routes/suppliers.js';
import { itemsRouter } from './routes/items.js';
import { subscriptionRouter } from './routes/subscription.js';
import { analyticsRouter } from './routes/analytics.js';
import { paymentsRouter } from './routes/payments.js';
import { reportsRouter } from './routes/reports.js';
import { ledgerRouter } from './routes/ledger.js';
import { extraExpensesRouter } from './routes/extra-expenses.js';
import { vyaparKhataRouter } from './routes/vyapar-khata.js';
import { uploadsRouter } from './routes/uploads.js';
import twilio from 'twilio';
import { Document } from './models/Document.js';
import { BusinessProfile } from './models/BusinessProfile.js';

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);

    // When running scripts from file:// (or certain embedded webviews), browsers send Origin: null
    if (origin === 'null') return cb(null, true);

    if (allowedOrigins.includes(origin)) return cb(null, true);

    // Allow Vite/localhost dev ports by default
    if (/^https?:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    if (/^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)) return cb(null, true);

    return cb(new Error('Not allowed by CORS'));
  },
  credentials: false,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/profiles', profilesRouter);
app.use('/documents', documentsRouter);
app.use('/customers', customersRouter);
app.use('/suppliers', suppliersRouter);
app.use('/items', itemsRouter);
app.use('/subscription', subscriptionRouter);
app.use('/analytics', analyticsRouter);
app.use('/payments', paymentsRouter);
app.use('/reports', reportsRouter);
app.use('/ledger', ledgerRouter);
app.use('/extra-expenses', extraExpensesRouter);
app.use('/vyapar-khata', vyaparKhataRouter);
app.use('/uploads', uploadsRouter);

const distPathCandidates = [
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../../src/dist'),
];
const distPath = distPathCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));

if (distPath) {
  app.use(express.static(distPath));
}
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path.startsWith('/profiles') || req.path.startsWith('/documents') || req.path.startsWith('/customers') || req.path.startsWith('/suppliers') || req.path.startsWith('/items') || req.path.startsWith('/subscription') || req.path.startsWith('/analytics') || req.path.startsWith('/payments') || req.path.startsWith('/reports') || req.path.startsWith('/ledger') || req.path.startsWith('/extra-expenses') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
    return next();
  }
  if (!distPath) {
    return res.status(500).send('Frontend build not found');
  }
  return res.sendFile(path.join(distPath, 'index.html'));
});

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = Number(err?.status || err?.statusCode || 500);
  const message = err?.message ? String(err.message) : 'Internal server error';
  res.status(status).json({ error: message });
});

const port = Number(process.env.PORT || 4000);
const mongoUri = process.env.MONGODB_URI;

// Debug: Check if environment variables are loaded
console.log('🔧 Environment variables loaded:');
console.log('- PORT:', process.env.PORT || 'not set');
console.log('- MONGODB_URI:', mongoUri ? '✅ set' : '❌ not set');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '✅ set' : '❌ not set');

if (!mongoUri) {
  console.error('❌ MONGODB_URI is missing from .env file');
  console.error('❌ Make sure .env file exists in backend directory with MONGODB_URI');
  throw new Error('MONGODB_URI is required');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

await mongoose.connect(mongoUri);

const remindersEnabled = String(process.env.AUTO_REMINDERS_ENABLED || '').toLowerCase() === 'true';
const reminderIntervalMinutes = Number(process.env.AUTO_REMINDERS_INTERVAL_MINUTES || 60);
const reminderLookbackDays = Number(process.env.AUTO_REMINDERS_LOOKBACK_DAYS || 60);
const reminderThrottleDays = Number(process.env.AUTO_REMINDERS_THROTTLE_DAYS || 2);
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM_NUMBER;

const shouldRunTwilio = remindersEnabled && twilioAccountSid && twilioAuthToken && twilioFrom;
const twilioClient = shouldRunTwilio ? twilio(twilioAccountSid, twilioAuthToken) : null;

const isSameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

const parseDocDate = (s) => {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isNaN(d.getTime()) ? null : d;
};

const daysBetween = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  const diff = Math.abs(db.getTime() - da.getTime());
  return diff / (1000 * 60 * 60 * 24);
};

const runAutoReminders = async () => {
  if (!twilioClient) return;

  const now = new Date();
  const lookbackStart = new Date(now);
  lookbackStart.setDate(now.getDate() - reminderLookbackDays);

  const candidates = await Document.find({
    type: { $in: ['invoice', 'billing'] },
    paymentStatus: { $ne: 'paid' },
    status: { $ne: 'draft' },
    updatedAt: { $gte: lookbackStart },
  }).sort({ updatedAt: -1 }).limit(500);

  for (const doc of candidates) {
    const to = String(doc.customerMobile || '').trim();
    if (!to) continue;

    const due = parseDocDate(doc.dueDate);
    if (!due) continue;

    const isDueOrOverdue = due.getTime() <= now.getTime();
    if (!isDueOrOverdue) continue;

    const isOverdue = now.getTime() > due.getTime();

    const last = doc.lastReminderSentAt;
    if (last && isSameDay(last, now)) continue;

    if (isOverdue && last && Number.isFinite(reminderThrottleDays) && reminderThrottleDays > 1) {
      if (daysBetween(last, now) < reminderThrottleDays) continue;
    }

    const profile = await BusinessProfile.findOne({ _id: doc.profileId, userId: doc.userId }).lean();
    const template = String(profile?.smsReminderTemplate || '').trim();

    const amount = Number(doc.grandTotal || 0);
    const invoiceNo = String(doc.documentNumber || '').trim();
    const party = String(doc.customerName || '').trim();
    const dueStr = String(doc.dueDate || '').trim();
    const businessName = String(profile?.businessName || '').trim();

    const defaultMsg = `Payment Reminder: ${party ? party + ', ' : ''}${invoiceNo ? invoiceNo + ', ' : ''}Amount ₹${amount.toFixed(2)}${dueStr ? ` due on ${dueStr}` : ''}. Kindly pay at the earliest.`;
    const fromTemplate = template
      ? template
          .replaceAll('{party}', party)
          .replaceAll('{docNo}', invoiceNo)
          .replaceAll('{amount}', amount.toFixed(2))
          .replaceAll('{dueDate}', dueStr)
          .replaceAll('{businessName}', businessName)
      : '';
    const msg = fromTemplate || defaultMsg;

    try {
      await twilioClient.messages.create({ from: twilioFrom, to, body: msg });
      doc.lastReminderSentAt = new Date();
      doc.reminderLogs = [
        ...(doc.reminderLogs || []),
        { sentAt: new Date(), channel: 'sms', to, message: msg, status: 'sent', error: null },
      ];
      await doc.save();
    } catch (e) {
      const error = e?.message ? String(e.message) : 'Failed to send SMS';
      doc.reminderLogs = [
        ...(doc.reminderLogs || []),
        { sentAt: new Date(), channel: 'sms', to, message: msg, status: 'failed', error },
      ];
      await doc.save();
    }
  }
};

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});

if (remindersEnabled && !shouldRunTwilio) {
  // eslint-disable-next-line no-console
  console.warn('AUTO_REMINDERS_ENABLED=true but Twilio env vars are missing; auto reminders will not run');
}

if (shouldRunTwilio) {
  // eslint-disable-next-line no-console
  console.log(`Auto reminders enabled: interval ${reminderIntervalMinutes} minutes`);
  const intervalMs = Math.max(1, reminderIntervalMinutes) * 60 * 1000;
  setInterval(() => {
    runAutoReminders().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Auto reminder job failed', err);
    });
  }, intervalMs);
}
