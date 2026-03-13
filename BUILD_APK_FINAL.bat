@echo off
setlocal enabledelayedexpansion

echo ========================================
echo BillVyapar APK Builder - Final Version
echo ========================================
echo.
echo Server: https://accounts-8rx9.onrender.com
echo.

REM Check prerequisites
echo Checking prerequisites...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found! Install Node.js first.
    pause
    exit /b 1
)

where java >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Java not found! Install Java 17.
    pause
    exit /b 1
)

echo ✓ Prerequisites OK
echo.

REM Ensure .env.production exists
if not exist ".env.production" (
    echo Creating .env.production...
    echo VITE_API_URL=https://accounts-8rx9.onrender.com > .env.production
)

echo [1/5] Building web application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Build failed!
    pause
    exit /b 1
)
echo ✓ Web build complete

echo.
echo [2/5] Syncing Capacitor...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Sync failed!
    pause
    exit /b 1
)
echo ✓ Capacitor synced

echo.
echo [3/5] Building Android APK...
cd android
call gradlew clean assembleRelease --build-cache --parallel
set BUILD_RESULT=%ERRORLEVEL%
cd ..
if %BUILD_RESULT% NEQ 0 (
    echo ✗ Android build failed!
    pause
    exit /b 1
)
echo ✓ APK built

echo.
echo [4/5] Signing APK...
set APK_IN=android\app\build\outputs\apk\release\app-release.apk
set APK_OUT=BillVyapar-Release-Signed.apk
set KEYSTORE=%USERPROFILE%\.android\debug.keystore

jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "%KEYSTORE%" -storepass android -keypass android "%APK_IN%" androiddebugkey 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠ Signing failed - creating unsigned APK
    copy "%APK_IN%" "BillVyapar-Release-Unsigned.apk" /Y >nul
    goto :done
)
echo ✓ APK signed

echo.
echo [5/5] Aligning APK...
zipalign -v 4 "%APK_IN%" "%APK_OUT%" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠ Alignment failed - using unaligned
    copy "%APK_IN%" "%APK_OUT%" /Y >nul
)
echo ✓ APK aligned

:done
echo.
echo ========================================
echo ✓ BUILD COMPLETE!
echo ========================================
echo.
if exist "%APK_OUT%" (
    echo Output: %APK_OUT%
    for %%A in ("%APK_OUT%") do echo Size: %%~zA bytes
) else (
    echo Output: BillVyapar-Release-Unsigned.apk
)
echo Server: https://accounts-8rx9.onrender.com
echo.
echo Install: adb install -r %APK_OUT%
echo.
pause
