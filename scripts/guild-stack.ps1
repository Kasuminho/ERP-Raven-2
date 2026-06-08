param(
  [ValidateSet('up', 'down', 'restart', 'logs', 'status', 'build')]
  [string]$Action = 'status',

  [string]$Service = ''
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

switch ($Action) {
  'up' {
    $tokenLine = Get-Content (Join-Path $Root '.env') -ErrorAction SilentlyContinue |
      Where-Object { $_ -match '^CLOUDFLARE_TUNNEL_TOKEN=' } |
      Select-Object -First 1

    if ($tokenLine) {
      $token = $tokenLine -replace '^CLOUDFLARE_TUNNEL_TOKEN=', ''
      if ($token -and $token.Length -lt 80) {
        Write-Warning 'CLOUDFLARE_TUNNEL_TOKEN looks too short. Paste the full token from the Cloudflare Docker command, not the tunnel UUID.'
      }
    }

    docker compose up -d --build
  }
  'down' {
    docker compose down
  }
  'restart' {
    docker compose restart
  }
  'logs' {
    if ($Service) {
      docker compose logs -f --tail=200 $Service
    } else {
      docker compose logs -f --tail=200
    }
  }
  'status' {
    docker compose ps
  }
  'build' {
    docker compose build
  }
}
