[CmdletBinding()]
param(
  [string]$ProjectRoot = "D:\1a Cursor Project\My 1x Project",
  [string]$ContentRoot = "D:\1a Cursor Project\My 1x Youtube Channel File",
  [string]$FailureCheckpoint = ""
)

$ErrorActionPreference = "Stop"

if (-not $IsWindows -and $PSVersionTable.PSEdition -eq "Core") {
  throw "This migration supports Windows only"
}

Import-Module (Join-Path $PSScriptRoot "migration\QuizMigration.psm1") -Force

try {
  Invoke-QuizOnlyMigration -ProjectRoot $ProjectRoot -ContentRoot $ContentRoot -FailureCheckpoint $FailureCheckpoint
  exit 0
} catch {
  exit 1
}
