@echo off
setlocal enabledelayedexpansion

:: Emergency Dispatch System - Run All Apps
title Emergency Dispatch System - All Apps
color 0A

echo.
echo ========================================
echo Emergency Dispatch System - All Apps
echo ========================================
echo.

:: Check if node_modules exist in root
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
    echo.
)

:: Start User App
echo Starting User App...
start "User App" cmd /k "cd packages\user-app && npm start"
timeout /t 3 /nobreak

:: Start Ambulance App
echo Starting Ambulance App...
start "Ambulance App" cmd /k "cd packages\ambulance-app && npm start"

echo.
echo ========================================
echo All apps are starting...
echo - User App window should open soon
echo - Ambulance App window should open soon
echo ========================================
echo.
timeout /t 5
