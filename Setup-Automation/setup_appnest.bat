@echo off
REM AppNest Automated Setup Script

REM 1. Ensure script is run as administrator for build tools
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Please run this script as Administrator.
    pause
    exit /b 1
)

REM 2. Install Node.js dependencies
echo Installing npm dependencies...
call npm install

REM 3. Install Windows build tools if not present
where cl >nul 2>&1
if %errorLevel% neq 0 (
    echo Installing Windows Build Tools...
    npm install --global windows-build-tools
)

REM 4. Ensure Python 3 is available
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Python 3 is required. Please install Python 3 and add it to your PATH.
    pause
    exit /b 1
)

REM 5. Build native Electron dependencies
echo Building native Electron dependencies...
call npx electron-builder install-app-deps

REM 6. Start the app
echo Starting AppNest...
call npm start

echo.
echo Setup complete!
pause