$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverLog = Join-Path $projectRoot "server.stdout.log"
$serverErr = Join-Path $projectRoot "server.stderr.log"
$tunnelLog = Join-Path $projectRoot "cloudflared.stdout.log"
$tunnelErr = Join-Path $projectRoot "cloudflared.stderr.log"
$publicUrlJson = Join-Path $projectRoot "public-url.json"
$publicUrlTxt = Join-Path $projectRoot "public-url.txt"
$localOriginUrl = "http://127.0.0.1:3000"
$localBrowserUrl = "http://localhost:3000"

function Resolve-Executable([string[]]$candidates, [string]$commandName) {
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  $command = Get-Command $commandName -ErrorAction SilentlyContinue
  if ($command -and $command.Source) {
    return $command.Source
  }

  throw "Could not find executable for $commandName"
}

function Test-Url([string]$url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 3
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Test-LocalServer() {
  return (Test-Url $localOriginUrl) -or (Test-Url $localBrowserUrl)
}

function Read-SharedText([string]$path) {
  if (-not (Test-Path $path)) {
    return ""
  }

  $stream = $null
  $reader = $null
  try {
    $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $reader = New-Object System.IO.StreamReader($stream)
    return $reader.ReadToEnd()
  } catch {
    return ""
  } finally {
    if ($reader) { $reader.Dispose() }
    if ($stream) { $stream.Dispose() }
  }
}

function Stop-ExistingTunnel() {
  $existing = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "cloudflared.exe" -and (
      $_.CommandLine -like "*http://localhost:3000*" -or
      $_.CommandLine -like "*http://127.0.0.1:3000*"
    )
  }

  foreach ($process in $existing) {
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
    } catch {
    }
  }
}

function Open-HostBrowser() {
  try {
    Start-Process $localBrowserUrl | Out-Null
  } catch {
  }
}

function Open-ShareFiles() {
  try {
    if (Test-Path $publicUrlTxt) {
      Start-Process notepad.exe -ArgumentList $publicUrlTxt | Out-Null
    }
  } catch {
  }
}

function Copy-ShareUrl([string]$url) {
  try {
    Set-Clipboard -Value $url
  } catch {
  }
}

$nodeExe = Resolve-Executable @(
  "C:\Program Files\nodejs\node.exe"
) "node"

$cloudflaredExe = Resolve-Executable @(
  "C:\Program Files (x86)\cloudflared\cloudflared.exe",
  "C:\Program Files\cloudflared\cloudflared.exe"
) "cloudflared"

if (-not (Test-LocalServer)) {
  if (Test-Path $serverLog) { Remove-Item $serverLog -Force }
  if (Test-Path $serverErr) { Remove-Item $serverErr -Force }

  Start-Process -FilePath $nodeExe -ArgumentList "server.js" -WorkingDirectory $projectRoot -RedirectStandardOutput $serverLog -RedirectStandardError $serverErr | Out-Null

  $serverReady = $false
  for ($index = 0; $index -lt 20; $index += 1) {
    Start-Sleep -Milliseconds 500
    if (Test-LocalServer) {
      $serverReady = $true
      break
    }
  }

  if (-not $serverReady) {
    throw "The local server did not start on $localBrowserUrl"
  }
}

Stop-ExistingTunnel

if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }
if (Test-Path $tunnelErr) { Remove-Item $tunnelErr -Force }
if (Test-Path $publicUrlJson) { Remove-Item $publicUrlJson -Force }
if (Test-Path $publicUrlTxt) { Remove-Item $publicUrlTxt -Force }

Start-Process -FilePath $cloudflaredExe -ArgumentList @("tunnel", "--url", $localOriginUrl, "--no-autoupdate") -WorkingDirectory $projectRoot -RedirectStandardOutput $tunnelLog -RedirectStandardError $tunnelErr | Out-Null

$publicUrl = $null
for ($index = 0; $index -lt 120; $index += 1) {
  Start-Sleep -Milliseconds 500

  $combined = Read-SharedText $tunnelLog
  $match = [regex]::Match($combined, "https://[-a-z0-9]+\.trycloudflare\.com")
  if ($match.Success) {
    $publicUrl = $match.Value
    break
  }

  $combinedErr = Read-SharedText $tunnelErr
  $matchErr = [regex]::Match($combinedErr, "https://[-a-z0-9]+\.trycloudflare\.com")
  if ($matchErr.Success) {
    $publicUrl = $matchErr.Value
    break
  }
}

if (-not $publicUrl) {
  throw "Cloudflare tunnel started but no public URL was detected. Check cloudflared.stdout.log / cloudflared.stderr.log."
}

@{ url = $publicUrl } | ConvertTo-Json | Set-Content -Path $publicUrlJson -Encoding UTF8
$publicUrl | Set-Content -Path $publicUrlTxt -Encoding UTF8
Copy-ShareUrl $publicUrl
Open-HostBrowser
Open-ShareFiles

Write-Host ""
Write-Host "Host game page:" -ForegroundColor Cyan
Write-Host $localBrowserUrl -ForegroundColor Green
Write-Host ""
Write-Host "Internet match URL:" -ForegroundColor Cyan
Write-Host $publicUrl -ForegroundColor Green
Write-Host ""
Write-Host "How to use:" -ForegroundColor Cyan
Write-Host "1. Your browser opens $localBrowserUrl"
Write-Host "2. public-url.txt opens in Notepad and the URL is copied to the clipboard"
Write-Host "3. The other player opens the public URL above"
Write-Host "4. Host creates the room and shares the room code"
