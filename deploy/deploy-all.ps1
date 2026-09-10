. "$PSScriptRoot\config.ps1"
Write-Host ""
Write-Host "SmartPass - Full AWS Deployment" -ForegroundColor Magenta
$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y") { exit 0 }

& "$PSScriptRoot\00-check.ps1";    if ($LASTEXITCODE -ne 0) { exit 1 }
& "$PSScriptRoot\01-database.ps1"; if ($LASTEXITCODE -ne 0) { exit 1 }
& "$PSScriptRoot\02-backend.ps1";  if ($LASTEXITCODE -ne 0) { exit 1 }
& "$PSScriptRoot\03-frontend.ps1"; if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
