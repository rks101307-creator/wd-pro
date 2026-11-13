@echo off
cd /d "%~dp0"
echo Starting NutriTrack AI...
npm start
if errorlevel 1 (
  echo.
  echo Startup failed. Make sure Node.js is installed and run npm install first.
  pause
)
