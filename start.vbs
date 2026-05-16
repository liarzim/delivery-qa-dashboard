' ─────────────────────────────────────────────────────────────────────────────
' start.vbs  —  Silent launcher for QA & Delivery Dashboard
'
' Double-click this file to start the server WITHOUT a visible terminal window.
' The browser will open automatically at http://localhost:3001
'
' Requirements:
'   • Node.js installed and on PATH
'   • npm --prefix client run build  was run at least once  (or use start-dev.vbs)
'
' To STOP the server: open Task Manager → find "node.exe" → End Task
' ─────────────────────────────────────────────────────────────────────────────

Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

' Resolve the directory containing this script
Dim scriptDir
scriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

' Run the Express server silently (window style 0 = hidden, False = don't wait)
WshShell.Run "cmd /c cd /d """ & scriptDir & """ && node server/src/index.js", 0, False

' Wait a moment for the server to boot, then open the browser
WScript.Sleep 2000
WshShell.Run "http://localhost:3001", 1, False

Set WshShell = Nothing
