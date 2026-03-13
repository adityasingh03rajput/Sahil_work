@echo off
setlocal
set APK_PATH=android\app\build\outputs\apk\release\app-release.apk
set APP_ID=com.billvyapar.app

echo ==========================================
echo    BILLVYAPAR - BUILD ^& INSTALL
echo ==========================================
echo Server: https://accounts-8rx9.onrender.com
echo.

echo [1/4] Building web assets...
call npm run build
if %errorlevel% neq 0 goto :error

echo.
echo [2/4] Syncing Capacitor...
call npx cap sync android
if %errorlevel% neq 0 goto :error

echo.
echo [3/4] Building Android Release APK...
pushd android
call gradlew.bat clean assembleRelease
popd
if %errorlevel% neq 0 goto :error

echo.
echo [4/4] Signing and Installing APK...
set DEBUG_KEYSTORE=%USERPROFILE%\.android\debug.keystore
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "%DEBUG_KEYSTORE%" -storepass android -keypass android "%APK_PATH%" androiddebugkey
if %errorlevel% neq 0 (
    echo WARNING: Signing failed, installing unsigned APK...
)
adb install -r "%APK_PATH%"
if %errorlevel% neq 0 goto :error

echo.
echo [READY] Launching app...
adb shell monkey -p %APP_ID% -c android.intent.category.LAUNCHER 1

echo.
echo ==========================================
echo    BUILD ^& INSTALL SUCCESSFUL! 🚀
echo ==========================================
pause
exit /b 0

:error
echo.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo    BUILD FAILED - PLEASE CHECK LOGS
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
pause
exit /b 1
