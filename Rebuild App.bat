@echo off
title Rebuilding QA ^& Delivery Dashboard
cd /d "%~dp0"

echo Rebuilding client app...
call npm run build
if errorlevel 1 (
    echo.
    echo Build failed! Check the error above.
    pause
    exit /b 1
)
echo Build complete. Run "Launch App.bat" to start.
pause
