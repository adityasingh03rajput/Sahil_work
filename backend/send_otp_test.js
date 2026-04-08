import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
const to = 'adityarajput.0106@gmail.com';
const otp = Math.floor(1000 + Math.random() * 9000);

if (!key) { console.error('RESEND_API_KEY NOT FOUND'); process.exit(1); }

async function run() {
  const resend = new Resend(key);
  console.log(`[AUDIT] OTP Prepared: ${otp}`);
  console.log(`[AUDIT] Relaying to ${to} via ${from}...`);
  try {
    const { data, error } = await resend.emails.send({
      from, to,
      subject: 'Hukum Audit — Secure OTP Deliverability',
      html: `<div style="font-family:sans-serif;padding:20px;border-radius:12px;background:#f4f6fb;max-width:400px;margin:auto;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.1)">
        <h1 style="color:#6366f1;font-weight:900;letter-spacing:-1px">Secure OTP</h1>
        <div style="font-size:42px;font-weight:900;letter-spacing:8px;color:#1e293b;padding:20px;background:#fff;border-radius:12px;border:2px dashed #6366f1">${otp}</div>
        <p style="color:#64748b;font-size:12px;margin-top:20px">Hukum Strategic Dashboard Audit Status: Success</p>
      </div>`
    });
    if (error) { console.error('[AUDIT] ERROR:', error); process.exit(1); }
    console.log('[AUDIT] SUCCESS: High-Precision Delivery Confirmed');
    console.log('[AUDIT] Delivery ID:', data.id);
  } catch (err) { console.error('[AUDIT] RUNTIME:', err); process.exit(1); }
}
run();
