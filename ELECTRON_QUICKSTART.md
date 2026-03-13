# 🚀 MasterAdmin Electron - Quick Start

Build your MasterAdmin desktop app in 3 simple steps!

## Step 1: Install Dependencies

Open terminal and run:
```bash
npm install
```

Wait for installation to complete (~2-3 minutes).

## Step 2: Build the Executable

Run the build script:
```bash
BUILD_ELECTRON_PORTABLE.bat
```

Or manually:
```bash
npm run build
npm run electron:build:portable
```

This takes ~5-10 minutes depending on your machine.

## Step 3: Run Your App

1. Go to the `release` folder
2. Double-click `MasterAdmin-0.0.1-portable.exe`
3. The app opens to the MasterAdmin login page!

## ✅ That's It!

You now have a standalone desktop application that:
- Runs without a browser
- Doesn't require Node.js
- Can be shared with anyone
- Works offline (after initial setup)

## 🎯 Next Steps

### Configure Backend API
Edit `src/app/config/api.ts` to point to your backend:
```typescript
export const API_BASE_URL = 'http://your-server:3000';
```

### Add Custom Icon
1. Create a 512x512 PNG logo
2. Convert to .ico: https://convertio.co/png-ico/
3. Save as `build/icon.ico`
4. Rebuild

### Test on Other Machines
Copy the .exe file to other Windows computers and test.

## 📚 More Information

- Full guide: `ELECTRON_SETUP_GUIDE.md`
- Detailed docs: `ELECTRON_README.md`
- Troubleshooting: Check the guides above

## 🆘 Common Issues

**Build fails?**
```bash
rmdir /s /q node_modules
npm install
```

**White screen?**
- Check API URL in config
- Open DevTools (Ctrl+Shift+I) to see errors

**Slow build?**
- Normal for first build
- Subsequent builds are faster
- Use SSD for better performance

## 💡 Pro Tips

- Keep the portable .exe for easy distribution
- No need to rebuild unless code changes
- Share the .exe file directly with users
- File size is ~150-200 MB (includes everything)

---

**Ready to build?** Run `BUILD_ELECTRON_PORTABLE.bat` now!
