@echo off
setlocal enabledelayedexpansion

:: Emergency Dispatch System - User App Only
title Emergency Dispatch System - User App
color 0A

echo.
echo ========================================
echo Starting User App
echo ========================================
echo.

cd /d "%~dp0packages\user-app"
npm start
