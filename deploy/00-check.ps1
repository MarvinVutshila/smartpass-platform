. "$PSScriptRoot\config.ps1"
Write-Step "Checking prerequisites"
Assert-Tool "docker"
Assert-Tool "aws"
Assert-Tool "node"
Assert-Tool "npm"

try {
    docker info | Out-Null
    Write-OK "Docker daemon is running"
} catch {
    Write-Err "Docker Desktop is not running."
    exit 1
}

try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-OK "AWS Account: $($identity.Account)"
    Write-OK "AWS User ARN: $($identity.Arn)"
} catch {
    Write-Err "AWS CLI is not configured. Run 'aws configure'."
    exit 1
}

Write-Host ""
Write-OK "All prerequisites satisfied!"
Write-Host ""
Write-Host "Next: run .\01-database.ps1" -ForegroundColor Cyan
