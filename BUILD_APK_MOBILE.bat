@echo off
setlocal
echo ==========================================
echo    BILLVYAPAR - BUILD APK
echo    Directory: D:\mobile hukum
echo ==========================================

echo.
echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [2/4] Building web assets (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Vite build failed
    pause
    exit /b 1
)

echo.
echo [3/4] Syncing Capacitor to Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed
    pause
    exit /b 1
)

echo.
echo [4/4] Building Android APK (Release)...
cd android
call gradlew.bat assembleRelease
cd ..
if %errorlevel% neq 0 (
    echo ERROR: Gradle build failed
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    BUILD SUCCESSFUL!
echo ==========================================
echo.
echo APK Location:
echo   android\app\build\outputs\apk\release\app-release-unsigned.apk
echo.
echo To sign with debug keystore (for testing):
echo   %LOCALAPPDATA%\Android\Sdk\build-tools\36.0.0\apksigner.bat sign --ks "%USERPROFILE%\.android\debug.keystore" --ks-pass pass:android --key-pass pass:android --out BillVyapar-signed.apk android\app\build\outputs\apk\release\app-release-unsigned.apk
echo   adb install -r BillVyapar-signed.apk
echo.
pause
