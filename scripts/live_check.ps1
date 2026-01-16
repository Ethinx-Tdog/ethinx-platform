param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$StripeSecretKey,
  [switch]$CheckHost,
  [switch]$RequireRealPayment
)

$ErrorActionPreference = "Stop"

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { throw "Not in a git repo. cd into the repo root first." }
Set-Location $repoRoot

New-Item -ItemType Directory -Force ops\reports | Out-Null
$ts = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$jsonOut = "ops/reports/live_check_$ts.json"

$env:ETHINX_BASE_URL = $BaseUrl
$env:STRIPE_SECRET_KEY = $StripeSecretKey

Write-Host "== ETHINX LIVE readiness check ==" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"
Write-Host "Report:   $jsonOut"
Write-Host ""

$args = @(
  "-m","ethinx.ops.live_readiness",
  "--base-url",$BaseUrl,
  "--stripe-secret-key",$StripeSecretKey,
  "--json-out",$jsonOut
)

if ($CheckHost) { $args += "--check-host" }
if ($RequireRealPayment) { $args += "--require-real-payment" }

python @args
exit $LASTEXITCODE
