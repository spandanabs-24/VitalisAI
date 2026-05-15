# VITALIS AI STARTUP SCRIPT
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "  VITALIS AI - STARTING SYSTEM" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Dependencies
Write-Host "[1/2] Installing Engine Dependencies..." -ForegroundColor Yellow
Set-Location "C:\Users\ullas\.gemini\antigravity\scratch\vitalis-ai\frontend"
npm install --quiet

# Step 2: Start Development Server
Write-Host "[2/2] Launching Vitalis Core..." -ForegroundColor Green
Write-Host "Opening browser at http://localhost:3000 in 10 seconds..." -ForegroundColor Gray

# Start dev in background and open browser
Start-Process "http://localhost:3000"
npm run dev
