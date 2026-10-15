$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$secretPath = Join-Path (Get-Location) 'functions/local/.secret.local'
if (-not (Test-Path -LiteralPath $secretPath)) {
  $secureKey = Read-Host 'Paste your replacement PayMongo TEST secret key (hidden)' -AsSecureString
  $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  try {
    $testKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
    if ($testKey -notmatch '^sk_test_[A-Za-z0-9]+$') { throw 'Use a secret TEST key beginning sk_test_.' }
    [IO.File]::WriteAllText($secretPath, "PAYMONGO_SECRET_KEY=$testKey`n", [Text.UTF8Encoding]::new($false))
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    $testKey = $null
  }
}
if (-not (Test-Path 'functions/node_modules/firebase-admin')) {
  & npm.cmd --prefix functions install --no-package-lock
  if ($LASTEXITCODE -ne 0) { throw 'Could not install backend dependencies.' }
}
$env:FIREBASE_CLI_DISABLE_UPDATE_CHECK = 'true'
& node scripts/prepare-paymongo-local.cjs
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the local website.' }
Write-Host 'Starting local test store. No Firebase billing or deployment.'
Write-Host 'After startup, use a second terminal: node scripts/seed-paymongo-local.cjs'
Write-Host 'Open http://127.0.0.1:5500/homepage.html . Stop with Ctrl+C.'
& firebase.cmd emulators:start --config firebase.paymongo-local.json --project demo-smilehub-local --only auth,firestore,functions,hosting
