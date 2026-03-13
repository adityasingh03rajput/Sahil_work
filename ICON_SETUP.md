# Icon Setup Guide

## Overview
The app icon has been configured across all platforms using `icon.png` from the workspace root.

## What's Been Set Up

### ✅ Web Application
- **Location**: `public/favicon.png`
- **Usage**: Displayed in browser tabs and bookmarks
- **Configuration**: Updated in `index.html`

### ✅ Electron Desktop App
- **Location**: `build/icon.png`
- **Usage**: Windows application icon
- **Configuration**: Updated in `electron-builder.json`
- **Note**: For best results on Windows, convert to `.ico` format (256x256 recommended)

### ✅ Android App
- **Location**: `build/icon.png`
- **Next Step**: Run `npx @capacitor/assets generate --android` to generate all Android icon sizes

## Quick Commands

### Regenerate Icons
```bash
npm run generate-icons
```

### Generate Android Icons
```bash
npx @capacitor/assets generate --android
```

## Icon Requirements

- **Recommended Size**: 512x512 pixels or larger
- **Format**: PNG with transparency
- **Aspect Ratio**: 1:1 (square)

## Files Created

1. `public/favicon.png` - Web favicon
2. `build/icon.png` - Build icon for Electron/Android
3. `scripts/generate-icons.cjs` - Icon generation script
4. `generate_icons.bat` - Windows batch script for icon generation

## Manual Steps (Optional)

### For Windows .ico File
If you want a proper Windows icon:
1. Visit https://convertio.co/png-ico/
2. Upload `icon.png`
3. Download as `icon.ico`
4. Place in `build/` folder
5. Update `electron-builder.json` to use `build/icon.ico`

### For Android
Generate all required Android icon sizes:
```bash
npx @capacitor/assets generate --android
```

This will create icons for all Android densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi).

## Verification

- ✅ Web: Check browser tab shows the icon
- ✅ Electron: Build and check Windows app icon
- ✅ Android: Check app launcher icon after building APK
