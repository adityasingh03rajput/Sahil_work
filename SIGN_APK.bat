@echo off
echo ========================================
echo BillVyapar APK Signing Script
echo ========================================
echo.

set APK_INPUT=BillVyapar-Release.apk
set APK_OUTPUT=BillVyapar-Release-Signed.apk
set DEBUG_KEYSTORE=%USERPROFILE%\.android\debug.keystore

if not exist "%APK_INPUT%" (
    echo ERROR: %APK_INPUT% not found!
    echo Please run BUILD_APK_WITH_SERVER.bat first
    pause
    exit /b 1
)

echo [1/2] Signing APK with debug keystore...
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "%DEBUG_KEYSTORE%" -storepass android -keypass android "%APK_INPUT%" androiddebugkey

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Signing failed!
    echo Make sure Android SDK is installed and jarsigner is in PATH
    pause
    exit /b 1
)

echo.
echo [2/2] Aligning APK...
zipalign -v 4 "%APK_INPUT%" "%APK_OUTPUT%"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Alignment failed!
    echo Make sure Android SDK build-tools are in PATH
    pause
    exit /b 1
)

echo.
echo ========================================
echo SIGNING COMPLETE!
echo ========================================
echo.
echo Signed APK: %APK_OUTPUT%
echo.
echo To install on device:
echo adb install -r %APK_OUTPUT%
echo.
pause
