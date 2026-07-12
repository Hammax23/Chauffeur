# Non-interactive iOS production build (run AFTER setup-ios-credentials.ps1 once)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$env:EXPO_ASC_API_KEY_PATH = Join-Path $PWD ".eas-keys\AuthKey_9D7SV9329Y.p8"
$env:EXPO_ASC_KEY_ID = "9D7SV9329Y"
$env:EXPO_ASC_ISSUER_ID = "1409c857-382c-4115-b6cc-799d2cfb96a6"
$env:EXPO_APPLE_TEAM_ID = "DP92UVLHJU"
$env:EXPO_APPLE_TEAM_TYPE = "INDIVIDUAL"
$env:EAS_BUILD_NO_EXPO_GO_WARNING = "true"

npx eas build -p ios --profile production --non-interactive
