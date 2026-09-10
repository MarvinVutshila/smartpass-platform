# SmartPass Full AWS Auto-Deployment
$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

$AWS_REGION          = "us-east-1"
$ECR_REPO_NAME       = "smartpass-backend"
$APP_RUNNER_SERVICE  = "smartpass-backend-service"
$IAM_ROLE_NAME       = "AppRunnerECRAccessRole"
$S3_BUCKET_EVENT     = "smartpass-event-portal-prod"
$S3_BUCKET_ADMIN     = "smartpass-admin-dashboard-prod"
$DB_IDENTIFIER       = "smartpass-db"
$DB_NAME             = "smartpass"
$DB_USER             = "smartpass_admin"
$DB_PASSWORD         = "SmartPass2026Secure"
$DB_INSTANCE_CLASS   = "db.t3.micro"
$DB_ENGINE_VERSION   = "16.4"

$ROOT_DIR    = Split-Path -Parent $PSScriptRoot
$BACKEND     = Join-Path $ROOT_DIR "backend"
$FRONT_EVENT = Join-Path $ROOT_DIR "frontend\event-portal"
$FRONT_ADMIN = Join-Path $ROOT_DIR "frontend\admin-dashboard"

function Log-Step($m)  { Write-Host ""; Write-Host "> $m" -ForegroundColor Cyan; Write-Host ("-" * 70) -ForegroundColor DarkGray }
function Log-OK($m)    { Write-Host "  [OK] $m" -ForegroundColor Green }
function Log-Warn($m)  { Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Log-Err($m)   { Write-Host "  [X]  $m" -ForegroundColor Red }
function Log-Info($m)  { Write-Host "  [i]  $m" -ForegroundColor Gray }

Write-Host ""
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "  SmartPass - Full AWS Auto-Deployment" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Estimated monthly cost: ~`$17 (RDS only)" -ForegroundColor Yellow
Write-Host ""

# 0. Pre-flight
Log-Step "Pre-flight checks"
foreach ($tool in @("docker", "aws", "node", "npm")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Log-Err "$tool is not installed"
        exit 1
    }
}
docker info *> $null
if ($LASTEXITCODE -ne 0) { Log-Err "Docker daemon not running"; exit 1 }

$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text).Trim()
Log-OK "AWS Account: $ACCOUNT_ID"
Log-OK "Docker running"
Log-OK "All tools available"

$ECR_URI = "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

# 1. IAM Role
Log-Step "Setting up IAM role for App Runner"
$roleExists = $null
try { $roleExists = aws iam get-role --role-name $IAM_ROLE_NAME 2>$null } catch { }

if (-not $roleExists) {
    $trustJson = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"build.apprunner.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
    $trustJson | Out-File -FilePath "$PSScriptRoot\.trust.json" -Encoding ASCII
    aws iam create-role --role-name $IAM_ROLE_NAME --assume-role-policy-document file://"$PSScriptRoot\.trust.json" | Out-Null
    aws iam attach-role-policy --role-name $IAM_ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess | Out-Null
    Log-OK "IAM role created"
    Start-Sleep -Seconds 10
} else {
    Log-Warn "IAM role already exists"
}

# 2. RDS
Log-Step "Setting up RDS PostgreSQL"
$rdsStatus = ""
try {
    $rdsStatus = (aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --region $AWS_REGION --query "DBInstances[0].DBInstanceStatus" --output text 2>$null).Trim()
} catch { }

if ($rdsStatus -and $rdsStatus -ne "None") {
    Log-Warn "RDS already exists (status: $rdsStatus)"
    if ($rdsStatus -ne "available") {
        Log-Info "Waiting for RDS to become available..."
        aws rds wait db-instance-available --db-instance-identifier $DB_IDENTIFIER --region $AWS_REGION
    }
} else {
    Log-Info "Creating RDS instance (~10 min)..."
    aws rds create-db-instance --db-instance-identifier $DB_IDENTIFIER --db-instance-class $DB_INSTANCE_CLASS --engine postgres --engine-version $DB_ENGINE_VERSION --master-username $DB_USER --master-user-password $DB_PASSWORD --allocated-storage 20 --storage-type gp2 --db-name $DB_NAME --backup-retention-period 7 --publicly-accessible --region $AWS_REGION | Out-Null
    Log-OK "RDS creation started"
    aws rds wait db-instance-available --db-instance-identifier $DB_IDENTIFIER --region $AWS_REGION
}

$endpoint = (aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --region $AWS_REGION --query "DBInstances[0].Endpoint.Address" --output text).Trim()
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@${endpoint}:5432/${DB_NAME}"
Log-OK "RDS ready at: $endpoint"
$DATABASE_URL | Out-File -FilePath "$PSScriptRoot\.database_url" -Encoding UTF8

# 3. ECR
Log-Step "Setting up ECR repository"
$repoExists = $null
try { $repoExists = aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION 2>$null } catch { }
if (-not $repoExists) {
    aws ecr create-repository --repository-name $ECR_REPO_NAME --region $AWS_REGION | Out-Null
    Log-OK "ECR repository created"
} else {
    Log-Warn "ECR repository already exists"
}

# 4. Build + Push
Log-Step "Building & pushing Docker image"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

Push-Location $BACKEND
Log-Info "Building image..."
docker build -t $ECR_REPO_NAME .
if ($LASTEXITCODE -ne 0) { Log-Err "Docker build failed"; Pop-Location; exit 1 }
docker tag "${ECR_REPO_NAME}:latest" "${ECR_URI}:latest"
Log-Info "Pushing image..."
docker push "${ECR_URI}:latest"
if ($LASTEXITCODE -ne 0) { Log-Err "Docker push failed"; Pop-Location; exit 1 }
Pop-Location
Log-OK "Image pushed"

# 5. App Runner
Log-Step "Creating App Runner service"
$existingArn = ""
try {
    $existingArn = (aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='$APP_RUNNER_SERVICE'].ServiceArn" --output text 2>$null).Trim()
} catch { }

if ($existingArn -and $existingArn -ne "None") {
    Log-Warn "App Runner already exists"
    aws apprunner start-deployment --service-arn $existingArn --region $AWS_REGION | Out-Null
    Log-OK "Redeployment triggered"
} else {
    $serviceConfig = @{
        ServiceName = $APP_RUNNER_SERVICE
        SourceConfiguration = @{
            ImageRepository = @{
                ImageIdentifier = "${ECR_URI}:latest"
                ImageConfiguration = @{
                    Port = "8080"
                    RuntimeEnvironmentVariables = @{
                        DATABASE_URL = $DATABASE_URL
                        ENVIRONMENT  = "production"
                        DEBUG        = "false"
                        FRONTEND_URL = "https://smartpass.co.za"
                        CORS_ORIGINS = "https://smartpass.co.za,https://admin.smartpass.co.za"
                        UPLOAD_DIR   = "/app/uploads"
                    }
                }
                ImageRepositoryType = "ECR"
            }
            AutoDeploymentsEnabled = $true
            AuthenticationConfiguration = @{
                AccessRoleArn = "arn:aws:iam::$ACCOUNT_ID:role/$IAM_ROLE_NAME"
            }
        }
        InstanceConfiguration = @{
            Cpu    = "1 vCPU"
            Memory = "2 GB"
        }
        HealthCheckConfiguration = @{
            Protocol           = "HTTP"
            Path               = "/health"
            Interval           = 10
            Timeout            = 5
            HealthyThreshold   = 1
            UnhealthyThreshold = 5
        }
    } | ConvertTo-Json -Depth 10

    $serviceConfig | Out-File -FilePath "$PSScriptRoot\.apprunner.json" -Encoding UTF8
    aws apprunner create-service --cli-input-json file://"$PSScriptRoot\.apprunner.json" --region $AWS_REGION | Out-Null
    Log-OK "App Runner creating..."
}

Log-Info "Waiting for App Runner to be RUNNING..."
$serviceUrl = $null
$start = Get-Date
while (((Get-Date) - $start).TotalMinutes -lt 15) {
    Start-Sleep -Seconds 15
    $status = (aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='$APP_RUNNER_SERVICE'].Status" --output text 2>$null).Trim()
    Write-Host "    Status: $status" -ForegroundColor DarkGray
    if ($status -eq "RUNNING") {
        $serviceUrl = (aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='$APP_RUNNER_SERVICE'].ServiceUrl" --output text).Trim()
        break
    }
}

if (-not $serviceUrl) { Log-Err "App Runner timeout"; exit 1 }
$API_URL = "https://$serviceUrl"
Log-OK "App Runner live at: $API_URL"
$serviceUrl | Out-File -FilePath "$PSScriptRoot\.api_url" -Encoding UTF8

# 6. Frontends
function Deploy-Frontend($Name, $Dir, $Bucket) {
    Log-Step "Deploying $Name"
    Push-Location $Dir
    if (-not (Test-Path "node_modules")) {
        Log-Info "Installing npm packages..."
        npm ci --silent 2>&1 | Out-Null
    }
    Log-Info "Building with API: $API_URL"
    $env:VITE_API_BASE_URL = $API_URL
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Log-Err "Build failed"; Pop-Location; return }
    Pop-Location

    aws s3api head-bucket --bucket $Bucket 2>$null
    if ($LASTEXITCODE -ne 0) {
        aws s3 mb "s3://$Bucket" --region $AWS_REGION | Out-Null
        Log-OK "S3 bucket created: $Bucket"
    } else {
        Log-Warn "S3 bucket exists: $Bucket"
    }
    aws s3 sync "$Dir\dist" "s3://$Bucket" --delete --region $AWS_REGION | Out-Null
    Log-OK "Deployed -> s3://$Bucket"
}

Deploy-Frontend -Name "event-portal"    -Dir $FRONT_EVENT -Bucket $S3_BUCKET_EVENT
Deploy-Frontend -Name "admin-dashboard" -Dir $FRONT_ADMIN -Bucket $S3_BUCKET_ADMIN

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  API URL:      $API_URL"
Write-Host "  Database:     $endpoint"
Write-Host "  Test health:  curl $API_URL/health"
Write-Host "  API docs:     $API_URL/docs"
Write-Host ""
Write-Host "  RDS costs ~`$17/month - destroy when done." -ForegroundColor Yellow
Write-Host ""
