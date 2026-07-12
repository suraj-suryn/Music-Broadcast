@echo off
title Music Broadcasting Server Control
cd /d "c:\Users\u734719\OneDrive - Finastra\Self_Task\Git project\Music Broadcasting"

:MENU
cls
echo ============================================
echo    MUSIC BROADCASTING SERVER CONTROL
echo ============================================
echo.
echo  1. Show Status
echo  2. Get Tunnel URL
echo  3. Restart All Services
echo  4. View Server Logs
echo  5. View Tunnel Logs
echo  6. Stop All Services
echo  7. Start All Services
echo  8. Exit
echo.
set /p choice="Enter choice (1-8): "

if "%choice%"=="1" goto STATUS
if "%choice%"=="2" goto URL
if "%choice%"=="3" goto RESTART
if "%choice%"=="4" goto SERVER_LOGS
if "%choice%"=="5" goto TUNNEL_LOGS
if "%choice%"=="6" goto STOP
if "%choice%"=="7" goto START
if "%choice%"=="8" exit
goto MENU

:STATUS
echo.
pm2 status
pause
goto MENU

:URL
echo.
echo === Current Tunnel URL ===
type network.config.json | findstr tunnelUrl
echo.
pause
goto MENU

:RESTART
echo.
echo Restarting services...
pm2 restart all
timeout /t 5 /nobreak >nul
echo.
echo === New Tunnel URL ===
pm2 logs tunnel --lines 15 --nostream
pause
goto MENU

:SERVER_LOGS
echo.
pm2 logs music-server --lines 30 --nostream
pause
goto MENU

:TUNNEL_LOGS
echo.
pm2 logs tunnel --lines 30 --nostream
pause
goto MENU

:STOP
echo.
pm2 stop all
echo Services stopped.
pause
goto MENU

:START
echo.
pm2 start all
timeout /t 5 /nobreak >nul
pm2 status
pause
goto MENU
