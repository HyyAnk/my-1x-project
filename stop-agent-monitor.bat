@echo off
setlocal
title Stopping Neural Agent Coordination Dashboard
cd /d "%~dp0"

echo Stopping Agent Coordination Monitor on port 3344...

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3344" ^| findstr "LISTENING"') do (
    set FOUND=1
    echo Terminating monitor server process PID %%a
    taskkill /f /pid %%a >nul 2>nul
)

if "%FOUND%"=="1" (
    echo [SUCCESS] Agent Coordination Monitor has been stopped. Port 3344 is released.
) else (
    echo [INFO] No active monitor server found on port 3344.
)

ping -n 3 127.0.0.1 >nul
