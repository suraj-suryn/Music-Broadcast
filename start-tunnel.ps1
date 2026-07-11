$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n🎵  Music Broadcast - Auto Tunnel" -ForegroundColor Cyan
Write-Host "──────────────────────────────────`n" -ForegroundColor DarkGray

# ── Find cloudflared ──────────────────────────────────────
$cloudflared = $null
foreach ($c in @(
    "cloudflared",
    "cloudflared.exe",
    "$ROOT\cloudflared.exe",
    "$env:USERPROFILE\Downloads\cloudflared.exe",
    "$env:USERPROFILE\Desktop\cloudflared.exe"
)) {
    try { $null = Get-Command $c -ErrorAction Stop; $cloudflared = $c; break } catch {}
    if (Test-Path $c -ErrorAction SilentlyContinue) { $cloudflared = $c; break }
}
if (-not $cloudflared) {
    Write-Host "ERROR: cloudflared.exe not found." -ForegroundColor Red
    Write-Host "Download it from:"
    Write-Host "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    Write-Host "Place it in this folder or add it to PATH."
    Read-Host "`nPress Enter to exit"
    exit 1
}
Write-Host "cloudflared: $cloudflared" -ForegroundColor DarkGray

# ── Read port from network.config.json ────────────────────
$CONFIG = "$ROOT\network.config.json"
$port = 3001
if (Test-Path $CONFIG) {
    try { $port = (Get-Content $CONFIG -Raw | ConvertFrom-Json).port } catch {}
}
Write-Host "Port       : $port`n" -ForegroundColor DarkGray

# ── Start cloudflared in background ──────────────────────
Write-Host "Starting cloudflared..." -ForegroundColor Yellow
$tmpOut = [System.IO.Path]::GetTempFileName()
$tmpErr = "$tmpOut.err"
$cfProc = Start-Process `
    -FilePath $cloudflared `
    -ArgumentList "tunnel --url http://localhost:$port" `
    -NoNewWindow -PassThru `
    -RedirectStandardOutput $tmpOut `
    -RedirectStandardError  $tmpErr

# ── Poll for URL (max 20 s) ───────────────────────────────
$url = $null
$ticks = 0
Write-Host "Waiting for tunnel URL " -NoNewline

while (-not $url -and $ticks -lt 40) {
    Start-Sleep -Milliseconds 500
    $ticks++
    Write-Host "." -NoNewline
    foreach ($f in @($tmpOut, $tmpErr)) {
        if (Test-Path $f) {
            $raw = Get-Content $f -Raw -ErrorAction SilentlyContinue
            if ($raw -match 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com') {
                $url = $matches[0]
                break
            }
        }
    }
}

Write-Host ""
Remove-Item $tmpOut, $tmpErr -ErrorAction SilentlyContinue

if (-not $url) {
    Write-Host "ERROR: Tunnel URL not received within 20 seconds." -ForegroundColor Red
    Stop-Process -Id $cfProc.Id -Force -ErrorAction SilentlyContinue
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Tunnel URL : $url" -ForegroundColor Green

# ── Update network.config.json ────────────────────────────
$cfg           = Get-Content $CONFIG -Raw | ConvertFrom-Json
$cfg.mode      = "tunnel"
$cfg.tunnelUrl = $url
$cfg | ConvertTo-Json -Depth 5 | Set-Content $CONFIG
Write-Host "Config updated ✓`n" -ForegroundColor Green

# ── npm start  (builds client, then starts server) ────────
Write-Host "Building and starting server..." -ForegroundColor Cyan
Set-Location $ROOT
try {
    npm start
}
finally {
    Write-Host "`nStopping cloudflared tunnel..." -ForegroundColor Yellow
    Stop-Process -Id $cfProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Done." -ForegroundColor DarkGray
}

