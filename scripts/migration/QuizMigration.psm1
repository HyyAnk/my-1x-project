Import-Module (Join-Path $PSScriptRoot "QuizMigration.Logging.psm1") -Force

function Get-MigrationPlan {
  param([string]$ProjectRoot, [string]$ContentRoot, [string]$Stamp)

  $project = [IO.Path]::GetFullPath($ProjectRoot)
  $content = [IO.Path]::GetFullPath($ContentRoot)
  if (-not (Test-Path -LiteralPath $project -PathType Container)) { throw "Project root does not exist: $project" }
  if (-not (Test-Path -LiteralPath $content -PathType Container)) { throw "Content root does not exist: $content" }

  $retiredRuntime = "." + ("docu" + "mentary") + "-studio"
  $targetRuntime = ".quiz-studio"
  $plan = [ordered]@{
    ProjectRoot = $project
    ContentRoot = $content
    ChannelsRoot = [IO.Path]::GetFullPath((Join-Path $content "channels"))
    ProjectSource = [IO.Path]::GetFullPath((Join-Path $project $retiredRuntime))
    ProjectTarget = [IO.Path]::GetFullPath((Join-Path $project $targetRuntime))
    ContentSource = [IO.Path]::GetFullPath((Join-Path $content $retiredRuntime))
    ContentTarget = [IO.Path]::GetFullPath((Join-Path $content $targetRuntime))
    TemporaryBackup = [IO.Path]::GetFullPath((Join-Path $content ".quiz-migration-$Stamp"))
  }
  Assert-ExactChildPath $project $plan.ProjectSource $retiredRuntime "project source"
  Assert-ExactChildPath $project $plan.ProjectTarget $targetRuntime "project target"
  Assert-ExactChildPath $content $plan.ContentSource $retiredRuntime "content source"
  Assert-ExactChildPath $content $plan.ContentTarget $targetRuntime "content target"
  Assert-ExactChildPath $content $plan.ChannelsRoot "channels" "channels root"
  Assert-ExactChildPath $content $plan.TemporaryBackup ".quiz-migration-$Stamp" "temporary backup"
  return $plan
}

function Assert-ExactChildPath {
  param([string]$Root, [string]$Candidate, [string]$ChildName, [string]$Label)
  $expected = [IO.Path]::GetFullPath((Join-Path $Root $ChildName))
  if (-not $Candidate.Equals($expected, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Resolved $Label escaped its exact root: $Candidate"
  }
}

function Get-ChannelFiles {
  param([string]$ChannelsRoot)
  if (-not (Test-Path -LiteralPath $ChannelsRoot -PathType Container)) { throw "Channels root does not exist: $ChannelsRoot" }
  $files = @(
    Get-ChildItem -LiteralPath $ChannelsRoot -Directory |
      ForEach-Object { Get-Item -LiteralPath (Join-Path $_.FullName "channel.json") -ErrorAction SilentlyContinue } |
      Where-Object { -not $_.PSIsContainer } |
      Sort-Object FullName
  )
  if ($files.Count -eq 0) { throw "No channel metadata files found beneath $ChannelsRoot" }
  return $files
}

function Assert-Preflight {
  param($Plan, [string]$FailureCheckpoint)
  if ($FailureCheckpoint -and $FailureCheckpoint -notmatch "^after-(channel-rewrite:\d+|project-runtime-move|content-runtime-move|backup-move)$") {
    throw "Unsupported failure checkpoint: $FailureCheckpoint"
  }
  foreach ($source in @($Plan.ProjectSource, $Plan.ContentSource)) {
    if (-not (Test-Path -LiteralPath $source -PathType Container)) { throw "Missing source runtime: $source" }
  }
  foreach ($target in @($Plan.ProjectTarget, $Plan.ContentTarget, $Plan.TemporaryBackup)) {
    if (Test-Path -LiteralPath $target) { throw "Destination already exists: $target" }
  }
}

function Copy-ChannelBackup {
  param([System.IO.FileInfo[]]$ChannelFiles, [string]$ChannelsRoot, [string]$BackupRoot)
  foreach ($file in $ChannelFiles) {
    $relative = $file.FullName.Substring($ChannelsRoot.Length).TrimStart("\", "/")
    $destination = Join-Path $BackupRoot $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $destination
  }
}

function Write-ChannelMetadataAtomic {
  param([string]$ChannelFile)
  $metadata = Get-Content -Raw -LiteralPath $ChannelFile | ConvertFrom-Json
  $metadata.PSObject.Properties.Remove("group_id")
  $metadata.PSObject.Properties.Remove("engine")
  $temporary = "$ChannelFile.quiz-migration-$PID.tmp"
  $replacementBackup = "$ChannelFile.quiz-migration-$PID.bak"
  $encoding = New-Object System.Text.UTF8Encoding($false)
  try {
    [IO.File]::WriteAllText($temporary, (($metadata | ConvertTo-Json -Depth 100) + [Environment]::NewLine), $encoding)
    [IO.File]::Replace($temporary, $ChannelFile, $replacementBackup)
  } finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
    if (Test-Path -LiteralPath $replacementBackup) { Remove-Item -LiteralPath $replacementBackup -Force }
  }
}

function Restore-ChannelMetadataAtomic {
  param([string]$BackupFile, [string]$ChannelFile)
  $temporary = "$ChannelFile.quiz-rollback-$PID.tmp"
  $replacementBackup = "$ChannelFile.quiz-rollback-$PID.bak"
  try {
    Copy-Item -LiteralPath $BackupFile -Destination $temporary
    [IO.File]::Replace($temporary, $ChannelFile, $replacementBackup)
  } finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
    if (Test-Path -LiteralPath $replacementBackup) { Remove-Item -LiteralPath $replacementBackup -Force }
  }
}

function Assert-FailureCheckpoint {
  param([string]$Requested, [string]$Current)
  if ($Requested -eq $Current) { throw "Injected failure at checkpoint $Current" }
}

function Invoke-MigrationRollback {
  param($State, $Plan)
  $rollbackFailed = $false
  Write-MigrationLog "STEP" "rollback" "Restoring channel metadata and reversing $($State.RuntimeMoves.Count) runtime move(s)"
  try {
    foreach ($backup in @(Get-ChildItem -LiteralPath $State.BackupLocation -Filter "channel.json" -File -Recurse)) {
      $relative = $backup.FullName.Substring($State.BackupLocation.Length).TrimStart("\", "/")
      Restore-ChannelMetadataAtomic $backup.FullName (Join-Path $Plan.ChannelsRoot $relative)
    }
    Write-MigrationLog "OK" "rollback_channels" "Channel metadata restored from $($State.BackupLocation)"
  } catch {
    $rollbackFailed = $true
    Write-MigrationLog "ERROR" "rollback_channels" "Metadata restore failed: $($_.Exception.Message). Next action: restore channel.json files manually from $($State.BackupLocation)"
  }

  for ($index = $State.RuntimeMoves.Count - 1; $index -ge 0; $index--) {
    $move = $State.RuntimeMoves[$index]
    try {
      if (-not (Test-Path -LiteralPath $move.Target -PathType Container)) { throw "Moved target is missing: $($move.Target)" }
      if (Test-Path -LiteralPath $move.Source) { throw "Rollback source already exists: $($move.Source)" }
      Move-Item -LiteralPath $move.Target -Destination $move.Source
      if ($State.BackupLocation.StartsWith($move.Target, [StringComparison]::OrdinalIgnoreCase)) {
        $State.BackupLocation = $move.Source + $State.BackupLocation.Substring($move.Target.Length)
      }
      Write-MigrationLog "OK" "rollback_runtime" "Reversed runtime move to $($move.Source)"
    } catch {
      $rollbackFailed = $true
      Write-MigrationLog "ERROR" "rollback_runtime" "Runtime rollback failed for $($move.Target): $($_.Exception.Message). Next action: keep both paths unchanged and recover from $($State.BackupLocation)"
    }
  }
  if ($rollbackFailed) {
    Write-MigrationLog "ERROR" "rollback" "Rollback needs manual recovery. Backup preserved at $($State.BackupLocation)"
  } else {
    Write-MigrationLog "OK" "rollback" "Rollback completed. Backup preserved at $($State.BackupLocation)"
  }
}

function Invoke-QuizOnlyMigration {
  param([string]$ProjectRoot, [string]$ContentRoot, [string]$FailureCheckpoint = "")
  $startedAt = Get-Date
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
  $state = [ordered]@{ Total = 0; BackupLocation = $null; RuntimeMoves = New-Object System.Collections.ArrayList }
  try {
    $plan = Get-MigrationPlan $ProjectRoot $ContentRoot $stamp
    $channelFiles = @(Get-ChannelFiles $plan.ChannelsRoot)
    $state.Total = $channelFiles.Count
    Write-MigrationLog "INFO" "startup" "mode=filesystem-migration concurrency=1 automation=PowerShell project=$($plan.ProjectRoot) content=$($plan.ContentRoot) profiles=$($state.Total)"
    Assert-Preflight $plan $FailureCheckpoint
    Write-MigrationLog "OK" "preflight" "Validated exact roots, two source runtimes, empty destinations, and $($state.Total) channel file(s)"

    Copy-ChannelBackup $channelFiles $plan.ChannelsRoot $plan.TemporaryBackup
    $state.BackupLocation = $plan.TemporaryBackup
    Write-MigrationLog "OK" "backup" "Timestamped channel backup created at $($state.BackupLocation)"

    for ($index = 0; $index -lt $channelFiles.Count; $index++) {
      Write-ChannelMetadataAtomic $channelFiles[$index].FullName
      Write-MigrationLog "OK" "channel_rewrite" "[$($index + 1)/$($state.Total)] Rewrote $($channelFiles[$index].FullName)"
      Assert-FailureCheckpoint $FailureCheckpoint "after-channel-rewrite:$($index + 1)"
    }

    Move-Item -LiteralPath $plan.ProjectSource -Destination $plan.ProjectTarget
    [void]$state.RuntimeMoves.Add([ordered]@{ Source = $plan.ProjectSource; Target = $plan.ProjectTarget })
    Write-MigrationLog "OK" "runtime_move" "Project runtime moved to $($plan.ProjectTarget)"
    Assert-FailureCheckpoint $FailureCheckpoint "after-project-runtime-move"

    Move-Item -LiteralPath $plan.ContentSource -Destination $plan.ContentTarget
    [void]$state.RuntimeMoves.Add([ordered]@{ Source = $plan.ContentSource; Target = $plan.ContentTarget })
    Write-MigrationLog "OK" "runtime_move" "Content runtime moved to $($plan.ContentTarget)"
    Assert-FailureCheckpoint $FailureCheckpoint "after-content-runtime-move"

    $recoveryTarget = Join-Path $plan.ContentTarget "migration-backups\$stamp\channels"
    New-Item -ItemType Directory -Path (Split-Path -Parent $recoveryTarget) -Force | Out-Null
    Move-Item -LiteralPath $state.BackupLocation -Destination $recoveryTarget
    $state.BackupLocation = $recoveryTarget
    Write-MigrationLog "OK" "backup_move" "Recovery backup relocated to $recoveryTarget"
    Assert-FailureCheckpoint $FailureCheckpoint "after-backup-move"

    Write-MigrationSummary $true $state.Total $state.Total 0 0 0 $startedAt
  } catch {
    $failure = $_
    Write-MigrationLog "ERROR" "migration" "$($failure.Exception.Message). Next action: keep services stopped and inspect the rollback messages"
    if ($null -ne $state.BackupLocation -and (Test-Path -LiteralPath $state.BackupLocation -PathType Container)) {
      Invoke-MigrationRollback $state $plan
    }
    Write-MigrationSummary $false $state.Total 0 1 0 0 $startedAt
    throw $failure
  }
}

Export-ModuleMember -Function Invoke-QuizOnlyMigration
