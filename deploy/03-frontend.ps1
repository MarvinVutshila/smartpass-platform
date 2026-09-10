. "$PSScriptRoot\config.ps1"

$API_URL_FILE = "$PSScriptRoot\.api_url"
if (-not (Test-Path $API_URL_FILE)) {
    Write-Err "API URL not found. Run 02-backend.ps1 first."
    exit 1
}
$API_URL = "https://" + (Get-Content $API_URL_FILE).Trim()

function Deploy-Frontend {
    param($Name, $SourceDir, $Bucket)

    Write-Step "Deploying $Name"
    Push-Location $SourceDir
    if (-not (Test-Path "node_modules")) {
        Write-Host "  Installing npm packages..."
        npm ci --silent
    }
    Write-Host "  Building with API_URL=$API_URL"
    $env:VITE_API_BASE_URL = $API_URL
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Err "Build failed"; Pop-Location; return }
    Pop-Location

    $bucketExists = aws s3api head-bucket --bucket $Bucket 2>$null
    if (-not $bucketExists) {
        aws s3 mb "s3://$Bucket" --region $AWS_REGION | Out-Null
        Write-OK "S3 bucket created: $Bucket"
    } else {
        Write-Warn "S3 bucket exists: $Bucket"
    }

    aws s3 sync "$SourceDir\dist" "s3://$Bucket" --delete --region $AWS_REGION
    Write-OK "Uploaded to s3://$Bucket"
}

Deploy-Frontend -Name "event-portal"    -SourceDir $FRONT_EVENT -Bucket $S3_BUCKET_EVENT
Deploy-Frontend -Name "admin-dashboard" -SourceDir $FRONT_ADMIN -Bucket $S3_BUCKET_ADMIN

Write-Host ""
Write-OK "All frontends deployed!"
