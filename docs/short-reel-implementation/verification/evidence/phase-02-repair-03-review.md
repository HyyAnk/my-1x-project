# Stage A Repair 03 Independent Review

## Review Identity

- **Target:** Stage A Repair 03 (Phase 02 / 03 boundary repair: source persistence, complete source gating, and writer draining safety)
- **Date:** 2026-09-07
- **Reviewer:** Antigravity (independent fresh review, independent from implementer `codex-stage-a-final-repair`)
- **HEAD:** `42d2ecd79c2a3e1955499764661d05446a3baf46`, main-direct
- **Baseline fingerprint:** `e6481b8e567b8d7034128a1af5f54e89dc1abef7cdfbe5fe04c053818d41037b`
- **Predecessor implementation claim:** `claim-codexstageafinalrepair-mtr1d2x4`, released at `2026-09-07T09:40:27.726Z`
- **Review documentation claim:** `claim-antigravityp02reviewer03-mtr2728s`
- **References:**
  - [Repair 03 Evidence](phase-02-repair-03.md)
  - [Repair 03 Self-Review](phase-02-repair-03-self-review.md)
  - [Repair 02 Recheck](phase-02-repair-02-recheck-codex.md)
  - [Repair Plan](../../../superpowers/plans/2026-09-07-short-reel-phase-02-03-repair.md)

---

## Findings First

### A-C01: Incomplete-source read compatibility admitted for new writes [RESOLVED]
- **Verification:**
  - In `packages/shared/src/shortReel/shortReel.schema.ts`, `createInitialShortReel` and `ShortReelEditCommandSchema` require `CompleteShortReelSourceSnapshotSchema` for creation and replacement.
  - In `apps/server/src/repository/shortReelSourcePolicy.ts`, `requireCompleteShortReelSource` strictly rejects incomplete sources with typed `INCOMPLETE_SOURCE` error if `fidelity === "incomplete"` or `original_question` is missing.
  - `assertShortReelSourceMutation` requires a complete source for all creative mutations (`update_script`, `update_segment`, `update_references`, `update_cover`, `update_publishing`).
  - Tested via 4 regression tests in `apps/server/test/shortReelCompleteSourceWrites.test.ts`. New creations and creative updates with incomplete sources fail with `INCOMPLETE_SOURCE`/`INVALID_SOURCE`, while legacy incomplete records remain readable and editable for model notes.
- **Disposition:** Satisfied.

### A-C02: Release drops SQLite lock while write is still running [RESOLVED]
- **Verification:**
  - Extracted admission and queueing into `shortReelWriterAdmission.ts` and `shortReelMutationQueue.ts`.
  - `reserveWriterOperation` synchronously increments `owner.pending += 1` before any task callback executes.
  - In `shortReelWriterAdmission.ts`, `finishDrainedOwners` only closes the SQLite database (`lease.db.close()`) when all owners have completed and drained (`drained.length === lease.owners.size` and `owner.pending === 0`).
  - The unsafe 5-second force-release timeout was completely removed. Virtual/simulated time beyond 5 seconds cannot force an unlock while work is running.
  - Tested via 7 lifecycle tests in `apps/server/test/shortReelDrainLifecycle.test.ts`, verifying synchronous reservation, queued task drainage, process exclusion during drain, non-owner release rejection, and safe root shutdown.
- **Disposition:** Satisfied.

### A-C03: Storage route did not await async root switch [RESOLVED]
- **Verification:**
  - In `apps/server/src/routes/system.ts:90`, `await repository.setStorageRoot(storageRoot)` is properly awaited before bootstrapping.
  - Tested via 2 tests in `apps/server/test/storageSwitchRoute.test.ts`.
- **Disposition:** Satisfied.

---

## Requirement Checks

| Requirement | Result | Evidence |
| :--- | :--- | :--- |
| **A1 Complete source write requirement** | PASS | `requireCompleteShortReelSource` enforces complete provenance on create/replace; 4 focused tests pass |
| **A1 Legacy read-only recovery** | PASS | Union schema allows legacy drafts without `original_question` to be listed and read safely without data loss |
| **A1 Script/cues boundary validation** | PASS | `validateReelScript` verifies canonical question/answer cues against source snapshot at repository boundary |
| **A1 Stale payload preservation** | PASS | Replacing source marks creative units stale while preserving prior payloads |
| **A2 Strict no-copy atomic replacement** | PASS | Rename exhaustion throws and unlinks temp file; `copyFile` is never called |
| **A2 Fail-closed single-writer admission** | PASS | SQLite OS lock with `STORAGE_BUSY` contention rejection; crash/SIGKILL releases lock immediately |
| **A2 Drain-safe writer lifecycle** | PASS | Synchronous reservation, zero timeout unlocks, all pending operations settle before database close |
| **A2 Replay & CAS serialization** | PASS | Unbounded mutation history; process-wide queue serializes writes; child-process restart verified |
| **Static checks & formatting** | PASS | ESLint 0 errors/0 warnings; Prettier clean; TypeScript typecheck passes |
| **English-only compliance** | PASS | 100% English across all modified files, test fixtures, comments, and documentation |
| **Zone validation & git hygiene** | PASS | 24 valid zones, 0 unmapped, 0 overlapping; git diff clean |

---

## Verification Performed By Reviewer

The reviewer executed the following automated checks on HEAD `42d2ecd79c2a3e1955499764661d05446a3baf46`:

1. `node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts`
   - **Result:** 25 / 25 passed (0 failed, 239ms)
2. `pnpm --filter @studio/server exec vitest run test/shortReelCompleteSourceWrites.test.ts test/shortReelDrainLifecycle.test.ts test/shortReelRepository.test.ts test/shortReelWriterSafety.test.ts test/shortReelSourcePersistence.test.ts test/shortReelAtomicWriter.test.ts test/shortReelQuestionSelection.test.ts test/storageSwitchRoute.test.ts test/repository.test.ts test/topicConfirmRoute.test.ts`
   - **Result:** 56 / 56 passed across 10 test suites (0 failed, 5.59s)
3. `pnpm typecheck`
   - **Result:** Exit code 0 across `@studio/shared`, `@studio/server`, and `@studio/web`
4. `pnpm exec eslint apps/server/src/repository/runtime.ts apps/server/src/repository/service.ts apps/server/src/repository/shortReelAtomicWriter.ts apps/server/src/repository/shortReelMutationQueue.ts apps/server/src/repository/shortReelSourcePolicy.ts apps/server/src/repository/shortReelWriterAdmission.ts apps/server/src/repository/shortReels.ts packages/shared/src/shortReel/shortReel.schema.ts packages/shared/src/shortReel/shortReelSource.schema.ts packages/shared/src/shortReel/shortReelSource.ts --no-warn-ignored`
   - **Result:** Exit code 0, 0 problems (0 errors, 0 warnings)
5. `pnpm exec prettier --check apps/server/src/repository/runtime.ts apps/server/src/repository/service.ts apps/server/src/repository/shortReelAtomicWriter.ts apps/server/src/repository/shortReelMutationQueue.ts apps/server/src/repository/shortReelSourcePolicy.ts apps/server/src/repository/shortReelWriterAdmission.ts apps/server/src/repository/shortReels.ts packages/shared/src/shortReel/shortReel.schema.ts packages/shared/src/shortReel/shortReelSource.schema.ts packages/shared/src/shortReel/shortReelSource.ts`
   - **Result:** Exit code 0, all matched files use Prettier code style
6. `node scripts/agent-validate-zones.mjs --json`
   - **Result:** Exit code 0, 24 valid zones, 0 unmapped files, 0 overlapping files
7. `git diff --check`
   - **Result:** Exit code 0, clean formatting and diff

---

## Decision

**ACCEPT Stage A Repair 03.**

All findings (A-R01 through A-R08, A-C01 through A-C03, and F03-08) are fully resolved with concrete regression tests and verified contracts.
- **Stage A Status:** **ACCEPTED**.
- **Stage B (Phase 03 repair) Status:** **ELIGIBLE TO PROCEED**.
- **Phase 04 Status:** **BLOCKED** until Stage B is implemented, verified, and accepted.

---

## Progress And Handoff

- **Progress Register:** Updated `docs/short-reel-implementation/progress.md` marking Stage A accepted.
- **Handoff Document:** `docs/agent-coordination/handoffs/short-reel-phase-02-repair-03-review.md`.
- **Next Step:** Authorize and execute Stage B under its own implementation claim.
