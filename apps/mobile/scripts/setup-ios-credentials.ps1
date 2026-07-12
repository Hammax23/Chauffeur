# Run this in PowerShell (interactive terminal) — sets up iOS credentials via API key.
# No Mac password or Apple ID password needed.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$env:EXPO_ASC_API_KEY_PATH = Join-Path $PWD ".eas-keys\AuthKey_9D7SV9329Y.p8"
$env:EXPO_ASC_KEY_ID = "9D7SV9329Y"
$env:EXPO_ASC_ISSUER_ID = "1409c857-382c-4115-b6cc-799d2cfb96a6"
$env:EXPO_APPLE_TEAM_ID = "DP92UVLHJU"
$env:EXPO_APPLE_TEAM_TYPE = "INDIVIDUAL"

if (-not (Test-Path $env:EXPO_ASC_API_KEY_PATH)) {
  Write-Host "Missing API key at $env:EXPO_ASC_API_KEY_PATH" -ForegroundColor Red
  exit 1
}

Write-Host "Configuring iOS credentials for production..." -ForegroundColor Cyan
Write-Host "When prompted: choose to GENERATE a new Apple Distribution Certificate (Yes)" -ForegroundColor Yellow
npx eas credentials:configure-build -p ios -e production

Write-Host ""
Write-Host "Starting production iOS build..." -ForegroundColor Cyan
npx eas build -p ios --profile production
