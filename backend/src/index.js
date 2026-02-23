import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) return cb(null, true);

    // Allow Vite/localhost dev ports by default
    if (/^https?:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    if (/^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)) return cb(null, true);

    return cb(new Error('Not allowed by CORS'));
  },
  credentials: false,
}));
app.use(express.json({ limit: '2mb' }));

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPathCandidates = [
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../../src/dist'),
];
const distPath = distPathCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));

if (distPath) {
  app.use(express.static(distPath));
}
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path.startsWith('/profiles') || req.path.startsWith('/documents') || req.path.startsWith('/customers') || req.path.startsWith('/suppliers') || req.path.startsWith('/items') || req.path.startsWith('/subscription') || req.path.startsWith('/analytics') || req.path.startsWith('/payments') || req.path.startsWith('/reports') || req.path.startsWith('/health')) {
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
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 4000);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('MONGODB_URI is required');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

await mongoose.connect(mongoUri);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
