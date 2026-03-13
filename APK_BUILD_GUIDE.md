# BillVyapar APK Build Guide

## Server Configuration

The app is configured to connect to:
```
https://accounts-8rx9.onrender.com
```

This is set in:
- `.env.production` - Production environment variables
- `.env.local` - Local development override
- `src/app/config/api.ts` - API configuration with fallback logic

## Quick Build (Recommended)

Run the all-in-one script:
```bash
BUILD_AND_SIGN_APK.bat
```

This will:
1. ✅ Verify server URL configuration
2. ✅ Build the web application with Vite
3. ✅ Sync Capacitor with Android project
4. ✅ Build the Android APK
5. ✅ Sign the APK for installation

Output: `BillVyapar-Release-Signed.apk`

## Manual Build Steps

### Step 1: Build Web Application
```bash
npm run build
```

### Step 2: Sync with Android
```bash
npx cap sync android
```

### Step 3: Build APK
```bash
cd android
gradlew assembleRelease
cd ..
```

### Step 4: Sign APK
```bash
# Using debug keystore (for testing)
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 ^
  -keystore "%USERPROFILE%\.android\debug.keystore" ^
  -storepass android -keypass android ^
  android\app\build\outputs\apk\release\app-release.apk androiddebugkey

# Align APK
zipalign -v 4 ^
  android\app\build\outputs\apk\release\app-release.apk ^
  BillVyapar-Release-Signed.apk
```

## Available Build Scripts

| Script | Purpose |
|--------|---------|
| `BUILD_AND_SIGN_APK.bat` | Complete build + sign (recommended) |
| `BUILD_APK_WITH_SERVER.bat` | Build only (no signing) |
| `SIGN_APK.bat` | Sign existing APK |
| `BUILD_COMPLETE.bat` | Legacy complete build |
| `BUILD_FAST.bat` | Fast incremental build |

## Installation

### Option 1: ADB (USB Debugging)
```bash
adb install -r BillVyapar-Release-Signed.apk
```

### Option 2: Manual Transfer
1. Copy `BillVyapar-Release-Signed.apk` to your Android device
2. Open the file on your device
3. Allow installation from unknown sources if prompted
4. Install the app

## Server URL Configuration

The app uses a smart URL resolution system:

1. **LocalStorage Override**: Users can set a custom API URL in the app
2. **Environment Variable**: `VITE_API_URL` from `.env.production`
3. **Default Fallback**: `https://accounts-8rx9.onrender.com`

### Changing Server URL

Edit `.env.production`:
```env
VITE_API_URL=https://your-new-server.com
```

Then rebuild:
```bash
BUILD_AND_SIGN_APK.bat
```

## App Configuration

- **App ID**: `com.billvyapar.app`
- **App Name**: BillVyapar
- **Version**: 1.0 (versionCode: 1)
- **Min SDK**: 22 (Android 5.1)
- **Target SDK**: 34 (Android 14)

## Troubleshooting

### Build Fails
- Ensure Node.js and npm are installed
- Run `npm install` to install dependencies
- Check that Android SDK is properly configured

### Signing Fails
- Verify Android SDK build-tools are in PATH
- Check that debug keystore exists at `%USERPROFILE%\.android\debug.keystore`
- For production, create a release keystore

### Installation Fails
- Enable "Install from Unknown Sources" on your device
- Check that the APK is properly signed
- Use `adb logcat` to view installation errors

### App Can't Connect to Server
- Verify server URL in `.env.production`
- Check that the server is accessible from your device
- Test server URL in a browser: https://accounts-8rx9.onrender.com
- Check app logs for connection errors

## Production Release

For production release, create a proper keystore:

```bash
keytool -genkey -v -keystore billvyapar-release.keystore ^
  -alias billvyapar -keyalg RSA -keysize 2048 -validity 10000
```

Then configure signing in `android/app/build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            storeFile file('../billvyapar-release.keystore')
            storePassword 'YOUR_STORE_PASSWORD'
            keyAlias 'billvyapar'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## File Locations

- **Source Code**: `src/`
- **Built Web App**: `dist/`
- **Android Project**: `android/`
- **APK Output**: `android/app/build/outputs/apk/release/`
- **Final APK**: `BillVyapar-Release-Signed.apk` (root directory)

## Next Steps

1. Run `BUILD_AND_SIGN_APK.bat`
2. Install the APK on your device
3. Test the app and verify server connectivity
4. For production, create a release keystore and configure signing
