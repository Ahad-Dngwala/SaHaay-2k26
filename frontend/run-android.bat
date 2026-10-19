@echo off
setlocal enabledelayedexpansion

:: Emergency Dispatch System - Android Build/Run
title Emergency Dispatch System - Android Build
color 0A

echo.
echo ========================================
echo Emergency Dispatch System - Android
echo ========================================
echo.

echo [1] User App - Android
echo [2] Ambulance App - Android
echo [3] Both - Android
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo Starting User App on Android...
    cd /d "%~dp0packages\user-app"
    npm run android
) else if "%choice%"=="2" (
    echo Starting Ambulance App on Android...
    cd /d "%~dp0packages\ambulance-app"
    npm run android
) else if "%choice%"=="3" (
    echo Starting both apps on Android...
    start "User App - Android" cmd /k "cd %~dp0packages\user-app && npm run android"
    timeout /t 5
    start "Ambulance App - Android" cmd /k "cd %~dp0packages\ambulance-app && npm run android"
) else (
    echo Invalid choice!
)
