@echo off
title BIRD Lucknow - LiveQuiz Installer
echo.
echo  ============================================
echo    BIRD Lucknow - LiveQuiz
echo    On Device Quizzing Solution
echo  ============================================
echo.
echo  Installing dependencies...
echo.

echo  [1/4] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed!
    echo  Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo  Found Node.js %%i

echo.
echo  [2/4] Installing root dependencies...
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    echo  ERROR: Root install failed!
    pause
    exit /b 1
)

echo.
echo  [3/4] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo  ERROR: Backend install failed!
    pause
    exit /b 1
)

echo.
echo  Setting up database...
call npx prisma generate
call npx prisma migrate dev --name init --skip-seed 2>nul
if %errorlevel% neq 0 (
    call npx prisma migrate deploy 2>nul
)

echo.
echo  [4/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo  ERROR: Frontend install failed!
    pause
    exit /b 1
)

echo.
echo  ============================================
echo    Installation Complete!
echo    Run start.bat to launch the application.
echo  ============================================
echo.
pause
