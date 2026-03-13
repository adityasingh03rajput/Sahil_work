# MasterAdmin Electron Setup Guide

Complete guide to build and distribute the MasterAdmin desktop application.

## 🚀 Quick Build (Recommended)

### Step 1: Run the Build Script

Double-click or run:
```bash
BUILD_ELECTRON_PORTABLE.bat
```

This will:
1. Install all dependencies
2. Build the React application
3. Create a portable .exe file

**Output**: `release/MasterAdmin-0.0.1-portable.exe`

### Step 2: Test the Application

1. Navigate to the `release` folder
2. Double-click `MasterAdmin-0.0.1-portable.exe`
3. The app will open directly to the MasterAdmin login page

## 📦 What Gets Built

### Portable Executable
- **File**: `MasterAdmin-0.0.1-portable.exe`
- **Size**: ~150-200 MB (includes Chromium)
- **Features**:
  - No installation required
  - Can run from USB drive
  - Self-contained (all dependencies included)
  - Perfect for distribution

### Full Installer (Optional)
Run `BUILD_ELECTRON.bat` to also create:
- **File**: `MasterAdmin-0.0.1-x64.exe`
- **Features**:
  - Professional installer
  - Desktop shortcut
  - Start menu entry
  - Uninstaller included

## 🛠️ Manual Build Process

If you prefer manual control:

### 1. Install Dependencies
```bash
npm install
```

### 2. Build React App
```bash
npm run build
```

### 3. Build Electron App
```bash
# Portable only
npm run electron:build:portable

# Or full installer + portable
npm run electron:build:win
```

## 🎨 Customizing the App

### Change App Name
Edit `electron-builder.json`:
```json
{
  "productName": "YourAppName",
  "appId": "com.yourcompany.yourapp"
}
```

### Change App Icon
1. Create a 512x512 PNG logo
2. Convert to .ico format: https://convertio.co/png-ico/
3. Save as `build/icon.ico`
4. Rebuild the app

### Change Starting Route
Edit `electron/main.js`, line 24:
```javascript
// Change from:
mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
  hash: '/master-admin/login'
});

// To your preferred route:
mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
  hash: '/your-route'
});
```

## 🔧 Development Mode

Test the app with hot reload:

```bash
npm run electron:dev
```

This will:
1. Start Vite dev server
2. Launch Electron window
3. Auto-reload on code changes

## 📋 File Structure

```
project/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Preload script (security)
├── build/
│   └── icon.ico         # App icon (add your own)
├── dist/                # Built React app (auto-generated)
├── release/             # Built executables (auto-generated)
├── electron-builder.json # Build configuration
├── BUILD_ELECTRON.bat   # Full build script
└── BUILD_ELECTRON_PORTABLE.bat # Portable build script
```

## 🌐 API Configuration

The app needs to connect to your backend API.

### Option 1: Environment Variables
Create `.env.production`:
```
VITE_API_URL=http://your-api-server:3000
```

### Option 2: Hardcode in Config
Edit `src/app/config/api.ts`:
```typescript
export const API_BASE_URL = 'http://your-api-server:3000';
```

## 🚢 Distribution

### For End Users
1. Share the portable .exe file
2. No installation needed
3. Just double-click to run

### For IT Departments
1. Share the installer .exe
2. Supports silent installation
3. Can be deployed via Group Policy

### File Sharing Options
- Email (if under 25MB)
- Cloud storage (Google Drive, Dropbox)
- Internal file server
- USB drive

## 🔒 Security Features

- Context isolation enabled
- Node integration disabled
- Secure preload script
- No remote code execution

## 📊 Build Size Optimization

Current size: ~150-200 MB

To reduce size:
1. Remove unused dependencies
2. Enable compression in electron-builder
3. Use asar archive (enabled by default)

## 🐛 Troubleshooting

### Build Fails with "electron not found"
```bash
npm install electron --save-dev
```

### App Shows White Screen
1. Open DevTools: Ctrl+Shift+I
2. Check Console for errors
3. Verify API URL is correct

### "Cannot find module" Error
```bash
rmdir /s /q node_modules
npm install
```

### Slow Build Times
- Use portable-only build: `BUILD_ELECTRON_PORTABLE.bat`
- Disable antivirus temporarily
- Use SSD for faster I/O

## 📱 Platform Support

### Windows
- ✅ Fully supported
- ✅ Portable executable
- ✅ NSIS installer

### Linux
- ✅ AppImage format
- ✅ .deb package
- Build command: `npm run electron:build -- --linux`

### macOS
- ✅ .dmg installer
- ✅ .zip archive
- Build command: `npm run electron:build -- --mac`
- Note: Requires macOS to build

## 🎯 Next Steps

1. ✅ Build the portable executable
2. ✅ Test on your machine
3. ✅ Configure API endpoint
4. ✅ Add custom icon
5. ✅ Test on target machines
6. ✅ Distribute to users

## 💡 Tips

- Keep the portable .exe for quick testing
- Use the installer for production deployment
- Test on a clean Windows machine
- Document the API requirements
- Provide user manual with the app

## 📞 Support

If you encounter issues:
1. Check the console logs (Ctrl+Shift+I)
2. Review the build output
3. Verify all dependencies are installed
4. Check the ELECTRON_README.md for details

## 🔄 Updates

To update the app:
1. Make code changes
2. Run build script again
3. Distribute new .exe file
4. Users replace old file with new one

For automatic updates, configure electron-updater (advanced).
