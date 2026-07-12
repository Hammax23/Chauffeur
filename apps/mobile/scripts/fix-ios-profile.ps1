# Regenerate iOS provisioning profile (includes Push + Sign in with Apple)
# Run when build fails with "doesn't support Push Notifications / Sign in with Apple"

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$env:EXPO_ASC_API_KEY_PATH = Join-Path $PWD ".eas-keys\AuthKey_9D7SV9329Y.p8"
$env:EXPO_ASC_KEY_ID = "9D7SV9329Y"
$env:EXPO_ASC_ISSUER_ID = "1409c857-382c-4115-b6cc-799d2cfb96a6"
$env:EXPO_APPLE_TEAM_ID = "DP92UVLHJU"
$env:EXPO_APPLE_TEAM_TYPE = "INDIVIDUAL"

Write-Host "=== Fix: Regenerate Provisioning Profile ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "When prompted:" -ForegroundColor Yellow
Write-Host "  Generate NEW Distribution Certificate?  ->  N  (No, keep existing)" -ForegroundColor Yellow
Write-Host "  Generate NEW Provisioning Profile?      ->  Y  (Yes)" -ForegroundColor Yellow
Write-Host "  Push Notifications setup?               ->  N  (No, skip for now)" -ForegroundColor Yellow
Write-Host ""

npx eas credentials:configure-build -p ios -e production

Write-Host ""
Write-Host "Profile fixed. Now run: npm run ios:build" -ForegroundColor Green
