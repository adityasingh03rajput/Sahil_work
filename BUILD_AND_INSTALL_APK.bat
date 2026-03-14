@echo off
echo ========================================
echo BillVyapar - Build and Install APK
echo ========================================
echo.

REM Check if adb is available
where adb >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: ADB not found in PATH
    echo Please install Android SDK Platform Tools
    pause
    exit /b 1
)

echo [1/6] Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist android\app\build rmdir /s /q android\app\build
echo Done.
echo.

echo [2/6] Generating Android icons...
call npm run generate-android-icons
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Icon generation failed, continuing with existing icons
)
echo Done.
echo.

echo [3/6] Building web app with Vite...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Vite build failed
    pause
    exit /b 1
)
echo Done.
echo.

echo [4/6] Syncing with Capacitor...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Capacitor sync failed
    pause
    exit /b 1
)
echo Done.
echo.

echo [5/6] Building APK with Gradle...
cd android
call gradlew assembleRelease
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Gradle build failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo Done.
echo.

echo [6/6] Locating APK...
set APK_PATH=android\app\build\outputs\apk\release\app-release-unsigned.apk
if not exist "%APK_PATH%" (
    echo ERROR: APK not found at %APK_PATH%
    pause
    exit /b 1
)
echo Found: %APK_PATH%
echo.

echo [7/7] Installing APK on connected device...
adb devices
echo.
adb install -r "%APK_PATH%"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: APK installation failed
    echo Make sure USB debugging is enabled and device is connected
    pause
    exit /b 1
)
echo.

echo ========================================
echo SUCCESS! APK built and installed
echo ========================================
echo.
echo APK Location: %APK_PATH%
echo.
echo You can now launch BillVyapar on your device
echo.
pause
