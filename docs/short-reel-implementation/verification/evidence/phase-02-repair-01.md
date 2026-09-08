# Stage A Repair Implementation Evidence: Source Persistence and Writer Safety

## Identity And Scope

- **Date:** 2026-09-07
- **Agent:** antigravity-p02-repair
- **Repository:** D:/1a Cursor Project/My 1x Project
- **Base Revision / HEAD:** 42d2ecd79c2a3e1955499764661d05446a3baf46
- **Claim ID:** claim-antigravityp02repair-mtqymdzg
- **Task:** Short-Reel Stage A repair: source persistence and writer safety
- **Working Mode:** main-direct (no git branches or worktrees)
- **Repair Plan:** docs/superpowers/plans/2026-09-07-short-reel-phase-02-03-repair.md (Stage A only)

## Findings Resolved

- **F03-08 (Inherited Contract and Storage Safety Gaps):**
  - **Issue:** Legacy atomic rename fell back to `copyFile + unlink` upon exhausted Windows file-lock retries, potentially corrupting existing records; cross-process concurrency lacked admitted locking; script cue drift was not validated at the repository persistence boundary; source snapshot did not retain the full verbatim bank question.
  - **Resolution:** Implemented `shortReelAtomicWriter.ts` with strict NO-COPY behavior on rename retry exhaustion, fail-closed single-writer admission per canonical storage root via built-in OS-held SQLite exclusive locks (`.short_reel_writer.lock`), persistence-boundary script cue validation via `validateReelScript`, and extracted cohesive `shortReelSource.schema.ts` / `shortReelSource.ts` preserving full `original_question: BankQuestionSchema` with zero mutable references.
- **Source Foundation for F03-02 and F03-03:**
  - Implemented `createEnglishSourceSnapshot` and `createSourceSnapshot` requiring approved status, supported archetype (`versus_faceoff` | `deep_trivia`), explicit English language or complete verified English translation, rejecting duplicate translated choice IDs and unverified translations, and computing a deterministic content hash invariant under key reordering.

## Files Owned And Changed

The following planned files were owned and created/modified under active claim `claim-antigravityp02repair-mtqymdzg`:

- `packages/shared/src/shortReel/shortReelSource.schema.ts` (NEW)
- `packages/shared/src/shortReel/shortReelSource.ts` (NEW)
- `packages/shared/src/shortReel/shortReel.schema.ts`
- `packages/shared/src/shortReel/shortReel.types.ts`
- `packages/shared/src/shortReel/index.ts`
- `packages/shared/test/shortReelSource.test.ts` (NEW)
- `packages/shared/test/shortReel.test.ts`
- `apps/server/src/repository/shortReelAtomicWriter.ts` (NEW)
- `apps/server/src/repository/shortReelStorage.ts`
- `apps/server/src/repository/shortReels.ts`
- `apps/server/src/repository/service.ts`
- `apps/server/src/repository/runtime.ts`
- `apps/server/test/shortReelAtomicWriter.test.ts` (NEW)
- `apps/server/test/shortReelWriterSafety.test.ts` (NEW)
- `apps/server/test/shortReelSourcePersistence.test.ts` (NEW)
- `apps/server/test/shortReelRepository.test.ts`
- `docs/short-reel-implementation/contracts.md`
- `docs/short-reel-implementation/decisions.md`
- `docs/short-reel-implementation/file-map.md`
- `docs/short-reel-implementation/progress.md`
- `docs/short-reel-implementation/verification/evidence/phase-02-repair-01.md` (NEW)
- `docs/agent-coordination/handoffs/short-reel-phase-02-repair-01.md` (NEW)

Pre-existing dirty files outside claimed scope were strictly untouched.

## Implementation Details

1. **Source Boundary Extraction (`@studio/shared`):**
   - Extracted `shortReelSource.schema.ts` and `shortReelSource.ts` from the oversized `shortReel.schema.ts`.
   - `ShortReelSourceSnapshotSchema` embeds `original_question: BankQuestionSchema` verbatim, deep-cloned via `structuredClone` to prevent mutable reference leaks.
   - Deterministic JSON serializer `canonicalJsonStringify` recursively sorts object keys; `computeSourceContentHash` hashes the deterministic JSON representation excluding `content_hash`.
   - `createEnglishSourceSnapshot` validates question status is approved, archetype is supported, and English baseline is satisfied (source language is English or complete verified translation is present, rejecting duplicate choices).

2. **Fail-Closed Single-Writer Admission (`apps/server`):**
   - In `shortReelAtomicWriter.ts`, `acquireWriterAdmission(storageRoot)` acquires an exclusive SQLite lock on `.short_reel_writer.lock` in the canonical storage root via `node:sqlite` `DatabaseSync` (`PRAGMA locking_mode = EXCLUSIVE; BEGIN EXCLUSIVE;`).
   - `resolveCanonicalStorageRoot` resolves real paths via `fs.realpathSync.native` / `path.resolve`, ensuring alias paths (e.g. `path/to/dir/..`) contend on the same lock.
   - Any contending process attempting to acquire admission or mutate reels on the same canonical root is rejected with `STORAGE_BUSY`.
   - On process termination or crash (`SIGKILL`), the OS kernel immediately closes the file descriptor, releasing the lock without requiring timeout-based lease expiration.
   - `releaseWriterAdmission(storageRoot)` and `process.on("exit")` provide clean lock release.

3. **Strict No-Copy Atomic JSON Writer (`apps/server`):**
   - `writeShortReelJsonAtomic(targetPath, record)` writes to a unique temporary file (`.tmp`), flushes to disk via `handle.sync()`, closes the file, and renames.
   - Bounded retries (up to 5 retries with backoff) handle transient Windows file locks.
   - Upon retry exhaustion or failure, the temporary file is unlinked and the error is propagated. `copyFile` is NEVER called, leaving existing destination bytes completely untouched.

4. **Persistence Boundary Validation & Durable Replay Protection (`apps/server`):**
   - `updateShortReel` validates `update_script` and `update_segment` against `updated.source` using `validateReelScript`. Cue mismatches (question text or answer text) throw typed `INVALID_SCRIPT` errors without altering disk bytes or incrementing revision.
   - On `replace_source_question`, prior script payloads in `units.script.last_accepted_payload` are retained as historical work, setting `units.script.state = "stale"` and `script = null`. The record remains valid on disk and in schemas.
   - Bounded `mutation_history` array (up to 50 entries) persisted in `ShortReelRecord` provides durable replay protection across process restarts: identical replays return the current record; reused request IDs with altered payloads throw `REQUEST_CONFLICT`.

## Verification Commands and Results

| Command | Status | Result Summary |
| --- | --- | --- |
| `pnpm --filter @studio/shared build` | Exit 0 | Clean TypeScript build of `@studio/shared` |
| `pnpm --filter @studio/shared test` | Exit 0 | 30 tests passed (existing layout policies) |
| `node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts` | Exit 0 | 21 tests passed (13 schema tests + 8 source boundary tests) |
| `pnpm --filter @studio/server test -- test/shortReelRepository.test.ts test/shortReelAtomicWriter.test.ts test/shortReelWriterSafety.test.ts test/shortReelSourcePersistence.test.ts` | Exit 0 | 20 tests passed across 4 behavioral test suites |
| `pnpm typecheck` | Exit 0 | Clean workspace typecheck across shared, server, web |
| `node scripts/agent-validate-zones.mjs --json` | Exit 0 | `{"valid": true, "unmappedFiles": [], "overlappingFiles": []}` |
| `git diff --check` | Exit 0 | Zero whitespace errors or conflict markers |

## Next Stage Dependency

Stage A is complete and ready for independent review. Per the repair plan constraints:
- The executor must NOT self-accept Stage A.
- Stage B (resolving F03-01 through F03-07, F03-09, F03-10) is ineligible until Stage A has been independently reviewed and accepted.
- Phase 04 remains ineligible.
