$ErrorActionPreference = "Stop"
npm run dist:win
if ($LASTEXITCODE -ne 0) { throw "Сборка завершилась с ошибкой" }
Write-Host "Установщик находится в папке release" -ForegroundColor Green
