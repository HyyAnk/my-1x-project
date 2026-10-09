param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [int]$DelayMilliseconds = 0,
  [switch]$DashboardOnly
)

$ErrorActionPreference = "SilentlyContinue"
$worker = "stop-dashboard"
$ports = if ($DashboardOnly) { @(4310, 7743) } else { @(4310, 7743, 2233, 8890) }
$resolvedRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path.TrimEnd("\").ToLowerInvariant()
$startedAt = Get-Date
$stopped = 0
$failed = 0
. (Join-Path $PSScriptRoot "dashboard-process-owner.ps1")

function Write-Log {
  param(
    [string]$Level,
    [string]$Step,
    [string]$Message,
    [ConsoleColor]$Color = [ConsoleColor]::Cyan
  )

  $timestamp = (Get-Date).ToString("HH:mm:ss")
  Write-Host ("[{0}] [{1}] [T:{2}] [STEP:{3}] {4}" -f $timestamp, $Level, $worker, $Step, $Message) -ForegroundColor $Color
}

$shutdownMode = if ($DashboardOnly) { "dashboard-only" } else { "all-local-services" }
Write-Log "INFO" "startup" ("root={0} | ports={1} | mode={2} | automation=process" -f $resolvedRoot, ($ports -join ","), $shutdownMode)
if ($DelayMilliseconds -gt 0) {
  Write-Log "STEP" "delay" ("Waiting {0}ms for the shutdown response to finish" -f $DelayMilliseconds) ([ConsoleColor]::Blue)
  Start-Sleep -Milliseconds $DelayMilliseconds
}

foreach ($port in $ports) {
  Write-Log "STEP" "inspect" ("Checking local service on port {0}" -f $port) ([ConsoleColor]::Blue)
  $connections = @(Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
  $processIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)

  if ($processIds.Count -eq 0) {
    Write-Log "INFO" "inspect" ("No service found on port {0}" -f $port)
    continue
  }

  foreach ($processId in $processIds) {
    $process = Get-Process -Id $processId
    if ($null -eq $process) {
      Write-Log "WARN" "stop" ("Process {0} disappeared before it could be stopped" -f $processId) ([ConsoleColor]::Yellow)
      continue
    }

    if (-not (Test-DashboardProcessOwner -ProcessId $processId -ProjectRoot $resolvedRoot)) {
      $failed++
      Write-Log "ERROR" "guard" ("Refusing to stop PID {0} on port {1}: it is not running from this workspace" -f $processId, $port) ([ConsoleColor]::Red)
      continue
    }

    Write-Log "STEP" "stop" ("Stopping {0} (PID {1}) for port {2}" -f $process.ProcessName, $processId, $port) ([ConsoleColor]::Blue)
    & taskkill.exe /PID $processId /T /F >$null 2>&1
    if ($LASTEXITCODE -ne 0) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    
    $terminated = $false
    for ($i = 0; $i -lt 10; $i++) {
      if (-not (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
        $terminated = $true
        break
      }
      Start-Sleep -Milliseconds 200
    }

    if (-not $terminated) {
      $failed++
      Write-Log "ERROR" "stop" ("Could not stop PID {0}; close the local service manually if it remains" -f $processId) ([ConsoleColor]::Red)
    } else {
      $stopped++
      Write-Log "OK" "stop" ("Stopped PID {0} on port {1}" -f $processId, $port) ([ConsoleColor]::Green)
    }
  }
}

# The launcher uses a dedicated window title. Closing that process tree prevents
# pnpm/concurrently watchers from restarting a service after its listener exits.
$launcher = @(Get-Process -Name cmd | Where-Object { $_.MainWindowTitle -eq "AI Quiz Studio" })
foreach ($process in $launcher) {
  if (-not (Test-DashboardProcessOwner -ProcessId $process.Id -ProjectRoot $resolvedRoot)) {
    Write-Log "WARN" "guard" ("Skipping launcher PID {0}: workspace ownership could not be verified" -f $process.Id) ([ConsoleColor]::Yellow)
    continue
  }
  Write-Log "STEP" "launcher" ("Stopping launcher process tree PID {0}" -f $process.Id) ([ConsoleColor]::Blue)
  & taskkill.exe /PID $process.Id /T /F >$null 2>&1
  if ($LASTEXITCODE -eq 0) {
    $stopped++
    Write-Log "OK" "launcher" ("Launcher process tree {0} stopped" -f $process.Id) ([ConsoleColor]::Green)
  } else {
    $failed++
    Write-Log "WARN" "launcher" ("Launcher process tree {0} was already closed or could not be found" -f $process.Id) ([ConsoleColor]::Yellow)
  }
}

# Stop any orphaned or lingering headless browser instances (Chrome, Edge, Chromium)
Write-Log "STEP" "browser" "Checking for lingering headless browser instances" ([ConsoleColor]::Blue)
$headlessProcesses = @(
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    ($_.Name -match '^(chrome|msedge|chromium|chrome-headless-shell)\.exe$') -and
    ($_.CommandLine -match '--headless|chrome-headless-shell') -and
    ($_.CommandLine -match 'remote-debugging|user-data-dir|begin-frame|deterministic-mode|puppeteer')
  }
)

if ($headlessProcesses.Count -gt 0) {
  foreach ($browserProc in $headlessProcesses) {
    Write-Log "STEP" "browser" ("Stopping headless browser PID {0} ({1})" -f $browserProc.ProcessId, $browserProc.Name) ([ConsoleColor]::Blue)
    & taskkill.exe /PID $browserProc.ProcessId /T /F >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
      $stopped++
      Write-Log "OK" "browser" ("Stopped headless browser PID {0}" -f $browserProc.ProcessId) ([ConsoleColor]::Green)
    } else {
      Stop-Process -Id $browserProc.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }
} else {
  Write-Log "INFO" "browser" "No lingering headless browser instances found"
}

$elapsed = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
if ($failed -gt 0) {
  Write-Log "ERROR" "summary" ("total={0} | stopped={1} | failed={2} | elapsed={3}s" -f $ports.Count, $stopped, $failed, $elapsed) ([ConsoleColor]::Red)
  exit 1
}

Write-Log "OK" "summary" ("total={0} | stopped={1} | failed=0 | data=untouched | elapsed={2}s" -f $ports.Count, $stopped, $elapsed) ([ConsoleColor]::Green)
exit 0
