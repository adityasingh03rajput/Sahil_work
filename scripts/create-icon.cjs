const fs = require('fs');
const pti = require('png-to-ico');

const pngToIco = pti.default || pti;

console.log('Creating icon for Electron desktop app...');
pngToIco('public/logo.png')
  .then(buf => {
    if (!fs.existsSync('build')) {
      fs.mkdirSync('build');
    }
    fs.writeFileSync('build/icon.ico', buf);
    console.log('Icon successfully created at build/icon.ico!');
  })
  .catch(console.error);
