@echo off
title BIRD Lucknow - LiveQuiz
echo.
echo  ============================================
echo    BIRD Lucknow - LiveQuiz
echo    On Device Quizzing Solution
echo  ============================================
echo.

:: Check if node_modules exist
if not exist "%~dp0backend\node_modules" (
    echo  ERROR: Dependencies not installed!
    echo  Please run install.bat first.
    pause
    exit /b 1
)
if not exist "%~dp0frontend\node_modules" (
    echo  ERROR: Dependencies not installed!
    echo  Please run install.bat first.
    pause
    exit /b 1
)

:: Get local IP address for display
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=*" %%b in ("%%a") do (
        set "LOCAL_IP=%%b"
        goto :found_ip
    )
)
:found_ip

echo  Starting servers...
echo.
echo  ============================================
echo    HOST (this PC):
echo      http://localhost:3000
echo.
echo    PARTICIPANTS (same WiFi):
echo      http://%LOCAL_IP%:3000
echo  ============================================
echo.
echo  Press Ctrl+C to stop both servers.
echo.

:: Start backend in a new minimized window
start "LiveQuiz Backend" /min cmd /c "cd /d "%~dp0backend" && npx nest start --watch"

:: Wait for backend to start
echo  Waiting for backend to start...
timeout /t 8 /nobreak >nul

:: Start frontend in this window so user can see output
cd /d "%~dp0frontend"
call npx next dev --hostname 0.0.0.0
