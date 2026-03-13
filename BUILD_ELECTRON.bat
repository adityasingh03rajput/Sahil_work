@echo off
echo ========================================
echo Building MasterAdmin Electron App
echo ========================================
echo.

echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Failed to build React app
    pause
    exit /b 1
)

echo.
echo Step 3: Building Electron executable...
call npm run electron:build:win
if %errorlevel% neq 0 (
    echo Error: Failed to build Electron app
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Your executable files are in the 'release' folder:
echo - MasterAdmin-0.0.1-x64.exe (Installer)
echo - MasterAdmin-0.0.1-portable.exe (Portable)
echo.
pause
