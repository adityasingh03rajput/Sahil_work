import fetch from 'node-fetch';

const url = 'https://billvyapar-backend.fly.dev/auth/forgot-password';
const body = JSON.stringify({ email: 'tellonted03angle@gmail.com' });

console.log('Testing endpoint for tellonted03angle@gmail.com:', url);
try {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  console.log('Status:', r.status);
  const data = await r.json();
  console.log('Data:', data);
} catch (e) { console.error('Error:', e); }
process.exit(0);
