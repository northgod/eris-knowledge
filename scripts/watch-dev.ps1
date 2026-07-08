param(
  [int]$IntervalSeconds = 15,
  [string]$ApiHealthUrl = "http://127.0.0.1:4174/api/health",
  [string]$ClientUrl = "http://127.0.0.1:5174/",
  [string]$LogDir = (Join-Path $PSScriptRoot "..\logs"),
  [switch]$Once
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ApiProcess = $null
$ClientProcess = $null

function Write-WatchLog {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$timestamp] $Message"
}

function Test-Endpoint {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Start-DevProcess {
  param(
    [string]$Name,
    [string]$NpmScript
  )

  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  $stdoutPath = Join-Path $LogDir "$Name.out.log"
  $stderrPath = Join-Path $LogDir "$Name.err.log"

  $process = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", $NpmScript) `
    -WorkingDirectory $ProjectRoot `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -WindowStyle Hidden `
    -PassThru

  Write-WatchLog "Started $Name with PID $($process.Id). Logs: $stdoutPath, $stderrPath"
  return $process
}

function Ensure-EndpointProcess {
  param(
    [ref]$ProcessRef,
    [string]$Name,
    [string]$NpmScript,
    [string]$Url
  )

  if (Test-Endpoint -Url $Url) {
    return
  }

  if ($ProcessRef.Value -and -not $ProcessRef.Value.HasExited) {
    Write-WatchLog "$Name endpoint is not responding, but watched PID $($ProcessRef.Value.Id) is still running. Waiting before starting a duplicate."
    return
  }

  Write-WatchLog "$Name endpoint is down. Starting npm run $NpmScript."
  $ProcessRef.Value = Start-DevProcess -Name $Name -NpmScript $NpmScript
}

Write-WatchLog "Watching eris-knowledge dev servers. API: $ApiHealthUrl Client: $ClientUrl"

do {
  Ensure-EndpointProcess -ProcessRef ([ref]$ApiProcess) -Name "api" -NpmScript "dev:server" -Url $ApiHealthUrl
  Ensure-EndpointProcess -ProcessRef ([ref]$ClientProcess) -Name "client" -NpmScript "dev:client" -Url $ClientUrl

  if ($Once) {
    break
  }

  Start-Sleep -Seconds $IntervalSeconds
} while ($true)
