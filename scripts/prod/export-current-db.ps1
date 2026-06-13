$ErrorActionPreference = 'Stop'

$container = $env:POSTGRES_CONTAINER
if ([string]::IsNullOrWhiteSpace($container)) {
  $container = 'guild-postgres'
}

$db = $env:POSTGRES_DB
if ([string]::IsNullOrWhiteSpace($db)) {
  $db = 'guild_platform'
}

$user = $env:POSTGRES_USER
if ([string]::IsNullOrWhiteSpace($user)) {
  $user = 'postgres'
}

$backupDir = Join-Path (Get-Location) 'backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$fileName = "${db}_${stamp}.dump"
$target = Join-Path $backupDir $fileName

Write-Host "Creating backup from container '$container'..."
docker exec $container pg_dump -U $user -d $db -Fc -f "/tmp/$fileName"
docker cp "${container}:/tmp/$fileName" $target
docker exec $container rm -f "/tmp/$fileName" | Out-Null

Write-Host "Backup ready: $target"
