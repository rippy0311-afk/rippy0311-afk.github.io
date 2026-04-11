$ErrorActionPreference = "SilentlyContinue"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$publicUrlJson = Join-Path $projectRoot "public-url.json"
$publicUrlTxt = Join-Path $projectRoot "public-url.txt"

Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "cloudflared.exe" -and (
    $_.CommandLine -like "*http://localhost:3000*" -or
    $_.CommandLine -like "*http://127.0.0.1:3000*"
  )
} | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force
}

if (Test-Path $publicUrlJson) {
  Remove-Item $publicUrlJson -Force
}

if (Test-Path $publicUrlTxt) {
  Remove-Item $publicUrlTxt -Force
}

Write-Host "Stopped the internet-share tunnel." -ForegroundColor Yellow
