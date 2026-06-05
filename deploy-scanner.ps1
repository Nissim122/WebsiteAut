# deploy-scanner.ps1 — מקמט ודוחף שינויים בסורק לשני הריפואים
# שימוש: .\deploy-scanner.ps1 "תיאור השינוי"

param([string]$msg = "update: scanner site")

$ROOT   = $PSScriptRoot
$SCANNER = Join-Path $ROOT "scanner-site"

# ── 0. סינכרון scanner.html → scanner-site/index.html ───────────
Write-Host "`n[0/4] Syncing scanner.html → scanner-site/index.html..." -ForegroundColor Cyan
node (Join-Path $ROOT "update-scanner-site.mjs")
if ($LASTEXITCODE -ne 0) {
    Write-Host "      Sync failed — aborting." -ForegroundColor Red
    exit 1
}
Write-Host "      Synced." -ForegroundColor Green

# ── 1. קומיט בריפו של scanner-site ──────────────────────────────
Write-Host "`n[1/4] Staging scanner-site..." -ForegroundColor Cyan
git -C $SCANNER add -A

$changes = git -C $SCANNER status --porcelain
if (-not $changes) {
    Write-Host "      Nothing to commit in scanner-site." -ForegroundColor DarkGray
} else {
    git -C $SCANNER commit -m $msg
    Write-Host "      Committed in scanner-site." -ForegroundColor Green
}

# ── 2. קומיט בריפו הראשי ────────────────────────────────────────
Write-Host "`n[2/4] Staging main repo..." -ForegroundColor Cyan
Set-Location $ROOT
git add scanner-site/

$mainChanges = git diff --cached --name-only
if (-not $mainChanges) {
    Write-Host "      Nothing to commit in main repo." -ForegroundColor DarkGray
} else {
    git commit -m $msg
    Write-Host "      Committed in main repo." -ForegroundColor Green
}

# ── 3. דחיפה ────────────────────────────────────────────────────
Write-Host "`n[3/4] Pushing main repo..." -ForegroundColor Cyan
git push

Write-Host "`n[4/4] Pushing scanner-site..." -ForegroundColor Cyan
$ahead = git -C $SCANNER rev-list origin/main..HEAD --count 2>$null
if ($ahead -gt 0) {
    git -C $SCANNER push
    Write-Host "      Pushed scanner-site ($ahead commit(s))." -ForegroundColor Green
} else {
    Write-Host "      scanner-site already up to date." -ForegroundColor DarkGray
}

Write-Host "`nDone. scanner.clix-automations.com will update shortly." -ForegroundColor Green
