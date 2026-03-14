const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Android icon sizes for different densities
const iconSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

async function generateAndroidIcons() {
  try {
    console.log('Generating Android icons from icon.png...\n');
    
    const sourceIcon = 'icon.png';
    
    if (!fs.existsSync(sourceIcon)) {
      console.error('ERROR: icon.png not found in root directory');
      process.exit(1);
    }
    
    // Generate icons for each density
    for (const [folder, size] of Object.entries(iconSizes)) {
      const outputDir = path.join('android', 'app', 'src', 'main', 'res', folder);
      
      if (!fs.existsSync(outputDir)) {
        console.log(`Creating directory: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputPath = path.join(outputDir, 'ic_launcher.png');
      const outputPathRound = path.join(outputDir, 'ic_launcher_round.png');
      const outputPathForeground = path.join(outputDir, 'ic_launcher_foreground.png');
      
      // Generate standard launcher icon
      await sharp(sourceIcon)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${folder}/ic_launcher.png (${size}x${size})`);
      
      // Generate round launcher icon
      await sharp(sourceIcon)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(outputPathRound);
      
      console.log(`✓ Generated ${folder}/ic_launcher_round.png (${size}x${size})`);
      
      // Generate foreground icon (for adaptive icons)
      await sharp(sourceIcon)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(outputPathForeground);
      
      console.log(`✓ Generated ${folder}/ic_launcher_foreground.png (${size}x${size})`);
    }
    
    console.log('\n✓ All Android icons generated successfully!');
    console.log('\nIcons created in:');
    console.log('  android/app/src/main/res/mipmap-*/');
    
  } catch (error) {
    console.error('Error generating Android icons:', error);
    process.exit(1);
  }
}

generateAndroidIcons();
