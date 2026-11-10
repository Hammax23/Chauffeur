# Registers a Windows Scheduled Task to drain invoice outbox every 10 minutes.
# Run elevated once on the host (or any always-on machine that can reach the site):
#   powershell -ExecutionPolicy Bypass -File scripts\register-invoice-cron.ps1
#
# Uses apps/web/.env CRON_SECRET + CRON_BASE_URL (defaults https://sarjworldwide.ca).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$taskName = "SARJ-InvoiceJobsCron"
$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $PSScriptRoot "hit-invoice-cron.mjs"

if (-not (Test-Path $script)) { throw "Missing $script" }

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Registered Scheduled Task '$taskName' (every 10 minutes)."
Write-Host "Test now: npm run cron:invoice-jobs"
