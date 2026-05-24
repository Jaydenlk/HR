[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "  Coach Dev Server" -ForegroundColor Cyan
Write-Host "  ================" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/4] Kill old processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -Confirm:$false -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$dbPath = Join-Path $root "packages\api\coach-dev.db"
if (Test-Path $dbPath) {
    Remove-Item $dbPath -Force -ErrorAction SilentlyContinue
    Write-Host "  Old DB deleted" -ForegroundColor DarkGray
}

Write-Host "[2/4] Starting backend (NestJS :3002)..." -ForegroundColor Yellow
$apiDir = Join-Path $root "packages\api"
$env:PORT = "3002"
Start-Process -FilePath "npx" -ArgumentList "nest","start","--watch" -WorkingDirectory $apiDir -WindowStyle Minimized
Start-Sleep -Seconds 10

Write-Host "[3/4] Starting frontend (Next.js :3001)..." -ForegroundColor Yellow
$webDir = Join-Path $root "packages\web"
$env:NEXT_PUBLIC_API_URL = "http://localhost:3002/api"
Start-Process -FilePath "npx" -ArgumentList "next","dev","--port","3001" -WorkingDirectory $webDir -WindowStyle Minimized
Start-Sleep -Seconds 5

Write-Host "[4/4] Creating default account..." -ForegroundColor Yellow
try {
    $body = '{"email":"admin@coach.dev","name":"Jayden","invite_code":"COACH2026"}'
    Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" -Method POST -ContentType "application/json" -Body $body | Out-Null
    Write-Host "  Account ready: admin@coach.dev" -ForegroundColor Green
} catch {
    Write-Host "  Backend still starting, login manually" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  READY!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  http://localhost:3001" -ForegroundColor White
Write-Host "  Backend:   http://localhost:3002/api" -ForegroundColor White
Write-Host "  Login:     http://localhost:3001/login" -ForegroundColor White
Write-Host ""
Write-Host "  Invite Code: COACH2026" -ForegroundColor Cyan
Write-Host "  Account:     admin@coach.dev / Jayden" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:3001"

Write-Host "  Running... (Close window or Ctrl+C to stop)" -ForegroundColor DarkGray
while ($true) { Start-Sleep -Seconds 60 }
