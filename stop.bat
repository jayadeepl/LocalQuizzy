@echo off
title BIRD Lucknow - LiveQuiz - Stop
echo.
echo  ============================================
echo    BIRD Lucknow - LiveQuiz - Stop
echo  ============================================
echo.
echo  Stopping anything running on ports 3000 and 3001...
echo.

powershell -NoProfile -Command "$stopped = $false; foreach ($port in 3000,3001) { $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { Write-Host ('  Stopping process on port {0} (PID {1})...' -f $port, $c.OwningProcess); Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; $stopped = $true } }; if (-not $stopped) { Write-Host '  Nothing was running on ports 3000 or 3001.' } else { Write-Host ''; Write-Host '  Done. You can now run start.bat or start-prod.bat.' }"

echo.
pause
