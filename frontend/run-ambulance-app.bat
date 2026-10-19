@echo off
setlocal enabledelayedexpansion

:: Emergency Dispatch System - Ambulance App Only
title Emergency Dispatch System - Ambulance App
color 0A

echo.
echo ========================================
echo Starting Ambulance App
echo ========================================
echo.

cd /d "%~dp0packages\ambulance-app"
npm start
