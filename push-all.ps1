# push-all.ps1 — דוחף את הריפו הראשי תמיד, ואת scanner-site רק אם יש commits חדשים

Write-Host "`nPushing main repo..." -ForegroundColor Cyan
git push

$ahead = git -C scanner-site rev-list origin/main..HEAD --count 2>$null
if ($ahead -gt 0) {
    Write-Host "`nPushing scanner-site ($ahead commit(s) ahead)..." -ForegroundColor Cyan
    git -C scanner-site push
} else {
    Write-Host "`nscanner-site — nothing to push" -ForegroundColor DarkGray
}

Write-Host "`nDone." -ForegroundColor Green
