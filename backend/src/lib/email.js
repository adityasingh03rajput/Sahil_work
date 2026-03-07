import nodemailer from 'nodemailer';
import { Resend } from 'resend';

function canSendResend() {
  return Boolean(process.env.RESEND_API_KEY);
}

function canSendSmtp() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function resolveFrom() {
  return String(process.env.EMAIL_FROM || process.env.RESEND_FROM || process.env.SMTP_FROM || '').trim();
}

async function sendViaResend({ to, subject, html }) {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (!key) throw new Error('RESEND_API_KEY is not configured');
  const from = resolveFrom();
  if (!from) throw new Error('EMAIL_FROM/RESEND_FROM is not configured');

  const resend = new Resend(key);
  await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}

async function sendViaSmtp({ to, subject, html }) {
  const from = resolveFrom() || String(process.env.SMTP_USER || '').trim();
  if (!from) throw new Error('SMTP_FROM/EMAIL_FROM is not configured');

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}

export function canSendEmail() {
  return canSendResend() || canSendSmtp();
}

export async function sendEmail({ to, subject, html }) {
  if (canSendResend()) return sendViaResend({ to, subject, html });
  if (canSendSmtp()) return sendViaSmtp({ to, subject, html });
  throw new Error('Email provider is not configured');
}
