$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $Root 'logs'
$LogFile = Join-Path $LogDir 'startup.log'

if (!(Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

function Write-StartupLog {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $LogFile -Value $line
}

Set-Location $Root
Write-StartupLog 'Starting Guild Platform stack.'

$tokenLine = Get-Content (Join-Path $Root '.env') -ErrorAction SilentlyContinue |
  Where-Object { $_ -match '^CLOUDFLARE_TUNNEL_TOKEN=' } |
  Select-Object -First 1

if ($tokenLine) {
  $token = $tokenLine -replace '^CLOUDFLARE_TUNNEL_TOKEN=', ''
  if ($token -and $token.Length -lt 80) {
    Write-StartupLog 'CLOUDFLARE_TUNNEL_TOKEN looks too short. Paste the full token from the Cloudflare Docker command, not the tunnel UUID.'
  }
}

$dockerDesktop = Join-Path $Env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
if (Test-Path $dockerDesktop) {
  $dockerReady = $false
  try {
    docker info *> $null
    $dockerReady = $true
  } catch {
    $dockerReady = $false
  }

  if (!$dockerReady) {
    Write-StartupLog 'Docker is not ready yet. Starting Docker Desktop.'
    Start-Process -FilePath $dockerDesktop
  }
}

for ($attempt = 1; $attempt -le 60; $attempt++) {
  try {
    docker info *> $null
    Write-StartupLog 'Docker is ready.'
    break
  } catch {
    if ($attempt -eq 60) {
      Write-StartupLog 'Docker did not become ready in time.'
      throw
    }

    Start-Sleep -Seconds 5
  }
}

docker compose up -d
Write-StartupLog 'docker compose up -d completed.'
docker compose ps | Out-String | Add-Content -Path $LogFile
