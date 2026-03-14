@echo off
setlocal

echo ==========================================
echo    BILL VYAPAR - BUILD ^& INSTALL APK
echo ==========================================

echo [1/3] Building web assets...
call npm run build
if %errorlevel% neq 0 goto :error

echo.
echo [2/3] Syncing Capacitor...
call npx cap sync android
if %errorlevel% neq 0 goto :error

echo.
echo [3/3] Building Android APK...
cd android
call gradlew.bat assembleDebug
cd ..
if %errorlevel% neq 0 goto :error

echo.
echo [4/4] Installing APK to device...
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
if %errorlevel% neq 0 goto :error

echo.
echo ==========================================
echo    BUILD ^& INSTALL SUCCESSFUL!
echo ==========================================
pause
exit /b 0

:error
echo.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo    BUILD FAILED - CHECK LOGS ABOVE
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
pause
exit /b 1
