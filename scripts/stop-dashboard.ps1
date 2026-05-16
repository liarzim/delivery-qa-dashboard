# stop-dashboard.ps1 — kills the backend + frontend processes started by start-dashboard.ps1
$ErrorActionPreference = 'SilentlyContinue'
$root    = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pidFile = Join-Path $root '.dashboard.pids'

# ── Kill saved process trees (cmd + npm + node children) ────────────────────
if (Test-Path $pidFile) {
    $saved = Get-Content $pidFile
    foreach ($p in ($saved | Where-Object { $_ -match '^\d+$' })) {
        & taskkill /F /T /PID $p 2>$null | Out-Null
    }
    Remove-Item $pidFile -Force
}

# ── Fallback: kill any process still holding ports 3001 or 5173 ─────────────
foreach ($port in @(3001, 5173)) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        & taskkill /F /PID $c.OwningProcess 2>$null | Out-Null
    }
}
