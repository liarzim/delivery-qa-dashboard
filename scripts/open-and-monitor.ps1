# open-and-monitor.ps1
# Opens the dashboard in a standalone app-mode browser window.
# When the window is closed, kills the server on port 3001.
$ErrorActionPreference = 'SilentlyContinue'
$url = 'http://localhost:3001'

$candidates = @(
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$browserExe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($browserExe) {
    $browser = Start-Process -FilePath $browserExe `
        -ArgumentList "--app=$url", '--window-size=1440,900' `
        -PassThru

    while (Get-Process -Id $browser.Id -ErrorAction SilentlyContinue) {
        Start-Sleep -Seconds 3
    }

    # Kill server on port 3001
    $pids = (Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue).OwningProcess
    foreach ($p in $pids) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
} else {
    Start-Process $url
}
