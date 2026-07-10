@echo off
title BIRD Lucknow - LiveQuiz (Production)
echo.
echo  ============================================
echo    BIRD Lucknow - LiveQuiz (Production Mode)
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

echo  Building backend and frontend for production...
echo  (this happens once per launch and takes a minute or two)
echo.

cd /d "%~dp0backend"
call npx nest build
if %errorlevel% neq 0 (
    echo  ERROR: Backend build failed!
    pause
    exit /b 1
)

cd /d "%~dp0frontend"
call npx next build
if %errorlevel% neq 0 (
    echo  ERROR: Frontend build failed!
    pause
    exit /b 1
)

:: Detect all local IPv4 addresses (skip loopback, link-local, and virtual adapters)
set "BEST_IP="
echo.
echo  Detecting network addresses...
echo.

for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Sort-Object -Property { switch -Wildcard ($_.InterfaceAlias) { 'Wi-Fi*' {0} 'Wireless*' {0} 'Local Area Connection*' {1} 'Ethernet*' {2} default {3} } } | Select-Object -First 1 -ExpandProperty IPAddress"`) do (
    set "BEST_IP=%%a"
)

if "%BEST_IP%"=="" set "BEST_IP=localhost"

echo  Starting servers in production mode...
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
echo  Production mode is much faster than the dev
echo  launcher (start.bat) - pages load instantly
echo  instead of compiling on first visit.
echo.
echo  Press Ctrl+C to stop both servers.
echo.

:: Start backend in a new minimized window
start "LiveQuiz Backend" /min cmd /c "cd /d "%~dp0backend" && node dist/main"

:: Wait for backend to start
echo  Waiting for backend to start...
timeout /t 3 /nobreak >nul

:: Start frontend in this window so user can see output
cd /d "%~dp0frontend"
call npx next start --hostname 0.0.0.0 --port 3000
