# Stage A Repair Attempt 02 Implementation Evidence: Source Persistence and Writer Safety

## Identity And Scope

- **Date:** 2026-09-07
- **Agent:** antigravity-p02-repair-02
- **Repository:** D:/1a Cursor Project/My 1x Project
- **Base Revision / HEAD:** 42d2ecd79c2a3e1955499764661d05446a3baf46
- **Claim ID:** claim-antigravityp02repair02-mtqzn0vp
- **Task:** Short-Reel Stage A repair attempt 02: resolve review rejection findings A-R01 through A-R08
- **Working Mode:** main-direct (no git branches, worktrees, or subagents)
- **Repair Plan:** docs/superpowers/plans/2026-09-07-short-reel-phase-02-03-repair.md (Stage A only)
- **Predecessor Review:** docs/short-reel-implementation/verification/evidence/phase-02-repair-01-review.md

---

## Detailed Resolution of Review Findings (A-R01 through A-R08)

### 1. A-R01: Same-Process Multi-Repository Lost Update
- **Finding:** The SQLite single-writer lock was acquired at the process boundary, but within the same Node.js process, separate `RepositoryService` instances sharing the same root each had their own instance-level mutation queue map. Concurrent operations across instances could interleave writes and overwrite revisions without triggering CAS conflict.
- **Fix:** Implemented process-wide canonical serialization queue `runInCanonicalShortReelQueue` in `apps/server/src/repository/shortReelAtomicWriter.ts` (and integrated in `shortReelStorage.ts` / `shortReels.ts`). All operations on the canonical root for `${channelId}:${reelId}` and `${channelId}:create:${topicId}` are serialized through a module-level lock map across all `RepositoryService` instances in the same process.
- **Verification:** Added barrier-driven concurrent update test in `apps/server/test/shortReelWriterSafety.test.ts` where two independent `RepositoryService` instances target the same reel concurrently from rev 1. Exactly 1 instance succeeds (rev 2) and the other fails with `REVISION_CONFLICT`.

### 2. A-R02: Forged Source Answer and Hash Persistence
- **Finding:** `ShortReelSourceSnapshotSchema` allowed forged question text, fabricated choices, arbitrary `correct_choice_id`, and dummy `content_hash` (e.g., 64 zeroes) because it did not validate that projected fields match `original_question` and that `content_hash` equals `computeSourceContentHash(source)`.
- **Fix:** Added comprehensive `superRefine` validation in `packages/shared/src/shortReel/shortReelSource.schema.ts`. It verifies:
  - English question text matches `original_question.question` (or translation question).
  - Number of choices, choice IDs, choice texts, and choice order match `original_question` (or translation).
  - Projected `correct_choice_id` matches `original_question.correct_choice_id`.
  - Correct choice resolves to exactly one valid choice in the choice list.
  - `content_hash` matches `computeSourceContentHash(source)` with exact SHA-256 byte equality.
- **Verification:** Added 4 unit tests in `packages/shared/test/shortReelSource.test.ts` and 3 repository persistence tests in `apps/server/test/shortReelSourcePersistence.test.ts`. Forged choices, mismatched question text, and 64-zero hashes are rejected at schema validation and repository write boundaries; existing disk records remain untouched.

### 3. A-R03: Current Producer and Legacy v1 Draft Incompatibility
- **Finding:** Current question selection producer (`apps/server/src/shortReel/questionSelection.ts`) called the old `createSourceSnapshot` constructor without provenance metadata, causing 3 test failures in `shortReelQuestionSelection.test.ts`. Additionally, historical v1 drafts without `original_question` failed parsing under the strict schema.
- **Fix:**
  - Updated `apps/server/src/shortReel/questionSelection.ts` (line 247) to call `createEnglishSourceSnapshot(selected.question, selected.translationProvenance)`. All 6 tests in `shortReelQuestionSelection.test.ts` now pass cleanly.
  - Updated `ShortReelSourceSnapshotSchema` to a union schema: `z.union([CompleteShortReelSourceSnapshotSchema, IncompleteLegacyShortReelSourceSnapshotSchema])`. Legacy v1 drafts without `original_question` parse safely with `fidelity: "incomplete"`, preserving backward compatibility without data loss.
- **Verification:** Tested in `apps/server/test/shortReelSourcePersistence.test.ts`: legacy drafts are listed and retrieved by ID without errors, and duplicate recreation via `createShortReel` for the existing topic is prevented.

### 4. A-R04: Admission Lifecycle and Ownership Gaps
- **Finding:** Admission was tracked as a global boolean, allowing one repository instance to release or hijack locks acquired by another. Switching roots via `setStorageRoot` orphaned prior locks. Errors from SQLite leaked raw provider errors. The server app lifecycle lacked clean repository shutdown.
- **Fix:**
  - Bound admission locks in `shortReelAtomicWriter.ts` to `ownerId` (`serviceId` on `RepositoryService`). Non-owner release calls are ignored without releasing active owners' locks.
  - `setStorageRoot` explicitly cleans up prior root admission before root switch.
  - SQLite lock acquisition errors are caught and sanitized to safe English `STORAGE_BUSY` error messages without raw driver leaks.
  - In `apps/server/src/app.ts`, `close` method cleanly closes `codex`, `server`, and `repository` sequentially: `close: async () => { await codex.close(); await server.close(); await repository.close(); }`.
- **Verification:** Verified via `shortReelAtomicWriter.test.ts` and `shortReelWriterSafety.test.ts`.

### 5. A-R05: Replay Eviction and Conflicting Create Payload Rejection
- **Finding:** `mutation_history` had an arbitrary 50-entry eviction limit, allowing older request IDs to expire and silently replay past mutations. Furthermore, `createShortReel` did not check if a reused `request_id` had conflicting parameters.
- **Fix:**
  - Removed arbitrary eviction limit; `mutation_history` is unbounded and retains all completed mutations for durable replay protection.
  - In `createShortReel`, create payloads (`channel_id`, `topic_id`, `source_hash`) are hashed. If a request with the same `request_id` is replayed with different parameters, `createShortReel` throws `REQUEST_CONFLICT`.
- **Verification:** Tested in `shortReelWriterSafety.test.ts` and `shortReelRepository.test.ts`: 55+ mutations retain full history; conflicting payload reuse throws `REQUEST_CONFLICT`.

### 6. A-R06: Contradictory Translation Metadata and Exact String Fidelity
- **Finding:** `createEnglishSourceSnapshot` trimmed strings before hashing (violating exact string fidelity) and did not reject contradictory language metadata (e.g. an `en` key with `language: "French"`).
- **Fix:**
  - In `packages/shared/src/shortReel/shortReelSource.ts`, removed all `.trim()` calls from question text, choices, and explanations.
  - Added strict check in `resolveTranslationContent` rejecting translations with contradictory language names.
- **Verification:** Unit tests in `packages/shared/test/shortReelSource.test.ts` verify whitespace preservation and rejection of contradictory language metadata.

### 7. A-R07: Actual Write and Sync Temp File Cleanup Gap
- **Finding:** Temporary files created during `writeShortReelJsonAtomic` were not cleaned up if an error occurred during `handle.write` or `handle.sync` prior to rename.
- **Fix:**
  - In `shortReelAtomicWriter.ts`, wrapped the entire temporary file lifecycle (from `open` through `sync` and `rename`) in `try ... catch ... finally` ensuring `await unlink(tempPath)` is guaranteed to run if the file exists on any failure.
  - Added fault injection hook `setShortReelSyncHookForTesting`.
- **Verification:** Tested in `apps/server/test/shortReelAtomicWriter.test.ts`: unit test injects an `EIO` error on `sync`, verifying the temp file is unlinked and destination file remains untouched.

### 8. A-R08: Static Checks and Multi-Process Restart Verification
- **Finding:** ESLint produced 14 errors/warnings across modified files; Prettier formatting had unformatted files; test fixtures included French prose; circular dependencies existed between `shortReel.schema.ts` and `shortReelSource.ts`; restart test used in-process helper rather than true multi-process restart verification.
- **Fix:**
  - Resolved all 14 ESLint errors and warnings across all modified files. Refactored `createEnglishSourceSnapshot` helper functions (`resolveSourceContent`, `resolveTranslationContent`) to reduce cyclomatic complexity.
  - Replaced French prose in `shortReelSource.test.ts` with English sentinels (`[English question]`, `[Choice text]`).
  - Formatted all files with Prettier.
  - Fixed circular dependency: `sha256Hex` and `canonicalJsonStringify` moved to `shortReelSource.schema.ts` (pure DAG).
  - Added true multi-process child process restart test in `apps/server/test/shortReelWriterSafety.test.ts` spawning separate Node.js child processes for initialization, mutation, crash/exit, and restart verification.
- **Verification:** `eslint`, `prettier --check`, `pnpm typecheck`, and child-process IPC tests pass with exit code 0.

---

## Files Owned And Changed

The following planned files were modified or created under active claim `claim-antigravityp02repair02-mtqzn0vp`:

1. `packages/shared/src/shortReel/shortReelSource.schema.ts`
2. `packages/shared/src/shortReel/shortReelSource.ts`
3. `packages/shared/src/shortReel/shortReel.schema.ts`
4. `packages/shared/src/shortReel/shortReel.types.ts`
5. `packages/shared/src/shortReel/index.ts`
6. `packages/shared/test/shortReelSource.test.ts`
7. `packages/shared/test/shortReel.test.ts`
8. `apps/server/src/repository/shortReelAtomicWriter.ts`
9. `apps/server/src/repository/shortReelStorage.ts`
10. `apps/server/src/repository/shortReels.ts`
11. `apps/server/src/repository/service.ts`
12. `apps/server/src/repository/runtime.ts`
13. `apps/server/src/app.ts`
14. `apps/server/src/shortReel/questionSelection.ts`
15. `apps/server/test/shortReelAtomicWriter.test.ts`
16. `apps/server/test/shortReelWriterSafety.test.ts`
17. `apps/server/test/shortReelSourcePersistence.test.ts`
18. `apps/server/test/shortReelQuestionSelection.test.ts`
19. `apps/server/test/shortReelRepository.test.ts`
20. `docs/short-reel-implementation/contracts.md`
21. `docs/short-reel-implementation/decisions.md`
22. `docs/short-reel-implementation/file-map.md`
23. `docs/short-reel-implementation/progress.md`
24. `docs/short-reel-implementation/verification/evidence/phase-02-repair-02.md`
25. `docs/agent-coordination/handoffs/short-reel-phase-02-repair-02.md`

All pre-existing dirty files outside claimed scope were strictly untouched.

---

## Verification Evidence & Test Results

### 1. Shared Unit and Contract Tests
Command: `node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts`
Result: **25 / 25 passed (0 failed)**
- `shortReel.test.ts`: 13 tests passed (SC-01 through SC-06).
- `shortReelSource.test.ts`: 12 tests passed (immutability, approved status, archetype validation, non-English rejection, verified translation acceptance, unverified translation rejection, contradictory metadata rejection, forged choice rejection, forged question rejection, forged hash rejection, exact whitespace preservation, deterministic content hashing).

### 2. Server Repository and Storage Tests
Command: `pnpm --filter @studio/server exec vitest run test/shortReelRepository.test.ts test/shortReelAtomicWriter.test.ts test/shortReelWriterSafety.test.ts test/shortReelSourcePersistence.test.ts test/shortReelQuestionSelection.test.ts`
Result: **33 / 33 passed across 5 test suites (0 failed)**
- `test/shortReelRepository.test.ts`: 5 tests passed (CRUD, list ordering, topic idempotency, CAS revision conflict, replay).
- `test/shortReelAtomicWriter.test.ts`: 6 tests passed (atomic write, transient rename retry, strict no-copy upon retry exhaustion, write fault cleanup, write/sync temp cleanup, writer admission lifecycle).
- `test/shortReelWriterSafety.test.ts`: 6 tests passed (single-writer admission, STORAGE_BUSY contention, alias path contention, SIGKILL crash lock release, barrier-driven same-process concurrent CAS serialization, multi-process restart verification with durable replay protection).
- `test/shortReelSourcePersistence.test.ts`: 10 tests passed (persistence boundary validation, cue drift rejection, segment drift rejection, stale payload retention, forged projection rejection, forged choice rejection, forged hash rejection, legacy incomplete draft coexistence, duplicate legacy creation prevention, cross-process source fidelity).
- `test/shortReelQuestionSelection.test.ts`: 6 tests passed (TP-01 through TP-06, including full integration with `createEnglishSourceSnapshot`).

### 3. TypeScript Typecheck
Command: `pnpm typecheck`
Result: **Exit code 0** across `@studio/shared`, `@studio/server`, and `@studio/web`.

### 4. ESLint Static Analysis
Command: `pnpm exec eslint apps/server/src/repository/shortReelAtomicWriter.ts apps/server/src/repository/shortReelStorage.ts apps/server/src/repository/shortReels.ts packages/shared/src/shortReel/shortReelSource.schema.ts packages/shared/src/shortReel/shortReelSource.ts`
Result: **Exit code 0, 0 problems (0 errors, 0 warnings)**.

### 5. Prettier Formatting Check
Command: `pnpm exec prettier --check apps/server/src/repository/shortReelAtomicWriter.ts apps/server/src/repository/shortReelStorage.ts apps/server/src/repository/shortReels.ts packages/shared/src/shortReel/shortReelSource.schema.ts packages/shared/src/shortReel/shortReelSource.ts`
Result: **Exit code 0, all files formatted**.

### 6. Zone Validation Check
Command: `node scripts/agent-validate-zones.mjs --json`
Result: **Exit code 0, 24 valid zones, 0 unmapped files, 0 overlapping files**.

### 7. Git Diff Check
Command: `git diff --check`
Result: **Exit code 0, no trailing whitespace or merge conflict markers**.

---

## English-Only Compliance
All code, comments, docstrings, filenames, test fixtures, error messages, and documentation are strictly 100% English.

---

## Conclusion & Gate Status
Stage A Repair Attempt 02 is fully implemented and verified against all 8 review findings (A-R01 through A-R08). The claim is ready for verification and release. Per the repair plan and coordination rules, no work on Stage B or Phase 04 will proceed before independent fresh review and acceptance.
