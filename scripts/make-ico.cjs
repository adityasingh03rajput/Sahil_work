const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function main() {
  // Resize to 256x256 square first
  const squarePng = await sharp('build/icon.png')
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  fs.writeFileSync('build/icon-256.png', squarePng);

  // Use png-to-ico
  const { default: pngToIco } = await import('png-to-ico');
  const ico = await pngToIco('build/icon-256.png');
  fs.writeFileSync('build/icon.ico', ico);
  console.log('✅ build/icon.ico created');
}

main().catch(e => { console.error(e); process.exit(1); });
