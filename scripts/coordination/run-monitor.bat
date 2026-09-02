@echo off
setlocal
title Neural Agent Coordination Dashboard
cd /d "%~dp0\..\.."

echo =============================================================
echo   NEURAL AGENT COORDINATION REALTIME DASHBOARD
echo   Three.js 3D Synapse and Safe-Zone Visualizer
echo =============================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH!
    pause
    exit /b 1
)

netstat -aon | findstr ":3344" | findstr "LISTENING" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Agent Monitor is already active on port 3344.
    start http://localhost:3344/
    ping -n 3 127.0.0.1 >nul
    exit /b 0
)

echo Starting Realtime Monitor Server on http://localhost:3344/ ...
node scripts/coordination/monitor-server.mjs --port 3344 --open
