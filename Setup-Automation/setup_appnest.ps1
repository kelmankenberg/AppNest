# setup_appnest.ps1
Write-Host "AppNest Automated Setup Script" -ForegroundColor Cyan

# 1. Install dependencies
Write-Host "Installing npm dependencies..."
npm install

# 2. Install Windows build tools if not present
if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Windows Build Tools..."
    npm install --global windows-build-tools
}

# 3. Ensure Python 3 is available
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python 3 is required. Please install Python 3 and add it to your PATH."
    exit 1
}

# 4. Build native Electron dependencies
Write-Host "Building native Electron dependencies..."
npx electron-builder install-app-deps

# 5. Start the app
Write-Host "Starting AppNest..."
npm start