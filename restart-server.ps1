# restart-server.ps1
# Stops the running server and restarts it — no rebuild, tunnel keeps running

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = if (Test-Path "$ROOT\network.config.json") {
    (Get-Content "$ROOT\network.config.json" -Raw | ConvertFrom-Json).port
} else { 3001 }

Write-Host "`n🔄  Restarting server on port $port..." -ForegroundColor Cyan

$pids = netstat -ano | Select-String ":$port " | Select-String "LISTENING" |
    ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
foreach ($p in $pids) {
    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped PID $p" -ForegroundColor DarkGray
}
Start-Sleep -Milliseconds 400

Write-Host "Server starting..." -ForegroundColor Yellow
Set-Location $ROOT
npm run start:dev
