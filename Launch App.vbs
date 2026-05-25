Dim fso, WshShell, strDir

Set fso      = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

' Always resolve paths relative to this script's own folder
strDir = fso.GetParentFolderName(WScript.ScriptFullName)

' ── Step 1: Install server deps if missing ────────────────────────────────────
If Not fso.FolderExists(strDir & "\server\node_modules") Then
    WshShell.Run "cmd /k ""cd /d " & strDir & "\server && npm install && echo. && echo Server deps installed — close this window.""", 1, True
End If

' ── Step 2: Build client if dist is missing ───────────────────────────────────
If Not fso.FileExists(strDir & "\client\dist\index.html") Then
    ' Show a window for the build so the user can see progress
    WshShell.Run "cmd /k ""cd /d " & strDir & " && npm run build && echo. && echo Build complete — close this window.""", 1, True
End If

' ── Step 3: Start Express server silently (no terminal window) ────────────────
WshShell.Run "cmd /c ""cd /d " & strDir & " && npm start""", 0, False

' ── Step 3: Wait for server to be ready, then open browser ───────────────────
WScript.Sleep 4000
WshShell.Run "http://localhost:3001"

Set fso      = Nothing
Set WshShell = Nothing
