# Submit latest iOS build to TestFlight using App Store Connect API key (no Apple ID login)
# Requires ascAppId in eas.json — get from App Store Connect > App > App Information > Apple ID

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$env:EXPO_ASC_API_KEY_PATH = Join-Path $PWD ".eas-keys\AuthKey_9D7SV9329Y.p8"
$env:EXPO_ASC_KEY_ID = "9D7SV9329Y"
$env:EXPO_ASC_ISSUER_ID = "1409c857-382c-4115-b6cc-799d2cfb96a6"

Write-Host "Submitting to TestFlight via API key (production profile)..." -ForegroundColor Cyan
npx eas submit -p ios --latest --profile production --non-interactive
