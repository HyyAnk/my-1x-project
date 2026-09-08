# Stage A Repair Review 02

## Review Identity

- **Target:** Stage A, Phase 02/03 boundary repair (Attempt 02), resolving review rejection findings A-R01 through A-R08 and F03-08.
- **Date:** 2026-09-07
- **Reviewer:** Independent fresh review (antigravity-p02-reviewer-02).
- **HEAD:** 42d2ecd79c2a3e1955499764661d05446a3baf46, main-direct
- **Current baseline fingerprint:** dc95b7c350ca56335a8fe9654c1da96f5589e46d57e397d1171df6522f6ef572, matching implementation release
- **Implementation claim:** claim-antigravityp02repair02-mtqzn0vp, released 2026-09-07T08:58:14.317Z
- **Review documentation claim:** claim-antigravityp02reviewer02-mtr0hvk2
- **References:**
  - [Implementation evidence](phase-02-repair-02.md)
  - [Implementation handoff](../../../agent-coordination/handoffs/short-reel-phase-02-repair-02.md)
  - [Prior review rejection](phase-02-repair-01-review.md)
  - [Repair plan](../../../superpowers/plans/2026-09-07-short-reel-phase-02-03-repair.md)

---

## Findings Evaluation (A-R01 through A-R08)

### A-R01: Same-process repositories bypass CAS serialization [RESOLVED]
- **Inspection:** Inspected `apps/server/src/repository/shortReelAtomicWriter.ts` lines 178-217. `runInCanonicalShortReelQueue` shares a module-level lock map across all `RepositoryService` instances in the same process, serializing per `${canonicalRoot}::${channelId}:${reelId}` and `${channelId}:create:${topicId}`.
- **Verification:** Ran barrier-driven concurrent update test in `apps/server/test/shortReelWriterSafety.test.ts`. Two distinct `RepositoryService` instances concurrently mutating the same reel from revision 1 result in exactly 1 success (revision 2) and 1 failure (`REVISION_CONFLICT`). No updates are lost.
- **Status:** Satisfied.

### A-R02: Forged source projection and hash pass persistence validation [RESOLVED]
- **Inspection:** Inspected `packages/shared/src/shortReel/shortReelSource.schema.ts` lines 147-322. `superRefine` enforces that question text, choice texts, choice IDs, choice counts, and correct choice ID match `original_question` (or its verified English translation). Additionally verifies `content_hash === computeSourceContentHash(...)`.
- **Verification:** Ran tests in `packages/shared/test/shortReelSource.test.ts` and `apps/server/test/shortReelSourcePersistence.test.ts`. Forged choices, altered question text, and dummy/zero hashes fail schema validation and repository write boundaries, preserving existing disk bytes.
- **Status:** Satisfied.

### A-R03: Required source field breaks current producer and hides existing drafts [RESOLVED]
- **Inspection:** Inspected `apps/server/src/shortReel/questionSelection.ts` line 247: `createEnglishSourceSnapshot` is wired with `translationProvenance`. In `shortReelSource.schema.ts`, `ShortReelSourceSnapshotSchema` is defined as a union including `IncompleteLegacyShortReelSourceSnapshotSchema` (`fidelity: "incomplete"`).
- **Verification:** All 6 tests in `shortReelQuestionSelection.test.ts` pass cleanly (including TP-03, TP-04, TP-06). In `shortReelSourcePersistence.test.ts`, legacy drafts are listed and retrieved by ID without error, and duplicate creations are blocked.
- **Status:** Satisfied.

### A-R04: Admission ownership and normal application release are not integrated [RESOLVED]
- **Inspection:** In `shortReelAtomicWriter.ts`, admission is tracked with `ownerId` (`serviceId`). Non-owners cannot release locks held by other instances. `setStorageRoot` cleans up prior root locks before switching roots. SQLite errors are sanitized to safe English `STORAGE_BUSY` errors without leaking raw SQLite strings or paths. In `apps/server/src/app.ts`, `buildApp.close` awaits `repository.close()`.
- **Verification:** Verified in `apps/server/test/shortReelAtomicWriter.test.ts` and `shortReelWriterSafety.test.ts`.
- **Status:** Satisfied.

### A-R05: Replay protection silently expires after 50 entries [RESOLVED]
- **Inspection:** Inspected `apps/server/src/repository/shortReels.ts` lines 260-264: `mutation_history` is unbounded and retains all applied mutation receipts without slicing or capping. In lines 104-114, `createShortReel` checks create payload hashes and rejects conflicting parameter reuse with `REQUEST_CONFLICT`.
- **Verification:** Verified via tests with 55+ sequential mutations and conflicting create payload replays in `apps/server/test/shortReelWriterSafety.test.ts`.
- **Status:** Satisfied.

### A-R06: Translation selection trusts a key despite contradictory language metadata [RESOLVED]
- **Inspection:** In `packages/shared/src/shortReel/shortReelSource.ts` lines 44-45, `resolveTranslationContent` verifies that translations under an `en` key must not declare a non-English language. All string trimming (`.trim()`) was removed from `shortReelSource.ts` to guarantee exact string fidelity.
- **Verification:** Unit tests in `packages/shared/test/shortReelSource.test.ts` confirm contradictory language metadata is rejected and exact whitespace is preserved.
- **Status:** Satisfied.

### A-R07: Actual temporary write/sync failure skips cleanup [RESOLVED]
- **Inspection:** In `apps/server/src/repository/shortReelAtomicWriter.ts` lines 226-278, `writeShortReelJsonAtomic` wraps the entire temporary file lifecycle in `try ... catch` ensuring that if `tempFileCreated` is true, `await unlink(tempPath)` is called on any write, sync, close, or rename failure.
- **Verification:** Injected EIO sync failure test in `apps/server/test/shortReelAtomicWriter.test.ts` proves that temporary files are deleted and destination files remain intact.
- **Status:** Satisfied.

### A-R08: Required static and true restart verification is missing/failing [RESOLVED]
- **Inspection:** Inspected ESLint and Prettier outputs: 0 errors, 0 warnings, all files formatted. Inspected test fixtures: French sentences replaced with English sentinels. Inspected module graph: circular dependencies eliminated by placing hashing and schemas in pure DAG.
- **Verification:** Ran true multi-process child process restart test in `apps/server/test/shortReelWriterSafety.test.ts`. Child Process 1 initializes storage and advances to revision 2; Child Process 2 starts up fresh on the same storage root, reads the reel from disk, verifies revision 2, validates replay/conflict semantics, and advances to revision 3.
- **Status:** Satisfied.

---

## Requirement Checks

| Gate | Result | Evidence |
| :--- | :--- | :--- |
| **A1 original-question retention/deep clone** | PASS | Full `original_question: BankQuestion` retained with deep clone; verified by unit tests |
| **A1 English / verified translation** | PASS | Strict validation of approved status, archetype, English language, and non-contradictory translation metadata |
| **A1 canonical script persistence** | PASS | Script cues strictly validated against source snapshot; mismatches rejected at persistence boundary |
| **A1 stale historical payload preservation** | PASS | Stale payloads retained on source replacement without failing schema validation |
| **A2 strict no-copy atomic rename** | PASS | Rename exhaustion throws and unlinks temp file; `copyFile` is never called |
| **A2 fail-closed single-writer admission** | PASS | Canonical root SQLite lock with STORAGE_BUSY contention rejection and crash release |
| **A2 admitted writer/CAS lifecycle** | PASS | Module-level process-wide queue serializes writes across distinct instances; app shutdown closes repository |
| **A2 replay and true process restart** | PASS | Unbounded mutation history; true multi-process child restart test verified |
| **Current consumers and prior records** | PASS | `questionSelection.ts` integrated; legacy v1 drafts parse safely as incomplete fidelity |
| **Static checks & formatting** | PASS | ESLint 0 errors/0 warnings; Prettier 100% formatted; TypeScript typecheck 0 errors |
| **English-only compliance** | PASS | 100% English code, comments, sentinels, and documentation across all modified files |
| **Zone validation & git hygiene** | PASS | 24 valid zones, 0 unmapped, 0 overlapping; git diff clean |

---

## Verification Performed By Reviewer

All checks executed independently on HEAD `42d2ecd79c2a3e1955499764661d05446a3baf46`:

1. `node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts`
   - **Result:** Exit code 0, 25 / 25 passed (0 failed, 334ms).
2. `pnpm --filter @studio/server exec vitest run test/shortReelRepository.test.ts test/shortReelAtomicWriter.test.ts test/shortReelWriterSafety.test.ts test/shortReelSourcePersistence.test.ts test/shortReelQuestionSelection.test.ts`
   - **Result:** Exit code 0, 33 / 33 passed across 5 test suites (0 failed, 6.24s).
3. `pnpm typecheck`
   - **Result:** Exit code 0 across `@studio/shared`, `@studio/server`, and `@studio/web`.
4. `pnpm exec eslint apps/server/src/repository/shortReelAtomicWriter.ts apps/server/src/repository/shortReelStorage.ts apps/server/src/repository/shortReels.ts packages/shared/src/shortReel/shortReelSource.schema.ts packages/shared/src/shortReel/shortReelSource.ts --no-warn-ignored`
   - **Result:** Exit code 0, 0 problems (0 errors, 0 warnings).
5. `pnpm exec prettier --check apps/server/src/repository/shortReelAtomicWriter.ts apps/server/src/repository/shortReelStorage.ts apps/server/src/repository/shortReels.ts packages/shared/src/shortReel/shortReelSource.schema.ts packages/shared/src/shortReel/shortReelSource.ts`
   - **Result:** Exit code 0, all matched files use Prettier code style.
6. `node scripts/agent-validate-zones.mjs --json`
   - **Result:** Exit code 0, 24 valid zones, 0 unmapped, 0 overlapping.
7. `git diff --check`
   - **Result:** Exit code 0, no trailing whitespace or conflict markers.

---

## Decision

**ACCEPT Stage A Repair Attempt 02.**

The Stage A repair satisfies all requirements under the repair plan:
- Resolves F03-08 and establishes the verified source/writer foundation for Stage B.
- Resolves all 8 review findings A-R01 through A-R08.
- Preserves pre-existing dirty files outside claimed scope.
- Enforces strict 100% English-only rules.

### Gate Advancement:
- **Phase 02 / Stage A Status:** **ACCEPTED**.
- **Stage B (Phase 03 repair) Status:** **ELIGIBLE TO PROCEED**.
- **Phase 04 Status:** **BLOCKED** until Stage B is implemented, verified, and accepted.

---

## Progress And Handoff

- **Progress Register:** Updated `docs/short-reel-implementation/progress.md` marking Phase 02 / Stage A as `accepted`.
- **Review Handoff:** `docs/agent-coordination/handoffs/short-reel-phase-02-repair-02-review.md`.
- **Next Eligible Action:** Execute Stage B of the repair plan (`docs/superpowers/plans/2026-09-07-short-reel-phase-02-03-repair.md`) to repair Phase 03 topic confirmation, slot steering, draft UI, and integration.
