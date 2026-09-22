[CmdletBinding()]
param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$ContentRoot = "",
  [string]$FailureCheckpoint = ""
)

$ErrorActionPreference = "Stop"

if (-not $IsWindows -and $PSVersionTable.PSEdition -eq "Core") {
  throw "This migration supports Windows only"
}

if ([string]::IsNullOrWhiteSpace($ContentRoot)) {
  $storageConfigFile = Join-Path $ProjectRoot ".quiz-studio\storage.local.json"
  if ($env:STUDIO_STORAGE_PATH -and (Test-Path -LiteralPath $env:STUDIO_STORAGE_PATH)) {
    $ContentRoot = $env:STUDIO_STORAGE_PATH
  } elseif (Test-Path -LiteralPath $storageConfigFile) {
    try {
      $storageJson = Get-Content -LiteralPath $storageConfigFile -Raw | ConvertFrom-Json
      if ($storageJson.storage_path -and (Test-Path -LiteralPath $storageJson.storage_path)) {
        $ContentRoot = $storageJson.storage_path
      }
    } catch { }
  }
}

if ([string]::IsNullOrWhiteSpace($ContentRoot)) {
  throw "ContentRoot was not provided and could not be resolved from .quiz-studio\storage.local.json or STUDIO_STORAGE_PATH"
}

Import-Module (Join-Path $PSScriptRoot "migration\QuizMigration.psm1") -Force

try {
  Invoke-QuizOnlyMigration -ProjectRoot $ProjectRoot -ContentRoot $ContentRoot -FailureCheckpoint $FailureCheckpoint
  exit 0
} catch {
  exit 1
}
