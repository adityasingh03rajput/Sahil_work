const https = require('https');
const GSTIN = '23BXNPJ1682A1ZR';
const options = {
  method: 'GET',
  hostname: 'gst-return-status.p.rapidapi.com',
  port: null,
  path: '/free/gstin/' + GSTIN,
  headers: {
    'x-rapidapi-key': '4a00119dc9msh4494a26f89c8e86p104643jsndd8dfa279d10',
    'x-rapidapi-host': 'gst-return-status.p.rapidapi.com',
    'Content-Type': 'application/json'
  }
};
const req = https.request(options, function(res) {
  console.log('Status:', res.statusCode);
  const chunks = [];
  res.on('data', function(chunk) { chunks.push(chunk); });
  res.on('end', function() {
    const body = Buffer.concat(chunks).toString();
    if (!body) { console.log('(empty body)'); return; }
    try { console.log(JSON.stringify(JSON.parse(body), null, 2)); }
    catch(e) { console.log(body); }
  });
});
req.on('error', function(e) { console.error('Error:', e.message); });
req.end();
