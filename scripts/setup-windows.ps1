$ErrorActionPreference = "Stop"

Write-Host "LeadPilot Desktop: проверка окружения" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js не найден. Установите Node.js LTS с https://nodejs.org/"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm не найден. Переустановите Node.js LTS."
}

npm install
if ($LASTEXITCODE -ne 0) { throw "Не удалось установить зависимости" }

Write-Host "Готово. Запуск: npm run dev" -ForegroundColor Green
Write-Host "Сборка установщика: npm run dist:win" -ForegroundColor Green
