@echo off
echo ========================================
echo Building MasterAdmin Portable Executable
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
echo Step 3: Building portable executable...
call npm run electron:build:portable
if %errorlevel% neq 0 (
    echo Error: Failed to build portable executable
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Your portable executable is in the 'release' folder:
echo - MasterAdmin-0.0.1-portable.exe
echo.
echo This file can be run without installation!
echo.
pause
