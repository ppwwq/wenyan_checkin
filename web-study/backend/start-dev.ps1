param([int]$Port = 8787)
$ErrorActionPreference = 'Stop'
$backendDir = $PSScriptRoot
$dataDir = Join-Path $backendDir 'data'
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
$configPath = Join-Path $dataDir 'local-config.json'
if (-not (Test-Path -LiteralPath $configPath)) {
  $studentInvite = & node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
  $adminInvite = & node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
  @{ studentInvite = $studentInvite; adminInvite = $adminInvite; adminUsername = 'teacher' } | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding utf8
}
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$env:BOOTSTRAP_INVITE = $config.studentInvite
$env:ADMIN_INVITE = $config.adminInvite
$env:ADMIN_USERNAME = $config.adminUsername
$env:DATABASE_PATH = Join-Path $dataDir 'study.sqlite'
$env:HOST = '127.0.0.1'
$env:PORT = "$Port"
Write-Host "本机开发网址: http://127.0.0.1:$Port"
Write-Host "学生邀请码: $($config.studentInvite)"
Write-Host "维护者账号: $($config.adminUsername)"
Write-Host "维护者单次邀请码: $($config.adminInvite)"
Write-Host '首次注册后请保存恢复码。邀请配置保存在 backend/data/local-config.json。'
& node (Join-Path $backendDir 'server.mjs')
