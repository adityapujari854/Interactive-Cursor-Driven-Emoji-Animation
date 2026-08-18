@echo off
REM Interactive Emoji Animation - Windows Setup Script
REM This script helps set up the project for development

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  The Emojis - Vite + PixiJS Setup
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version

REM Check npm
where npm >nul 2>nul
if errorlevel 1 (
    echo [WARNING] npm not found in PATH
    echo Trying to use npm from Node.js installation...
)

echo.
echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo [!] node_modules not found. Installing...
    call npm install
) else (
    echo [OK] node_modules exists
)

echo.
echo [2/3] Verifying assets...
if not exist "assets\emojis" (
    echo [ERROR] Emoji assets folder not found!
    echo Expected: assets\emojis\512 (1).webp through 512 (24).webp
    pause
    exit /b 1
)

for /l %%i in (1,1,24) do (
    if not exist "assets\emojis\512 (%%i).webp" (
        echo [WARNING] Missing: assets\emojis\512 (%%i).webp
    )
)
echo [OK] Emoji assets verified

echo.
echo [3/3] Verifying source files...
setlocal enabledelayedexpansion
set missing=0
for %%f in (src\main.js, src\emojiWorld.js, src\physics.js, src\gyro.js, src\style.css, vite.config.js, index.html) do (
    if not exist "%%f" (
        echo [ERROR] Missing: %%f
        set /a missing=!missing!+1
    ) else (
        echo [OK] %%f
    )
)

if !missing! gtr 0 (
    echo.
    echo [ERROR] !missing! required file(s) missing!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo   1. Start dev server:
echo      npm run dev
echo.
echo   2. Build for production:
echo      npm run build
echo.
echo   3. Preview production build:
echo      npm run preview
echo.
echo For mobile testing, scan QR code displayed by dev server
echo or visit the URL from another device on same network.
echo.
echo Desktop: Move cursor over emojis
echo Mobile:  Shake device to make emojis fall!
echo.
pause
