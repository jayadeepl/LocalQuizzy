@echo off
title BIRD LiveQuiz - Firewall Setup
echo.
echo  ============================================
echo    BIRD LiveQuiz - Firewall Setup
echo  ============================================
echo.

:: Check for admin
net session >nul 2>nul
if %errorlevel% neq 0 (
    echo  This script needs Administrator privileges.
    echo  Right-click and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo  Removing old rules (if any)...
netsh advfirewall firewall delete rule name="BIRD LiveQuiz Frontend" >nul 2>nul
netsh advfirewall firewall delete rule name="BIRD LiveQuiz Backend" >nul 2>nul

echo  Adding firewall rules...
netsh advfirewall firewall add rule name="BIRD LiveQuiz Frontend" dir=in action=allow protocol=TCP localport=3000 profile=any
netsh advfirewall firewall add rule name="BIRD LiveQuiz Backend" dir=in action=allow protocol=TCP localport=3001 profile=any

echo.
echo  Done! Ports 3000 and 3001 are now open on all networks.
echo  (WiFi, Hotspot, Ethernet, etc.)
echo.
pause
