@echo off
echo ========================================
echo BillVyapar Complete APK Build and Sign
echo ========================================
echo.
echo This script will:
echo 1. Configure server URL
echo 2. Build web application
echo 3. Sync with Android
echo 4. Build APK
echo 5. Sign APK for installation
echo.
echo Server URL: https://accounts-8rx9.onrender.com
echo.
pause

REM Verify environment file
if not exist ".env.production" (
    echo Creating .env.production file...
    echo VITE_API_URL=https://accounts-8rx9.onrender.com > .env.production
)

echo.
echo ========================================
echo STEP 1: Building Web Application
echo ========================================
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Web build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo STEP 2: Syncing Capacitor
echo ========================================
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo STEP 3: Building Android APK
echo ========================================
cd android
call gradlew clean assembleRelease --build-cache --parallel
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Android build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo STEP 4: Signing APK
echo ========================================
set APK_UNSIGNED=android\app\build\outputs\apk\release\app-release.apk
set APK_SIGNED=BillVyapar-Release-Signed.apk
set DEBUG_KEYSTORE=%USERPROFILE%\.android\debug.keystore

echo Signing with debug keystore...
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "%DEBUG_KEYSTORE%" -storepass android -keypass android "%APK_UNSIGNED%" androiddebugkey

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Signing failed! Creating unsigned APK...
    copy "%APK_UNSIGNED%" "BillVyapar-Release-Unsigned.apk" /Y
    echo.
    echo Unsigned APK created: BillVyapar-Release-Unsigned.apk
    echo You need to sign it manually before installation
    pause
    exit /b 0
)

echo.
echo Aligning APK...
zipalign -v 4 "%APK_UNSIGNED%" "%APK_SIGNED%"

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Alignment failed! Using unaligned APK...
    copy "%APK_UNSIGNED%" "%APK_SIGNED%" /Y
)

echo.
echo ========================================
echo BUILD AND SIGN COMPLETE!
echo ========================================
echo.
echo Signed APK: %APK_SIGNED%
echo Server URL: https://accounts-8rx9.onrender.com
echo.
echo To install on device:
echo adb install -r %APK_SIGNED%
echo.
echo Or transfer the APK to your device and install manually
echo.
pause
