$ErrorActionPreference = 'Stop'

$TaskName = 'Guild Platform Stack'
$Root = Split-Path -Parent $PSScriptRoot
$StartScript = Join-Path $Root 'scripts\start-guild-stack.ps1'
$PowerShell = Join-Path $Env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

$Action = New-ScheduledTaskAction `
  -Execute $PowerShell `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`""

$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Description 'Starts the Guild Platform Docker Compose stack when Windows logs in.' `
  -Force | Out-Null

Write-Host "Scheduled task '$TaskName' installed."
