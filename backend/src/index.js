import compression from 'compression';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Patch all async route errors to be forwarded to Express error handler
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
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
import { bankTransactionsRouter } from './routes/bank-transactions.js';
import { reportsRouter } from './routes/reports.js';
import { ledgerRouter } from './routes/ledger.js';
import { extraExpensesRouter } from './routes/extra-expenses.js';
import { vyaparKhataRouter } from './routes/vyapar-khata.js';
import { uploadsRouter } from './routes/uploads.js';
import { masterAdminRouter } from './routes/masterAdmin/index.js';
import twilio from 'twilio';
import { Document } from './models/Document.js';
import { BusinessProfile } from './models/BusinessProfile.js';

// ── Validate required env vars early ─────────────────────────────────────────
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) throw new Error('MONGODB_URI is required');
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

const app = express();

// ── Compression ───────────────────────────────────────────────────────────────
// Gzip all responses > 1KB — cuts payload size by ~70% on JSON lists
app.use(compression({ threshold: 1024 }));

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // needed for Capacitor WebView
  contentSecurityPolicy: false,     // managed by frontend
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (origin === 'null') return cb(null, true);
    if (origin === 'capacitor://localhost' || origin === 'http://localhost' || origin === 'https://localhost') {
      return cb(null, true);
    }
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (/^https?:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    if (/^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)) return cb(null, true);
    if (/^https?:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)) return cb(null, true);
    if (/^https?:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: false,
}));

// ── Request logging ───────────────────────────────────────────────────────────
// Skip health checks to keep logs clean
app.use(morgan('combined', {
  skip: (req) => req.path === '/health',
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Strict limit on auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/verify-session', // don't throttle session checks
});

// General API limiter — generous but prevents abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/auth', authLimiter);
app.use(apiLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting
  const dbOk = dbState === 1 || dbState === 2;
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] ?? 'unknown',
    uptime: Math.floor(process.uptime()),
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/profiles', profilesRouter);
app.use('/documents', documentsRouter);
app.use('/customers', customersRouter);
app.use('/suppliers', suppliersRouter);
app.use('/items', itemsRouter);
app.use('/subscription', subscriptionRouter);
app.use('/analytics', analyticsRouter);
app.use('/payments', paymentsRouter);
app.use('/bank-transactions', bankTransactionsRouter);
app.use('/reports', reportsRouter);
app.use('/ledger', ledgerRouter);
app.use('/extra-expenses', extraExpensesRouter);
app.use('/vyapar-khata', vyaparKhataRouter);
app.use('/uploads', uploadsRouter);
app.use('/master-admin', masterAdminRouter);

// ── Static frontend ───────────────────────────────────────────────────────────
const distPathCandidates = [
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../../src/dist'),
];
const distPath = distPathCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));
if (distPath) app.use(express.static(distPath, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  },
}));

const API_PREFIXES = [
  '/auth', '/profiles', '/documents', '/customers', '/suppliers', '/items',
  '/subscription', '/analytics', '/payments', '/reports', '/ledger',
  '/extra-expenses', '/uploads', '/health', '/bank-transactions',
  '/vyapar-khata', '/master-admin',
];

app.get('*', (req, res, next) => {
  if (API_PREFIXES.some(p => req.path.startsWith(p))) return next();
  if (!distPath) return res.status(500).send('Frontend build not found');
  // Admin panel routes → serve admin.html
  if (req.path === '/admin' || req.path.startsWith('/admin/')) {
    const adminHtml = path.join(distPath, 'admin.html');
    if (fs.existsSync(adminHtml)) return res.sendFile(adminHtml);
  }
  return res.sendFile(path.join(distPath, 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Don't log 4xx — those are client errors, not server problems
  if (!err?.status || err.status >= 500) {
    console.error('[ERROR]', err?.message || err);
  }
  const status = Number(err?.status || err?.statusCode || 500);
  const message = err?.message ? String(err.message) : 'Internal server error';
  // Never leak stack traces to clients
  res.status(status).json({ error: message });
});

// ── MongoDB connection with retry ─────────────────────────────────────────────
const MONGO_OPTS = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
};

async function connectWithRetry(uri, retries = 5, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(uri, MONGO_OPTS);
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${i}/${retries} failed: ${err.message}`);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs * i)); // exponential back-off
    }
  }
}

// Re-connect on unexpected disconnects (e.g. Atlas failover)
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected — attempting reconnect…');
  connectWithRetry(mongoUri).catch(err => console.error('Reconnect failed:', err.message));
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err.message);
});

// ── Start server ──────────────────────────────────────────────────────────────
const port = Number(process.env.PORT || 4000);

await connectWithRetry(mongoUri);

// ── Auto-reminders (Twilio) ───────────────────────────────────────────────────
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
  const da = new Date(a); const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};
const parseDocDate = (s) => { if (!s) return null; const d = new Date(String(s)); return Number.isNaN(d.getTime()) ? null : d; };
const daysBetween = (a, b) => Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);

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
    if (!due || due.getTime() > now.getTime()) continue;
    const last = doc.lastReminderSentAt;
    if (last && isSameDay(last, now)) continue;
    if (doc.paymentStatus !== 'paid' && last && daysBetween(last, now) < reminderThrottleDays) continue;

    const profile = await BusinessProfile.findOne({ _id: doc.profileId, userId: doc.userId }).lean();
    const template = String(profile?.smsReminderTemplate || '').trim();
    const amount = Number(doc.grandTotal || 0);
    const invoiceNo = String(doc.documentNumber || '').trim();
    const party = String(doc.customerName || '').trim();
    const dueStr = String(doc.dueDate || '').trim();
    const businessName = String(profile?.businessName || '').trim();

    const defaultMsg = `Payment Reminder: ${party ? party + ', ' : ''}${invoiceNo ? invoiceNo + ', ' : ''}Amount ₹${amount.toFixed(2)}${dueStr ? ` due on ${dueStr}` : ''}. Kindly pay at the earliest.`;
    const msg = template
      ? template.replaceAll('{party}', party).replaceAll('{docNo}', invoiceNo)
          .replaceAll('{amount}', amount.toFixed(2)).replaceAll('{dueDate}', dueStr)
          .replaceAll('{businessName}', businessName)
      : defaultMsg;

    try {
      await twilioClient.messages.create({ from: twilioFrom, to, body: msg });
      doc.lastReminderSentAt = new Date();
      doc.reminderLogs = [...(doc.reminderLogs || []), { sentAt: new Date(), channel: 'sms', to, message: msg, status: 'sent', error: null }];
      await doc.save();
    } catch (e) {
      doc.reminderLogs = [...(doc.reminderLogs || []), { sentAt: new Date(), channel: 'sms', to, message: msg, status: 'failed', error: e?.message || 'Failed' }];
      await doc.save();
    }
  }
};

const server = app.listen(port, () => {
  console.log(`🚀 Backend listening on http://localhost:${port}`);
  console.log(`📦 MongoDB: ${mongoUri.replace(/\/\/[^@]+@/, '//***@')}`); // mask credentials
});

if (shouldRunTwilio) {
  console.log(`📨 Auto reminders enabled: every ${reminderIntervalMinutes} min`);
  const intervalMs = Math.max(1, reminderIntervalMinutes) * 60 * 1000;
  setInterval(() => runAutoReminders().catch(err => console.error('Reminder job failed:', err.message)), intervalMs);
} else if (remindersEnabled) {
  console.warn('⚠️  AUTO_REMINDERS_ENABLED=true but Twilio env vars missing');
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Lets in-flight requests finish before closing (important on Render/Railway)
let shuttingDown = false;

function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully…`);

  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    } catch (e) {
      console.error('Error closing MongoDB:', e.message);
    }
    process.exit(0);
  });

  // Force exit after 10s if requests don't drain
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Catch unhandled promise rejections — log but don't crash
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Give logger time to flush, then exit — let process manager restart
  setTimeout(() => process.exit(1), 500);
});
