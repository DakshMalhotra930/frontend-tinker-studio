# PraxisAI Deployment Script
# This script helps deploy both frontend and backend from the same repository

Write-Host "🚀 PraxisAI Deployment Script" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "frontend-tinker-studio") -or -not (Test-Path "backend")) {
    Write-Host "❌ Error: Please run this script from the root directory containing both frontend-tinker-studio and backend folders" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found both frontend and backend directories" -ForegroundColor Green

# Function to deploy frontend to Vercel
function Deploy-Frontend {
    Write-Host "`n📱 Deploying Frontend to Vercel..." -ForegroundColor Yellow
    
    # Check if Vercel CLI is installed
    try {
        $vercelVersion = vercel --version
        Write-Host "✅ Vercel CLI found: $vercelVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
        npm install -g vercel
    }
    
    # Navigate to frontend directory
    Set-Location "frontend-tinker-studio"
    
    # Check if user is logged in to Vercel
    try {
        vercel whoami
        Write-Host "✅ Logged in to Vercel" -ForegroundColor Green
    } catch {
        Write-Host "❌ Not logged in to Vercel. Please login first:" -ForegroundColor Red
        Write-Host "Run: vercel login" -ForegroundColor Yellow
        Set-Location ".."
        return
    }
    
    # Deploy to Vercel
    Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow
    vercel --prod
    
    Set-Location ".."
    Write-Host "✅ Frontend deployment initiated!" -ForegroundColor Green
}

# Function to deploy backend to Fly.io
function Deploy-Backend {
    Write-Host "`n🖥️ Deploying Backend to Fly.io..." -ForegroundColor Yellow
    
    # Check if Fly CLI is installed
    try {
        $flyVersion = fly version
        Write-Host "✅ Fly CLI found: $flyVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Fly CLI not found. Please install it first:" -ForegroundColor Red
        Write-Host "Run: iwr https://fly.io/install.ps1 -useb | iex" -ForegroundColor Yellow
        return
    }
    
    # Navigate to backend directory
    Set-Location "backend"
    
    # Check if user is logged in to Fly.io
    try {
        fly auth whoami
        Write-Host "✅ Logged in to Fly.io" -ForegroundColor Green
    } catch {
        Write-Host "❌ Not logged in to Fly.io. Please login first:" -ForegroundColor Red
        Write-Host "Run: fly auth login" -ForegroundColor Yellow
        Set-Location ".."
        return
    }
    
    # Check if app exists
    try {
        fly status
        Write-Host "✅ App exists, deploying..." -ForegroundColor Green
    } catch {
        Write-Host "❌ App not found. Please create it first:" -ForegroundColor Red
        Write-Host "Run: fly launch" -ForegroundColor Yellow
        Set-Location ".."
        return
    }
    
    # Deploy to Fly.io
    Write-Host "🚀 Deploying to Fly.io..." -ForegroundColor Yellow
    fly deploy
    
    Set-Location ".."
    Write-Host "✅ Backend deployment initiated!" -ForegroundColor Green
}

# Function to set up environment variables
function Setup-Environment {
    Write-Host "`n🔧 Environment Setup Guide" -ForegroundColor Yellow
    Write-Host "=========================" -ForegroundColor Yellow
    
    Write-Host "`n📱 VERCEL ENVIRONMENT VARIABLES:" -ForegroundColor Cyan
    Write-Host "1. Go to your Vercel dashboard" -ForegroundColor White
    Write-Host "2. Select your project" -ForegroundColor White
    Write-Host "3. Go to Settings → Environment Variables" -ForegroundColor White
    Write-Host "4. Add these variables:" -ForegroundColor White
    Write-Host "   - VITE_API_BASE_URL = https://praxis-ai.fly.dev" -ForegroundColor Gray
    Write-Host "   - VITE_SUPABASE_URL = your-supabase-url" -ForegroundColor Gray
    Write-Host "   - VITE_SUPABASE_ANON_KEY = your-supabase-anon-key" -ForegroundColor Gray
    
    Write-Host "`n🖥️ FLY.IO SECRETS:" -ForegroundColor Cyan
    Write-Host "Run these commands in the backend directory:" -ForegroundColor White
    Write-Host "fly secrets set TOGETHER_API_KEY='your-together-ai-key'" -ForegroundColor Gray
    Write-Host "fly secrets set DB_HOST='your-database-host'" -ForegroundColor Gray
    Write-Host "fly secrets set DB_USER='your-database-user'" -ForegroundColor Gray
    Write-Host "fly secrets set DB_PASSWORD='your-database-password'" -ForegroundColor Gray
    Write-Host "fly secrets set DB_NAME='your-database-name'" -ForegroundColor Gray
    Write-Host "fly secrets set DB_PORT='5432'" -ForegroundColor Gray
    Write-Host "fly secrets set GOOGLE_GEMINI_API_KEY='your-gemini-key'" -ForegroundColor Gray
}

# Main menu
Write-Host "`nWhat would you like to do?" -ForegroundColor White
Write-Host "1. Deploy Frontend to Vercel" -ForegroundColor Cyan
Write-Host "2. Deploy Backend to Fly.io" -ForegroundColor Cyan
Write-Host "3. Deploy Both" -ForegroundColor Cyan
Write-Host "4. Show Environment Setup Guide" -ForegroundColor Cyan
Write-Host "5. Exit" -ForegroundColor Cyan

$choice = Read-Host "`nEnter your choice (1-5)"

switch ($choice) {
    "1" { Deploy-Frontend }
    "2" { Deploy-Backend }
    "3" { 
        Deploy-Frontend
        Deploy-Backend
    }
    "4" { Setup-Environment }
    "5" { 
        Write-Host "👋 Goodbye!" -ForegroundColor Green
        exit 0
    }
    default { 
        Write-Host "❌ Invalid choice. Please run the script again." -ForegroundColor Red
    }
}

Write-Host "`n🎉 Deployment process completed!" -ForegroundColor Green
Write-Host "Don't forget to set up your environment variables!" -ForegroundColor Yellow

