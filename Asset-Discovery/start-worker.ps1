# Run from anywhere — always uses Asset-Discovery as the Celery app directory.
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not $env:C_FORCE_ROOT) { $env:C_FORCE_ROOT = "1" }

# Prefork is unreliable on Windows; use solo unless the caller passes --pool.
$extra = @()
if ($args -notcontains "--pool") {
  $extra = @("--pool", "solo")
}

& celery -A task worker --loglevel=info -c 4 @extra @args
