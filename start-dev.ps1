# Coach Dev Server Startup
# Usage: powershell -ExecutionPolicy Bypass -File start-dev.ps1
#
# Ports are configured in ports.env at project root.
# If a port is occupied, just edit ports.env and re-run this script.

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiDir = Join-Path $root "packages\api"
$webDir = Join-Path $root "packages\web"

# --- Read port config ---
$portsFile = Join-Path $root "ports.env"
$API_PORT = 3002
$WEB_PORT = 3001

if (Test-Path $portsFile) {
    Get-Content $portsFile | ForEach-Object {
        if ($_ -match '^\s*API_PORT\s*=\s*(\d+)') { $API_PORT = [int]$Matches[1] }
        if ($_ -match '^\s*WEB_PORT\s*=\s*(\d+)') { $WEB_PORT = [int]$Matches[1] }
    }
}

Write-Host ""
Write-Host "  Coach Dev Server" -ForegroundColor Cyan
Write-Host "  ================" -ForegroundColor Cyan
Write-Host "  API: :$API_PORT  |  WEB: :$WEB_PORT" -ForegroundColor DarkCyan
Write-Host ""

# --- Step 1: Free ports ---
Write-Host "[1/5] Freeing ports..." -ForegroundColor Yellow

foreach ($port in @($API_PORT, $WEB_PORT)) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            try {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "  Killed PID $($c.OwningProcess) on :$port" -ForegroundColor DarkGray
            } catch {}
        }
        Start-Sleep -Seconds 1
    }
}
Write-Host "  Ports clear" -ForegroundColor Green

# --- Step 2: Check deps ---
Write-Host "[2/5] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $apiDir "node_modules"))) {
    Write-Host "  Installing..." -ForegroundColor DarkGray
    Push-Location $root; pnpm install; Pop-Location
}
Write-Host "  OK" -ForegroundColor Green

# --- Step 3: Start backend ---
Write-Host "[3/5] Starting backend (:$API_PORT)..." -ForegroundColor Yellow

# Write .env.local for frontend with correct API port
$webEnvLocal = Join-Path $webDir ".env.local"
"NEXT_PUBLIC_API_URL=http://localhost:${API_PORT}/api" | Out-File -FilePath $webEnvLocal -Encoding utf8

# Start NestJS via cmd to inherit proper shell
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "cd /d `"$apiDir`" && set PORT=$API_PORT && npx nest start --watch" `
    -WindowStyle Minimized

# Wait for backend
$waited = 0
while ($waited -lt 40) {
    Start-Sleep -Seconds 2; $waited += 2
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:${API_PORT}/api/auth/me" -TimeoutSec 2 -ErrorAction Stop
    } catch {
        if ($_.Exception -and $_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 401) {
            Write-Host "  Backend ready (${waited}s)" -ForegroundColor Green
            break
        }
    }
    if ($waited % 10 -eq 0) { Write-Host "  Waiting... (${waited}s)" -ForegroundColor DarkGray }
}
if ($waited -ge 40) { Write-Host "  Backend slow to start, check logs" -ForegroundColor Red }

# --- Step 4: Start frontend ---
Write-Host "[4/5] Starting frontend (:$WEB_PORT)..." -ForegroundColor Yellow

Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "cd /d `"$webDir`" && set NEXT_PUBLIC_API_URL=http://localhost:${API_PORT}/api && npx next dev --port $WEB_PORT" `
    -WindowStyle Minimized

Start-Sleep -Seconds 8
Write-Host "  Frontend starting..." -ForegroundColor Green

# --- Step 5: Create default account ---
Write-Host "[5/5] Creating default account..." -ForegroundColor Yellow
try {
    $body = '{"email":"admin@coach.dev","name":"Jayden","invite_code":"COACH2026"}'
    Invoke-RestMethod -Uri "http://localhost:${API_PORT}/api/auth/login" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop | Out-Null
    Write-Host "  Account: admin@coach.dev" -ForegroundColor Green
} catch {
    Write-Host "  Login manually (backend may still be initializing)" -ForegroundColor DarkGray
}

# --- Done ---
Write-Host ""
Write-Host "  =======================================" -ForegroundColor Green
Write-Host "  READY" -ForegroundColor Green
Write-Host "  =======================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:    http://localhost:$WEB_PORT" -ForegroundColor White
Write-Host "  Backend:     http://localhost:${API_PORT}/api" -ForegroundColor White
Write-Host "  Login:       http://localhost:${WEB_PORT}/login" -ForegroundColor White
Write-Host ""
Write-Host "  Invite Code: COACH2026" -ForegroundColor Cyan
Write-Host "  Account:     admin@coach.dev / Jayden" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Port config: ports.env" -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host ""

Start-Process "http://localhost:$WEB_PORT"

try { while ($true) { Start-Sleep -Seconds 60 } }
finally {
    Write-Host "  Stopping..." -ForegroundColor Yellow
    foreach ($port in @($API_PORT, $WEB_PORT)) {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($c in $conns) {
                try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
            }
        }
    }
    Write-Host "  Stopped." -ForegroundColor Green
}
