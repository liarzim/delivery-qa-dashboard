# start-dashboard.ps1
# Starts backend + frontend silently, opens the dashboard in a dedicated app-mode
# browser window, then auto-shuts down the servers when that window is closed.
$ErrorActionPreference = 'SilentlyContinue'
$root    = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pidFile = Join-Path $root '.dashboard.pids'

# ── Kill any previous instance cleanly ──────────────────────────────────────
if (Test-Path $pidFile) {
    foreach ($p in (Get-Content $pidFile | Where-Object { $_ -match '^\d+$' })) {
        & taskkill /F /T /PID $p 2>$null | Out-Null
    }
    Remove-Item $pidFile -Force
}

# ── Always re-seed sample data (fast, idempotent) ───────────────────────────
Start-Process -FilePath 'node' `
    -ArgumentList 'server\src\scripts\generateSampleData.js' `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -Wait

# ── Start backend (port 3001) ────────────────────────────────────────────────
$backend = Start-Process -FilePath 'cmd' `
    -ArgumentList '/c npm --prefix server run dev' `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -PassThru

# ── Start frontend (port 5173) ───────────────────────────────────────────────
$frontend = Start-Process -FilePath 'cmd' `
    -ArgumentList '/c npm --prefix client run dev' `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -PassThru

@($backend.Id, $frontend.Id) | Set-Content $pidFile

# ── Wait for backend (up to 45 s) ───────────────────────────────────────────
$deadline = (Get-Date).AddSeconds(45)
while ((Get-Date) -lt $deadline) {
    try { $t = New-Object System.Net.Sockets.TcpClient; $t.Connect('127.0.0.1',3001); $t.Close(); break }
    catch { Start-Sleep -Milliseconds 600 }
}

# ── Wait for frontend (up to 30 s) ──────────────────────────────────────────
$deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline) {
    try { $t = New-Object System.Net.Sockets.TcpClient; $t.Connect('127.0.0.1',5173); $t.Close(); break }
    catch { Start-Sleep -Milliseconds 600 }
}

Start-Sleep -Milliseconds 400

# ── Find Chrome or Edge ──────────────────────────────────────────────────────
$url = 'http://localhost:5173'
$candidates = @(
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$browserExe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

# ── Open in app-mode (standalone window — process exits when window is closed)
$browser = $null
if ($browserExe) {
    $browser = Start-Process -FilePath $browserExe `
        -ArgumentList "--app=$url", '--window-size=1440,900' `
        -PassThru
} else {
    # Fallback: normal browser tab (no auto-shutdown on close)
    Start-Process $url
}

# ── Monitor: shut down servers when the browser window is closed ─────────────
if ($browser) {
    while (Get-Process -Id $browser.Id -ErrorAction SilentlyContinue) {
        Start-Sleep -Seconds 3
    }
    # Browser window closed → kill servers
    foreach ($p in (Get-Content $pidFile -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\d+$' })) {
        & taskkill /F /T /PID $p 2>$null | Out-Null
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
