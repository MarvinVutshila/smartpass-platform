. "$PSScriptRoot\config.ps1"
Write-Step "Creating RDS PostgreSQL instance"

$existing = aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --region $AWS_REGION --query "DBInstances[0].DBInstanceStatus" --output text 2>$null

if ($existing -and $existing -ne "None") {
    Write-Warn "RDS instance already exists (status: $existing)"
} else {
    Write-Host "  Creating RDS instance (~10 min)..."
    aws rds create-db-instance `
        --db-instance-identifier $DB_IDENTIFIER `
        --db-instance-class $DB_INSTANCE_CLASS `
        --engine postgres `
        --engine-version $DB_ENGINE_VERSION `
        --master-username $DB_USER `
        --master-user-password $DB_PASSWORD `
        --allocated-storage 20 `
        --storage-type gp2 `
        --db-name $DB_NAME `
        --backup-retention-period 7 `
        --publicly-accessible `
        --region $AWS_REGION | Out-Null
    Write-OK "RDS creation started"
}

Write-Host "  Waiting for RDS to become available..."
aws rds wait db-instance-available --db-instance-identifier $DB_IDENTIFIER --region $AWS_REGION

$endpoint = aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --region $AWS_REGION --query "DBInstances[0].Endpoint.Address" --output text
$connectionString = "postgresql://${DB_USER}:${DB_PASSWORD}@${endpoint}:5432/${DB_NAME}"

Write-OK "RDS ready at: $endpoint"
$connectionString | Out-File -FilePath "$PSScriptRoot\.database_url" -Encoding UTF8
Write-Host "Next: run .\02-backend.ps1" -ForegroundColor Cyan
