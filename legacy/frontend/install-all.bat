@echo off
setlocal enabledelayedexpansion

:: Emergency Dispatch System - Install Dependencies
title Emergency Dispatch System - Install Dependencies
color 0A

echo.
echo ========================================
echo Installing All Dependencies
echo ========================================
echo.

echo Installing root dependencies...
call npm install

echo.
echo Installing user-app dependencies...
cd /d "%~dp0packages\user-app"
call npm install

echo.
echo Installing ambulance-app dependencies...
cd /d "%~dp0packages\ambulance-app"
call npm install

echo.
echo Installing shared dependencies...
cd /d "%~dp0packages\shared"
call npm install

echo.
echo ========================================
echo All dependencies installed!
echo ========================================
echo.
timeout /t 3
