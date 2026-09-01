$script:MigrationWorker = "main"
$script:MigrationProfile = "quiz-cutover"

function Write-MigrationLog {
  param(
    [ValidateSet("INFO", "STEP", "OK", "WARN", "ERROR", "DEBUG")]
    [string]$Level,
    [string]$Step,
    [string]$Message
  )

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
  $color = switch ($Level) {
    "OK" { "Green" }
    "WARN" { "Yellow" }
    "ERROR" { "Red" }
    "STEP" { "Blue" }
    "DEBUG" { "DarkGray" }
    default { "Cyan" }
  }
  $line = "[$timestamp] [$Level] [T:$script:MigrationWorker] [P:$script:MigrationProfile] [STEP:$Step] $Message"
  if ([Console]::IsOutputRedirected) {
    Write-Host $line
  } else {
    Write-Host $line -ForegroundColor $color
  }
}

function Write-MigrationSummary {
  param(
    [bool]$Succeeded,
    [int]$Total,
    [int]$Success,
    [int]$Failed,
    [int]$Skipped,
    [int]$Retries,
    [datetime]$StartedAt
  )

  $elapsed = ((Get-Date) - $StartedAt).ToString("c")
  $level = if ($Succeeded) { "OK" } else { "ERROR" }
  Write-MigrationLog $level "summary" "total=$Total success=$Success failed=$Failed skipped=$Skipped retries=$Retries elapsed=$elapsed"
}

Export-ModuleMember -Function Write-MigrationLog, Write-MigrationSummary
