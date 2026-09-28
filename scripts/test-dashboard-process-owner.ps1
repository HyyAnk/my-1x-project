$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'dashboard-process-owner.ps1')
$root = Split-Path -Parent $PSScriptRoot
$cases = @(
  @{ Directory = $root; Expected = $true },
  @{ Directory = "$root\apps\web"; Expected = $true },
  @{ Directory = $root.ToUpperInvariant(); Expected = $true },
  @{ Directory = "$root-other"; Expected = $false },
  @{ Directory = (Split-Path -Parent $root); Expected = $false },
  @{ Directory = ''; Expected = $false }
)
foreach ($case in $cases) {
  $actual = Test-DashboardWorkspaceDirectory $case.Directory $root
  if ($actual -ne $case.Expected) { throw "Unexpected ownership for '$($case.Directory)'" }
}
Push-Location $root
try {
  if (-not (Test-DashboardProcessOwner $PID $root)) { throw 'Current process ownership was not detected' }
  if (Test-DashboardProcessOwner 0 $root) { throw 'Inaccessible process must fail closed' }
} finally { Pop-Location }
Write-Host ("[{0:HH:mm:ss}] [OK] [T:test] [STEP:summary] total=8 | success=8 | failed=0" -f (Get-Date)) -ForegroundColor Green
