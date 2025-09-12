# GitHub Pages Deployment Setup Script
# Run this script to set up GitHub repository and deploy to GitHub Pages

Write-Host "VoiceTranslate Website - GitHub Pages Deployment Setup" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check if git is installed
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git from https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}

# Get GitHub username
$username = Read-Host "Enter your GitHub username"
if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "Error: GitHub username is required" -ForegroundColor Red
    exit 1
}

# Repository name
$repoName = "voicetranslate-website"

Write-Host "`nSetting up Git repository..." -ForegroundColor Yellow

# Initialize git if not already initialized
if (!(Test-Path ".git")) {
    git init
    Write-Host "Git repository initialized" -ForegroundColor Green
}

# Add all files
git add .
Write-Host "Files added to git" -ForegroundColor Green

# Commit files
git commit -m "Initial commit - VoiceTranslate website ready for GitHub Pages"
Write-Host "Files committed" -ForegroundColor Green

# Set main branch
git branch -M main
Write-Host "Main branch set" -ForegroundColor Green

# Add remote origin
$remoteUrl = "https://github.com/$username/$repoName.git"
git remote remove origin 2>$null  # Remove if exists
git remote add origin $remoteUrl
Write-Host "Remote origin added: $remoteUrl" -ForegroundColor Green

Write-Host "`n=================================================" -ForegroundColor Green
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Green
Write-Host "1. Go to GitHub.com and create a new repository named '$repoName'" -ForegroundColor White
Write-Host "   - Make it PUBLIC (required for free GitHub Pages)" -ForegroundColor White
Write-Host "   - Don't initialize with README" -ForegroundColor White
Write-Host "`n2. Run this command to push your code:" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host "`n3. Enable GitHub Pages:" -ForegroundColor White
Write-Host "   - Go to repository Settings > Pages" -ForegroundColor White
Write-Host "   - Set Source to 'GitHub Actions'" -ForegroundColor White
Write-Host "`n4. Your site will be available at:" -ForegroundColor White
Write-Host "   https://$username.github.io/$repoName/" -ForegroundColor Cyan
Write-Host "`n=================================================" -ForegroundColor Green

Write-Host "`nSetup complete! Follow the steps above to deploy." -ForegroundColor Green