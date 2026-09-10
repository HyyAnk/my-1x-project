# Phase 1 Report: Bank Safety

## Result

PASS. Phase 1 Bank Safety completed against baseline commit cc77992 with preserved working tree edits.

## Reproduction

- **B1 (Link containment in index manager)**:
  - *Fixture setup*: Created an external index file (`bank-external-.../external-index.json`) and an external bank folder (`bank-junction-external-...`). In test 1, `index.json` in the test Bank was replaced with a file symlink to `external-index.json`. In test 2, `bankRoot` was replaced with a junction to `externalBankDir`.
  - *Expected vs observed before repair*: Expected `UNSAFE_PATH` before reading or mutating outside files. Observed that `readQuestionBankIndex` resolved successfully (in test 1: `{ current_total: 0 }`, in test 2: `{ current_total: 999 }`), and `recalculateQuestionBankIndex` attempted reads/writes without containment verification.
  - *Deterministic failure point*: `readQuestionBankIndexUnlocked` and `recalculateQuestionBankIndexUnlocked` lacked `assertSafeBankFilesystemPath` preflight guards on `indexPath` and `prevPath`.

- **B2 (Delete mutation safety with redirected runtime and rollback)**:
  - *Fixture setup*: Created distinct `projectRoot` and `runtimeRoot`. Seeded a stale duplicate batch in `projectRoot` and active batch in `runtimeRoot`. Called `deleteQuestionBankQuestion`. In a second test, injected failure on `index.json` write during delete.
  - *Expected vs observed before repair*: In test 1, expected question deletion in runtime without touching project duplicate. Observed `RepositoryError: Question Bank path escaped its root: .../bank-project-root-...` because project candidates were checked against runtime root containment after mutating runtime files. In test 2, expected batch file to be restored to original preimage upon index write failure. Observed batch was permanently modified and not restored.
  - *Deterministic failure point*: `deleteQuestionBankQuestionUnlocked` iterated unauthorized project candidates during redirected runtime and lacked preimage capture/rollback on index recalculation failure.

- **B3 (Migration manifest & rollback transaction compensation)**:
  - *Fixture setup*: Two batches seeded. In apply test, intercepted manifest write to write and then throw. In rollback test, injected failure on the second batch write.
  - *Expected vs observed before repair*: In apply test, batches were reverted but manifest was left with status `applied` instead of restoring `backed_up` preimage. In rollback test, the first batch was left in rolled-back state rather than being compensated back to its postimage before rollback.
  - *Deterministic failure point*: `applyBankLanguageMigration` and `rollbackBankLanguageMigration` lacked preimage capture and compensation for the manifest and touched batches.

- **B4 (Relative storage path & typed errors)**:
  - *Fixture setup*: Configured `storage.local.json` with relative `storage_path: "./custom-storage"`, and another test with malformed JSON `{ malformed json`.
  - *Expected vs observed before repair*: Observed bare `Error: BANK_ROOT_MISMATCH` because `path.resolve(config.storage_path)` resolved against `process.cwd()` instead of `repository.rootDirectory`. Observed unhandled `SyntaxError` on malformed config instead of typed `BANK_CONFIG_CORRUPT`.
  - *Deterministic failure point*: `resolveCanonicalRoot` resolved relative paths using `process.cwd()` and lacked `RepositoryError` wrapping around `JSON.parse`.

## Implementation

- Modified files:
  - `apps/server/src/repository/quiz/bank/bankPathSafety.ts`: Exported `isInside` for shared containment boundary verification.
  - `apps/server/src/repository/quiz/bank/bankFileTransaction.ts`: Created new module providing `captureFile`, `captureFiles`, `restoreFile`, `restoreFiles`, and `BankFileTransaction` with `BANK_RECOVERY_REQUIRED` error handling when compensation fails.
  - `apps/server/src/repository/quiz/bank/bankIndexManager.ts`: Added safe containment verification using `assertSafeBankFilesystemPath` before reading or recalculating `index.json`, preventing symlink/junction traversals and preserving taxonomy fallback.
  - `apps/server/src/repository/quiz/bank/bankBatchStorage.ts`: Updated catch blocks to rethrow `RepositoryError` (such as `UNSAFE_PATH`) rather than wrapping in `BANK_READ_FAILED`.
  - `apps/server/src/repository/quiz/bank/bankMutationEngine.ts`: Preflighted write sets before mutation; avoided project candidates when runtime is redirected; added preimage capture and compensation rollback in `deleteQuestionBankQuestionUnlocked`.
  - `apps/server/src/repository/quiz/bank/bankMetadataMigration.ts`: Resolved relative `storage_path` against `repository.rootDirectory`; converted bare errors and syntax errors to typed `RepositoryError` (`BANK_CONFIG_MISSING`, `BANK_CONFIG_CORRUPT`, `BANK_ROOT_MISMATCH`, `BANK_DRIFT`, `BANK_BACKUP_INVALID`, `BANK_MIGRATION_STATE`); implemented preimage manifest restoration in `applyBankLanguageMigration` and full batch/manifest compensation in `rollbackBankLanguageMigration` with `recovery_journal.json` logging if compensation fails.
  - `apps/server/test/bankStorageSafety.test.ts`: Added regressions for external index symlink, junction ancestor, redirected runtime duplicate safety, and delete rollback.
  - `apps/server/test/bankMetadataMigration.test.ts`: Added regressions for relative storage path, malformed config JSON, apply manifest write failure compensation, and rollback second batch failure compensation.

## Verification

- Command: `pnpm --filter @studio/server exec vitest run test/bankStorageSafety.test.ts`
  - Date: 2026-09-09
  - Exit code: 0
  - Results: 1 file, 12 tests passed, 0 failures, 0 skips.
- Command: `pnpm --filter @studio/server exec vitest run test/bankMetadataMigration.test.ts`
  - Date: 2026-09-09
  - Exit code: 0
  - Results: 1 file, 17 tests passed, 0 failures, 0 skips.
- Command: `pnpm --filter @studio/server exec vitest run test/bankStorageSafety.test.ts test/bankMetadataMigration.test.ts test/boundTopicConfirmation.test.ts test/productLocalization.test.ts test/shortReelLocalization.test.ts test/shortReelConfirmationRecovery.test.ts test/topicAvailabilityRoute.test.ts`
  - Date: 2026-09-09
  - Exit code: 0
  - Results: 7 files, 82 tests passed, 0 failures, 0 skips.

## Remaining work

None for Phase 1. Handing off to Phase 2 (Source-backed allocation and authoritative validation).

## Safety

- All tests used temporary directories via `mkdtemp` (`bank-storage-safety-*`, `bank-migration-test-*`, etc.).
- No live Question Bank data was modified or migrated.
- No translated questions were written back to Bank.
- All existing dirty edits in the working tree were preserved.
- Direct execution; no subagents spawned.
