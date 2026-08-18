#!/usr/bin/env pwsh
# Interactive Emoji Animation - PowerShell Setup Script

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  The Emojis - Vite + PixiJS Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[*] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($null -eq $nodeVersion) {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "Visit: https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green

# Check npm
Write-Host "[*] Checking npm..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($null -eq $npmVersion) {
    Write-Host "[WARNING] npm not in PATH" -ForegroundColor Yellow
} else {
    Write-Host "[OK] npm: $npmVersion" -ForegroundColor Green
}

# Check node_modules
Write-Host ""
Write-Host "[*] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "[!] node_modules not found. Installing..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] node_modules exists" -ForegroundColor Green
}

# Check assets
Write-Host ""
Write-Host "[*] Verifying assets..." -ForegroundColor Yellow
if (-not (Test-Path "assets\emojis")) {
    Write-Host "[ERROR] Emoji assets folder not found!" -ForegroundColor Red
    exit 1
}

$missingEmojis = @()
for ($i = 1; $i -le 24; $i++) {
    $path = "assets\emojis\512 ($i).webp"
    if (-not (Test-Path $path)) {
        $missingEmojis += $path
    }
}

if ($missingEmojis.Count -gt 0) {
    Write-Host "[WARNING] Missing emoji files:" -ForegroundColor Yellow
    $missingEmojis | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "[OK] All 24 emoji assets found" -ForegroundColor Green
}

# Check source files
Write-Host ""
Write-Host "[*] Verifying source files..." -ForegroundColor Yellow
$requiredFiles = @(
    "src\main.js",
    "src\emojiWorld.js",
    "src\physics.js",
    "src\gyro.js",
    "src\style.css",
    "vite.config.js",
    "index.html"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "[OK] $file" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "[ERROR] $($missingFiles.Count) required file(s) missing!" -ForegroundColor Red
    exit 1
}

# Success
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Start dev server:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Build for production:" -ForegroundColor White
Write-Host "     npm run build" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. Preview production build:" -ForegroundColor White
Write-Host "     npm run preview" -ForegroundColor Yellow
Write-Host ""
Write-Host "For mobile testing, scan QR code displayed by dev server" -ForegroundColor Cyan
Write-Host "or visit the URL from another device on same network." -ForegroundColor Cyan
Write-Host ""
Write-Host "Desktop: Move cursor over emojis" -ForegroundColor Green
Write-Host "Mobile:  Shake device to make emojis fall!" -ForegroundColor Green
Write-Host ""
