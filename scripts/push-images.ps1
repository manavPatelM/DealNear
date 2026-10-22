# Builds every DealNear microservice image and pushes it to its own ECR repository.
# Run after `terraform apply -target=aws_ecr_repository.service` in infra/aws-ecs.
#   powershell -File scripts/push-images.ps1 [-Region us-east-1] [-Tag latest]
param(
    [string]$Region = "us-east-1",
    [string]$Tag = "latest"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$services = [ordered]@{
    "identity-service"  = "services/identity-service"
    "vendor-service"    = "services/vendor-service"
    "offer-service"     = "services/offer-service"
    "discovery-service" = "services/discovery-service"
    "api-gateway"       = "services/api-gateway"
    "customer-web"      = "frontend"
}

$account = (aws sts get-caller-identity --query Account --output text).Trim()
$registry = "$account.dkr.ecr.$Region.amazonaws.com"
# Windows PowerShell 5 re-encodes piped text, which corrupts the token (ECR replies 400),
# so the pipe runs inside cmd.exe.
cmd /c "aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $registry"
if ($LASTEXITCODE -ne 0) { throw "ECR login failed" }

foreach ($name in $services.Keys) {
    $image = "$registry/dealnear/${name}:$Tag"
    Write-Host "==> $name -> $image"
    docker build --platform linux/amd64 -t $image (Join-Path $root $services[$name])
    if ($LASTEXITCODE -ne 0) { throw "build failed for $name" }
    # Pushes over flaky networks can drop; retry a few times before giving up.
    $pushed = $false
    for ($i = 1; $i -le 3 -and -not $pushed; $i++) {
        docker push $image
        if ($LASTEXITCODE -eq 0) { $pushed = $true } else { Write-Host "push attempt $i failed, retrying"; Start-Sleep 5 }
    }
    if (-not $pushed) { throw "push failed for $name" }
}
Write-Host "All images pushed with tag $Tag"
