<#
.SYNOPSIS
    Creates a deployment-ready zip bundle for AWS Elastic Beanstalk.
.DESCRIPTION
    Uses .NET ZipArchive to ensure all paths use forward slashes (Linux-compatible).
    PowerShell's Compress-Archive uses backslashes which causes unzip failure on AWS Linux.
.NOTES
    Run from the backend-express directory:
    .\create-aws-bundle.ps1
#>

param(
    [string]$OutputDir = "."
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Configuration
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipName = "ticketops-backend-aws-$timestamp.zip"
$sourceDir = $PSScriptRoot
$outputPath = Join-Path $OutputDir $zipName

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " TicketOps Backend - AWS Bundle Creator " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Files and folders to EXCLUDE
$excludeDirs = @(
    "node_modules",
    "backups",
    "uploads",
    "__tests__",
    ".git",
    ".vscode",
    ".idea",
    "Docs",
    "api"
)

$excludeFiles = @(
    ".env",
    ".env.local",
    ".env.production",
    ".env.staging",
    ".vercelignore",
    "vercel.json",
    "check-escalations.js",
    "check-user-rights.js",
    "check-users-debug.js",
    "temp_ping_check.ps1",
    "health_output.json",
    "health_utf8.json",
    "CONNECTION_OPTIONS.txt",
    "create-aws-bundle.ps1"
)

$excludePatterns = @(
    "*.log",
    "*.swp",
    "*.swo",
    "temp_*.ps1",
    "ticketops-backend-aws-*.zip"
)

# Step 1: Remove existing zip if present
if (Test-Path $outputPath) {
    Remove-Item $outputPath -Force
}

# Step 2: Create zip using .NET ZipArchive (forward slashes guaranteed)
Write-Host "[1/3] Scanning source files..." -ForegroundColor Yellow

$zipStream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create)
$zipArchive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)

$copiedCount = 0
$skippedCount = 0

$allFiles = Get-ChildItem -Path $sourceDir -Recurse -Force -File

Write-Host "[2/3] Building zip with Linux-compatible paths..." -ForegroundColor Yellow

foreach ($file in $allFiles) {
    $relativePath = $file.FullName.Substring($sourceDir.Length + 1)

    # Check exclusions
    $shouldExclude = $false

    # Check if inside excluded directory
    foreach ($dir in $excludeDirs) {
        if ($relativePath -like "$dir\*" -or $relativePath -eq $dir) {
            $shouldExclude = $true
            break
        }
    }

    if (-not $shouldExclude) {
        # Check exact filename exclusions
        if ($excludeFiles -contains $file.Name) {
            $shouldExclude = $true
        }

        # Check pattern exclusions
        if (-not $shouldExclude) {
            foreach ($pattern in $excludePatterns) {
                if ($file.Name -like $pattern) {
                    $shouldExclude = $true
                    break
                }
            }
        }
    }

    if ($shouldExclude) {
        $skippedCount++
        continue
    }

    # KEY FIX: Convert Windows backslashes to forward slashes for Linux unzip
    $entryName = $relativePath.Replace('\', '/')

    # Add file to zip
    $entry = $zipArchive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $fileStream = [System.IO.File]::OpenRead($file.FullName)
    $fileStream.CopyTo($entryStream)
    $fileStream.Close()
    $entryStream.Close()

    $copiedCount++
}

# Step 3: Close zip
$zipArchive.Dispose()
$zipStream.Dispose()

Write-Host "[3/3] Done!" -ForegroundColor Yellow

$zipSize = (Get-Item $outputPath).Length
$zipSizeMB = [math]::Round($zipSize / 1MB, 2)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Bundle Created Successfully!           " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  File  : $outputPath" -ForegroundColor White
Write-Host "  Size  : $zipSizeMB MB" -ForegroundColor White
Write-Host "  Files : $copiedCount included, $skippedCount excluded" -ForegroundColor White
Write-Host "  Paths : Forward slashes (Linux-compatible) ✅" -ForegroundColor Green
Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Go to AWS Elastic Beanstalk Console" -ForegroundColor White
Write-Host "  2. Upload and Deploy → $zipName" -ForegroundColor White
Write-Host "  3. Set environment variables (see .env.aws.example)" -ForegroundColor White
Write-Host ""
