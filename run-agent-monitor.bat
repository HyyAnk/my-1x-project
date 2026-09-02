@echo off
setlocal
title Neural Agent Coordination Dashboard
cd /d "%~dp0"

echo =============================================================
echo   NEURAL AGENT COORDINATION REALTIME DASHBOARD
echo   Three.js 3D Synapse and Safe-Zone Visualizer
echo =============================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH!
    echo Please install Node.js to run this monitor.
    echo.
    pause
    exit /b 1
)

netstat -aon | findstr ":3344" | findstr "LISTENING" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Agent Monitor is already active on port 3344.
    echo Opening dashboard in your default browser...
    start http://localhost:3344/
    echo To stop the monitor, run: stop-agent-monitor.bat
    ping -n 3 127.0.0.1 >nul
    exit /b 0
)

echo Starting Realtime Monitor Server on http://localhost:3344/ ...
echo Press Ctrl+C in this window to stop the server anytime.
echo.

node scripts/coordination/monitor-server.mjs --port 3344 --open
