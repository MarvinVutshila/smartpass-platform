# SmartPass AWS Deployment — Shared Configuration
$AWS_REGION          = "us-east-1"
$ECR_REPO_NAME       = "smartpass-backend"
$APP_RUNNER_SERVICE  = "smartpass-backend-service"
$S3_BUCKET_EVENT     = "smartpass-event-portal"
$S3_BUCKET_ADMIN     = "smartpass-admin-dashboard"
$CF_DIST_EVENT_NAME  = "SmartPass Event Portal"
$CF_DIST_ADMIN_NAME  = "SmartPass Admin Dashboard"

$DB_IDENTIFIER       = "smartpass-db"
$DB_NAME             = "smartpass"
$DB_USER             = "smartpass_admin"
$DB_INSTANCE_CLASS   = "db.t3.micro"
$DB_ENGINE_VERSION   = "16.4"

# ─── SECRETS (from environment, never hardcoded) ─────
$DB_PASSWORD = $env:SMARTPASS_DB_PASSWORD
if (-not $DB_PASSWORD) {
    Write-Host "ERROR: Set SMARTPASS_DB_PASSWORD environment variable first" -ForegroundColor Red
    Write-Host "  Example: `$env:SMARTPASS_DB_PASSWORD = 'YourStrongPassword123!'" -ForegroundColor Yellow
    exit 1
}

$ROOT_DIR    = Split-Path -Parent $PSScriptRoot
$BACKEND     = Join-Path $ROOT_DIR "backend"
$FRONT_EVENT = Join-Path $ROOT_DIR "frontend\event-portal"
$FRONT_ADMIN = Join-Path $ROOT_DIR "frontend\admin-dashboard"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "> $msg" -ForegroundColor Cyan
    Write-Host ("-" * 70) -ForegroundColor DarkGray
}
function Write-OK($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  [X]  $msg" -ForegroundColor Red }

function Assert-Tool($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Err "$name is not installed or not in PATH"
        exit 1
    }
    Write-OK "$name found"
}
