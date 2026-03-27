import { sendEmail, canSendEmail } from '../src/lib/email.js';
import 'dotenv/config';

console.log('Testing email send...');
console.log('canSendEmail:', canSendEmail());
console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

try {
  await sendEmail({
    to: 'adityarajsir162@gmail.com', // (assuming this is the owner's email)
    subject: 'Test connection from BillVyapar server',
    html: '<h1>Hello</h1><p>This is a test.</p>'
  });
  console.log('✅ Email sent successfully!');
} catch (error) {
  console.error('❌ Email send failed:');
  console.error(error);
}
process.exit(0);
