const https = require('https');

const measureLatency = async (name, url) => {
  return new Promise((resolve) => {
    const start = process.hrtime();
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const diff = process.hrtime(start);
        const timeMs = (diff[0] * 1000) + (diff[1] / 1000000);
        console.log(`${name}: ${timeMs.toFixed(2)} ms (Status: ${res.statusCode})`);
        resolve(timeMs);
      });
    }).on('error', (err) => {
      console.error(`${name} Error:`, err.message);
      resolve(-1);
    });
  });
};

const run = async () => {
  console.log('--- Speed Test: Fly.dev vs Render.com ---');
  console.log('Target: /api/health (or root if it redirects/auth fails)');
  
  // Do 3 pings each
  for(let i=1; i<=3; i++) {
    console.log(`\nPing ${i}:`);
    await measureLatency('Fly.dev Server', 'https://billvyapar-backend.fly.dev/');
    await measureLatency('Render Server ', 'https://accounts-8rx9.onrender.com/');
  }
};

run();
