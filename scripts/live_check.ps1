param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$StripeSecretKey,
  [switch]$CheckHost,
  [switch]$RequireRealPayment
)

$ErrorActionPreference = "Stop"

if ($BaseUrl -match "YOUR_DOMAIN|example\.com|localhost$") {
  throw "BaseUrl looks like a placeholder. Provide your real prod URL (https://...)."
}
if ($StripeSecretKey -match "sk_live_\.\.\.|sk_test_\.\.\.") {
  throw "StripeSecretKey looks like a placeholder. Provide the real sk_live_... key."
}
if (-not $StripeSecretKey.StartsWith("sk_live_")) {
  throw "StripeSecretKey must be a LIVE key starting with sk_live_."
}

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { throw "Not in a git repo. cd into the repo root first." }
Set-Location $repoRoot

New-Item -ItemType Directory -Force ops\reports | Out-Null
$ts = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$jsonOut = "ops/reports/live_check_$ts.json"

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
