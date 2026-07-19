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

:: Make sure nothing is already using our ports. Starting anyway would
:: crash instantly with no visible error, since this window closes the
:: moment the command exits.
netstat -ano | findstr /c:":3000 " | findstr /i "LISTENING" >nul
if not errorlevel 1 (
    echo  ERROR: Port 3000 is already in use.
    echo  LiveQuiz may already be running - try opening
    echo  http://localhost:3000 in your browser.
    echo  If nothing should be using it, run stop.bat first.
    echo.
    pause
    exit /b 1
)
netstat -ano | findstr /c:":3001 " | findstr /i "LISTENING" >nul
if not errorlevel 1 (
    echo  ERROR: Port 3001 is already in use.
    echo  LiveQuiz may already be running. If nothing should
    echo  be using it, run stop.bat first.
    echo.
    pause
    exit /b 1
)

:: Check firewall rules
netsh advfirewall firewall show rule name="BIRD LiveQuiz Frontend" >nul 2>nul
if %errorlevel% neq 0 (
    echo  WARNING: Firewall rules not found!
    echo  Other devices may not be able to connect.
    echo.
    net session >nul 2>nul
    if %errorlevel% equ 0 (
        echo  Adding firewall rules...
        netsh advfirewall firewall add rule name="BIRD LiveQuiz Frontend" dir=in action=allow protocol=TCP localport=3000 profile=any >nul
        netsh advfirewall firewall add rule name="BIRD LiveQuiz Backend" dir=in action=allow protocol=TCP localport=3001 profile=any >nul
        echo  Firewall rules added!
        echo.
    ) else (
        echo  Run firewall-setup.bat as Administrator to fix this.
        echo.
    )
)

:: Detect all local IPv4 addresses (skip loopback, link-local, and virtual adapters)
set "BEST_IP="
echo  Detecting network addresses...
echo.

:: Use PowerShell to reliably get the active network IP
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Sort-Object -Property { switch -Wildcard ($_.InterfaceAlias) { 'Wi-Fi*' {0} 'Wireless*' {0} 'Local Area Connection*' {1} 'Ethernet*' {2} default {3} } } | Select-Object -First 1 -ExpandProperty IPAddress"`) do (
    set "BEST_IP=%%a"
)

if "%BEST_IP%"=="" (
    :: Fallback to ipconfig parsing
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        for /f "tokens=*" %%b in ("%%a") do (
            if "%BEST_IP%"=="" set "BEST_IP=%%b"
        )
    )
)

if "%BEST_IP%"=="" set "BEST_IP=localhost"

echo  Starting servers (development mode)...
echo.
echo  ============================================
echo.
echo    HOST (this PC):
echo      http://localhost:3000
echo.
echo    PARTICIPANTS (same network):
echo      http://%BEST_IP%:3000
echo.
echo  ============================================
echo.
echo  Share the above URL or scan the QR code in
echo  the lobby screen to let participants join.
echo.
echo  Tip: development mode recompiles each page the
echo  first time you visit it, so it can feel slow.
echo  For live hosting, use start-prod.bat instead.
echo.
echo  Press Ctrl+C to stop both servers.
echo.

:: Start backend in a new minimized window
start "LiveQuiz Backend" /min cmd /c "cd /d "%~dp0backend" && npx nest start --watch"

:: Wait for backend to start, then confirm it actually came up. The
:: backend window is minimized, so without this check a failed backend
:: fails completely silently and the app just won't work.
echo  Waiting for backend to start...
timeout /t 8 /nobreak >nul

netstat -ano | findstr /c:":3001 " | findstr /i "LISTENING" >nul
if errorlevel 1 (
    echo.
    echo  WARNING: Backend does not appear to be running on port 3001 yet.
    echo  Check the minimized "LiveQuiz Backend" window for errors.
    echo  The app will not work correctly until that's fixed.
    echo.
)

:: Start frontend in this window so user can see output
cd /d "%~dp0frontend"
call npx next dev --hostname 0.0.0.0 --port 3000

:: If we get here, the frontend server exited (Ctrl+C or a crash). Keep
:: the window open so any error message is actually readable.
echo.
echo  ============================================
echo    LiveQuiz frontend has stopped.
echo  ============================================
pause
