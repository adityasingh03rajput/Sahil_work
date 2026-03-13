# MasterAdmin Electron Desktop Application

This guide explains how to build and run the MasterAdmin interface as a standalone desktop application using Electron.

## Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Windows OS (for building .exe files)

## Quick Start

### Option 1: Build Installer + Portable Executable

Run the batch file:
```bash
BUILD_ELECTRON.bat
```

This will create:
- `release/MasterAdmin-0.0.1-x64.exe` - Full installer with start menu shortcuts
- `release/MasterAdmin-0.0.1-portable.exe` - Portable executable (no installation needed)

### Option 2: Build Portable Executable Only

Run the batch file:
```bash
BUILD_ELECTRON_PORTABLE.bat
```

This creates only the portable version for faster builds.

## Manual Build Commands

### Install Dependencies
```bash
npm install
```

### Development Mode (with hot reload)
```bash
npm run electron:dev
```

### Build for Production
```bash
# Build web app first
npm run build

# Build Windows installer + portable
npm run electron:build:win

# Or build for all platforms
npm run electron:build
```

## Output Files

After building, you'll find the executables in the `release/` folder:

- **Installer**: `MasterAdmin-0.0.1-x64.exe`
  - Creates desktop and start menu shortcuts
  - Allows custom installation directory
  - Includes uninstaller

- **Portable**: `MasterAdmin-0.0.1-portable.exe`
  - No installation required
  - Can run from USB drive
  - Perfect for testing or distribution

## Application Features

- Standalone desktop application
- No browser required
- Native window controls
- Application menu with keyboard shortcuts
- Auto-updates support (can be configured)
- Offline capable (after initial setup)

## Configuration

### Change App Icon

1. Create icons in the `build/` folder:
   - `icon.ico` - Windows icon (256x256)
   - `icon.png` - Linux icon (512x512)
   - `icon.icns` - macOS icon

2. Use online tools to convert PNG to ICO/ICNS:
   - https://convertio.co/png-ico/
   - https://cloudconvert.com/png-to-icns

### Modify App Settings

Edit `electron-builder.json` to change:
- App name and ID
- Build targets
- Installation options
- File associations

### Environment Variables

Create `.env.electron` file for Electron-specific settings:
```
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=MasterAdmin
```

## Troubleshooting

### Build Fails

1. Clear node_modules and reinstall:
```bash
rmdir /s /q node_modules
npm install
```

2. Clear build cache:
```bash
rmdir /s /q dist
rmdir /s /q release
```

### App Won't Start

1. Check if backend API is running
2. Verify API URL in config files
3. Check console logs in DevTools (Ctrl+Shift+I)

### White Screen on Launch

1. Open DevTools (Ctrl+Shift+I)
2. Check for JavaScript errors
3. Verify all routes are properly configured

## Distribution

### For End Users

1. Share the portable executable for quick testing
2. Share the installer for permanent installation
3. Both files are standalone and don't require Node.js

### For Developers

1. The app loads from `dist/` folder in production
2. In development, it connects to Vite dev server
3. All React Router routes work with hash-based routing

## Security Notes

- The app uses `contextIsolation: true` for security
- Node integration is disabled in renderer process
- Only safe APIs are exposed via preload script

## Next Steps

1. Add auto-update functionality
2. Implement native notifications
3. Add system tray integration
4. Create custom splash screen
5. Add crash reporting

## Support

For issues or questions:
1. Check the console logs
2. Review the Electron documentation
3. Check the build output in `release/` folder
