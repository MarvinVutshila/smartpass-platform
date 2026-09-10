. "$PSScriptRoot\config.ps1"

$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$ECR_URI    = "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

Write-Step "Creating ECR repository"
$repoExists = aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION 2>$null
if (-not $repoExists) {
    aws ecr create-repository --repository-name $ECR_REPO_NAME --region $AWS_REGION | Out-Null
    Write-OK "ECR repository created"
} else {
    Write-Warn "ECR repository already exists"
}

Write-Step "Logging into ECR"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

Write-Step "Building Docker image"
Push-Location $BACKEND
docker build -t $ECR_REPO_NAME .
if ($LASTEXITCODE -ne 0) { Write-Err "Docker build failed"; Pop-Location; exit 1 }
docker tag "${ECR_REPO_NAME}:latest" "${ECR_URI}:latest"
Pop-Location

Write-Step "Pushing image to ECR"
docker push "${ECR_URI}:latest"
if ($LASTEXITCODE -ne 0) { Write-Err "Docker push failed"; exit 1 }
Write-OK "Image pushed"

$DB_URL_FILE = "$PSScriptRoot\.database_url"
if (-not (Test-Path $DB_URL_FILE)) {
    Write-Err "Database URL file not found. Run 01-database.ps1 first."
    exit 1
}
$DATABASE_URL = (Get-Content $DB_URL_FILE).Trim()

Write-Step "Creating App Runner service"

$svc = aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='$APP_RUNNER_SERVICE'].ServiceArn" --output text 2>$null

if ($svc -and $svc -ne "None") {
    Write-Warn "App Runner exists: $svc"
    aws apprunner start-deployment --service-arn $svc --region $AWS_REGION | Out-Null
    Write-OK "Deployment triggered"
    exit 0
}

$serviceJson = @"
{
  "ServiceName": "$APP_RUNNER_SERVICE",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "$ECR_URI:latest",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "DATABASE_URL": "$DATABASE_URL",
          "ENVIRONMENT": "production",
          "DEBUG": "false",
          "FRONTEND_URL": "https://smartpass.co.za",
          "CORS_ORIGINS": "https://smartpass.co.za,https://admin.smartpass.co.za",
          "UPLOAD_DIR": "/app/uploads"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true,
    "AuthenticationConfiguration": {
      "AccessRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/AppRunnerECRAccessRole"
    }
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }
}
"@

$serviceJson | Out-File -FilePath "$PSScriptRoot\.apprunner.json" -Encoding UTF8

aws apprunner create-service --cli-input-json file://"$PSScriptRoot\.apprunner.json" --region $AWS_REGION | Out-Null

Write-OK "App Runner created. Waiting for RUNNING status..."

do {
    Start-Sleep -Seconds 15
    $status = aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='$APP_RUNNER_SERVICE'].Status" --output text
    Write-Host "  Status: $status"
} while ($status -ne "RUNNING")

$serviceUrl = aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='$APP_RUNNER_SERVICE'].ServiceUrl" --output text
Write-OK "App Runner live at: https://$serviceUrl"
$serviceUrl | Out-File -FilePath "$PSScriptRoot\.api_url" -Encoding UTF8
Write-Host "Next: run .\03-frontend.ps1" -ForegroundColor Cyan
