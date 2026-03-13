@echo off
echo ========================================
echo BillVyapar APK Build with Server Config
echo ========================================
echo.
echo Server URL: https://accounts-8rx9.onrender.com
echo.

REM Verify environment file exists
if not exist ".env.production" (
    echo Creating .env.production file...
    echo VITE_API_URL=https://accounts-8rx9.onrender.com > .env.production
)

echo [1/5] Verifying server configuration...
type .env.production
echo.

echo [2/5] Building web application with production config...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Web build failed!
    pause
    exit /b 1
)

echo.
echo [3/5] Syncing Capacitor with Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Building Android release APK...
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
echo [5/5] Copying APK to main folder...
copy "android\app\build\outputs\apk\release\app-release.apk" "BillVyapar-Release.apk" /Y

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo APK Location: BillVyapar-Release.apk
echo Server URL: https://accounts-8rx9.onrender.com
echo.
echo IMPORTANT: This APK needs to be signed before installation
echo.
echo To sign with debug key (for testing):
echo jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "%%USERPROFILE%%\.android\debug.keystore" -storepass android -keypass android BillVyapar-Release.apk androiddebugkey
echo zipalign -v 4 BillVyapar-Release.apk BillVyapar-Release-Signed.apk
echo.
echo To install on device:
echo adb install -r BillVyapar-Release-Signed.apk
echo.
pause
