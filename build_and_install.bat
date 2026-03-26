@echo off
echo ========================================
echo Building BillVyapar APK...
echo ========================================

echo.
echo [1/5] Building Vite project...
call npm run build
if %errorlevel% neq 0 (
  echo Error building Vite project.
  exit /b %errorlevel%
)

echo.
echo [2/5] Syncing Capacitor Android plugins...
call npx cap sync android
if %errorlevel% neq 0 (
  echo Error syncing Capacitor.
  exit /b %errorlevel%
)

echo.
echo [3/5] Compiling Android Release APK...
cd android
call .\gradlew assembleRelease
if %errorlevel% neq 0 (
  echo Error building APK.
  cd ..
  exit /b %errorlevel%
)
cd ..

echo.
echo [4/5] Signing APK...
call "%LOCALAPPDATA%\Android\Sdk\build-tools\34.0.0\apksigner.bat" sign --ks "D:\hukum\android\app\release.jks" --ks-pass pass:billvyapar --key-pass pass:billvyapar --out "D:\hukum\BillVyapar.apk" "D:\hukum\android\app\build\outputs\apk\release\app-release-unsigned.apk"
if %errorlevel% neq 0 (
  echo Error signing APK.
  exit /b %errorlevel%
)

echo.
echo [5/5] Deploying to Device...
echo Uninstalling old app (it's okay if this fails on first run)...
call adb uninstall com.billvyapar.app >nul 2>&1

echo Installing new APK...
call adb install -r -d "D:\hukum\BillVyapar.apk"
if %errorlevel% neq 0 (
  echo Error installing APK.
  exit /b %errorlevel%
)

echo.
echo ========================================
echo SUCCESS! APK Built and Installed.
echo ========================================
