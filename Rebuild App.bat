@echo off
title Rebuilding QA ^& Delivery Dashboard
cd /d "%~dp0"

echo Installing server dependencies...
cd server && call npm install && cd ..
if errorlevel 1 (
    echo.
    echo Server npm install failed! Check the error above.
    pause
    exit /b 1
)

echo Installing client dependencies...
cd client && call npm install && cd ..
if errorlevel 1 (
    echo.
    echo Client npm install failed! Check the error above.
    pause
    exit /b 1
)

echo Rebuilding client app...
call npm run build
if errorlevel 1 (
    echo.
    echo Build failed! Check the error above.
    pause
    exit /b 1
)
echo Build complete. Run "Launch App.vbs" to start.
pause
