<#
.SYNOPSIS
    Automated Deployment Script for ETHINX Platform.
    
.DESCRIPTION
    1. Uploads the 'deployment' folder to the target server.
    2. Connects via SSH.
    3. Executes the remote 'deploy.sh' script.
    
    The 'deployment' folder should contain a 'deploy.sh' script that handles
    the actual deployment logic on the remote server.

.EXAMPLE
    .\deploy.ps1 -ServerIP "91.99.162.243" -User "ubuntu" -KeyFile "~/.ssh/ethinx_deploy"
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,

    [string]$User = "root",

    [string]$RemotePath = "/tmp/openstack",

    [string]$KeyFile
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment to $User@$ServerIP..." -ForegroundColor Cyan

# 1. Validation
if (-not (Test-Path "deployment")) {
    Write-Error "❌ 'deployment' folder not found in current directory."
    exit 1
}

# 2. Build SSH Command Options
$sshOptions = @()
if (-not [string]::IsNullOrWhiteSpace($KeyFile)) {
    # Expand tilde paths to user home directory
    $expandedPath = $KeyFile -replace '^~', $env:USERPROFILE
    if (Test-Path $expandedPath) {
        $realKeyPath = Convert-Path $expandedPath
        $sshOptions += "-i", "$realKeyPath"
    }
    else {
        Write-Error "❌ SSH key file not found: $expandedPath"
        exit 1
    }
}

# 3. Upload Files (SCP)
Write-Host "📦 Uploading deployment files..." -ForegroundColor Yellow
try {
    # Construct SCP command manually to ensure proper argument passing
    $scpArgs = $sshOptions + "-r", "deployment", "$($User)@$($ServerIP):$($RemotePath)"
    & scp $scpArgs
    if ($LASTEXITCODE -ne 0) { throw "SCP failed with exit code $LASTEXITCODE" }
    Write-Host "✅ Upload complete." -ForegroundColor Green
}
catch {
    Write-Error "❌ Failed to upload files. Check your SSH keys/permissions."
    exit 1
}

# 4. Remote Execution
Write-Host "🔧 Executing remote deploy script..." -ForegroundColor Yellow
$remoteCommands = "cd $RemotePath/deployment && chmod +x deploy.sh && ./deploy.sh"

try {
    $sshArgs = $sshOptions + "$($User)@$($ServerIP)", $remoteCommands
    & ssh $sshArgs
    if ($LASTEXITCODE -ne 0) { throw "Remote script failed with exit code $LASTEXITCODE" }
    Write-Host "✨ Deployment successfully completed!" -ForegroundColor Green
}
catch {
    Write-Error "❌ Remote execution failed."
    exit 1
}
